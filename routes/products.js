const express = require('express');
const { pool } = require('../db/pg');

const router = express.Router();
// module loaded

function mapProduct(row) {
  const imagesRaw = row.images;
  const colorsRaw = row.colors;

  const images = Array.isArray(imagesRaw)
    ? imagesRaw.filter(Boolean).slice(0, 3)
    : (typeof imagesRaw === 'string'
      ? (() => {
        try {
          const parsed = JSON.parse(imagesRaw);
          return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 3) : [];
        } catch {
          return [];
        }
      })()
      : []);

  const colors = Array.isArray(colorsRaw)
    ? colorsRaw.filter(Boolean)
    : (typeof colorsRaw === 'string'
      ? (() => {
        try {
          const parsed = JSON.parse(colorsRaw);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
          return [];
        }
      })()
      : []);

  const primaryImage = (images[0] || row.image);

  return {
    id: row.id,
    product_name: row.product_name,
    category: row.category,
    price: Number(row.price),
    old_price: row.old_price == null ? null : Number(row.old_price),
    image: primaryImage,
    images: images.length ? images : (row.image ? [row.image] : []),
    colors,
    description: row.description,
    sizes: row.sizes,
    stock: row.stock
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `select id, product_name, category, price, old_price, image, images, colors, description, sizes, stock
       from products
       order by id asc`
    );
    return res.json({ products: result.rows.map(mapProduct) });
  } catch (err) {
    console.log('Products GET error:', err?.message || err);
    return res.status(500).json({
      message: 'SQL not configured or server error',
      error: process.env.NODE_ENV === 'production' ? 'hidden' : (err?.message || String(err)),
      products: []
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid product id' });

    const result = await pool.query(
      `select id, product_name, category, price, old_price, image, images, colors, description, sizes, stock
       from products
       where id = $1
       limit 1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
    return res.json({ product: mapProduct(result.rows[0]) });
  } catch (err) {
    console.log('Products GET/:id error:', err?.message || err);
    return res.status(500).json({
      message: 'SQL not configured or server error',
      error: process.env.NODE_ENV === 'production' ? 'hidden' : (err?.message || String(err))
    });
  }
});

module.exports = router;

