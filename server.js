const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool using environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test database connectivity on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('DATABASE CONNECTION FAILED (ECONNREFUSED/AUTH):', err.message);
    } else {
        console.log('Connected to Supabase PostgreSQL successfully!');
    }
});

// Verify table creation
pool.query(`
    CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT,
        reg_number TEXT,
        dob TEXT,
        email TEXT,
        phone TEXT,
        level TEXT,
        course TEXT,
        passport_path TEXT
    )
`, (err) => {
    if (err) console.error('Error creating table:', err);
});

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'idrobert123456@gmail.com',
        pass: 'nghvnjdwjjvrrvjag'
    }
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', upload.single('passport'), async (req, res) => {
    try {
        const { name, reg_number, dob, email, phone, level, course } = req.body;
        
        let passport_path = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            passport_path = `data:${req.file.mimetype};base64,${b64}`;
        }

        const query = `INSERT INTO students (name, reg_number, dob, email, phone, level, course, passport_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        const values = [name || '', reg_number || '', dob || '', email || '', phone || '', level || '', course || '', passport_path || ''];

        // Save to database
        await pool.query(query, values);
        
        // Respond success immediately
        res.json({ success: true });

        // Try sending email safely in background
        if (email) {
            try {
                await transporter.sendMail({
                    from: '"ACES Civil Portal" <idrobert123456@gmail.com>',
                    to: email,
                    subject: 'Registration Successful',
                    text: `Hello ${name}, your registration for Akwa Ibom State Polytechnic Dept of Civil Engineering has been received successfully.`
                });
            } catch (mailErr) {
                console.log('Background email error (non-fatal):', mailErr.message);
            }
        }
    } catch (err) {
        console.error('SERVER FATAL ERROR:', err);
        const errorDetails = err.message || JSON.stringify(err) || err.toString();
        res.status(200).json({ success: false, error: errorDetails });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
