const logger = require('./logger');

/**
 * Scroll to the bottom of the page to load more content
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Scroll options
 * @param {number} options.timeout - Maximum time to scroll in ms
 * @param {number} options.scrollStep - Pixels to scroll in each step
 * @param {number} options.scrollDelay - Delay between scroll steps in ms
 * @returns {Promise<void>}
 */
exports.autoScroll = async function autoScroll(page, {
    timeout = 30000,  // 30 seconds max
    scrollStep = 300, // Scroll 300px each step
    scrollDelay = 100 // Wait 100ms between scrolls
} = {}) {
    try {
        await page.evaluate(async (timeout, scrollStep, scrollDelay) => {
            await new Promise((resolve) => {
                const startTime = Date.now();
                let lastScrollTop = 0;
                let scrollCount = 0;
                let noChangeCount = 0;

                const scrollInterval = setInterval(() => {
                    window.scrollBy(0, scrollStep);
                    scrollCount++;

                    // Get current scroll position
                    const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

                    // Check if we've reached the bottom or timeout
                    const isTimeOut = Date.now() - startTime > timeout;
                    const isScrolledToBottom = currentScrollTop + window.innerHeight >= document.body.scrollHeight;
                    const isScrollStuck = currentScrollTop === lastScrollTop;

                    // Increment no change counter if scroll position hasn't changed
                    if (isScrollStuck) {
                        noChangeCount++;
                    } else {
                        noChangeCount = 0;
                    }

                    // Stop if we've reached bottom, timeout, or scroll is stuck
                    if (isScrolledToBottom || isTimeOut || noChangeCount > 5) {
                        clearInterval(scrollInterval);
                        resolve();
                    }

                    // Update last scroll position
                    lastScrollTop = currentScrollTop;
                }, scrollDelay);
            });
        }, timeout, scrollStep, scrollDelay);

        logger.debug('Finished auto-scrolling page');
    } catch (error) {
        logger.error('Error during auto-scroll:', error.message);
    }
};

/**
 * Wait for random time to avoid detection
 * @param {number} min - Minimum wait time in ms
 * @param {number} max - Maximum wait time in ms
 * @returns {Promise<void>}
 */
exports.randomDelay = async function randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    logger.debug(`Adding random delay: ${delay}ms`);
    return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Extract clean text from an element
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector
 * @param {string} defaultValue - Default value if not found
 * @returns {Promise<string>} - Extracted text
 */
exports.getText = async function getText(page, selector, defaultValue = '') {
    try {
        const text = await page.$eval(selector, el => el.textContent.trim());
        return text || defaultValue;
    } catch (error) {
        return defaultValue;
    }
};

/**
 * Normalize LinkedIn date strings to create sortable values
 * @param {string} dateStr - LinkedIn date string (e.g., "1 day ago", "2 weeks ago", "Just now")
 * @returns {number} - Normalized value in hours (smaller = more recent)
 */
exports.normalizePostedDate = function normalizePostedDate(dateStr) {
    if (!dateStr) return Number.MAX_SAFE_INTEGER; // For missing dates, consider them oldest

    dateStr = dateStr.toLowerCase().trim();

    // Check for "Just now", "Today", etc.
    if (dateStr.includes('just now') || dateStr.includes('today') || dateStr === 'now') {
        return 0;
    }

    // Extract numbers and units
    const match = dateStr.match(/(\d+)\s+(minute|hour|day|week|month|year)s?/);
    if (!match) return Number.MAX_SAFE_INTEGER; // If format doesn't match, treat as oldest

    const [, count, unit] = match;
    const numCount = parseInt(count, 10);

    // Convert to hours
    switch (unit) {
        case 'minute': return numCount / 60;
        case 'hour': return numCount;
        case 'day': return numCount * 24;
        case 'week': return numCount * 24 * 7;
        case 'month': return numCount * 24 * 30; // Approximation
        case 'year': return numCount * 24 * 365; // Approximation
        default: return Number.MAX_SAFE_INTEGER;
    }
};
