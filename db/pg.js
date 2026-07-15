const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // Allow server to start for auth-only usage
  console.warn('DATABASE_URL not set. SQL-backed features will not work until configured.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected database connection error:', err.message);
  if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    console.error('Database connection failed: Network/DNS issue. Check your internet connection and DNS settings.');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('Database connection refused: Check if the database server is running and accessible.');
  }
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('DNS resolution failed. The database hostname cannot be resolved.');
      console.error('Possible fixes:');
      console.error('1. Check your internet connection');
      console.error('2. Try changing DNS to 8.8.8.8 (Google DNS)');
      console.error('3. Disable VPN if using one');
      console.error('4. Check if Supabase is accessible in your region');
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      console.error('Connection timeout. The database server is not responding.');
      console.error('Possible fixes:');
      console.error('1. Check your internet connection stability');
      console.error('2. Check if firewall is blocking port 6543');
      console.error('3. Verify Supabase project is active and not paused');
      console.error('4. Try accessing Supabase dashboard to verify service status');
      console.error('5. Check if your IP is allowed in Supabase settings');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. The database server rejected the connection.');
      console.error('Possible fixes:');
      console.error('1. Verify DATABASE_URL is correct');
      console.error('2. Check if Supabase project is active');
      console.error('3. Verify your credentials in DATABASE_URL');
    }
  } else {
    console.log('Database connected successfully');
    release();
  }
});

module.exports = { pool };

