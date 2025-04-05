const axios = require('axios');
const fs = require('fs');
const logger = require('./logger');

// 2Captcha example - you'll need an API key from their service
class CaptchaSolver {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.CAPTCHA_API_KEY;
        this.baseUrl = 'https://2captcha.com/';
    }

    async solveRecaptchaV2(siteKey, pageUrl) {
        try {
            logger.info(`Attempting to solve reCAPTCHA v2: ${siteKey} on ${pageUrl}`);

            // Step 1: Send CAPTCHA for solving
            const createTaskResponse = await axios.post(`${this.baseUrl}in.php`, null, {
                params: {
                    key: this.apiKey,
                    method: 'userrecaptcha',
                    googlekey: siteKey,
                    pageurl: pageUrl,
                    json: 1
                }
            });

            if (createTaskResponse.data.status !== 1) {
                throw new Error(`Failed to create CAPTCHA task: ${createTaskResponse.data.error_text}`);
            }

            const taskId = createTaskResponse.data.request;
            logger.info(`CAPTCHA task created with ID: ${taskId}`);

            // Step 2: Wait for the CAPTCHA to be solved
            let result = null;
            let retries = 0;

            while (!result && retries < 30) {
                await new Promise(resolve => setTimeout(resolve, 5000));

                const resultResponse = await axios.get(`${this.baseUrl}res.php`, {
                    params: {
                        key: this.apiKey,
                        action: 'get',
                        id: taskId,
                        json: 1
                    }
                });

                if (resultResponse.data.status === 1) {
                    result = resultResponse.data.request;
                    break;
                }

                if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
                    throw new Error(`CAPTCHA solving error: ${resultResponse.data.request}`);
                }

                retries++;
            }

            if (!result) {
                throw new Error('CAPTCHA solving timeout');
            }

            logger.info('CAPTCHA solved successfully');
            return result;

        } catch (error) {
            logger.error('Error solving CAPTCHA:', error);
            throw error;
        }
    }

    async solveImageCaptcha(imagePath) {
        try {
            // Read the image file
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            // Step 1: Send image for solving
            const createTaskResponse = await axios.post(`${this.baseUrl}in.php`, null, {
                params: {
                    key: this.apiKey,
                    method: 'base64',
                    body: base64Image,
                    json: 1
                }
            });

            if (createTaskResponse.data.status !== 1) {
                throw new Error(`Failed to create image CAPTCHA task: ${createTaskResponse.data.error_text}`);
            }

            const taskId = createTaskResponse.data.request;

            // Step 2: Wait for the CAPTCHA to be solved
            let result = null;
            let retries = 0;

            while (!result && retries < 30) {
                await new Promise(resolve => setTimeout(resolve, 3000));

                const resultResponse = await axios.get(`${this.baseUrl}res.php`, {
                    params: {
                        key: this.apiKey,
                        action: 'get',
                        id: taskId,
                        json: 1
                    }
                });

                if (resultResponse.data.status === 1) {
                    result = resultResponse.data.request;
                    break;
                }

                retries++;
            }

            if (!result) {
                throw new Error('Image CAPTCHA solving timeout');
            }

            return result;

        } catch (error) {
            logger.error('Error solving image CAPTCHA:', error);
            throw error;
        }
    }
}

module.exports = CaptchaSolver;