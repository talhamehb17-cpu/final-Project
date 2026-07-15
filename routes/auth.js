const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateOTP } = require('../utils/otp');
const transporter = require('../utils/emailTransporter');
const jwt = require('jsonwebtoken');
const { sanitizeName, sanitizeEmail, sanitizeString } = require('../utils/sanitize');
const { authLimiter, loginLimiter } = require('../middleware/rateLimit');

// ===== SIGNUP =====
router.post('/signup', authLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });

        const sanitizedName = sanitizeName(name);
        const sanitizedEmail = sanitizeEmail(email);

        if (!sanitizedName || sanitizedName.length < 2) return res.status(400).json({ message: 'Invalid name' });
        if (!sanitizedEmail) return res.status(400).json({ message: 'Invalid email' });
        if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const hashed = await hashPassword(password);
        const otp = generateOTP();
        const otpExpire = new Date(Date.now() + process.env.OTP_EXPIRE * 60000); // e.g., 10 min

        const newUser = await User.create({
            name: sanitizedName,
            email: sanitizedEmail,
            password: hashed,
            otp,
            otpExpire,
            isVerified: false
        });

        // Send OTP email (console fallback if fails)
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify your Nighthowls account',
                html: `<p>Hello ${name},</p>
                       <p>Your OTP is: <b>${otp}</b></p>
                       <p>It expires in ${process.env.OTP_EXPIRE} minutes</p>`
            });
        } catch (emailErr) {
            console.log('Email send failed, OTP:', otp);
        }

        // Always return JSON
        res.json({ message: 'User registered. OTP sent', email });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// ===== VERIFY OTP =====
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const sanitizedEmail = sanitizeEmail(email);
        const sanitizedOtp = sanitizeString(otp, 10);

        if (!sanitizedEmail) return res.status(400).json({ message: 'Invalid email' });
        if (!sanitizedOtp || sanitizedOtp.length !== 6) return res.status(400).json({ message: 'Invalid OTP' });

        const user = await User.findOne({ email: sanitizedEmail });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

        if (user.otp !== sanitizedOtp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.otpExpire < new Date()) return res.status(400).json({ message: 'OTP expired' });

        user.isVerified = true;
        user.otp = null;
        user.otpExpire = null;
        await user.save();

        res.json({ message: 'OTP verified successfully', email: user.email });

    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ message: 'Server error during OTP verification' });
    }
});

// ===== LOGIN =====
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        const sanitizedEmail = sanitizeEmail(email);

        if (!sanitizedEmail || !password) return res.status(400).json({ message: 'Email and password required' });
        if (password.length < 6) return res.status(400).json({ message: 'Invalid password' });

        const user = await User.findOne({ email: sanitizedEmail });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (!user.isVerified) return res.status(400).json({ message: 'Please verify your account with OTP' });

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            message: 'Login successful', 
            token, 
            user: { id: String(user._id), name: user.name, email: user.email } 
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

module.exports = router;
