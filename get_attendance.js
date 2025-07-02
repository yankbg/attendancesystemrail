const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins and allow GET, OPTIONS methods
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// MySQL connection config - replace with your actual credentials or use env variables
const dbConfig = {
  host: 'centerbeam.proxy.rlwy.net',
  user: 'root',
  password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
  database: 'railway',
  port: 13662,
};

// Handle preflight OPTIONS request
app.options('/get_attendance', (req, res) => {
  res.sendStatus(200);
});

// GET endpoint to fetch attendance records
app.get('/get_attendance', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);

    // Query attendance records ordered by date and time descending
    const [rows] = await conn.execute(
      'SELECT student_name, student_id, date, time FROM attendance ORDER BY date DESC, time DESC'
    );

    await conn.end();

    if (rows.length === 0) {
      return res.json({
        status: 'success',
        message: 'No attendance records found',
        data: [],
        count: 0,
      });
    }

    // Map results and convert student_id to integer
    const attendanceRecords = rows.map(row => ({
      student_name: row.student_name,
      student_id: Number(row.student_id),
      date: row.date,
      time: row.time,
    }));

    return res.json({
      status: 'success',
      message: 'Attendance records retrieved successfully',
      data: attendanceRecords,
      count: attendanceRecords.length,
    });
  } catch (error) {
    console.error('Error in /get_attendance:', error);
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