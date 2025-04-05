const puppeteer = require('puppeteer');
const path = require('path'); // added to fix missing 'path'
const { autoScroll } = require('../utils/scrape-helpers');
const logger = require('../utils/logger');
const selectors = require('../config/selectors');
const CaptchaSolver = require('../utils/captcha-solver');
const ManualCaptchaSolver = require('../utils/manual-captcha');
const manualSolver = new ManualCaptchaSolver();

// Add to your server.js or BrowserPool implementation
const proxyList = [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
    'http://proxy3.example.com:8080'
];

// Select a random proxy for each browser instance
function getRandomProxy() {
    return proxyList[Math.floor(Math.random() * proxyList.length)];
}

// Removed erroneous top-level browser launch code:
// const browser = await puppeteer.launch({
//     args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         `--proxy-server=${getRandomProxy()}`
//     ]
// });

exports.scrapeJobs = async (browser, searchQuery, location, jobType) => {
    logger.info(`Scraping Wellfound jobs for: ${searchQuery}`);

    try {
        // Add a random delay before starting to avoid rate limiting
        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 second delay
        await new Promise(resolve => setTimeout(resolve, delay));

        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Enhanced anti-detection
        await page.evaluateOnNewDocument(() => {
            // Override the navigator.webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            // Add plugins array
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Add Chrome-specific properties
            window.chrome = {
                runtime: {},
                loadTimes: function () { },
                csi: function () { },
                app: {}
            };

            // Add language strings
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });

        // Add to your existing page setup code
        await page.evaluateOnNewDocument(() => {
            // More convincing browser fingerprinting

            // Override navigator properties
            const newProto = navigator.__proto__;
            delete newProto.webdriver;

            // Add realistic plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    return [
                        {
                            0: { type: "application/pdf" },
                            name: "PDF Viewer",
                            filename: "internal-pdf-viewer",
                            description: "Portable Document Format"
                        },
                        {
                            0: { type: "application/x-google-chrome-pdf" },
                            name: "Chrome PDF Viewer",
                            filename: "internal-pdf-viewer",
                            description: "Portable Document Format"
                        }
                    ];
                }
            });

            // Add permission behavior
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {
                return parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters);
            };

            // Fake WebGL renderer
            Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
                value: function (contextType) {
                    if (contextType === 'webgl2' || contextType === 'webgl') {
                        const gl = document.createElement('canvas').getContext(contextType);
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        Object.defineProperty(gl, 'getParameter', {
                            value: function (parameter) {
                                if (parameter === debugInfo.UNMASKED_VENDOR_WEBGL) return 'Intel Inc.';
                                if (parameter === debugInfo.UNMASKED_RENDERER_WEBGL) return 'Intel Iris OpenGL Engine';
                                return gl.getParameter(parameter);
                            }
                        });
                        return gl;
                    }
                    return HTMLCanvasElement.prototype.getContext.apply(this, arguments);
                }
            });
        });

        // Move this before navigation
        page.on('console', msg => {
            logger.info(`BROWSER CONSOLE: ${msg.text()}`);
        });

        // Add before navigating to search URL
        async function loginToWellfound(page) {
            try {
                logger.info('Attempting to log in to Wellfound');
                await page.goto('https://wellfound.com/login', { waitUntil: 'networkidle2' });

                // Check if already logged in
                const isLoggedIn = await page.evaluate(() => {
                    return document.body.textContent.includes('Log out') ||
                        document.querySelector('[data-testid="user-menu"]') !== null;
                });

                if (isLoggedIn) {
                    logger.info('Already logged in to Wellfound');
                    return true;
                }

                // Fill login form
                await page.type('#email', process.env.WELLFOUND_EMAIL || 'your_email@example.com');
                await page.type('#password', process.env.WELLFOUND_PASSWORD || 'your_password');

                // Click login button and wait for navigation
                await Promise.all([
                    page.click('button[type="submit"]'),
                    page.waitForNavigation({ waitUntil: 'networkidle2' })
                ]);

                // Check if login was successful
                const loginSuccess = await page.evaluate(() => {
                    return !document.body.textContent.includes('Invalid email or password');
                });

                if (loginSuccess) {
                    logger.info('Successfully logged in to Wellfound');
                    return true;
                } else {
                    logger.error('Failed to log in to Wellfound - check credentials');
                    return false;
                }
            } catch (error) {
                logger.error('Error during Wellfound login:', error);
                return false;
            }
        }

        // Call the login function before searching
        await loginToWellfound(page);

        // Construct search URL for Wellfound (was AngelList Talent)
        // Try a different URL format that might work better with their current site structure
        let searchUrl = `https://wellfound.com/jobs`;
        let hasParams = false;

        if (searchQuery) {
            searchUrl += `?q=${encodeURIComponent(searchQuery)}`;
            hasParams = true;
        }

        if (location) {
            searchUrl += hasParams ? '&' : '?';
            searchUrl += `location=${encodeURIComponent(location)}`;
            hasParams = true;
        }

        // Update job type filters based on actual site parameters
        if (jobType === 'internship') {
            searchUrl += hasParams ? '&' : '?';
            searchUrl += 'internships=true';
        } else if (jobType === 'fulltime') {
            searchUrl += hasParams ? '&' : '?';
            searchUrl += 'full_time=true';
        } else if (jobType === 'contract') {
            searchUrl += hasParams ? '&' : '?';
            searchUrl += 'contract=true';
        }

        logger.info(`Navigating to: ${searchUrl}`);
        const response = await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        logger.info(`Wellfound HTTP status: ${response.status()}`);

        // Log page content and examine URL
        const currentUrl = page.url();
        logger.info(`Current URL after navigation: ${currentUrl}`);

        const captchaSolver = new CaptchaSolver();

        // After navigation, check for CAPTCHA
        const captchaData = await page.evaluate(() => {
            const recaptcha = document.querySelector('div.g-recaptcha, iframe[src*="recaptcha"]');
            if (recaptcha) {
                const siteKey = recaptcha.getAttribute('data-sitekey') ||
                    document.querySelector('[data-sitekey]')?.getAttribute('data-sitekey');
                return { type: 'recaptcha', siteKey };
            }

            return null;
        });

        if (captchaData && captchaData.type === 'recaptcha' && captchaData.siteKey) {
            logger.info(`Detected reCAPTCHA with site key: ${captchaData.siteKey}`);

            try {
                const token = await captchaSolver.solveRecaptchaV2(captchaData.siteKey, page.url());

                // Execute the callback function with the token
                await page.evaluate(`grecaptcha.callback('${token}')`);

                // Wait for page to process the CAPTCHA response
                await page.waitForNavigation({ timeout: 10000 }).catch(() => { });
                logger.info('CAPTCHA solved and submitted');
            } catch (error) {
                logger.error('Failed to solve CAPTCHA:', error);
            }
        }

        // After navigation, check for CAPTCHA
        const hasCaptcha = await page.evaluate(() => {
            return document.body.textContent.includes('CAPTCHA') ||
                document.body.textContent.includes('verify you are human') ||
                document.querySelector('iframe[src*="recaptcha"]') !== null;
        });

        if (hasCaptcha) {
            logger.info('CAPTCHA detected - attempting to solve manually');

            // Take screenshot of the CAPTCHA page
            const screenshotPath = path.join(__dirname, '../../temp/captcha-screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });

            // Get manual solution
            try {
                const solution = await manualSolver.solveCaptcha(screenshotPath);
                logger.info('Received manual CAPTCHA solution');

                // Try to fill in the CAPTCHA solution
                // This depends on the specific CAPTCHA type
                const filled = await page.evaluate((sol) => {
                    // Try different possible input fields for text CAPTCHA
                    const inputs = document.querySelectorAll('input[type="text"]');
                    for (let input of inputs) {
                        if (input.placeholder.toLowerCase().includes('captcha')) {
                            input.value = sol;
                            return true;
                        }
                    }
                    return false;
                }, solution);

                if (filled) {
                    // Try to submit the form
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                        const submitButton = buttons.find(button =>
                            button.textContent.toLowerCase().includes('submit') ||
                            button.textContent.toLowerCase().includes('verify')
                        );

                        if (submitButton) {
                            submitButton.click();
                            return true;
                        }
                        return false;
                    });

                    // Wait for navigation after CAPTCHA submission
                    await page.waitForNavigation({ timeout: 10000 }).catch(() => { });
                }
            } catch (error) {
                logger.error('Manual CAPTCHA solving failed:', error);
            }
        }

        // Accept cookies if dialog appears
        try {
            await page.waitForSelector('button[data-testid="cookie-consent-accept-button"], .cookie-banner button', { timeout: 5000 });
            await page.click('button[data-testid="cookie-consent-accept-button"], .cookie-banner button');
            logger.info('Accepted cookies on Wellfound');
        } catch (e) {
            // Cookie dialog might not appear, which is fine
            logger.info('No cookie dialog on Wellfound or already accepted');
        }

        // Wait a moment for the page to settle
        await page.waitForTimeout(2000);

        // Take a screenshot for debugging
        await page.screenshot({ path: 'wellfound_debug.png' });
        logger.info('Took screenshot of Wellfound page for debugging');

        // Check for job listings using more generic selectors
        const hasJobs = await page.evaluate(() => {
            return Boolean(
                document.querySelector('.job, .job-card, .job-listing, .job-search-card, .listings-item') ||
                document.querySelector('[data-testid*="job"], [class*="job-"]')
            );
        });

        if (!hasJobs) {
            logger.warn('No job elements found on Wellfound page with standard selectors');
            // Try to extract any content that might contain job listings
            await page.screenshot({ path: 'wellfound_debug_nojobs.png', fullPage: true });
        }

        // Extract job data with more flexible selectors
        const jobListings = await page.evaluate(() => {
            const listings = [];

            // Try direct job card selector
            let jobElements = document.querySelectorAll('.job-card, .job, .job-listing, .job-search-card, .listings-item');

            // If no elements found, try broader selectors
            if (jobElements.length === 0) {
                jobElements = document.querySelectorAll('[data-testid*="job"], [class*="job-"]');
            }

            // If still no elements, try to find anything that might be a job card
            if (jobElements.length === 0) {
                jobElements = document.querySelectorAll('a[href*="/jobs/"], div[class*="listing"]');
            }

            console.log(`Found ${jobElements.length} potential job elements`);

            jobElements.forEach((job, index) => {
                try {
                    // For debugging purposes in the console
                    console.log(`Processing job element ${index + 1}`);

                    // More aggressive selector strategy
                    const titleEl = job.querySelector('h3, h4, [class*="title"], [class*="role"], [class*="position"], a[href*="/jobs/"]');
                    const companyEl = job.querySelector('[class*="company"], [class*="startup"], [class*="employer"]');
                    const locationEl = job.querySelector('[class*="location"], [class*="workplace"]');

                    // Find any link that might be the job link
                    const linkEl = job.tagName === 'A' ? job : job.querySelector('a');

                    // Date information
                    const dateEl = job.querySelector('[class*="date"], [class*="time"], [class*="posted"]');

                    // Extract text/attributes safely
                    const title = titleEl ? titleEl.textContent.trim() : '';
                    const company = companyEl ? companyEl.textContent.trim() : 'Wellfound';
                    const location = locationEl ? locationEl.textContent.trim() : 'Remote/Various';
                    const link = linkEl ? linkEl.href : '';
                    const posted = dateEl ? dateEl.textContent.trim() : 'Recently posted';

                    // Only add if we have at least a title or the element definitely contains job information
                    if (title || job.textContent.toLowerCase().includes('job') || job.textContent.toLowerCase().includes('position')) {
                        listings.push({
                            title: title || 'Job Position',
                            company: company || 'Wellfound',
                            location,
                            link,
                            posted
                        });
                    }
                } catch (error) {
                    console.log(`Error parsing Wellfound job card ${index + 1}: ${error.message}`);
                }
            });

            return listings;
        });

        logger.info(`Extracted ${jobListings.length} jobs from Wellfound`);
        await page.close();
        return jobListings;

    } catch (error) {
        logger.error('Wellfound scraping error:', error);
        return []; // Return empty array instead of throwing
    }
};