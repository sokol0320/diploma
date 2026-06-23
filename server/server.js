require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { json } = require('body-parser');

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
app.get('/rules/:guid', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM device_rules WHERE guid = ?', [req.params.guid]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/rules', async (req, res) => {
    const { guid, start_time, end_time, days, mode } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO device_rules (guid, start_time, end_time, days, mode) VALUES (?, ?, ?, ?, ?)',
            [guid, start_time, end_time, JSON.stringify(days), mode]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/rules/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM device_rules WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/rules/:id/toggle', async (req, res) => {
    const { is_active } = req.body;
    try {
        await db.execute('UPDATE device_rules SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ message: 'Toggled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- ПРОКСІ ДЛЯ КЕРУВАННЯ ПРИСТРОЄМ (ОБХІД CORS) ---
app.post('/device-command', async (req, res) => {
    const body = req.body || {};
    const go = body.go;
    const guid = body.guid;
    
    if (!go || !guid) {
        return res.status(400).json({ error: "Відсутні параметри 'go' або 'guid'" });
    }

    try {
        const controller = new AbortController();
        // Таймаут 8 секунд
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // ВІДПРАВЛЯЄМО ЧИСТИЙ JSON НА set.php
        const response = await fetch('http://193.33.207.39/set.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ go, guid }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const textData = await response.text();
        
        try {
            // Пробуємо розпарсити відповідь як JSON
            const cleanText = textData.trim();
            const jsonData = JSON.parse(cleanText);
            res.json(jsonData);
        } catch (parseErr) {
            // Якщо це не JSON (наприклад, текст помилки від PHP)
            if (!response.ok) {
                return res.status(500).json({ error: "Помилка PHP: " + response.status });
            }
            res.json({ status: textData.trim() });
        }
    } catch (err) {
        console.error("Помилка зв'язку з пристроєм:", err.message);
        res.status(500).json({ error: "Пристрій офлайн або недоступний" });
    }
});
// --- АВТОМАТИЧНЕ ВИКОНАННЯ КОМАНД ЗА РОЗКЛАДОМ (ФОНОВИЙ ПРОЦЕС) ---
const statusMap = { 200: 'open', 300: 'ventilation', 400: 'closed' };
const modeMap = { 'Відкрито': 'open', 'Закрито': 'closed', 'Провітрювання': 'ventilation' };
const commandMap = { 'open': 'open', 'closed': 'close', 'ventilation': 'tilt' };

setInterval(async () => {
    try {
        // 1. Отримуємо поточний час та день тижня суворо за Київським часом
        const kyivTimeStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" });
        const kyivDate = new Date(kyivTimeStr);
        
        const daysMap = ['Нд', 'Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб'];
        const currentDay = daysMap[kyivDate.getDay()];
        const currentTime = kyivDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', hour12: false });

        // 2. Вибираємо з БД всі активні правила
        const [rules] = await db.execute('SELECT * FROM device_rules WHERE is_active = true');
        if (rules.length === 0) return;

        // Групуємо правила за GUID, щоб визначити цільовий стан для кожного вікна
        const targetsByGuid = {};

        rules.forEach(rule => {
            let parsedDays = [];
            try {
                parsedDays = typeof rule.days === 'string' ? JSON.parse(rule.days) : rule.days;
            } catch (e) {
                return;
            }

            // Перевіряємо, чи підходить день тижня
            if (parsedDays.includes(currentDay)) {
                let isCurrent = false;
                // Логіка для звичайних та нічних інтервалів (наприклад, 22:00 - 06:00)
                if (rule.start_time <= rule.end_time) {
                    isCurrent = currentTime >= rule.start_time && currentTime <= rule.end_time;
                } else {
                    isCurrent = currentTime >= rule.start_time || currentTime <= rule.end_time;
                }

                if (isCurrent) {
                    // Якщо для цього GUID вже є правило, пріоритет можна віддати новішому
                    targetsByGuid[rule.guid] = modeMap[rule.mode];
                }
            }
        });

        // 3. Перевіряємо поточний стан пристроїв та відправляємо команди
        for (const guid in targetsByGuid) {
            const targetState = targetsByGuid[guid];

            try {
                // Запитуємо статус у set.php
                const resStatus = await fetch('http://193.33.207.39/set.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ go: 'status', guid: guid })
                });

                if (resStatus.ok) {
                    const statusData = await resStatus.json();
                    const currentDeviceState = statusMap[statusData.status];

                    // Відправляємо команду тільки якщо поточний стан НЕ збігається з розкладом
                    if (currentDeviceState && currentDeviceState !== targetState) {
                        console.log(`[АВТОМАТИКА СЕРВЕРА] Вікно ${guid} потребує зміни стану на: ${targetState}`);
                        
                        await fetch('http://193.33.207.39/set.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ go: commandMap[targetState], guid: guid })
                        });
                    }
                }
            } catch (err) {
                console.error(`[АВТОМАТИКА СЕРВЕРА] Помилка зв'язку з платою ${guid}:`, err.message);
            }
        }
    } catch (dbErr) {
        console.error("[АВТОМАТИКА СЕРВЕРА] Помилка роботи з базою даних:", dbErr.message);
    }
}, 30000); // Перевірка кожні 30 секунд
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));