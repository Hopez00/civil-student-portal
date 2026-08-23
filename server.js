const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool for Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to Supabase PostgreSQL successfully!');
  }
});

// Automatically create table if it doesn't exist
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
  if (err) console.error('Error creating table:', err.stack);
  else console.log('Students table verified/created.');
});

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'idrobert123456@gmail.com',
    pass: 'ngvbnjdwzjjrvvjag'
  }
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
    
app.post('/register', upload.single('passport'), (req, res) => {
  const { name, reg_number, dob, email, phone, level, course } = req.body;
  const passport_path = req.file ? `/uploads/${req.file.filename}` : '';

  const query = `INSERT INTO students (name, reg_number, dob, email, phone, level, course, passport_path) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
  
  pool.query(query, [name, reg_number, dob, email, phone, level, course, passport_path], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    const mailOptions = {
      from: '"ACES Civil Engineering Portal" <idrobert123456@gmail.com>',
      to: email,
      cc: 'idrobert123456@gmail.com',
      subject: 'Registration Confirmation - Department of Civil Engineering',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #051011; color: #fff;">
          <h2 style="color: #400F2E;">Registration Successful</h2>
          <p>Dear <b>${name}</b>,</p>
          <p>Your student registration for the Akwa Ibom State Polytechnic Department of Civil Engineering has been successfully received.</p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2);">
          <p><b>Registration Number:</b> ${reg_number}</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (mailErr) => {
      if (mailErr) console.log(mailErr);
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
    
