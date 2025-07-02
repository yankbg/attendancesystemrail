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

// MySQL connection config - replace with your credentials or use env variables
const dbConfig = {
  host: 'centerbeam.proxy.rlwy.net',
  user: 'root',
  password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
  database: 'railway',
  port: 13662,
};

// Handle preflight OPTIONS request
app.options('/get_attendance_date', (req, res) => {
  res.sendStatus(200);
});

app.all('/get_attendance_date', async (req, res) => {
  try {
    // Retrieve date parameter from JSON body, POST form, or GET query
    let date = null;
    if (req.method === 'POST' || req.method === 'OPTIONS') {
      date = req.body.date;
    }
    if (!date && req.method === 'GET') {
      date = req.query.date;
    }

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing date parameter',
      });
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Expected YYYY-MM-DD.',
      });
    }

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Prepare and execute query
    const [rows] = await conn.execute(
      'SELECT student_id, student_name, time FROM attendance WHERE date = ?',
      [date]
    );

    await conn.end();

    return res.json({
      status: 'success',
      date,
      data: rows,
    });
  } catch (error) {
    console.error('Error in /get_attendance_date:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});