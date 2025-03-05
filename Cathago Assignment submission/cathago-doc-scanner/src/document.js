const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { db } = require('./db');
const { spawn } = require('child_process');
const router = express.Router();

function promisifyDb(db) {
    return {
        run: (...args) => new Promise((resolve, reject) => db.run(...args, function(err) { err ? reject(err) : resolve(this) })),
        get: (...args) => new Promise((resolve, reject) => db.get(...args, (err, row) => err ? reject(err) : resolve(row)))
    };
}

const dbPromise = promisifyDb(db);

function levenshtein(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator
            );
        }
    }
    return matrix[b.length][a.length];
}

function getGeminiMatches(queryContent, uploadFiles) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [path.join(__dirname, 'gemini_match.py')]);
        const inputData = JSON.stringify({ 
            query_content: { filename: queryContent.filename, content: queryContent.content }, 
            db_files: uploadFiles 
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdin.write(inputData);
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const matches = JSON.parse(output);
                    console.log('Gemini API matches from Python:', matches);
                    resolve(matches);
                } catch (e) {
                    console.error('Error parsing Gemini output:', e);
                    resolve([]);
                }
            } else {
                console.error('Gemini script error:', errorOutput);
                resolve([]);
            }
        });
    });
}

router.post('/upload', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.session.user.credits < 1) return res.status(400).json({ error: 'No credits left' });
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.files.file;
    const content = file.data.toString('utf8');
    const filename = `${Date.now()}_${file.name}`;
    const today = new Date().toISOString().split('T')[0];

    console.log('Uploading for userId:', req.session.user.id);

    try {
        const row = await dbPromise.get('SELECT scan_count FROM daily_scans WHERE user_id = ? AND scan_date = ?', [req.session.user.id, today]);
        const scanCount = row ? row.scan_count : 0;
        if (scanCount >= 20 && req.session.user.role !== 'admin') {
            return res.status(400).json({ error: 'Daily scan limit reached' });
        }

        await dbPromise.run('UPDATE users SET credits = credits - 1 WHERE id = ?', [req.session.user.id]);
        await dbPromise.run('INSERT INTO documents (user_id, filename, content, timestamp) VALUES (?, ?, ?, ?)', 
            [req.session.user.id, filename, content, new Date().toISOString()]);
        const { lastID } = await dbPromise.run('INSERT OR REPLACE INTO daily_scans (user_id, scan_date, scan_count) VALUES (?, ?, ?)', 
            [req.session.user.id, today, scanCount + 1]);
        const docRow = await dbPromise.get('SELECT id FROM documents WHERE user_id = ? AND filename = ?', [req.session.user.id, filename]);
        
        console.log('Uploaded docId:', docRow.id, 'for userId:', req.session.user.id);
        req.session.user.credits--;
        res.json({ message: 'Document uploaded', docId: docRow.id });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/matches/:docId', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });

    console.log(`Matching request for docId: ${req.params.docId}, userId: ${req.session.user.id}`);
    try {
        const doc = await dbPromise.get('SELECT filename, content FROM documents WHERE id = ? AND user_id = ?', [req.params.docId, req.session.user.id]);
        if (!doc) {
            console.log(`Document not found for docId: ${req.params.docId}, userId: ${req.session.user.id}`);
            return res.status(404).json({ error: 'Document not found' });
        }

        const uploadDir = path.join(__dirname, '../uploads');
        const uploadFiles = fs.readdirSync(uploadDir)
            .filter(file => file.endsWith('.txt'))
            .map(file => ({
                filename: file,
                content: fs.readFileSync(path.join(uploadDir, file), 'utf8')
            }));

        console.log(`Checking ${uploadFiles.length} files in uploads folder for matches with ${doc.filename}`);

        const matches = [];

        uploadFiles.forEach(file => {
            if (file.filename !== doc.filename) {
                const distance = levenshtein(doc.content, file.content);
                const similarity = 1 - distance / Math.max(doc.content.length, file.content.length);
                console.log(`Levenshtein: Comparing "${doc.content}" with "${file.content}": Similarity ${similarity}`);
                if (similarity > 0.5) {
                    matches.push({ id: null, filename: file.filename, similarity, source: 'Levenshtein' });
                }
            }
        });

        const geminiMatches = await getGeminiMatches(doc, uploadFiles);
        matches.push(...geminiMatches);

        res.json(matches);
    } catch (err) {
        console.error('Match error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/upload-to-uploads', (req, res) => {
    if (req.session?.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.files.file;
    const content = file.data.toString('utf8');
    const filename = `${Date.now()}_${file.name}`;
    const filePath = path.join(__dirname, '../uploads', filename);

    fs.writeFileSync(filePath, content);
    res.json({ message: 'File uploaded to uploads folder' });
});

router.get('/download/:filename', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

router.get('/user-analytics', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    const today = new Date().toISOString().split('T')[0];
    db.get('SELECT scan_count FROM daily_scans WHERE user_id = ? AND scan_date = ?', [req.session.user.id, today], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const dailyScans = row ? row.scan_count : 0;
        db.all('SELECT content FROM documents WHERE user_id = ?', [req.session.user.id], (err, docs) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            const topics = docs.reduce((acc, doc) => {
                const words = doc.content.split(' ').slice(0, 5).join(' ');
                acc[words] = (acc[words] || 0) + 1;
                return acc;
            }, {});
            res.json({
                dailyScans,
                topTopics: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 5)
            });
        });
    });
});

module.exports = router;