const { pool } = require('../db/pg');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration: add_promo_to_orders.sql');
    
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50)');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2)');
    
    await client.query(`COMMENT ON COLUMN orders.promo_code IS 'The promo code applied to this order, if any'`);
    await client.query(`COMMENT ON COLUMN orders.discount_percentage IS 'The discount percentage applied (e.g., 10.00 for 10%)'`);
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
