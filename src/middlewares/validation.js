// Validation middleware
exports.validateScrapeRequest = (searchQuery, sources) => {
    // Validate search query
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
        return 'Search query is required';
    }

    // Validate sources if provided
    if (sources && (!Array.isArray(sources) || sources.length === 0)) {
        return 'Sources must be a non-empty array';
    }

    return null;
};