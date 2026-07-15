require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Check if admin exists
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required to create the admin account.');
      process.exit(1);
    }

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email:', adminEmail);
      console.log('Password: (existing password)');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new Admin({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin'
      });
      
      await admin.save();
      console.log('Admin user created successfully');
      console.log('Email:', adminEmail);
      console.log('Password: (configured password from environment)');
    }

    // Check PostgreSQL connection
    const { pool } = require('../db/pg');
    
    try {
      // Test connection
      await pool.query('SELECT NOW()');
      console.log('PostgreSQL connected successfully');

      // Check if tables exist
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log('PostgreSQL tables:', tables.rows.map(t => t.table_name));

      // Check products count
      const productsCount = await pool.query('SELECT COUNT(*) FROM products');
      console.log('Products count:', productsCount.rows[0].count);

      // Check orders count
      const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
      console.log('Orders count:', ordersCount.rows[0].count);

    } catch (pgError) {
      console.error('PostgreSQL error:', pgError.message);
      console.log('PostgreSQL may not be configured. Check DATABASE_URL in .env');
    }

  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setupAdmin();
