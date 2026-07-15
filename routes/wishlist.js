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
          coalesce(w.product_name, p.product_name) as product_name,
          p.category,
          coalesce(w.price, p.price) as price,
          coalesce(w.image, p.image) as image,
          p.description,
          p.sizes,
          p.stock
       from wishlists w
       join products p on p.id = w.product_id
       where w.user_id = $1
       order by w.created_at desc`,
      [userId]
    );
    return res.json({ products: result.rows });
  } catch (err) {
    console.error('Wishlist GET error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.body?.product_id);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product_id' });

    await pool.query(
      `insert into wishlists (user_id, product_id, product_name, price, image)
       select $1, p.id, p.product_name, p.price, p.image
       from products p
       where p.id = $2
       on conflict (user_id, product_id) do nothing`,
      [userId, productId]
    );

    return res.json({ message: 'Added to wishlist' });
  } catch (err) {
    console.error('Wishlist POST error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

    await pool.query(
      `delete from wishlists where user_id = $1 and product_id = $2`,
      [userId, productId]
    );

    return res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error('Wishlist DELETE error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

module.exports = router;

