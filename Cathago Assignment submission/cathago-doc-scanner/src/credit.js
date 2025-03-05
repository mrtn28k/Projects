const express = require('express');
const { db } = require('./db');
const router = express.Router();

function resetCredits() {
    const today = new Date().toISOString().split('T')[0];
    db.run('UPDATE users SET credits = 20 WHERE role != "admin"', () => {
        db.run('INSERT OR REPLACE INTO daily_scans (user_id, scan_date, scan_count) SELECT id, ?, 0 FROM users WHERE role != "admin"', [today]);
    });
}

setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) resetCredits();
}, 60000);

router.post('/request', (req, res) => {
    if (!req.session?.user) return res.status(401).send('Unauthorized');
    const { credits } = req.body;
    db.run('INSERT INTO credit_requests (user_id, credits) VALUES (?, ?)', [req.session.user.id, credits], () => {
        res.send('Request submitted');
    });
});

router.get('/admin/requests', (req, res) => {
    if (req.session?.user?.role !== 'admin') return res.status(403).send('Forbidden');
    db.all('SELECT cr.*, u.username FROM credit_requests cr JOIN users u ON cr.user_id = u.id WHERE status = "pending"', (err, requests) => {
        if (err) return res.status(500).send('Database error');
        res.json(requests);
    });
});

router.post('/admin/approve', (req, res) => {
    if (req.session?.user?.role !== 'admin') return res.status(403).send('Forbidden');
    const { requestId, approve } = req.body;
    const status = approve ? 'approved' : 'denied';
    db.run('UPDATE credit_requests SET status = ? WHERE id = ?', [status, requestId], (err) => {
        if (err) return res.status(500).send('Database error');
        if (approve) {
            db.get('SELECT user_id, credits FROM credit_requests WHERE id = ?', [requestId], (err, req) => {
                if (err) return res.status(500).send('Database error');
                db.run('UPDATE users SET credits = credits + ? WHERE id = ?', [req.credits, req.user_id]);
            });
        }
        res.send('Request processed');
    });
});

router.post('/admin/adjust-credits', (req, res) => {
    if (req.session?.user?.role !== 'admin') return res.status(403).send('Forbidden');
    const { username, credits } = req.body;
    db.run('UPDATE users SET credits = ? WHERE username = ?', [credits, username], (err) => {
        if (err) return res.status(500).send('Database error');
        if (this.changes === 0) return res.status(404).send('User not found');
        res.send('Credits adjusted');
    });
});

module.exports = router;