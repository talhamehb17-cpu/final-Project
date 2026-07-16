require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const cors = require('cors');

if (!process.env.MONGO_URI) {
    console.error('Missing required environment variable: MONGO_URI');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('Missing required environment variable: JWT_SECRET');
    process.exit(1);
}

const app = express();

// ===== MIDDLEWARE =====
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow frontend (Live Server) to talk to backend
const allowedOrigins = [
"http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://inspiring-bublanina-6c1cd6.netlify.app"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (Postman, REST Client, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

/*app.use(cors({
    origin: function (origin, callback) {
        // allow REST tools/no-origin requests
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));*/
/*app.use(cors({
    origin: function (origin, callback) {
        console.log("Incoming Origin:", origin);

        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log("Blocked Origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));*/

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/products', require('./routes/products'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/promo-codes', require('./routes/promoCodes'));

// Config route for EasyPaisa phone
app.get('/api/config/easypaisa-phone', (req, res) => {
    res.json({ phone: process.env.PHONE || '' });
});

// ===== CONNECT MONGO =====
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.log('MongoDB connection error:', err.message);
        if (err.name === 'MongooseServerSelectionError') {
            console.error('MongoDB connection failed: Network/DNS issue.');
            console.error('Possible fixes:');
            console.error('1. Check your internet connection stability');
            console.error('2. Try changing DNS to 8.8.8.8 (Google DNS)');
            console.error('3. Disable VPN if using one');
            console.error('4. Check if MongoDB Atlas is accessible in your region');
            console.error('5. Verify your MongoDB connection string is correct');
            console.error('6. Check if MongoDB Atlas cluster is active (not paused)');
            console.error('7. Verify your IP is whitelisted in MongoDB Atlas Network Access');
        } else if (err.message.includes('timeout')) {
            console.error('MongoDB connection timeout. The server is not responding.');
            console.error('Possible fixes:');
            console.error('1. Check your internet connection');
            console.error('2. Verify MongoDB Atlas cluster is active');
            console.error('3. Check if firewall is blocking MongoDB ports');
            console.error('4. Try accessing MongoDB Atlas dashboard to verify status');
        }
    });

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start background order status scheduler
    try {
        const { startOrderScheduler } = require('./utils/orderScheduler');
        startOrderScheduler();
    } catch (schedErr) {
        console.error('Failed to start order status scheduler:', schedErr.message);
    }
});
