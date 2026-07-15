require('dotenv').config({ override: true });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const countRes = await pool.query('select count(*)::int as c from reviews');
  const count = countRes.rows[0].c;
  if (count > 0) {
    console.log(`Seed skipped (reviews=${count})`);
    await pool.end();
    return;
  }

  await pool.query('insert into reviews (name, text, rating) values ($1,$2,$3)', [
    'Ayesha',
    'Great quality and fast delivery!',
    5
  ]);

  await pool.query('insert into reviews (name, text, rating) values ($1,$2,$3)', [
    'Hamza',
    'Clean design, premium feel. Highly recommended.',
    4
  ]);

  await pool.query('insert into reviews (name, text, rating) values ($1,$2,$3)', [
    'Sara',
    'Customer support was super helpful and responsive.',
    5
  ]);

  console.log('Seed OK');
  await pool.end();
}

main().catch((e) => {
  console.error('Seed FAIL', e);
  process.exit(1);
});

