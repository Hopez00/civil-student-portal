const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const db = new sqlite3.Database('civil_dept.db', (err) => {
    if (err) console.error('Database opening error: ', err.message);
    else console.log('Connected to Civil Dept SQLite Database.');
});

db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    reg_number TEXT,
    dob TEXT,
    email TEXT,
    phone TEXT,
    level TEXT,
    course TEXT,
    passport_path TEXT
)`);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'idrobert123456@gmail.com',
        pass: 'ngvbnjdwzjrvvjag'
    }
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/register', upload.single('passport'), (req, res) => {
    const { name, reg_number, dob, email, phone, level, course } = req.body;
    const passport_path = req.file ? '/uploads/' + req.file.filename : '';

    const query = `INSERT INTO students (name, reg_number, dob, email, phone, level, course, passport_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [name, reg_number, dob, email, phone, level, course, passport_path], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });

        const mailOptions = {
            from: '"ACES Civil Engineering Portal" <idrobert123456@gmail.com>',
            to: email,
            cc: 'idrobert123456@gmail.com',
            subject: 'Registration Confirmation - Department of Civil Engineering',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #051011; color: #FFFFFF; border-radius: 10px;">
                    <h2 style="color: #00F2FE;">Registration Successful!</h2>
                    <p>Dear <b>${name}</b>,</p>
                    <p>Your student registration for the <b>Akwa Ibom State Polytechnic Department of Civil Engineering Portal</b> has been received and processed successfully.</p>
                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2);" />
                    <p><b>Registration Number:</b> ${reg_number}</p>
                    <p><b>Program Level:</b> ${level}</p>
                    <p><b>Specialization:</b> ${course || 'N/A'}</p>
                    <br/>
                    <p style="font-size: 0.85rem; color: #94A3B8;">Brought to you by HOPEKONCEPT AND DESIGNS - Official Service Partner.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
                console.log('Error sending email notification:', mailErr);
            } else {
                console.log('Email notification dispatched successfully.', info.response);
            }
        });

        res.json({ success: true, message: 'Registration successful and email sent!' });
    });
});

app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Admin Authentication and Data Endpoint
app.post('/api/admin/login', express.json(), (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = 'HopeKoncept@2026'; 

    if (password === ADMIN_PASSWORD) {
        db.all("SELECT * FROM students ORDER BY id DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, students: rows });
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Password. Access Denied.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:3000`);
});

