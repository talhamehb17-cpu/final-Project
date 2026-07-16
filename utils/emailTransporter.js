const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email Transporter] WARNING: EMAIL_USER or EMAIL_PASS is not set in environment variables. OTP emails will fail to send.');
}

// Shared nodemailer transporter instance
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    pool: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

module.exports = transporter;