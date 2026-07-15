const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const transporter = require('../utils/emailTransporter');
const { sanitizeName, sanitizeEmail, sanitizeString } = require('../utils/sanitize');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    const sanitizedName = sanitizeName(name);
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedMessage = sanitizeString(message, 2000);

    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!sanitizedEmail) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!sanitizedMessage || sanitizedMessage.length < 5) {
      return res.status(400).json({ message: 'Message must be at least 5 characters' });
    }

    await ContactMessage.create({
      name: sanitizedName,
      email: sanitizedEmail,
      message: sanitizedMessage
    });

    // Optional: notify store inbox. Never fail the request if SMTP fails.
    const notifyTo = process.env.CONTACT_NOTIFY_TO || process.env.EMAIL_USER;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && notifyTo) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: notifyTo,
          replyTo: sanitizedEmail,
          subject: `New contact message from ${sanitizedName}`,
          text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\n\nMessage:\n${sanitizedMessage}\n`
        });
      } catch (mailErr) {
        console.log('Contact email send failed:', mailErr?.message || mailErr);
      }
    }

    return res.json({ message: 'Message received' });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

