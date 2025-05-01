const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const jobRoutes = require('./routes/job.routes');
const { helmet, limiter } = require('./middlewares/security');
const BrowserPool = require('./utils/browserPool');

// Get reference to the browser pool instance used in job service
const browserPool = require('./services/job.service').getBrowserPool();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5050;

// Apply security middlewares
app.use(helmet());  // Adds security headers
app.use(limiter);   // Rate limiting

// Updated CORS configuration with explicit origins
app.use(cors({
    origin: process.env.FRONTEND_URL || [
        'https://sudhanshu-s3.github.io',
        'https://sudhanshu-s3.github.io/JobSrcapper-client',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Update static file paths to include src directory for Render deployment
if (process.env.RENDER) {
    app.use(express.static(path.join(__dirname, 'public')));
} else {
    app.use(express.static(path.join(__dirname, '../public')));
}

// Log all requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Pre-flight OPTIONS request handler for CORS
app.options('*', cors());

// API Routes
app.use('/api/jobs', jobRoutes);

// Serve the frontend with updated path handling for Render
app.get('/', (req, res) => {
    if (process.env.RENDER) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server only if not being imported
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

// Export for serverless use
module.exports = app;

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
    logger.info('Shutting down server gracefully');

    // Close browser pool
    try {
        if (browserPool) {
            logger.info('Closing browser pool...');
            await browserPool.closeAll();
            logger.info('Browser pool closed successfully');
        }
    } catch (err) {
        logger.error('Error closing browser pool:', err);
    }

    process.exit(0);
}