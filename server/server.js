require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client('876673268691-scqmciamd7gcmec4jrg2v0hv2a0hkerj.apps.googleusercontent.com');
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Тимчасове сховище для кодів
const resetCodes = new Map();
const pendingRegistrations = new Map();

// КРОК 1 РЕЄСТРАЦІЇ: Відправка коду
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Всі поля обов\'язкові' });
    }

    try {
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Користувач з таким email вже існує' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Зберігаємо дані в пам'ять на 15 хвилин
        pendingRegistrations.set(email, { name, email, password, code, expires: Date.now() + 15 * 60 * 1000 });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Підтвердження реєстрації SmartWindow',
            text: `Ваш код для підтвердження пошти: ${code}\nКод дійсний 15 хвилин.`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Код підтвердження відправлено на вашу пошту' });
    } catch (err) {
        console.error("ПОМИЛКА РЕЄСТРАЦІЇ:", err);
        res.status(500).json({ error: err.message });
    }
});

// КРОК 2 РЕЄСТРАЦІЇ: Перевірка коду та збереження в БД
app.post('/verify-registration', async (req, res) => {
    const { email, code } = req.body;
    const record = pendingRegistrations.get(email);

    if (!record) {
        return res.status(400).json({ message: 'Код не запитувався або термін дії минув' });
    }
    if (record.code !== code) {
        return res.status(400).json({ message: 'Невірний код' });
    }
    if (Date.now() > record.expires) {
        pendingRegistrations.delete(email);
        return res.status(400).json({ message: 'Термін дії коду минув. Пройдіть реєстрацію заново.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(record.password, 10);
        
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [record.name, record.email, hashedPassword]
        );

        pendingRegistrations.delete(email); // Видаляємо з тимчасової пам'яті
        
        res.status(201).json({ 
            message: 'Реєстрація успішна', 
            user: { id: result.insertId, name: record.name, email: record.email } 
        });
    } catch (err) {
        console.error("ПОМИЛКА ПІДТВЕРДЖЕННЯ РЕЄСТРАЦІЇ:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }
        res.json({ message: 'Вхід успішний', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: [
                '876673268691-scqmciamd7gcmec4jrg2v0hv2a0hkerj.apps.googleusercontent.com', 
                'ТВОЙ_ANDROID_CLIENT_ID.apps.googleusercontent.com',                        
                'ТВОЙ_IOS_CLIENT_ID.apps.googleusercontent.com'                             
            ], 
        });
        const { name, email } = ticket.getPayload();
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        let user = rows[0];

        if (!user) {
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, 'google-authenticated']
            );
            user = { id: result.insertId, name, email };
        }
        res.json({ message: 'Вхід через Google успішний', user });
    } catch (error) {
        res.status(400).json({ message: 'Невалідний Google токен' });
    }
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(404).json({ message: 'Користувача з таким email не знайдено' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        resetCodes.set(email, { code, expires: Date.now() + 15 * 60 * 1000 });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Код відновлення пароля SmartWindow',
            text: `Ваш код для відновлення пароля: ${code}\nКод дійсний 15 хвилин.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Код підтвердження відправлено на вашу пошту' });
    } catch (err) {
        console.error("ПОМИЛКА ВІДПРАВКИ ЛИСТА:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const record = resetCodes.get(email);
    
    if (!record) return res.status(400).json({ message: 'Код не запитувався або термін дії минув' });
    if (record.code !== code) return res.status(400).json({ message: 'Невірний код' });
    if (Date.now() > record.expires) {
        resetCodes.delete(email);
        return res.status(400).json({ message: 'Термін дії коду минув' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        resetCodes.delete(email);
        res.json({ message: 'Пароль успішно змінено' });
    } catch (err) {
        console.error("ПОМИЛКА ЗМІНИ ПАРОЛЯ:", err);
        res.status(500).json({ error: err.message });
    }
});

// Маршрути для пристроїв
app.post('/add-device', async (req, res) => {
    const { guid, ownerId, deviceName, side, ...otherData } = req.body;
    if (!guid || !ownerId) return res.status(400).json({ message: 'Поля GUID та ownerId обов\'язкові' });

    try {
        await db.execute(
            'INSERT INTO devices (guid, ownerId, deviceName, side, metadata) VALUES (?, ?, ?, ?, ?)',
            [guid, ownerId, deviceName || 'Unknown Device', side, JSON.stringify(otherData)]
        );
        res.status(201).json({ message: 'Пристрій збережено' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Пристрій з таким GUID вже існує' });
        res.status(500).json({ error: err.message });
    }
});

app.get('/devices/:ownerId', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM devices WHERE ownerId = ?', [req.params.ownerId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/devices/:guid', async (req, res) => {
    const { deviceName, side } = req.body;
    try {
        await db.execute(
            'UPDATE devices SET deviceName = ?, side = ? WHERE guid = ?',
            [deviceName, side, req.params.guid]
        );
        res.json({ message: 'Пристрій оновлено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/devices/:guid', async (req, res) => {
    try {
        await db.execute('DELETE FROM devices WHERE guid = ?', [req.params.guid]);
        res.json({ message: 'Пристрій видалено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));