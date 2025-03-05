const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path'); // Keep this for flexibility
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.sqlite')); // Relative path to project root

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function initDB() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user',
            credits INTEGER DEFAULT 20
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS credit_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            credits INTEGER,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            filename TEXT,
            content TEXT,
            timestamp TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS daily_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            scan_date TEXT,
            scan_count INTEGER DEFAULT 0,
            UNIQUE(user_id, scan_date),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        const adminPassword = hashPassword('123');
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (!row) {
                db.run('INSERT INTO users (username, password, role, credits) VALUES (?, ?, ?, ?)', 
                    ['admin', adminPassword, 'admin', 9999], (err) => {
                        if (err) console.error('Error inserting admin:', err);
                        else console.log('Admin user created: admin/123');
                    });
            }
        });
    });
}

module.exports = { db, initDB };