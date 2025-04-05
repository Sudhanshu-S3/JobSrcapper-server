// Configuration for different job scrapers
module.exports = {
    // Scraper settings
    defaultTimeout: 60000, // 60 seconds
    requestDelay: 1000,    // 1 second delay between requests

    // URL patterns for each website
    urls: {
        linkedin: {
            base: 'https://www.linkedin.com/jobs/search/',
            internship: '&f_JT=I',
            fulltime: '&f_JT=F',
            contract: '&f_JT=C'
        },
        wellfound: {
            base: 'https://wellfound.com/jobs',
            internship: '&job_type=internship',
            fulltime: '&job_type=full-time',
            contract: '&job_type=contract'
        },
        unstop: {
            base: 'https://unstop.com/jobs-internships',
            internship: '&oppurtunity_type=internship',
            fulltime: '&oppurtunity_type=job',
            contract: ''
        }
    }
};