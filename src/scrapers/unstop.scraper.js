const { autoScroll } = require('../utils/scrape-helpers');
const logger = require('../utils/logger');
const selectors = require('../config/selectors');

exports.scrapeJobs = async (browser, searchQuery, location, jobType) => {
    logger.info(`Scraping Unstop jobs for: ${searchQuery}`);

    try {
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Enable JavaScript console logging
        page.on('console', msg => logger.info(`BROWSER CONSOLE: ${msg.text()}`));

        // Evade detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            window.navigator.chrome = { runtime: {} };
        });

        // Construct search URL - update for Unstop's current URL structure
        // As of 2023, Unstop was rebranded from Dare2Compete
        let searchUrl = `https://unstop.com/search?keyword=${encodeURIComponent(searchQuery)}&tab=jobs`;

        if (location) {
            searchUrl += `&location=${encodeURIComponent(location)}`;
        }

        // Adjust job type parameters based on Unstop's filters
        if (jobType === 'internship') {
            searchUrl += '&type=internship';
        } else if (jobType === 'fulltime') {
            searchUrl += '&type=job';
        }

        logger.info(`Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept cookies if dialog appears
        try {
            await page.waitForSelector('.cookie-consent-btn, .accept-cookies-btn', { timeout: 5000 });
            await page.click('.cookie-consent-btn, .accept-cookies-btn');
        } catch (e) {
            logger.info('No cookie dialog on Unstop or already accepted');
        }

        // Wait for job listings to load
        await page.waitForFunction(() => {
            return document.querySelectorAll('.opportunity-card, .job-card, .job-listing').length > 0 ||
                document.querySelector('.no-results-found, .no-opportunities');
        }, { timeout: 15000 })
            .catch(() => logger.warn('Unstop selector timeout - continuing anyway'));

        // Scroll to load more jobs
        await autoScroll(page);

        // Take screenshot for debugging
        await page.screenshot({ path: 'unstop_debug.png' });
        logger.info('Took screenshot of Unstop page for debugging');

        // Extract job data with more flexible approach
        const jobListings = await page.evaluate(() => {
            const listings = [];

            // Try multiple selectors to adapt to site changes
            const cards = document.querySelectorAll('.opportunity-card, .job-card, .job-listing');

            if (cards.length === 0) {
                console.log('No job cards found on Unstop');
            }

            cards.forEach(card => {
                try {
                    // Try multiple potential selectors for each element
                    const titleEl = card.querySelector('.opportunity-title, .job-title, .listing-title, h3');
                    const companyEl = card.querySelector('.company-name, .organization-name, .company');
                    const locationEl = card.querySelector('.location, .job-location, .opportunity-location');
                    const linkEl = card.querySelector('a');
                    const postedEl = card.querySelector('.posted-date, .date-posted, .listing-date');

                    if (titleEl && (companyEl || card.textContent.includes('Unstop'))) {
                        const listing = {
                            title: titleEl.textContent.trim(),
                            company: companyEl ? companyEl.textContent.trim() : 'Unstop Opportunity',
                            location: locationEl ? locationEl.textContent.trim() : 'Multiple Locations',
                            link: linkEl ? linkEl.href : null,
                            posted: postedEl ? postedEl.textContent.trim() : 'Recently posted'
                        };

                        listings.push(listing);
                    }
                } catch (error) {
                    console.log('Error parsing Unstop job card');
                }
            });

            return listings;
        });

        logger.info(`Extracted ${jobListings.length} jobs from Unstop`);
        await page.close();
        return jobListings;

    } catch (error) {
        logger.error('Unstop scraping error:', error);
        return []; // Return empty array instead of throwing
    }
};