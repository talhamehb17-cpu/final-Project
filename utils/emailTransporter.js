const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email Transporter] WARNING: EMAIL_USER or EMAIL_PASS is not set');
}

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log("[EMAIL VERIFY FAILED]", error);
    } else {
        console.log("[EMAIL SERVER READY]");
    }
});

module.exports = transporter;