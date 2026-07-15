const express = require('express');
const { pool } = require('../db/pg');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `select
          p.id,
          coalesce(c.product_name, p.product_name) as product_name,
          p.category,
          coalesce(c.price, p.price) as price,
          coalesce(c.image, p.image) as image,
          p.description,
          p.sizes,
          p.stock,
          c.quantity,
          c.color,
          c.size
       from cart_items c
       join products p on p.id = c.product_id
       where c.user_id = $1
       order by c.created_at desc`,
      [userId]
    );
    return res.json({ items: result.rows });
  } catch (err) {
    console.error('Cart GET error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.body?.product_id);
    const quantity = Number(req.body?.quantity ?? 1);
    const color = typeof req.body?.color === 'string' ? req.body.color.trim() : null;
    const size = typeof req.body?.size === 'string' ? req.body.size.trim() : null;
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product_id' });
    if (!Number.isFinite(quantity) || quantity < 1) return res.status(400).json({ message: 'Invalid quantity' });

    await pool.query(
      `insert into cart_items (user_id, product_id, quantity, product_name, price, image, color, size)
       select $1, p.id, $3, p.product_name, p.price, p.image, $4, $5
       from products p
       where p.id = $2
       on conflict (user_id, product_id)
       do update set
          quantity = cart_items.quantity + excluded.quantity,
          product_name = coalesce(cart_items.product_name, excluded.product_name),
          price = coalesce(cart_items.price, excluded.price),
          image = coalesce(cart_items.image, excluded.image),
          color = coalesce(excluded.color, cart_items.color),
          size = coalesce(excluded.size, cart_items.size)`,
      [userId, productId, quantity, color, size]
    );

    return res.json({ message: 'Added to cart' });
  } catch (err) {
    console.error('Cart POST error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

router.patch('/:productId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);
    const quantity = Number(req.body?.quantity);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });
    if (!Number.isFinite(quantity) || quantity < 1) return res.status(400).json({ message: 'Invalid quantity' });

    await pool.query(
      `update cart_items
       set quantity = $3
       where user_id = $1 and product_id = $2`,
      [userId, productId, quantity]
    );

    return res.json({ message: 'Quantity updated' });
  } catch (err) {
    console.error('Cart PATCH error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

    await pool.query(
      `delete from cart_items where user_id = $1 and product_id = $2`,
      [userId, productId]
    );

    return res.json({ message: 'Removed from cart' });
  } catch (err) {
    console.error('Cart DELETE error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(`delete from cart_items where user_id = $1`, [userId]);
    return res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('Cart CLEAR error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

module.exports = router;

