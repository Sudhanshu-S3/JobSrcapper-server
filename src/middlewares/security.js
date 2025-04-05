// Security middleware for Express
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Configure rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per windowMs
    message: 'Too many requests, please try again later'
});

module.exports = {
    helmet,
    limiter
};