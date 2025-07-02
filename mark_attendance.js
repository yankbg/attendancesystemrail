const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS', 'GET'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10mb' })); // Adjust limit if needed

// MySQL config - replace with your actual credentials or use env variables
const dbConfig = {
  host: 'mysql.railway.internal',
  user: 'root',
  password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
  database: 'railway',
  port: 3306,
};

// Handle preflight OPTIONS request
app.options('/mark_attendance', (req, res) => {
  res.sendStatus(200);
});

// GET request handler (optional info/testing)
app.get('/mark_attendance', (req, res) => {
  res.json({
    status: 'info',
    message: 'This endpoint expects POST requests with attendance data',
  });
});

// POST request handler
app.post('/mark_attendance', async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.qr_data) {
      return res.status(400).json({ status: 'error', message: "Missing 'qr_data' in request" });
    }

    // qr_data is a JSON string, parse it
    let qrInfo;
    try {
      qrInfo = JSON.parse(data.qr_data);
    } catch (err) {
      return res.status(400).json({ status: 'error', message: "Invalid JSON format in 'qr_data'" });
    }

    // Validate required fields
    const requiredFields = ['studentId', 'fullname', 'Date', 'time'];
    for (const field of requiredFields) {
      if (!qrInfo[field]) {
        return res.status(400).json({ status: 'error', message: `Missing required field: ${field}` });
      }
    }

    const studentId = parseInt(qrInfo.studentId, 10);
    const studentName = qrInfo.fullname;
    const date = qrInfo.Date; // Expected format: YYYY-MM-DD
    const time = qrInfo.time; // Expected format: HH:MM:SS or HH:MM

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Create attendance table if not exists
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attendance (student_id, date)
      )
    `;
    await conn.execute(createTableSQL);

    // Check if attendance already marked for student on the date
    const [existing] = await conn.execute(
      'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
      [studentId, date]
    );

    if (existing.length > 0) {
      await conn.end();
      return res.status(409).json({
        status: 'error',
        message: `Attendance already marked for this student on ${date}`,
      });
    }

    // Insert attendance record
    const [result] = await conn.execute(
      'INSERT INTO attendance (student_id, student_name, date, time) VALUES (?, ?, ?, ?)',
      [studentId, studentName, date, time]
    );

    await conn.end();

    return res.json({
      status: 'success',
      message: `Attendance marked successfully for student ${studentName}`,
      data: {
        studentId,
        fullname: studentName,
        Date: date,
        time,
        marked_at: new Date().toISOString().slice(0, 19).replace('T', ' '), // Format: YYYY-MM-DD HH:mm:ss
      },
    });
  } catch (error) {
    console.error('Error in /mark_attendance:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to mark attendance',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
