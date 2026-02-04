const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: {
        ca: process.env.DB_CA_CERT_PATH ? fs.readFileSync(process.env.DB_CA_CERT_PATH) : undefined,
    },
};

let pool;

async function initDB() {
    try {
        pool = await mysql.createPool(dbConfig);
        console.log('Connected to TiDB');

        // Create tables if they don't exist
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                face_descriptor JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                punch_in TIMESTAMP NULL,
                punch_out TIMESTAMP NULL,
                date DATE NOT NULL,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
            )
        `);
        connection.release();
    } catch (err) {
        console.error('Error connecting to TiDB:', err.message);
    }
}

// Routes
app.get('/', (req, res) => {
    res.send('Mess Attendance API');
});

// Register Employee
app.post('/api/employees', async (req, res) => {
    const { employeeId, name, faceDescriptor } = req.body;
    try {
        await pool.query(
            'INSERT INTO employees (employee_id, name, face_descriptor) VALUES (?, ?, ?)',
            [employeeId, name, JSON.stringify(faceDescriptor)]
        );
        res.status(201).json({ message: 'Employee registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all employees (for face matching on client)
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT employee_id, name, face_descriptor FROM employees');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Punch Attendance
app.post('/api/attendance', async (req, res) => {
    const { employeeId, type } = req.body; // type: 'in' or 'out'
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    try {
        if (type === 'in') {
            await pool.query(
                'INSERT INTO attendance (employee_id, punch_in, date) VALUES (?, ?, ?)',
                [employeeId, now, today]
            );
        } else {
            await pool.query(
                'UPDATE attendance SET punch_out = ? WHERE employee_id = ? AND date = ? AND punch_out IS NULL',
                [now, employeeId, today]
            );
        }
        res.json({ message: `Punched ${type} successfully`, time: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, e.name 
            FROM attendance a 
            JOIN employees e ON a.employee_id = e.employee_id 
            ORDER BY a.date DESC, a.punch_in DESC
        `);
        const today = new Date().toISOString().split('T')[0];
        const [[{ totalEmployees }]] = await pool.query('SELECT COUNT(*) as totalEmployees FROM employees');
        const [[{ presentToday }]] = await pool.query(
            'SELECT COUNT(DISTINCT employee_id) as presentToday FROM attendance WHERE date = ?',
            [today]
        );
        const [completedShifts] = await pool.query('SELECT punch_in, punch_out FROM attendance WHERE punch_out IS NOT NULL');

        let avgWorkMinutes = 0;
        if (completedShifts.length > 0) {
            const totalMinutes = completedShifts.reduce((acc, shift) => {
                const diff = new Date(shift.punch_out) - new Date(shift.punch_in);
                return acc + (diff / (1000 * 60));
            }, 0);
            avgWorkMinutes = totalMinutes / completedShifts.length;
        }

        res.json({
            attendance: rows,
            stats: {
                totalEmployees,
                presentToday,
                avgWorkHours: `${Math.floor(avgWorkMinutes / 60)}h ${Math.round(avgWorkMinutes % 60)}m`
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initDB();
});
