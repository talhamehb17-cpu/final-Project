require('dotenv').config({ override: true });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Add columns if missing (safe to rerun)
  await pool.query(`alter table if exists cart_items add column if not exists product_name text`);
  await pool.query(`alter table if exists cart_items add column if not exists price numeric(10,2)`);
  await pool.query(`alter table if exists cart_items add column if not exists image text`);

  await pool.query(`alter table if exists wishlists add column if not exists product_name text`);
  await pool.query(`alter table if exists wishlists add column if not exists price numeric(10,2)`);
  await pool.query(`alter table if exists wishlists add column if not exists image text`);

  // Backfill snapshots from products where null
  await pool.query(`
    update cart_items c
    set product_name = coalesce(c.product_name, p.product_name),
        price = coalesce(c.price, p.price),
        image = coalesce(c.image, p.image)
    from products p
    where p.id = c.product_id
  `);

  await pool.query(`
    update wishlists w
    set product_name = coalesce(w.product_name, p.product_name),
        price = coalesce(w.price, p.price),
        image = coalesce(w.image, p.image)
    from products p
    where p.id = w.product_id
  `);

  console.log('Migration OK');
  await pool.end();
}

main().catch((e) => {
  console.error('Migration FAIL', e);
  process.exit(1);
});

