const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pg');
const requireAdminAuth = require('../middleware/adminAuth');
const { adminActionLogger } = require('../middleware/adminLogger');

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Create JWT token with admin role
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name, 
        role: 'admin' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Verify Admin Token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Not an admin token' });
    }
    
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Dashboard Statistics
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    // Total orders
    const totalOrdersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);
    
    // Total revenue
    const totalRevenueResult = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != $1',
      ['cancelled']
    );
    const totalRevenue = parseFloat(totalRevenueResult.rows[0].total);
    
    // Total customers (from MongoDB)
    const User = require('../models/User');
    const totalCustomers = await User.countDocuments({ isVerified: true });
    
    // Total products
    const totalProductsResult = await pool.query('SELECT COUNT(*) as count FROM products');
    const totalProducts = parseInt(totalProductsResult.rows[0].count);
    
    // Order status counts
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);
    const orderStatuses = {};
    statusResult.rows.forEach(row => {
      orderStatuses[row.status] = parseInt(row.count);
    });
    
    // Low stock products (stock < 10)
    const lowStockResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE stock < 10'
    );
    const lowStockCount = parseInt(lowStockResult.rows[0].count);
    
    // Recent orders
    const recentOrdersResult = await pool.query(`
      SELECT o.order_id, o.total_amount, o.status, o.created_at, o.customer_name
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    const recentOrders = recentOrdersResult.rows.map(row => ({
      orderId: row.order_id,
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      createdAt: row.created_at,
      customerName: row.customer_name
    }));
    
    res.json({
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      orderStatuses: {
        pending: orderStatuses.pending || 0,
        processing: orderStatuses.processing || 0,
        delivered: orderStatuses.delivered || 0,
        cancelled: orderStatuses.cancelled || 0
      },
      lowStockCount,
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Products Management
router.get('/products', requireAdminAuth, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (product_name ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    
    if (search) {
      countQuery += ` AND (product_name ILIKE $${countParamIndex} OR category ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    
    if (category) {
      countQuery += ` AND category = $${countParamIndex}`;
      countParams.push(category);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    const products = result.rows.map(p => ({
      id: p.id,
      productName: p.product_name,
      category: p.category,
      price: parseFloat(p.price),
      oldPrice: p.old_price ? parseFloat(p.old_price) : null,
      image: p.image,
images: (() => {
  if (!p.images) return [];

  // Already array
  if (Array.isArray(p.images)) {
    return p.images;
  }

  // JSON string
  if (typeof p.images === "string") {
    try {
      return JSON.parse(p.images);
    } catch {
      return [p.images];
    }
  }

  return [];
})(),
 colors: (() => {
  if (!p.colors) return [];

  if (Array.isArray(p.colors)) {
    return p.colors;
  }

  if (typeof p.colors === "string") {
    try {
      return JSON.parse(p.colors);
    } catch {
      return [p.colors];
    }
  }

  return [];
})(),
      description: p.description,
      sizes: p.sizes,
      stock: p.stock
    }));
    
    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get Single Product
router.get('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = {
      id: result.rows[0].id,
      productName: result.rows[0].product_name,
      category: result.rows[0].category,
      price: parseFloat(result.rows[0].price),
      oldPrice: result.rows[0].old_price ? parseFloat(result.rows[0].old_price) : null,
      image: result.rows[0].image,
      images: result.rows[0].images || [],

      colors: result.rows[0].colors || [],
      description: result.rows[0].description,
      sizes: result.rows[0].sizes,
      stock: result.rows[0].stock
    };
    
    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// Add Product
router.post('/products', requireAdminAuth, async (req, res) => {
  try {
    const {
      product_name,
      category,
      price,
      old_price,
      image,
      images,
      description,
      sizes,
      colors,
      stock
    } = req.body;
    
    if (!product_name || !category || !price) {
      return res.status(400).json({ message: 'Product name, category, and price are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO products (product_name, category, price, old_price, image, images, description, sizes, colors, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        product_name,
        category,
        price,
        old_price || null,
        image || null,
        JSON.stringify(images || []),
        description || null,
        sizes || null,
        JSON.stringify(colors || []),
        stock || 0
      ]
    );
    
    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Update Product
router.put('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name,
      category,
      price,
      old_price,
      image,
      images,
      description,
      sizes,
      colors,
      stock
    } = req.body;
    
    const result = await pool.query(
      `UPDATE products 
       SET product_name = $1, category = $2, price = $3, old_price = $4, image = $5, 
           images = $6, description = $7, sizes = $8, colors = $9, stock = $10
       WHERE id = $11
       RETURNING *`,
      [
        product_name,
        category,
        price,
        old_price || null,
        image || null,
        JSON.stringify(images || []),
        description || null,
        sizes || null,
        JSON.stringify(colors || []),
        stock || 0,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete Product
router.delete('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// Orders Management
router.get('/orders', requireAdminAuth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'image', oi.image,
                 'color', oi.color,
                 'size', oi.size
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (o.customer_name ILIKE $${paramIndex} OR o.customer_email ILIKE $${paramIndex} OR CAST(o.order_id AS TEXT) ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` GROUP BY o.order_id ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT order_id) as count FROM orders WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (customer_name ILIKE $${countParamIndex} OR customer_email ILIKE $${countParamIndex} OR CAST(order_id AS TEXT) ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    const orders = result.rows.map(row => ({
      orderId: row.order_id,
      userId: row.user_id,
      totalAmount: parseFloat(row.total_amount),
      paymentMethod: row.payment_method,
      status: row.status,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      phone: row.phone,
      shippingAddress: row.shipping_address,
      subtotal: parseFloat(row.subtotal),
      discountTotal: parseFloat(row.discount_total),
      shipping: parseFloat(row.shipping),
      tax: parseFloat(row.tax),
      estimatedDeliveryDate: row.estimated_delivery_date,
      createdAt: row.created_at,
      promoCode: row.promo_code,
      discountPercentage: row.discount_percentage ? parseFloat(row.discount_percentage) : null,
      items: row.items || []
    }));
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get Single Order
router.get('/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'image', oi.image,
                 'color', oi.color,
                 'size', oi.size
               )
             ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.order_id = $1
       GROUP BY o.order_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const row = result.rows[0];
    res.json({
      order: {
        orderId: row.order_id,
        userId: row.user_id,
        totalAmount: parseFloat(row.total_amount),
        paymentMethod: row.payment_method,
        status: row.status,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        phone: row.phone,
        shippingAddress: row.shipping_address,
        subtotal: parseFloat(row.subtotal),
        discountTotal: parseFloat(row.discount_total),
        shipping: parseFloat(row.shipping),
        tax: parseFloat(row.tax),
        estimatedDeliveryDate: row.estimated_delivery_date,
        createdAt: row.created_at,
        promoCode: row.promo_code,
        discountPercentage: row.discount_percentage ? parseFloat(row.discount_percentage) : null,
        items: row.items || []
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// Update Order Status
router.put('/orders/:id/status', requireAdminAuth, adminActionLogger('UPDATE_ORDER_STATUS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// Customers Management
router.get('/customers', requireAdminAuth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const User = require('../models/User');
    
    let query = { isVerified: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const customers = await User.find(query)
      .select('-password -otp -otpExpiry')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    
    const total = await User.countDocuments(query);
    
    // Get order counts for each customer
    const customerIds = customers.map(c => c._id.toString());
    const orderCountsResult = await pool.query(
      `SELECT user_id, COUNT(*) as order_count, SUM(total_amount) as total_spent
       FROM orders 
       WHERE user_id = ANY($1)
       GROUP BY user_id`,
      [customerIds]
    );
    
    const orderStats = {};
    orderCountsResult.rows.forEach(row => {
      orderStats[row.user_id] = {
        orderCount: parseInt(row.order_count),
        totalSpent: parseFloat(row.total_spent)
      };
    });
    
    const customersWithStats = customers.map(c => ({
      id: c._id,
      name: c.name,
      email: c.email,
      createdAt: c.createdAt,
      orderCount: orderStats[c._id.toString()]?.orderCount || 0,
      totalSpent: orderStats[c._id.toString()]?.totalSpent || 0
    }));
    
    res.json({
      customers: customersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

// Inventory Management
router.get('/inventory', requireAdminAuth, async (req, res) => {
  try {
    const { lowStock = false, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM products';
    const params = [];
    
    if (lowStock === 'true') {
      query += ' WHERE stock < 10';
    }
    
    query += ' ORDER BY stock ASC, id DESC LIMIT $1 OFFSET $2';
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    const totalResult = await pool.query(
      lowStock === 'true' 
        ? 'SELECT COUNT(*) as count FROM products WHERE stock < 10'
        : 'SELECT COUNT(*) as count FROM products'
    );
    const total = parseInt(totalResult.rows[0].count);
    
    const products = result.rows.map(p => ({
      id: p.id,
      productName: p.product_name,
      category: p.category,
      stock: p.stock,
      price: parseFloat(p.price),
      image: p.image
    }));
    
    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Error fetching inventory' });
  }
});

// Analytics
router.get('/analytics', requireAdminAuth, async (req, res) => {
  try {
    // Sales overview (last 30 days)
    const salesResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    const salesData = salesResult.rows.map(row => ({
      date: row.date,
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue)
    }));
    
    // Best-selling products
    const bestSellersResult = await pool.query(`
      SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_sold DESC
      LIMIT 10
    `);
    
    const bestSellers = bestSellersResult.rows.map(row => ({
      productId: row.product_id,
      productName: row.product_name,
      totalSold: parseInt(row.total_sold),
      totalRevenue: parseFloat(row.total_revenue)
    }));
    
    // Customer growth (last 6 months)
    const User = require('../models/User');
    const customerGrowthResult = await User.aggregate([
      {
        $match: {
          isVerified: true,
          createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);
    
    const customerGrowth = customerGrowthResult.map(row => ({
      year: row._id.year,
      month: row._id.month,
      count: row.count
    }));
    
    // Revenue by category
    const categoryRevenueResult = await pool.query(`
      SELECT 
        p.category,
        SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status != 'cancelled'
      GROUP BY p.category
      ORDER BY revenue DESC
    `);
    
    const categoryRevenue = categoryRevenueResult.rows.map(row => ({
      category: row.category,
      revenue: parseFloat(row.revenue)
    }));
    
    res.json({
      salesData,
      bestSellers,
      customerGrowth,
      categoryRevenue
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

module.exports = router;

module.exports = router;
