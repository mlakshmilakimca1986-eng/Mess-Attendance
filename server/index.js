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
                device_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if device_id column exists (for existing tables)
        const [columns] = await connection.query('SHOW COLUMNS FROM employees LIKE "device_id"');
        if (columns.length === 0) {
            await connection.query('ALTER TABLE employees ADD COLUMN device_id VARCHAR(255)');
        }

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
    const { employeeId, name, faceDescriptor, deviceId } = req.body;
    try {
        await pool.query(
            'INSERT INTO employees (employee_id, name, face_descriptor, device_id) VALUES (?, ?, ?, ?)',
            [employeeId, name, JSON.stringify(faceDescriptor), deviceId]
        );
        res.status(201).json({ message: 'Employee registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all employees (for face matching on client)
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT employee_id, name, face_descriptor, device_id FROM employees');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to calculate distance between two coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Punch Attendance (Auto In/Out with Master Device & Location Verification)
app.post('/api/attendance', async (req, res) => {
    const { employeeId, deviceId, latitude, longitude } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Configuration
    const MESS_LAT = parseFloat(process.env.MESS_LAT || "12.845196");
    const MESS_LON = parseFloat(process.env.MESS_LON || "77.702240");
    const ALLOWED_RADIUS = parseInt(process.env.ALLOWED_RADIUS || "200");
    const AUTHORIZED_DEVICES = (process.env.AUTHORIZED_DEVICES || "").split(',').map(id => id.trim());

    try {
        // 1. Verify Master Device Authorization
        if (AUTHORIZED_DEVICES.length > 0 && AUTHORIZED_DEVICES[0] !== "" && !AUTHORIZED_DEVICES.includes(deviceId)) {
            return res.status(403).json({
                error: 'This device is not authorized for attendance. Please use the Incharge mobile.',
                details: `Device ID: ${deviceId}`
            });
        }

        // 2. Verify Geofence
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Location access required for attendance.' });
        }

        const distance = calculateDistance(latitude, longitude, MESS_LAT, MESS_LON);
        if (distance > ALLOWED_RADIUS) {
            return res.status(403).json({
                error: `Too far from Mess! You are ${Math.round(distance)}m away. Allowed: ${ALLOWED_RADIUS}m`
            });
        }

        // 3. Determine Punch Type (Auto)
        const [[employeeExists]] = await pool.query('SELECT employee_id FROM employees WHERE employee_id = ?', [employeeId]);
        if (!employeeExists) return res.status(404).json({ error: 'Employee not found' });

        const [[existingRecord]] = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
            [employeeId, today]
        );

        let type = 'in';
        if (!existingRecord) {
            await pool.query(
                'INSERT INTO attendance (employee_id, punch_in, date) VALUES (?, ?, ?)',
                [employeeId, now, today]
            );
            type = 'in';
        } else if (existingRecord.punch_out === null) {
            await pool.query(
                'UPDATE attendance SET punch_out = ? WHERE id = ?',
                [now, existingRecord.id]
            );
            type = 'out';
        } else {
            return res.status(400).json({ error: 'Attendance already completed for today.' });
        }

        res.json({ message: `Successfully punched ${type.toUpperCase()}`, type, time: now });
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
