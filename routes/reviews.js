const express = require('express');
const { pool } = require('../db/pg');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const { sanitizeName, sanitizeString, sanitizeNumber } = require('../utils/sanitize');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `select id, name, text, rating, created_at
       from reviews
       order by created_at desc
       limit 50`
    );

    const reviews = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      text: r.text,
      rating: Number(r.rating),
      date: new Date(r.created_at).toISOString().split('T')[0]
    }));

    return res.json({ reviews });
  } catch (err) {
    console.error('Reviews GET error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error', reviews: [] });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const mongoUser = await User.findById(userId).lean();
    const { text, rating } = req.body || {};
    
    const sanitizedName = sanitizeName(mongoUser?.name) || 'Customer';
    const sanitizedEmail = mongoUser?.email || null;
    const sanitizedText = sanitizeString(text, 1000);
    const ratingNum = sanitizeNumber(rating, 1, 5);

    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!sanitizedText || sanitizedText.length < 5) {
      return res.status(400).json({ message: 'Review must be at least 5 characters' });
    }
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be 1 to 5' });
    }

    await pool.query(
      `insert into reviews (name, text, rating, user_id, user_email)
       values ($1, $2, $3, $4, $5)`,
      [sanitizedName, sanitizedText, ratingNum, String(userId), sanitizedEmail]
    );

    // Optional owner notification
    const ownerEmail = process.env.REVIEW_NOTIFY_TO || process.env.EMAIL_FROM || 'onboarding@resend.dev';
    if (process.env.RESEND_API_KEY && ownerEmail) {
      try {
        await sendEmail({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: ownerEmail,
          subject: `New review by ${sanitizedName}`,
          html: `<p><strong>Reviewer:</strong> ${sanitizedName}${sanitizedEmail ? ` (${sanitizedEmail})` : ''}</p>
                 <p><strong>Rating:</strong> ${ratingNum}/5</p>
                 <p><strong>Review:</strong></p>
                 <p>${sanitizedText}</p>`
        });
      } catch (e) {
        console.log('Review email failed:', e?.message || e);
      }
    }

    return res.json({ message: 'Review submitted' });
  } catch (err) {
    console.error('Reviews POST error:', err);
    return res.status(500).json({ message: 'SQL not configured or server error' });
  }
});

module.exports = router;

