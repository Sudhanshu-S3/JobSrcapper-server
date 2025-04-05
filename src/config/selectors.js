// CSS selectors for different job platforms
module.exports = {
    linkedin: {
        jobsList: '.jobs-search__results-list',
        title: '.base-search-card__title',
        company: '.base-search-card__subtitle',
        location: '.job-search-card__location',
        link: 'a.base-card__full-link',
        posted: '.job-search-card__listdate'
    },
    wellfound: {
        // Updated selectors based on current site structure
        jobsList: '.listings-container, .jobs-container',
        title: '.role, .job-title, .role-title',
        company: '.startup-name, .company-name, .employer',
        location: '.location, .job-location, .workplace',
        link: '.role a, .job-title a, .listings-item a',
        posted: '.job-date, .date-display, .time-ago'
    },
    unstop: {
        jobsList: '.opportunity-listing',
        title: '.opportunity-title',
        company: '.company-name',
        location: '.location',
        link: 'a.opportunity-link',
        posted: '.posted-date'
    }
};