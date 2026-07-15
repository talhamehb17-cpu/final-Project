require('dotenv').config({ override: true });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pool.query(`alter table if exists cart_items add column if not exists color text`);
  await pool.query(`alter table if exists cart_items add column if not exists size text`);

  await pool.query(`alter table if exists order_items add column if not exists color text`);
  await pool.query(`alter table if exists order_items add column if not exists size text`);

  console.log('Variant migration OK');
  await pool.end();
}

main().catch((e) => {
  console.error('Variant migration FAIL', e);
  process.exit(1);
});

