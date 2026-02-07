require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const PikPakClient = require('./pikpak');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const client = new PikPakClient(process.env.PIKPAK_USER, process.env.PIKPAK_PASS);

if (!process.env.PIKPAK_USER || !process.env.PIKPAK_PASS) {
    console.error('ERROR: PIKPAK_USER or PIKPAK_PASS environment variables are missing!');
} else {
    console.log(`Starting server with user: ${process.env.PIKPAK_USER}`);
}

app.post('/api/magnet', async (req, res) => {
    console.log('Received magnet request:', req.body);
    const { magnet } = req.body;
    if (!magnet) {
        return res.status(400).json({ error: 'Magnet link is required' });
    }

    try {
        const result = await client.addMagnet(magnet);
        console.log('Add magnet result:', result);
        if (result.success === false && result.error === 'CAPTCHA_REQUIRED') {
            return res.status(403).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('API Error:', error);
        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.get('/api/files/:taskId', async (req, res) => {
    const { taskId } = req.params;
    try {
        const result = await client.listFiles(taskId);
        if (result.success === false && result.error === 'CAPTCHA_REQUIRED') {
            return res.status(403).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/captcha', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Captcha token is required' });
    }

    try {
        const result = await client.login(token);
        if (result.success) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(403).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
