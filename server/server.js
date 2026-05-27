require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Використовуємо проміси для async/await
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('876673268691-scqmciamd7gcmec4jrg2v0hv2a0hkerj.apps.googleusercontent.com');
const app = express();
app.use(cors());
app.use(express.json());

// --- Налаштування пулу підключень до Aurora ---
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================
// БЛОК 1: КОРИСТУВАЧІ (USERS)
// ==========================

// 1. РЕЄСТРАЦІЯ
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Всі поля обов\'язкові' });
    }

    try {
        // Перевірка чи існує користувач
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ? OR name = ?', [email, name]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Користувач з таким email або ім\'ям вже існує' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Вставка в БД
        await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: 'Користувача створено' , user:{name, email, hashedPassword}});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. ВХІД (LOGIN)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }

        res.json({ 
            message: 'Вхід успішний', 
            user: { id: user.id, name: user.name, email: user.email } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/google-login', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            // ПЕРЕДАЕМ МАССИВ ИЗ ВСЕХ ТВОИХ CLIENT ID
            audience: [
                '876673268691-scqmciamd7gcmec4jrg2v0hv2a0hkerj.apps.googleusercontent.com', 
                'ТВОЙ_ANDROID_CLIENT_ID.apps.googleusercontent.com',                        
                'ТВОЙ_IOS_CLIENT_ID.apps.googleusercontent.com'                             
            ], 
        });
        const { name, email, picture } = ticket.getPayload();

        // 1. Перевіряємо, чи є такий користувач у вашій Aurora RDS
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        let user = rows[0];

        // 2. Якщо користувача немає — створюємо його
        if (!user) {
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, 'google-authenticated']
            );
            user = { id: result.insertId, name, email };
        }

        res.json({ message: 'Вхід через Google успішний', user });
    } catch (error) {
        console.error("Помилка перевірки токена:", error);
        res.status(400).json({ message: 'Невалідний Google токен' });
    }
});
// ==========================
// БЛОК 2: ПРИСТРОЇ (DEVICES)
// ==========================

// 3. ДОДАТИ ПРИСТРІЙ
app.post('/add-device', async (req, res) => {
    const { guid, ownerId, deviceName, side, ...otherData } = req.body;
    if (!guid || !ownerId) {
        return res.status(400).json({ message: 'Поля GUID та ownerId обов\'язкові' });
    }

    try {
        // otherData зберігаємо як JSON (Aurora MySQL підтримує тип JSON)
        await db.execute(
            'INSERT INTO devices (guid, ownerId, deviceName, side, metadata) VALUES (?, ?, ?, ?, ?)',
            [guid, ownerId, deviceName || 'Unknown Device', side, JSON.stringify(otherData)]
        );
        console.log(guid, ownerId, deviceName, side, JSON.stringify(otherData))

        res.status(201).json({ message: 'Пристрій збережено' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Пристрій з таким GUID вже існує' });
        }
        res.status(500).json({ error: err.message });
    }
});

// 4. ПОШУК ПРИСТРОЇВ ПО OWNER ID
app.get('/devices/:ownerId', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM devices WHERE ownerId = ?', [req.params.ownerId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));