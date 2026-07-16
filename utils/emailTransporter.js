const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email Transporter] WARNING: EMAIL_USER or EMAIL_PASS is not set in environment variables. OTP emails will fail to send.');
}

// Shared nodemailer transporter instance
const transporter = nodemailer.createTransport({
    pool: true, // Enable connection pooling to speed up handshake latency
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = transporter;
