require('dotenv').config({ override: true });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pool.query(`alter table if exists reviews add column if not exists user_id text`);
  await pool.query(`alter table if exists reviews add column if not exists user_email text`);

  console.log('Migration OK');
  await pool.end();
}

main().catch((e) => {
  console.error('Migration FAIL', e);
  process.exit(1);
});

