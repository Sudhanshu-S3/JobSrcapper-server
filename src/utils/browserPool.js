const puppeteer = require('puppeteer');
const logger = require('./logger');

class BrowserPool {
    constructor(options = {}) {
        this.maxPoolSize = options.maxPoolSize || 3;
        this.idleBrowsers = [];
        this.activeBrowsers = 0;

        // Enhanced browser options for Render deployment
        this.browserOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--single-process',
                '--disable-extensions',
                '--no-zygote'
            ]
        };

        // Specific configuration for Render.com
        if (process.env.RENDER) {
            logger.info('Running on Render.com - applying specific configurations');
            this.browserOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
    }

    async acquire() {
        // If we have idle browsers, use one
        if (this.idleBrowsers.length > 0) {
            const browser = this.idleBrowsers.pop();
            this.activeBrowsers++;
            logger.info(`Reusing browser instance. Active: ${this.activeBrowsers}, Idle: ${this.idleBrowsers.length}`);
            return browser;
        }

        // If we haven't reached max pool size, create a new browser
        if (this.activeBrowsers < this.maxPoolSize) {
            this.activeBrowsers++;
            logger.info(`Creating new browser instance. Active: ${this.activeBrowsers}`);
            return await puppeteer.launch(this.browserOptions);
        }

        // Otherwise, wait for a browser to become available
        logger.info('Waiting for browser instance to become available');
        return new Promise(resolve => {
            const checkInterval = setInterval(async () => {
                if (this.idleBrowsers.length > 0) {
                    clearInterval(checkInterval);
                    const browser = this.idleBrowsers.pop();
                    this.activeBrowsers++;
                    logger.info(`Acquired browser after waiting. Active: ${this.activeBrowsers}, Idle: ${this.idleBrowsers.length}`);
                    resolve(browser);
                }
            }, 500);
        });
    }

    async release(browser) {
        try {
            // Check if browser is still functional
            const pages = await browser.pages().catch(() => null);
            const isHealthy = pages !== null;

            if (isHealthy && this.idleBrowsers.length < this.maxPoolSize) {
                // If browser is healthy and we're below max pool size, add to idle pool
                this.idleBrowsers.push(browser);
                logger.info(`Released browser to pool. Active: ${this.activeBrowsers - 1}, Idle: ${this.idleBrowsers.length}`);
            } else {
                // Otherwise, close the browser
                await browser.close().catch(err => logger.error('Error closing browser:', err));
                logger.info('Closed browser instance');
            }
        } catch (error) {
            logger.error('Error releasing browser:', error);
            try {
                await browser.close();
            } catch (e) {
                logger.error('Error forcing browser close:', e);
            }
        } finally {
            this.activeBrowsers--;
        }
    }

    async closeAll() {
        logger.info('Closing all browser instances');
        const closingPromises = this.idleBrowsers.map(browser =>
            browser.close().catch(err => logger.error('Error closing browser during cleanup:', err))
        );
        await Promise.all(closingPromises);
        this.idleBrowsers = [];
    }
}

module.exports = BrowserPool;