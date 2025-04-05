const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const open = require('open');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class ManualCaptchaSolver {
    constructor(port = 3030) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        this.setupServer();
    }

    setupServer() {
        this.app.use(express.static(path.join(__dirname, '../public/captcha')));
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/captcha/index.html'));
        });

        this.io.on('connection', (socket) => {
            logger.info('Manual CAPTCHA solver client connected');

            socket.on('captchaSolved', (solution) => {
                logger.info('Received CAPTCHA solution from manual solver');
                this.resolveCaptcha(solution);
            });

            socket.on('disconnect', () => {
                logger.info('Manual CAPTCHA solver client disconnected');
            });
        });
    }

    async startServer() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                logger.info(`Manual CAPTCHA solver server running on port ${this.port}`);
                resolve();
            });
        });
    }

    stopServer() {
        this.server.close();
        logger.info('Manual CAPTCHA solver server stopped');
    }

    async solveCaptcha(screenshotPath) {
        try {
            // Start the server if not already running
            if (!this.server.listening) {
                await this.startServer();
            }

            // Copy the screenshot to the public directory
            const publicScreenshotPath = path.join(__dirname, '../public/captcha/current-captcha.png');
            fs.copyFileSync(screenshotPath, publicScreenshotPath);

            // Create a promise that will be resolved when the CAPTCHA is solved
            this.captchaPromise = new Promise((resolve) => {
                this.resolveCaptcha = resolve;
            });

            // Notify clients that a new CAPTCHA is available
            this.io.emit('newCaptcha', { path: '/current-captcha.png' });

            // Open the browser for manual solving
            await open(`http://localhost:${this.port}`);

            // Wait for the solution
            logger.info('Waiting for manual CAPTCHA solution...');
            const solution = await this.captchaPromise;

            return solution;
        } catch (error) {
            logger.error('Error in manual CAPTCHA solving process:', error);
            throw error;
        }
    }
}

module.exports = ManualCaptchaSolver;