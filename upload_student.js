const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs-extra');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON body
app.use(express.json({ limit: '10mb' })); // Increase limit if images are large

// MySQL connection config - replace with your actual credentials or use environment variables
const dbConfig = {
  host: 'centerbeam.proxy.rlwy.net',
  user: 'root',
  password: 'hTqNMZuZUBrEaiRcvlnzDIWBFynwbvRL',
  database: 'railway',
  port: 13662,
};

app.post('/upload_student', async (req, res) => {
  try {
    const data = req.body;

    // 2. Validate JSON input
    if (!data) {
      return res.status(400).json({ status: 'error', message: 'Invalid JSON input' });
    }

    // 3. Validate required fields
    const { id, name, image } = data;
    if (!id || !name || !image) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: id, name, or image',
      });
    }

    // 4. Clean and decode Base64 image data
    let imageData = image;
    if (imageData.includes('base64,')) {
      imageData = imageData.split('base64,')[1];
    }
    imageData = imageData.replace(/ /g, '+');

    const decodedImage = Buffer.from(imageData, 'base64');
    if (!decodedImage) {
      return res.status(400).json({ status: 'error', message: 'Failed to decode Base64 image' });
    }

    // 5. Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.ensureDir(uploadDir);

    // 6. Generate a unique filename for the image
    const fileName = `img_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    // 7. Save the decoded image to the server
    await fs.writeFile(filePath, decodedImage);

    // 8. Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // 9. Create students table if not exists
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await conn.execute(createTableSQL);

    // 10. Check for duplicate student by id or name
    const [rows] = await conn.execute(
      'SELECT COUNT(*) as count FROM students WHERE id = ? OR name = ?',
      [id, name]
    );
    if (rows[0].count > 0) {
      await conn.end();
      return res.status(409).json({
        status: 'error',
        message: 'Student with this ID or name already registered',
      });
    }

    // 11. Insert student data into database
    const relativeFilePath = `uploads/${fileName}`;
    await conn.execute(
      'INSERT INTO students (id, name, image_path) VALUES (?, ?, ?)',
      [id, name, relativeFilePath]
    );

    await conn.end();

    return res.json({
      status: 'success',
      message: 'Student registered successfully',
      image_path: relativeFilePath,
    });
  } catch (error) {
    console.error('Error in /upload_student:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
