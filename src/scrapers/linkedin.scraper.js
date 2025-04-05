const { autoScroll } = require('../utils/scrape-helpers');
const logger = require('../utils/logger');
const selectors = require('../config/selectors');

exports.scrapeJobs = async (browser, searchQuery, location, jobType) => {
    logger.info(`Scraping LinkedIn jobs for: ${searchQuery}`);

    try {
        const page = await browser.newPage();

        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Construct search URL
        let searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}`;

        if (location) {
            searchUrl += `&location=${encodeURIComponent(location)}`;
        }

        if (jobType === 'internship') {
            searchUrl += '&f_JT=I';
        } else if (jobType === 'fulltime') {
            searchUrl += '&f_JT=F';
        } else if (jobType === 'contract') {
            searchUrl += '&f_JT=C';
        }

        logger.info(`Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for job listings to load
        await page.waitForSelector(selectors.linkedin.jobsList, { timeout: 10000 })
            .catch(() => logger.warn('LinkedIn selector timeout - continuing anyway'));

        // Scroll to load more jobs
        await autoScroll(page);

        // Extract job data
        const jobListings = await page.evaluate((sel) => {
            const listings = [];

            // Get all job cards
            const jobCards = document.querySelectorAll(sel.jobsList + ' > li');

            jobCards.forEach(card => {
                try {
                    const titleElement = card.querySelector(sel.title);
                    const companyElement = card.querySelector(sel.company);
                    const locationElement = card.querySelector(sel.location);
                    const linkElement = card.querySelector(sel.link);
                    const timeElement = card.querySelector(sel.posted);

                    if (titleElement && companyElement) {
                        const listing = {
                            title: titleElement.textContent.trim(),
                            company: companyElement.textContent.trim(),
                            location: locationElement ? locationElement.textContent.trim() : 'Location not specified',
                            link: linkElement ? linkElement.href : null,
                            posted: timeElement ? timeElement.textContent.trim() : 'Recently posted'
                        };

                        listings.push(listing);
                    }
                } catch (error) {
                    console.log('Error parsing LinkedIn job card');
                }
            });

            return listings;
        }, selectors.linkedin);

        await page.close();
        return jobListings;

    } catch (error) {
        logger.error('LinkedIn scraping error:', error);
        throw error;
    }
};