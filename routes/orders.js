const express = require('express');
const { pool } = require('../db/pg');
const { requireAuth } = require('../middleware/auth');
const transporter = require('../utils/emailTransporter');
const User = require('../models/User');
const { orderCustomerEmailHtml, orderOwnerEmailHtml } = require('../utils/emails');
const multer = require('multer');
const { sanitizeName, sanitizeEmail, sanitizePhone, sanitizeAddress, sanitizeString, sanitizeNumber } = require('../utils/sanitize');

const router = express.Router();

console.log('Orders routes loaded');

// Configure multer for memory storage (screenshot not saved to disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ message: err.message });
        }
        if (err.message === 'Only image files are allowed') {
            return res.status(400).json({ message: 'Only image files are allowed' });
        }
    }
    next(err);
};


const CANCEL_WINDOW_DAYS = 3;
const DELIVERY_ETA_DAYS = 7;

router.post('/', requireAuth, upload.single('payment_screenshot'), async (req, res) => {
  let client;
  try {
    client = await pool.connect();
  } catch (dbErr) {
    console.error('Failed to connect to database:', dbErr);
    return res.status(500).json({ message: 'Database connection failed' });
  }

  try {
    const userId = req.user.id;
    const paymentMethod = req.body.payment_method || 'COD';
    const brandName = process.env.BRAND_NAME || 'Nighthowls';
    const ownerEmail = process.env.ORDER_NOTIFY_TO || process.env.EMAIL_USER;
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
    const supportPhone = process.env.SUPPORT_PHONE || process.env.PHONE;
    const paymentScreenshot = req.file; // Screenshot from multer

    const {
      customer_name,
      customer_email,
      phone,
      address2,
      city,
      town,
      street,
      house_number,
      country,
      order_notes,
      promo_code
    } = req.body || {};

    const mongoUser = await User.findById(userId).lean();
    
    // Sanitize inputs
    const sanitizedCustomerName = sanitizeName(customer_name) || sanitizeName(mongoUser?.name) || 'Customer';
    const sanitizedCustomerEmail = sanitizeEmail(customer_email) || sanitizeEmail(mongoUser?.email);
    const sanitizedPhone = sanitizePhone(phone);
    const sanitizedCity = sanitizeAddress(city);
    const sanitizedTown = sanitizeAddress(town);
    const sanitizedStreet = sanitizeAddress(street);
    const sanitizedHouseNumber = sanitizeAddress(house_number);
    const sanitizedAddress2 = sanitizeAddress(address2) || '';
    const sanitizedCountry = sanitizeAddress(country);
    const sanitizedOrderNotes = sanitizeString(order_notes, 500) || '';
    const sanitizedPromoCode = promo_code ? sanitizeString(promo_code, 50).toUpperCase() : null;
    
    const loginEmail = (req.user.email || mongoUser?.email || '').toLowerCase();

    // Enforce user-specific by logged-in email
    if (!loginEmail) return res.status(400).json({ message: 'Login email missing' });
    if (sanitizedCustomerEmail && sanitizedCustomerEmail !== loginEmail) {
      return res.status(400).json({ message: 'Order email must match the logged-in email' });
    }

    // Pakistan only
    if (sanitizedCountry.toLowerCase() !== 'pakistan') {
      return res.status(400).json({ message: 'Orders are available for Pakistan only' });
    }

    // Required address fields
    if (!sanitizedCity || !sanitizedTown || !sanitizedStreet || !sanitizedHouseNumber) {
      return res.status(400).json({ message: 'City, Town, Street, and House/Apartment No. are required' });
    }

    await client.query('begin');

    const cartRes = await client.query(
      `select product_id, quantity, color, size from cart_items where user_id = $1`,
      [userId]
    );
    if (cartRes.rowCount === 0) {
      await client.query('rollback');
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const ids = cartRes.rows.map(r => r.product_id);
    const productsRes = await client.query(
      `select id, product_name, price, old_price, image, stock from products where id = any($1::int[])`,
      [ids]
    );

    const productById = new Map(productsRes.rows.map(p => [p.id, p]));
    let subtotal = 0;

    for (const row of cartRes.rows) {
      const p = productById.get(row.product_id);
      if (!p) {
        await client.query('rollback');
        return res.status(400).json({ message: 'One or more products no longer exist' });
      }
      if (typeof p.stock === 'number' && p.stock < row.quantity) {
        await client.query('rollback');
        return res.status(400).json({ message: 'Not enough stock for one or more items' });
      }
      const unit = Number(p.price);
      subtotal += unit * Number(row.quantity);
    }

    // Validate promo code and calculate discount
    let discountPercentage = 0.03; // Default 3% discount
    let appliedPromoCode = null;
    
    if (sanitizedPromoCode) {
      const promoResult = await client.query(
        `SELECT code, discount_percentage FROM promo_codes 
         WHERE code = $1 AND is_active = true AND expiry_date > CURRENT_TIMESTAMP`,
        [sanitizedPromoCode]
      );
      
      if (promoResult.rows.length > 0) {
        discountPercentage = parseFloat(promoResult.rows[0].discount_percentage) / 100;
        appliedPromoCode = promoResult.rows[0].code;
      } else {
        await client.query('rollback');
        return res.status(400).json({ message: 'Invalid or expired promo code' });
      }
    }
    
    const discountTotal = subtotal * discountPercentage;
    const shipping = 100; // Fixed shipping fee of Rs. 100
    const tax = 0; // No tax
    const totalAmount = subtotal - discountTotal + shipping;
    const estimatedDeliveryDate = new Date(Date.now() + DELIVERY_ETA_DAYS * 24 * 60 * 60 * 1000);

    const shippingAddress = {
      address2: sanitizedAddress2,
      city: sanitizedCity,
      town: sanitizedTown,
      street: sanitizedStreet,
      house_number: sanitizedHouseNumber,
      country: 'Pakistan'
    };

    const orderRes = await client.query(
      `insert into orders (
          user_id, total_amount, payment_method, status,
          customer_name, customer_email, phone, shipping_address,
          subtotal, discount_total, shipping, tax, estimated_delivery_date,
          promo_code, discount_percentage
       )
       values ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning order_id`,
      [
        userId,
        totalAmount,
        paymentMethod,
        sanitizedCustomerName,
        loginEmail,
        sanitizedPhone || null,
        JSON.stringify({ ...shippingAddress, order_notes: sanitizedOrderNotes }),
        subtotal,
        discountTotal,
        shipping,
        tax,
        estimatedDeliveryDate.toISOString().slice(0, 10),
        appliedPromoCode,
        discountPercentage * 100
      ]
    );
    const orderId = orderRes.rows[0].order_id;

    const emailItems = [];
    for (const row of cartRes.rows) {
      const p = productById.get(row.product_id);
      await client.query(
        `insert into order_items (order_id, product_id, quantity, price, unit_price, old_price, product_name, image, color, size)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          orderId,
          row.product_id,
          row.quantity,
          p.price,
          p.price,
          p.old_price,
          p.product_name,
          p.image,
          row.color || null,
          row.size || null
        ]
      );

      emailItems.push({
        product_id: row.product_id,
        product_name: p.product_name,
        image: p.image,
        quantity: row.quantity,
        unit_price: Number(p.price),
        old_price: p.old_price == null ? null : Number(p.old_price),
        color: row.color || null,
        size: row.size || null
      });

      if (typeof p.stock === 'number') {
        await client.query(
          `update products set stock = stock - $2 where id = $1`,
          [row.product_id, row.quantity]
        );
      }
    }

    await client.query(`delete from cart_items where user_id = $1`, [userId]);
    await client.query('commit');

    // Send order emails in background (never fail the order if email fails)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && ownerEmail) {
      const createdAt = new Date();
      const deliveryText = `Your order will be delivered in ${DELIVERY_ETA_DAYS} days (1 week).`;
      const deliveryDate = estimatedDeliveryDate.toISOString().slice(0, 10);
      const fullAddress = `${shippingAddress.house_number}, ${shippingAddress.street}, ${shippingAddress.town}, ${shippingAddress.city}, Pakistan`;

      // Prepare attachments for owner email (screenshot for EasyPaisa)
      const ownerAttachments = [];
      if (paymentMethod === 'EasyPaisa' && paymentScreenshot) {
        ownerAttachments.push({
          filename: `payment_screenshot_${orderId}.png`,
          content: paymentScreenshot.buffer,
          contentType: paymentScreenshot.mimetype
        });
      }

      // Send emails in background without awaiting
      Promise.resolve().then(async () => {
        try {
          // Owner copy
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: ownerEmail,
            subject: `New Order Received - ${paymentMethod}`,
            html: orderOwnerEmailHtml({
              brandName,
              orderId,
              createdAt,
              deliveryDate,
              customerName: sanitizedCustomerName,
              customerEmail: loginEmail,
              phone: typeof phone === 'string' ? phone.trim() : '',
              fullAddress,
              items: emailItems,
              subtotal,
              discountTotal,
              shipping,
              tax,
              total: totalAmount,
              paymentMethod,
              promoCode: appliedPromoCode,
              discountPercentage: discountPercentage * 100,
              status: 'pending'
            }),
            attachments: ownerAttachments
          });

          // Customer copy (NO screenshot attachment)
          if (loginEmail) {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: loginEmail,
              subject: 'Thank You for Shopping with Us!',
              html: orderCustomerEmailHtml({
                brandName,
                customerName: sanitizedCustomerName,
                orderId,
                createdAt,
                deliveryText,
                deliveryDate,
                items: emailItems,
                subtotal,
                discountTotal,
                shipping,
                tax,
                total: totalAmount,
                contactEmail: supportEmail,
                contactPhone: supportPhone,
                paymentMethod,
                promoCode: appliedPromoCode,
                discountPercentage: discountPercentage * 100,
                status: 'pending'
              })
            });
          }
        } catch (mailErr) {
          console.log('Order email send failed:', mailErr?.message || mailErr);
        }
      }).catch(mailErr => {
        console.log('Order email send failed:', mailErr?.message || mailErr);
      });
    }

    return res.json({
      message: 'Order placed',
      order_id: orderId,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      estimated_delivery_date: estimatedDeliveryDate.toISOString().slice(0, 10),
      delivery_eta_days: DELIVERY_ETA_DAYS
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('rollback');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
    console.error('Orders POST error:', err);
    return res.status(500).json({ message: err.message || 'SQL not configured or server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

router.post('/:orderId/cancel', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const loginEmail = (req.user.email || '').toLowerCase();
    const orderId = req.params.orderId;

    if (!orderId) return res.status(400).json({ message: 'Order id is required' });

    await client.query('begin');

    const orderRes = await client.query(
      `select order_id, status, created_at
       from orders
       where order_id = $1 and user_id = $2 and customer_email = $3
       for update`,
      [orderId, userId, loginEmail]
    );

    if (orderRes.rowCount === 0) {
      await client.query('rollback');
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRes.rows[0];
    const status = String(order.status || '').toLowerCase();
    if (status === 'delivered') {
      await client.query('rollback');
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }
    if (status === 'cancelled') {
      await client.query('rollback');
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    const createdAt = order.created_at ? new Date(order.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      await client.query('rollback');
      return res.status(400).json({ message: 'Order date missing; cannot cancel' });
    }

    const deadlineMs = createdAt.getTime() + CANCEL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > deadlineMs) {
      await client.query('rollback');
      return res.status(400).json({ message: `Cancellation window expired (${CANCEL_WINDOW_DAYS} days)` });
    }

    // Restock items (best effort) + mark cancelled
    const itemsRes = await client.query(
      `select product_id, quantity
       from order_items
       where order_id = $1`,
      [orderId]
    );

    await client.query(
      `update orders
       set status = 'cancelled'
       where order_id = $1 and user_id = $2 and customer_email = $3`,
      [orderId, userId, loginEmail]
    );

    for (const it of itemsRes.rows) {
      await client.query(
        `update products
         set stock = stock + $2
         where id = $1`,
        [it.product_id, it.quantity]
      );
    }

    await client.query('commit');
    return res.json({ message: 'Order cancelled', order_id: orderId });
  } catch (err) {
    await client.query('rollback');
    console.error('Orders CANCEL error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  } finally {
    client.release();
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const loginEmail = (req.user.email || '').toLowerCase();

    // Auto-transition is handled by the background order status scheduler.

    // Backfill older orders that were created before customer_email was enforced.
    // This preserves user isolation (still scoped to this user_id) and makes orders visible again.
    if (loginEmail) {
      await pool.query(
        `update orders
         set customer_email = $2
         where user_id = $1
           and (customer_email is null or btrim(customer_email) = '')`,
        [userId, loginEmail]
      );
    }

    const ordersRes = await pool.query(
      `select order_id, total_amount, payment_method, status, created_at,
              customer_name, customer_email, phone, shipping_address,
              subtotal, discount_total, shipping, tax, estimated_delivery_date,
              promo_code, discount_percentage,
              (created_at + interval '${CANCEL_WINDOW_DAYS} days') as cancel_deadline,
              (status not in ('delivered','cancelled')
                and created_at >= (now() - interval '${CANCEL_WINDOW_DAYS} days')
              ) as can_cancel
       from orders
       where user_id = $1 and customer_email = $2
       order by created_at desc
       limit 50`,
      [userId, loginEmail]
    );

    const orderIds = ordersRes.rows.map(o => o.order_id);
    if (orderIds.length === 0) return res.json({ orders: [] });

    const itemsRes = await pool.query(
      `select
          oi.order_id,
          oi.product_id,
          oi.quantity,
          coalesce(oi.product_name, p.product_name, '') as product_name,
          coalesce(oi.image, p.image, '') as image,
          coalesce(oi.unit_price, oi.price) as unit_price,
          coalesce(oi.old_price, p.old_price) as old_price,
          oi.color,
          oi.size
       from order_items oi
       left join products p on p.id = oi.product_id
       where oi.order_id = any($1::bigint[])
       order by oi.id asc`,
      [orderIds]
    );

    const itemsByOrder = new Map();
    for (const it of itemsRes.rows) {
      const k = String(it.order_id);
      if (!itemsByOrder.has(k)) itemsByOrder.set(k, []);
      itemsByOrder.get(k).push(it);
    }

    const orders = ordersRes.rows.map(o => ({
      ...o,
      items: itemsByOrder.get(String(o.order_id)) || []
    }));

    return res.json({ orders });
  } catch (err) {
    console.error('Orders GET error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

module.exports = router;

