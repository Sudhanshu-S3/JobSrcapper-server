const BrowserPool = require('../utils/browserPool');
const scrapersConfig = require('../config/scrapers');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

// Initialize browser pool
const browserPool = new BrowserPool({ maxPoolSize: 3 });

// Available scraping sources
const availableSources = ['linkedin', 'wellfound', 'unstop'];

// Export the browser pool for shutdown handling
exports.getBrowserPool = () => browserPool;

// Get all available sources
exports.getAvailableSources = () => availableSources;

// Main job aggregation service
exports.aggregateJobs = async (searchQuery, location, jobType, sources = availableSources) => {
    const cacheKey = `${searchQuery}-${location}-${jobType}-${sources.sort().join(',')}`;

    // Try to get from cache first
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
        logger.info(`Cache hit for query: ${searchQuery}`);
        return cachedResults;
    }

    logger.info(`Aggregating jobs for: ${searchQuery} in ${location}, type: ${jobType}`);
    logger.info(`Sources: ${sources.join(', ')}`);

    let allJobs = [];

    // Get browser instance from pool
    const browser = await browserPool.acquire();

    try {
        // Run selected scrapers in parallel
        const scrapingPromises = [];

        // Filter valid sources
        const validSources = sources.filter(source => availableSources.includes(source));

        for (const source of validSources) {
            const scraper = require(`../scrapers/${source}.scraper`);
            scrapingPromises.push(
                scraper.scrapeJobs(browser, searchQuery, location, jobType)
                    .then(jobs => {
                        logger.info(`${source}: Found ${jobs.length} job listings`);
                        return jobs.map(job => ({ ...job, source: source.charAt(0).toUpperCase() + source.slice(1) }));
                    })
                    .catch(err => {
                        logger.error(`${source} scraping error:`, err);
                        return []; // Return empty array on error
                    })
            );
        }

        // Wait for all scrapers to complete
        const results = await Promise.all(scrapingPromises);

        // Combine all results
        allJobs = results.flat();

        logger.info(`Total aggregated jobs: ${allJobs.length}`);

        // Store in cache for 30 minutes
        cache.set(cacheKey, allJobs, 30 * 60); // 30 minutes in seconds

        return allJobs;

    } finally {
        // Always return browser to pool
        await browserPool.release(browser);
    }
};