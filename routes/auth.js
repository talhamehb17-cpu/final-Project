const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateOTP } = require('../utils/otp');
const transporter = require('../utils/emailTransporter');
const jwt = require('jsonwebtoken');
const { sanitizeName, sanitizeEmail, sanitizeString } = require('../utils/sanitize');
const { authLimiter, loginLimiter } = require('../middleware/rateLimit');
const { storePendingRegistration, getPendingRegistration, deletePendingRegistration } = require('../utils/tempRegistrationStore');

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

        // Check if user already exists (both verified and pending)
        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ message: 'Email already registered' });
            } else {
                // Delete old unverified user from DB to avoid duplicate key issues during OTP verification
                console.log(`[Signup] Deleting old unverified user record for ${sanitizedEmail}`);
                await User.deleteOne({ email: sanitizedEmail });
            }
        }

        const hashed = await hashPassword(password);
        const otp = generateOTP();
        const otpExpire = new Date(Date.now() + (process.env.OTP_EXPIRE || 10) * 60000); // e.g., 10 min

        // Store registration data temporarily (don't create user yet)
        storePendingRegistration(sanitizedEmail, {
            name: sanitizedName,
            email: sanitizedEmail,
            password: hashed,
            otp,
            otpExpire
        });

        console.log(`[OTP] Generated OTP for ${sanitizedEmail}: ${otp}`);

        // Send OTP email with proper error handling
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify your Nighthowls account',
                html: `<p>Hello ${name},</p>
                       <p>Your OTP is: <b>${otp}</b></p>
                       <p>It expires in ${process.env.OTP_EXPIRE || 10} minutes</p>
                       <p>If you didn't request this, please ignore this email.</p>`
            });
            console.log(`[OTP] Email sent successfully to ${sanitizedEmail}`);
        } catch (emailErr) {
            console.error('[OTP] Email send failed:', emailErr);
            // Clean up pending registration if email fails
            deletePendingRegistration(sanitizedEmail);
            return res.status(500).json({ 
                message: 'Failed to send OTP email. Please try again later.',
                error: 'EMAIL_SEND_FAILED'
            });
        }

        // Only return success if email was actually sent
        res.json({ message: 'OTP sent successfully', email: sanitizedEmail });

    } catch (err) {
        console.error('[Signup] Error:', err);
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

        // Retrieve pending registration data
        const pendingData = getPendingRegistration(sanitizedEmail);
        if (!pendingData) {
            console.log(`[OTP] No pending registration found for ${sanitizedEmail}`);
            return res.status(400).json({ message: 'Registration expired or not found. Please sign up again.' });
        }

        console.log(`[OTP] Verifying OTP for ${sanitizedEmail}: ${sanitizedOtp}`);

        // Verify OTP
        if (pendingData.otp !== sanitizedOtp) {
            console.log(`[OTP] Invalid OTP for ${sanitizedEmail}`);
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if (pendingData.otpExpire < new Date()) {
            console.log(`[OTP] Expired OTP for ${sanitizedEmail}`);
            return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
        }

        // Check if user already exists (race condition check)
        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create the user now that OTP is verified
        const newUser = await User.create({
            name: pendingData.name,
            email: pendingData.email,
            password: pendingData.password,
            isVerified: true
        });

        deletePendingRegistration(sanitizedEmail);

        console.log(`[OTP] User created successfully: ${sanitizedEmail}`);

        res.json({ message: 'OTP verified successfully', email: newUser.email });

    } catch (err) {
        console.error('[Verify OTP] Error:', err);
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
