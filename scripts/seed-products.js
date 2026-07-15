require('dotenv').config({ override: true });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const countRes = await pool.query('select count(*)::int as c from products');
  const count = countRes.rows[0].c;
  if (count > 0) {
    console.log(`Seed skipped (products=${count})`);
    await pool.end();
    return;
  }

  const items = [
    [
      'Midnight Leather Jacket',
      'fashion',
      299,
      'images/logo.png',
      JSON.stringify(['images/logo.png']),
      JSON.stringify(['Black', 'Brown']),
      'Premium leather jacket built for late nights.',
      'S,M,L,XL',
      12
    ],
    [
      'Designer Ceramic Vase',
      'home',
      129,
      'images/logo.png',
      JSON.stringify(['images/logo.png']),
      JSON.stringify(['White', 'Black']),
      'Hand-finished ceramic vase for modern interiors.',
      '',
      25
    ],
    [
      'Wireless Headphones',
      'electronics',
      349,
      'images/logo.png',
      JSON.stringify(['images/logo.png']),
      JSON.stringify(['Black', 'Silver']),
      'Noise-cancelling wireless headphones with deep bass.',
      '',
      18
    ]
  ];

  for (const it of items) {
    await pool.query(
      'insert into products (product_name, category, price, image, images, colors, description, sizes, stock) values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9)',
      it
    );
  }

  console.log('Seed OK');
  await pool.end();
}

main().catch((e) => {
  console.error('Seed FAIL', e);
  process.exit(1);
});

