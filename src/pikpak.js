const axios = require('axios');
const crypto = require('crypto');

class PikPakClient {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.deviceId = this.generateDeviceId();
        this.accessToken = null;
        this.refreshToken = null;
        this.userId = null;
    }

    generateDeviceId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async login(captchaToken = null) {
        const url = 'https://user.mypikpak.com/v1/auth/signin';
        const payload = {
            client_id: 'YNxT9w7GMdWvEOKa',
            grant_type: 'password',
            username: this.username,
            password: this.password,
            device_id: this.deviceId,
        };

        if (captchaToken) {
            payload.captcha_token = captchaToken;
        }

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            this.accessToken = response.data.access_token;
            this.refreshToken = response.data.refresh_token;
            this.userId = response.data.user_id; // Capture user_id
            console.log('Login successful');
            return { success: true };
        } catch (error) {
            console.error('Login failed:', error.response ? error.response.data : error.message);
            if (error.response && error.response.data.error_code === 4100) {
                return { success: false, error: 'CAPTCHA_REQUIRED', data: error.response.data };
            }
            throw error;
        }
    }

    async addMagnet(magnetLink) {
        if (!this.accessToken) {
            const loginResult = await this.login();
            if (!loginResult.success) return loginResult; // Return CAPTCHA error if any
        }

        const url = 'https://api-drive.mypikpak.com/drive/v1/files';
        const payload = {
            kind: 'drive#file',
            parent_id: '',
            upload_type: 'UPLOAD_TYPE_URL',
            url: {
                url: magnetLink
            },
            name: '' // PikPak often requires a name field, even if empty
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return { success: true, task: response.data };
        } catch (error) {
            console.error('Add magnet failed:', error.response ? JSON.stringify(error.response.data) : error.message);
            if (error.response) {
                console.error('Error status:', error.response.status);
                console.error('Error headers:', JSON.stringify(error.response.headers));

                if (error.response.status === 401) {
                    const loginResult = await this.login();
                    if (!loginResult.success) return loginResult;
                    return this.addMagnet(magnetLink);
                }
            }
            throw error;
        }
    }

    async listFiles(taskId) {
        if (!this.accessToken) await this.login();
        // First check task status to get file_id
        const taskUrl = `https://api-drive.mypikpak.com/drive/v1/tasks/${taskId}`;
        try {
            const taskResponse = await axios.get(taskUrl, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (taskResponse.data.phase === 'PHASE_TYPE_COMPLETE') {
                // If complete, return the file details. 
                // Note: Ideally we want to list the specific file. 
                // For now, let's return the task info which contains file_id and name.
                return { success: true, data: taskResponse.data };
            } else {
                return { success: true, status: 'pending', data: taskResponse.data };
            }
        } catch (error) {
            console.error('List files failed:', error.response ? error.response.data : error.message);
            if (error.response && error.response.status === 401) {
                await this.login();
                return this.listFiles(taskId);
            }
            throw error;
        }
    }
}

module.exports = PikPakClient;
