require('dotenv').config({ override: true });

async function main() {
  const base = 'http://localhost:5000/api';
  const password = 'testpass123';
  const email = `order_${Date.now()}@gmail.com`;
  const name = 'Order Test';

  let r = await fetch(base + '/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  if (!r.ok) throw new Error('signup failed');

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const u = await User.findOne({ email }).lean();
  const otp = u?.otp;
  await mongoose.disconnect();
  if (!otp) throw new Error('otp missing');

  r = await fetch(base + '/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  if (!r.ok) throw new Error('verify failed');

  r = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const login = await r.json();
  if (!r.ok) throw new Error('login failed');
  const token = login.token;

  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  await fetch(base + '/cart', { method: 'POST', headers: auth, body: JSON.stringify({ product_id: 1, quantity: 2 }) });

  r = await fetch(base + '/orders', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      customer_name: name,
      customer_email: email,
      phone: '123456789',
      address: 'Street 1',
      city: 'City',
      state: 'CA',
      zip: '00000',
      country: 'US'
    })
  });
  const placed = await r.json();
  if (!r.ok) throw new Error(placed.message || 'order failed');

  console.log('order placed', placed.order_id, placed.total_amount);

  r = await fetch(base + '/orders', { headers: { Authorization: 'Bearer ' + token } });
  const orders = await r.json();
  console.log('orders', orders.orders?.length, 'items', orders.orders?.[0]?.items?.length);
}

main().catch((e) => {
  console.error('TEST FAIL', e.message);
  process.exit(1);
});

