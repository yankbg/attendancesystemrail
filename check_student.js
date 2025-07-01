const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to enable CORS and parse JSON and URL-encoded bodies
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL connection config - replace with your actual credentials or use env variables
const dbConfig = {
  host: 'centerbeam.proxy.rlwy.net',
  user: 'root',
  password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
  database: 'railway',
  port: 13662,
};

// Handle preflight OPTIONS request (CORS)
app.options('/check_student', (req, res) => {
  res.sendStatus(200);
});

app.post('/check_student', async (req, res) => {
  try {
    // Accept both JSON and URL-encoded data
    const studentIdRaw = req.body.studentId;
    const fullnameRaw = req.body.fullname;

    // Validate inputs
    if (!studentIdRaw || !fullnameRaw) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing studentId or fullname',
      });
    }

    // Validate studentId is numeric
    const studentId = Number(studentIdRaw);
    if (isNaN(studentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid studentId',
      });
    }

    const fullname = fullnameRaw.toLowerCase();

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Prepare and execute query (case-insensitive search on name)
    const [rows] = await conn.execute(
      'SELECT id, image_path FROM students WHERE id = ? AND LOWER(name) = ?',
      [studentId, fullname]
    );

    await conn.end();

    if (rows.length > 0) {
      return res.json({
        status: 'success',
        exists: true,
        image_path: rows[0].image_path, // relative or absolute URL to student image
      });
    } else {
      return res.status(404).json({
        status: 'error',
        exists: false,
        message: 'Student not found',
      });
    }
  } catch (error) {
    console.error('Error in /check_student:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
