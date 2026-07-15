require('dotenv').config({ override: true });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Orders: customer + totals + delivery
  await pool.query(`alter table if exists orders add column if not exists customer_name text`);
  await pool.query(`alter table if exists orders add column if not exists customer_email text`);
  await pool.query(`alter table if exists orders add column if not exists phone text`);
  await pool.query(`alter table if exists orders add column if not exists shipping_address jsonb`);

  await pool.query(`alter table if exists orders add column if not exists subtotal numeric(12,2)`);
  await pool.query(`alter table if exists orders add column if not exists discount_total numeric(12,2)`);
  await pool.query(`alter table if exists orders add column if not exists shipping numeric(12,2)`);
  await pool.query(`alter table if exists orders add column if not exists tax numeric(12,2)`);
  await pool.query(`alter table if exists orders add column if not exists estimated_delivery_date date`);

  // Order items snapshot for email/history
  await pool.query(`alter table if exists order_items add column if not exists product_name text`);
  await pool.query(`alter table if exists order_items add column if not exists image text`);
  await pool.query(`alter table if exists order_items add column if not exists old_price numeric(10,2)`);
  await pool.query(`alter table if exists order_items add column if not exists unit_price numeric(10,2)`);

  console.log('Migration OK');
  await pool.end();
}

main().catch((e) => {
  console.error('Migration FAIL', e);
  process.exit(1);
});

