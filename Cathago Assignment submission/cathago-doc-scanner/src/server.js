const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const session = require('express-session'); // Add this
const authRoutes = require('./auth');
const creditRoutes = require('./credit');
const documentRoutes = require('./document');
const analyticsRoutes = require('./analytics');
const { initDB, db } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Add session middleware
app.use(session({
    secret: 'your-secret-key', // Change this to a secure key in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to sync credits with database
app.use((req, res, next) => {
    if (req.session?.user) {
        db.get('SELECT credits FROM users WHERE id = ?', [req.session.user.id], (err, row) => {
            if (!err && row) req.session.user.credits = row.credits;
            next();
        });
    } else {
        next();
    }
});

// Initialize database
initDB();

// Routes
app.use('/auth', authRoutes);
app.use('/credits', creditRoutes);
app.use('/scan', documentRoutes);
app.use('/admin', analyticsRoutes);

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});