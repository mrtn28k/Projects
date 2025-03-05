const express = require('express');
const { db } = require('./db');
const router = express.Router();

router.get('/analytics', (req, res) => {
    if (req.session?.user?.role !== 'admin') return res.status(403).send('Forbidden');
    db.all('SELECT username, credits, (SELECT COUNT(*) FROM documents WHERE user_id = users.id) as scans FROM users', (err, users) => {
        if (err) return res.status(500).send('Database error');
        db.all('SELECT content FROM documents', (err, docs) => {
            if (err) return res.status(500).send('Database error');
            const topics = docs.reduce((acc, doc) => {
                const words = doc.content.split(' ').slice(0, 5).join(' ');
                acc[words] = (acc[words] || 0) + 1;
                return acc;
            }, {});
            db.all('SELECT user_id, scan_date, scan_count FROM daily_scans', (err, dailyScans) => {
                if (err) return res.status(500).send('Database error');
                db.all('SELECT u.username, COUNT(*) as requests, SUM(cr.credits) as total_credits FROM credit_requests cr JOIN users u ON cr.user_id = u.id WHERE cr.status = "approved" GROUP BY u.id, u.username', (err, creditStats) => {
                    if (err) return res.status(500).send('Database error');
                    res.json({
                        users,
                        topTopics: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 5),
                        dailyScans,
                        creditStats
                    });
                });
            });
        });
    });
});

module.exports = router;