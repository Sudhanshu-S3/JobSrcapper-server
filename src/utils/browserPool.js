const puppeteer = require('puppeteer');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');

/**
 * Browser pool for managing Puppeteer instances
 */
class BrowserPool {
    /**
     * Create a browser pool
     * @param {Object} options - Pool options
     * @param {number} options.maxPoolSize - Maximum number of browser instances
     */
    constructor({ maxPoolSize = 3 } = {}) {
        this.maxPoolSize = maxPoolSize;
        this.pool = [];
        this.inUse = new Set();
        this.waitQueue = [];

        logger.info(`Browser pool initialized with max size: ${this.maxPoolSize}`);
    }

    /**
     * Find Chrome executable on Windows
     * @returns {string|null} Path to Chrome executable or null if not found
     */
    _findChromeExecutableOnWindows() {
        const prefixes = [
            process.env['PROGRAMFILES(X86)'],
            process.env.PROGRAMFILES,
            process.env.LOCALAPPDATA
        ].filter(Boolean);

        const suffixes = [
            '\\Google\\Chrome\\Application\\chrome.exe',
            '\\Microsoft\\Edge\\Application\\msedge.exe',
            '\\Chrome\\Application\\chrome.exe',
        ];

        for (const prefix of prefixes) {
            for (const suffix of suffixes) {
                try {
                    const chromePath = path.join(prefix, suffix);
                    if (fs.existsSync(chromePath)) {
                        return chromePath;
                    }
                } catch (error) {
                    // Continue searching
                }
            }
        }

        return null;
    }

    /**
     * Find Chrome executable on macOS
     * @returns {string|null} Path to Chrome executable or null if not found
     */
    _findChromeExecutableOnMac() {
        const paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ];

        for (const path of paths) {
            try {
                if (fs.existsSync(path)) {
                    return path;
                }
            } catch (error) {
                // Continue searching
            }
        }

        return null;
    }

    /**
     * Find Chrome executable on Linux
     * @returns {string|null} Path to Chrome executable or null if not found
     */
    _findChromeExecutableOnLinux() {
        try {
            // Try to find Chrome using the which command
            const browserPath = execSync('which google-chrome || which chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
            if (browserPath) {
                return browserPath;
            }
        } catch (error) {
            // Continue with hardcoded paths
        }

        const paths = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
        ];

        for (const path of paths) {
            try {
                if (fs.existsSync(path)) {
                    return path;
                }
            } catch (error) {
                // Continue searching
            }
        }

        return null;
    }

    /**
     * Find Chrome executable based on operating system
     * @returns {string|null} Path to Chrome executable or null if not found
     */
    _findChromeExecutable() {
        const platform = os.platform();

        if (platform === 'win32') {
            return this._findChromeExecutableOnWindows();
        } else if (platform === 'darwin') {
            return this._findChromeExecutableOnMac();
        } else if (platform === 'linux') {
            return this._findChromeExecutableOnLinux();
        }

        return null;
    }

    /**
     * Launch a new browser instance
     * @returns {Promise<Browser>} - Puppeteer browser instance
     */
    async _launchBrowser() {
        try {
            logger.info('Launching new browser instance...');

            // Default launch options
            const launchOptions = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--single-process', // Add this
                    '--no-zygote',      // Add this
                    '--disable-extensions' // Add this
                ],
                ignoreHTTPSErrors: true
            };

            try {
                // First attempt: Try using bundled Chromium
                return await puppeteer.launch(launchOptions);
            } catch (error) {
                // If bundled Chromium fails, try to find installed Chrome
                logger.warn('Failed to launch with bundled Chromium, trying to detect system Chrome...');

                const executablePath = this._findChromeExecutable();

                if (!executablePath) {
                    throw new Error('Could not find Chrome or Chromium installed on the system. Please install Google Chrome and try again.');
                }

                logger.info(`Found Chrome at: ${executablePath}`);

                // Launch with detected Chrome
                return await puppeteer.launch({
                    ...launchOptions,
                    executablePath,
                    channel: path.basename(executablePath).toLowerCase().includes('edge') ? 'msedge' : undefined
                });
            }
        } catch (error) {
            logger.error('Failed to launch browser:', error.message);

            // Provide helpful error message
            const errorMsg = `Browser launch failed: ${error.message}\n` +
                'Please ensure that Google Chrome is installed on your system.\n' +
                'If you continue to have issues, try running: npm run install-puppeteer';

            throw new Error(errorMsg);
        }
    }

    /**
     * Remove browser from pool
     * @param {Browser} browser - Browser to remove
     */
    _removeBrowser(browser) {
        const idx = this.pool.indexOf(browser);
        if (idx !== -1) {
            this.pool.splice(idx, 1);
        }
        this.inUse.delete(browser);
    }

    /**
     * Process waiting acquire requests
     */
    _processQueue() {
        if (this.waitQueue.length > 0 && (this.pool.length - this.inUse.size > 0 || this.pool.length < this.maxPoolSize)) {
            const { resolve, reject } = this.waitQueue.shift();
            this.acquire().then(resolve).catch(reject);
        }
    }

    /**
     * Acquire a browser instance from the pool
     * @returns {Promise<Browser>} - Puppeteer browser instance
     */
    async acquire() {
        // First, try to get an available browser from the pool
        const availableBrowser = this.pool.find(browser => !this.inUse.has(browser));

        if (availableBrowser) {
            logger.debug('Reusing existing browser instance');
            this.inUse.add(availableBrowser);
            return availableBrowser;
        }

        // If pool is not full, create a new browser
        if (this.pool.length < this.maxPoolSize) {
            try {
                const newBrowser = await this._launchBrowser();
                this.pool.push(newBrowser);
                this.inUse.add(newBrowser);

                // Handle browser disconnect
                newBrowser.on('disconnected', () => {
                    logger.info('Browser disconnected');
                    this._removeBrowser(newBrowser);
                });

                logger.info('Browser instance launched successfully');
                return newBrowser;
            } catch (error) {
                logger.error('Failed to acquire browser:', error.message);
                throw error;
            }
        }

        // If we're here, the pool is full and all browsers are in use
        // Wait for a browser to become available
        logger.info('Browser pool full, waiting for available instance');
        return new Promise((resolve, reject) => {
            this.waitQueue.push({ resolve, reject });
        });
    }

    /**
     * Release a browser instance back to the pool
     * @param {Browser} browser - Browser to release
     */
    async release(browser) {
        if (this.inUse.has(browser)) {
            this.inUse.delete(browser);
            logger.debug('Browser instance released back to pool');

            // Process any waiting requests
            this._processQueue();
        }
    }

    /**
     * Close all browser instances
     */
    async closeAll() {
        logger.info(`Closing all browsers in pool (${this.pool.length} total)`);

        const closingPromises = this.pool.map(async (browser) => {
            try {
                await browser.close();
                logger.debug('Browser closed successfully');
            } catch (error) {
                logger.error('Error closing browser:', error.message);
            }
        });

        await Promise.all(closingPromises);

        this.pool = [];
        this.inUse.clear();

        // Reject any waiting promises
        this.waitQueue.forEach(({ reject }) => {
            reject(new Error('Browser pool is closing'));
        });
        this.waitQueue = [];

        logger.info('All browsers in pool have been closed');
    }
}

module.exports = BrowserPool;
