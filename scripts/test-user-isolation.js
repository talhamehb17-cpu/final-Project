require('dotenv').config({ override: true });

async function signupVerifyLogin(base, name, email, password) {
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
  const j = await r.json();
  if (!r.ok) throw new Error('login failed');
  return { token: j.token, user: j.user, email };
}

function mkEmail() {
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}@gmail.com`;
}

async function main() {
  const base = 'https://final-project-production-13f4.up.railway.app/api';
  const password = 'testpass123';

  const a = await signupVerifyLogin(base, 'User A', mkEmail(), password);
  const b = await signupVerifyLogin(base, 'User B', mkEmail(), password);

  const authA = { Authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json' };

  await fetch(base + '/cart', { method: 'POST', headers: authA, body: JSON.stringify({ product_id: 1, quantity: 1 }) });
  await fetch(base + '/wishlist', { method: 'POST', headers: authA, body: JSON.stringify({ product_id: 2 }) });

  let r = await fetch(base + '/cart', { headers: { Authorization: 'Bearer ' + a.token } });
  let j = await r.json();
  console.log('A cart items:', j.items?.length, 'image:', j.items?.[0]?.image);

  r = await fetch(base + '/cart', { headers: { Authorization: 'Bearer ' + b.token } });
  j = await r.json();
  console.log('B cart items:', j.items?.length);

  r = await fetch(base + '/wishlist', { headers: { Authorization: 'Bearer ' + a.token } });
  j = await r.json();
  console.log('A wishlist items:', j.products?.length, 'image:', j.products?.[0]?.image);

  r = await fetch(base + '/wishlist', { headers: { Authorization: 'Bearer ' + b.token } });
  j = await r.json();
  console.log('B wishlist items:', j.products?.length);
}

main().catch((e) => {
  console.error('TEST FAIL', e.message);
  process.exit(1);
});

