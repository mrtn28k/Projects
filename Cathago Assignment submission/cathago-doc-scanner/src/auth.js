const express = require('express');
const crypto = require('crypto');
const { db } = require('./db');
const router = express.Router();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

router.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashed = hashPassword(password);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], (err) => {
        if (err) return res.status(400).send('Username taken');
        res.redirect('/index.html');
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const hashed = hashPassword(password);
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, hashed], (err, user) => {
        if (err || !user) return res.status(401).send('Invalid credentials');
        req.session.user = user;
        res.redirect(user.role === 'admin' ? '/admin.html' : '/dashboard.html');
    });
});

router.get('/profile', (req, res) => {
    if (!req.session?.user) return res.status(401).send('Unauthorized');
    db.all('SELECT filename, timestamp FROM documents WHERE user_id = ?', [req.session.user.id], (err, docs) => {
        if (err) return res.status(500).send('Database error');
        res.json({ ...req.session.user, documents: docs });
    });
});

module.exports = router;