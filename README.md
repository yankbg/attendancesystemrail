

# Attendance System Backend (Node.js)

A robust Node.js backend for managing attendance in schools, businesses, or any organization. This API handles user registration, attendance records, and student management, designed for easy integration with any frontend.

## Features

- **Student Registration & Management**
- **Attendance Recording and Tracking**
- **RESTful API Endpoints**
- **Simple, Extendable Codebase**

## Requirements

- Node.js v14+  
- npm (Node package manager)
- Mysql Railway (or your preferred database; see config)

## Quick Start

1. **Clone the Repo**
   ```bash
   git clone https://github.com/yankbg/attendancesystemrail.git
   cd attendancesystemrail
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   - Copy `.env.example` to `.env`
   - Edit `.env` with your database URI and secret keys:
     ```
     DB_URI=mongodb://localhost:27017/attendance
     JWT_SECRET=your_jwt_secret
     PORT=5000
     ```

4. **Start the Server**
   ```bash
   npm start
   ```
   The API will be running on `http://localhost:5000`

## API Overview (Main Endpoints)

| Method | Endpoint               | Description                  |
|--------|------------------------|------------------------------|
| POST   | upload_student         | Register user/students       |
| GET    | get_attendance         | List user/students           |
| POST   | get_attendance-date    | List user/students by date   |
| POST   | mark_attendance        | Record attendance            |


## How It Works

1. **Student Management:** Add students via `upload_students`.
2. **Attendance:** Record attendance for students, fetch attendance logs by date or student.
3. **Extensible:** Add new features or connect to any frontend.

##  Folder Structure (for Reference)

- `index.js` — Main entry point
- `routes/` — API route definitions
- `models/` — Mongoose models (Student, User, Attendance)
- `controllers/` — Business logic for each endpoint
- `middleware/` — Auth and other middleware


## ⚠️ Important: Railway Deployment, Database Setup, and Configuration

**Note on Railway Deployment (21-Day Limit):**  
This project can be deployed for free on [Railway](https://railway.app/), but free databases are only available for 21 days. After this period, your Railway database might be deleted automatically.

**What to do if the database is deleted or missing:**
1. **Go to Railway and create a new database project.**
2. **Copy the new database connection details (host, user, password, db name, port, etc.).**
3. **Return to your local copy of the code.**
4. **Update the database connection settings in your configuration file (e.g., `config`).**

**Why you should use a `.env` file:**  
Currently, this project does **not** use a `.env` file for sensitive configuration (like database credentials).  
It is **strongly recommended** to use environment variables (a `.env` file) to keep your database credentials and secret keys safe, instead of hardcoding them in your code.  
- Example:  
  ```
  DB_HOST=your_host
  DB_USER=your_user
  DB_PASS=your_pass
  DB_NAME=your_db
  ```

## Contributing

Pull requests and suggestions are welcome. For major changes, open an issue first to discuss.

## License

MIT
