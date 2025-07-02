const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

// MySQL configuration
// const dbConfig = {
//   host: 'mysql.railway.internal',
//   user: 'root',
//   password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
//   database: 'railway',
//   port: 3306,
// };
const dbConfig = process.env.MYSQL_URL;
// Middleware setup
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname))); // Serve your HTML/CSS/JS

// Serve home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ===========================
   API Endpoints
   =========================== */

// 1. Upload Student
app.post('/upload_student', async (req, res) => {
  try {
    const data = req.body;
    if (!data) return res.status(400).json({ status: 'error', message: 'Invalid JSON input' });
    
    const { id, name, image } = data;
    if (!id || !name || !image) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    // Process image
    let imageData = image.includes('base64,') ? image.split('base64,')[1] : image;
    imageData = imageData.replace(/ /g, '+');
    const decodedImage = Buffer.from(imageData, 'base64');

    // Create uploads directory
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.ensureDir(uploadDir);

    // Save image
    const fileName = `img_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, decodedImage);

    // Database operations
    const conn = await mysql.createConnection(dbConfig);
    
    // Create students table if not exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check for duplicates
    const [duplicateRows] = await conn.execute(
      'SELECT COUNT(*) AS count FROM students WHERE id = ? OR name = ?',
      [id, name]
    );
    
    if (duplicateRows[0].count > 0) {
      await conn.end();
      return res.status(409).json({ 
        status: 'error', 
        message: 'Student with this ID or name already registered' 
      });
    }

    // Insert student
    const relativePath = `uploads/${fileName}`;
    await conn.execute(
      'INSERT INTO students (id, name, image_path) VALUES (?, ?, ?)',
      [id, name, relativePath]
    );
    
    await conn.end();
    return res.json({ 
      status: 'success', 
      message: 'Student registered successfully',
      image_path: relativePath
    });

  } catch (error) {
    console.error('Upload Student Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 2. Check Student
app.post('/check_student', async (req, res) => {
  try {
    const { studentId, fullname } = req.body;
    if (!studentId || !fullname) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing studentId or fullname' 
      });
    }

    const studentIdNum = Number(studentId);
    if (isNaN(studentIdNum)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid studentId' 
      });
    }

    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, image_path FROM students WHERE id = ? AND LOWER(name) = ?',
      [studentIdNum, fullname.toLowerCase()]
    );
    
    await conn.end();

    if (rows.length > 0) {
      return res.json({ 
        status: 'success', 
        exists: true, 
        image_path: rows[0].image_path 
      });
    } else {
      return res.json({ 
        status: 'error', 
        exists: false, 
        message: 'Student not found' 
      });
    }
  } catch (error) {
    console.error('Check Student Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 3. Get Attendance
app.get('/get_attendance', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT student_name, student_id, date, time FROM attendance ORDER BY date DESC, time DESC'
    );
    
    await conn.end();

    if (rows.length === 0) {
      return res.json({ 
        status: 'success', 
        message: 'No attendance records found',
        data: [],
        count: 0
      });
    }

    const attendanceRecords = rows.map(row => ({
      ...row,
      student_id: Number(row.student_id)
    }));

    return res.json({
      status: 'success',
      message: 'Attendance records retrieved',
      data: attendanceRecords,
      count: attendanceRecords.length
    });
  } catch (error) {
    console.error('Get Attendance Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 4. Get Attendance by Date
app.all('/get_attendance_date', async (req, res) => {
  try {
    // Get date from POST body or GET query
    const date = req.body.date || req.query.date;
    if (!date) return res.status(400).json({ status: 'error', message: 'Missing date parameter' });
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT student_id, student_name, time FROM attendance WHERE date = ?',
      [date]
    );
    
    await conn.end();
    return res.json({ 
      status: 'success', 
      date: date, 
      data: rows 
    });
  } catch (error) {
    console.error('Get Attendance by Date Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 5. Get Student Info
app.post('/get_student_info', async (req, res) => {
  try {
    const { student_id, student_name } = req.body;
    if (!student_id || !student_name) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing student_id or student_name' 
      });
    }

    const studentIdNum = Number(student_id);
    if (isNaN(studentIdNum)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid student_id' 
      });
    }

    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT image_path FROM students WHERE id = ? AND LOWER(name) = ?',
      [studentIdNum, student_name.toLowerCase()]
    );
    
    await conn.end();

    if (rows.length > 0) {
      return res.json({ 
        status: 'success', 
        image_path: rows[0].image_path 
      });
    } else {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Image not found' 
      });
    }
  } catch (error) {
    console.error('Get Student Info Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 6. Mark Attendance
app.post('/mark_attendance', async (req, res) => {
  try {
    const { qr_data } = req.body;
    if (!qr_data) return res.status(400).json({ status: 'error', message: 'Missing qr_data' });

    let qrInfo;
    try {
      qrInfo = JSON.parse(qr_data);
    } catch (e) {
      return res.status(400).json({ status: 'error', message: 'Invalid qr_data format' });
    }

    // Validate required fields
    const requiredFields = ['studentId', 'fullname', 'Date', 'time'];
    for (const field of requiredFields) {
      if (!qrInfo[field]) {
        return res.status(400).json({ 
          status: 'error', 
          message: `Missing field: ${field}` 
        });
      }
    }

    const studentId = parseInt(qrInfo.studentId, 10);
    const studentName = qrInfo.fullname;
    const date = qrInfo.Date;
    const time = qrInfo.time;

    const conn = await mysql.createConnection(dbConfig);
    
    // Create attendance table if needed
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attendance (student_id, date)
      )
    `);

    // Check for existing attendance
    const [existing] = await conn.execute(
      'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
      [studentId, date]
    );

    if (existing.length > 0) {
      await conn.end();
      return res.status(409).json({ 
        status: 'error', 
        message: `Attendance already marked for ${date}` 
      });
    }

    // Insert new record
    await conn.execute(
      'INSERT INTO attendance (student_id, student_name, date, time) VALUES (?, ?, ?, ?)',
      [studentId, studentName, date, time]
    );
    
    await conn.end();
    return res.json({
      status: 'success',
      message: `Attendance marked for ${studentName}`,
      data: {
        studentId,
        fullname: studentName,
        Date: date,
        time,
        marked_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
    });
  } catch (error) {
    console.error('Mark Attendance Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}/`);
  console.log(`API Endpoints:`);
  console.log(`- POST   /upload_student`);
  console.log(`- POST   /check_student`);
  console.log(`- GET    /get_attendance`);
  console.log(`- ALL    /get_attendance_date`);
  console.log(`- POST   /get_student_info`);
  console.log(`- POST   /mark_attendance`);
});
