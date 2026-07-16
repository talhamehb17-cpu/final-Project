const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const { sendEmail } = require('../utils/emailService');
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

    // Optional: notify store inbox. Never fail the request if email fails.
    const notifyTo = process.env.CONTACT_NOTIFY_TO || process.env.EMAIL_FROM || 'onboarding@resend.dev';
    if (process.env.RESEND_API_KEY && notifyTo) {
      try {
        await sendEmail({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: notifyTo,
          subject: `New contact message from ${sanitizedName}`,
          html: `<p><strong>Name:</strong> ${sanitizedName}</p>
                 <p><strong>Email:</strong> ${sanitizedEmail}</p>
                 <p><strong>Message:</strong></p>
                 <p>${sanitizedMessage}</p>`
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

