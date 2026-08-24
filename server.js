const https = require('https');
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
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
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

    // 1. Save to database
    const query = 'INSERT INTO students (name, reg_number, dob, email, phone, level, course, passport_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    const values = [name, reg_number, dob, email, phone, level, course, passport_path];
    await pool.query(query, values);

    // 2. Respond success immediately
    res.json({ success: true });

    // 3. Send email using native Node.js HTTPS request (Bypasses Render timeouts)
    if (email) {
      const data = JSON.stringify({
        sender: { name: "ACES Civil Portal", email: "idrobert123456@gmail.com" },
        to: [{ email: email, name: name }],
        subject: "Registration Successful",
        htmlContent: `<html><body><h3>Hello ${name},</h3><p>Your registration for Akwa Ibom State Polytechnic Dept of Civil Engineering was successful!</p></body></html>`
      });

      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'Content-Length': data.length
        }
      };

      const reqMail = https.request(options, (apiRes) => {
        let responseBody = '';
        apiRes.on('data', (chunk) => { responseBody += chunk; });
        apiRes.on('end', () => {
          console.log('Brevo response:', responseBody);
        });
      });

      reqMail.on('error', (error) => {
        console.error('Background email error:', error.message);
      });

      reqMail.write(data);
      reqMail.end();
    }
} catch (err) {
  console.error('SERVER FATAL ERROR:', err);
  res.status(500).json({ success: false, error: err.message });
}
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
    
