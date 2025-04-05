const jobService = require('../services/job.service');
const { validateScrapeRequest } = require('../middlewares/validation');

// Controller for job-related operations
exports.scrapeJobs = async (req, res) => {
    try {
        const { searchQuery, location, jobType, sources } = req.body;

        // Validate request
        const validationError = validateScrapeRequest(searchQuery, sources);
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        // Get jobs from service
        const jobListings = await jobService.aggregateJobs(searchQuery, location, jobType, sources);

        // Return response
        res.json({ success: true, data: jobListings });
    } catch (error) {
        console.error('Error in scrapeJobs controller:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAvailableSources = (req, res) => {
    try {
        const sources = jobService.getAvailableSources();
        res.json({ success: true, data: sources });
    } catch (error) {
        console.error('Error in getAvailableSources controller:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};