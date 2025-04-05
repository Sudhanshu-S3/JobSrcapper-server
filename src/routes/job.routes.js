const express = require('express');
const jobController = require('../controllers/job.controller');
const router = express.Router();

// Job routes
router.post('/scrape', jobController.scrapeJobs);
router.get('/sources', jobController.getAvailableSources);

module.exports = router;