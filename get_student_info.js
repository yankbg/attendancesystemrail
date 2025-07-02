const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parse JSON and URL-encoded bodies
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//MySQL connection config - replace with your credentials or environment variables
const dbConfig = {
  host: 'mysql.railway.internal',
  user: 'root',
  password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
  database: 'railway',
  port: 3306,
};

// Handle preflight OPTIONS request
app.options('/get_student_info', (req, res) => {
  res.sendStatus(200);
});

app.post('/get_student_info', async (req, res) => {
  try {
    // Retrieve student_id and student_name from JSON body or form data
    const studentIdRaw = req.body.student_id;
    const studentNameRaw = req.body.student_name;

    // Validate inputs
    if (!studentIdRaw || isNaN(Number(studentIdRaw)) || !studentNameRaw) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or missing student_id or student_name',
      });
    }

    const studentId = Number(studentIdRaw);
    const studentName = studentNameRaw.toLowerCase();

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Prepare and execute query with case-insensitive name comparison
    const [rows] = await conn.execute(
      'SELECT image_path FROM students WHERE id = ? AND LOWER(name) = ?',
      [studentId, studentName]
    );

    await conn.end();

    if (rows.length > 0) {
      return res.json({
        status: 'success',
        image_path: rows[0].image_path,
      });
    } else {
      return res.status(404).json({
        status: 'error',
        message: 'Image not found',
      });
    }
  } catch (error) {
    console.error('Error in /get_student_info:', error);
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
