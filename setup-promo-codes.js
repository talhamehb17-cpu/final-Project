// Setup script to create promo_codes table
// Run with: node setup-promo-codes.js

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

async function setupPromoCodesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating promo_codes table...');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
          expiry_date TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_active_expiry ON promo_codes(is_active, expiry_date);
    `);

    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_promo_codes_updated_at ON promo_codes;
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_promo_codes_updated_at
          BEFORE UPDATE ON promo_codes
          FOR EACH ROW
          EXECUTE FUNCTION update_promo_codes_updated_at();
    `);

    // Insert sample promo codes
    await client.query(`
      INSERT INTO promo_codes (code, discount_percentage, expiry_date, is_active, created_by) VALUES
          ('WELCOME10', 10.00, CURRENT_TIMESTAMP + INTERVAL '30 days', true, 'admin@nighthowls.com'),
          ('SUMMER20', 20.00, CURRENT_TIMESTAMP + INTERVAL '60 days', true, 'admin@nighthowls.com'),
          ('FLASH15', 15.00, CURRENT_TIMESTAMP + INTERVAL '7 days', true, 'admin@nighthowls.com')
      ON CONFLICT (code) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✓ promo_codes table created successfully');
    console.log('✓ Sample promo codes inserted: WELCOME10 (10%), SUMMER20 (20%), FLASH15 (15%)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating promo_codes table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

setupPromoCodesTable()
  .then(() => {
    console.log('Setup completed successfully');
    pool.end();
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    pool.end();
    process.exit(1);
  });
