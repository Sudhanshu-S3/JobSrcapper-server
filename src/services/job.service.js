const BrowserPool = require('../utils/browserPool');
const scrapersConfig = require('../config/scrapers');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { normalizePostedDate } = require('../utils/scrape-helpers');

// Initialize browser pool
const browserPool = new BrowserPool({ maxPoolSize: 3 });

// Available scraping sources - LinkedIn only
const availableSources = ['linkedin'];

// Export the browser pool for shutdown handling
exports.getBrowserPool = () => browserPool;

// Get all available sources
exports.getAvailableSources = () => availableSources;

// Main job aggregation service
exports.aggregateJobs = async (searchQuery, location, jobType, sources = availableSources) => {
    // Force sources to be only LinkedIn
    sources = ['linkedin'];

    const cacheKey = `${searchQuery}-${location}-${jobType}-linkedin`;

    // Try to get from cache first
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
        logger.info(`Cache hit for query: ${searchQuery}`);
        return cachedResults;
    }

    logger.info(`Searching LinkedIn jobs for: ${searchQuery} in ${location}, type: ${jobType}`);

    let allJobs = [];

    // Get browser instance from pool
    const browser = await browserPool.acquire();

    try {
        // Only use LinkedIn scraper
        const scraper = require('../scrapers/linkedin.scraper');

        const jobs = await scraper.scrapeJobs(browser, searchQuery, location, jobType)
            .then(jobs => {
                logger.info(`LinkedIn: Found ${jobs.length} job listings`);
                return jobs.map(job => ({ ...job, source: 'LinkedIn' }));
            })
            .catch(err => {
                logger.error(`LinkedIn scraping error:`, err);
                return []; // Return empty array on error
            });

        allJobs = jobs;

        // Sort jobs by posting date (newest first)
        allJobs.sort((a, b) => {
            const dateA = normalizePostedDate(a.posted);
            const dateB = normalizePostedDate(b.posted);
            return dateA - dateB; // Lower values (more recent) come first
        });

        logger.info(`Total jobs found: ${allJobs.length}, sorted by posting date`);

        // Store in cache for 30 minutes
        cache.set(cacheKey, allJobs, 30 * 60); // 30 minutes in seconds

        return allJobs;

    } finally {
        // Always return browser to pool
        await browserPool.release(browser);
    }
};