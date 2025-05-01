const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const jobRoutes = require('./routes/job.routes');
const { helmet, limiter } = require('./middlewares/security');
const BrowserPool = require('./utils/browserPool');
const timeout = require('connect-timeout'); // Add at the top, after other requires

// Get reference to the browser pool instance used in job service
const browserPool = require('./services/job.service').getBrowserPool();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5050;

// Apply security middlewares
app.use(helmet());  // Adds security headers
app.use(limiter);   // Rate limiting

// Better CORS configuration with proper multiple origin handling
const allowedOrigins = [
    'https://sudhanshu-s3.github.io',
    'https://sudhanshu-s3.github.io/JobSrcapper-client',
    'https://sudhanshu-s3.github.io/JobSrcapper-client/', // with trailing slash
    'http://localhost:3000'
];

// Add FRONTEND_URL from env if it exists
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
    // Also add version without trailing slash
    if (process.env.FRONTEND_URL.endsWith('/')) {
        allowedOrigins.push(process.env.FRONTEND_URL.slice(0, -1));
    }
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Add before your routes
app.use(timeout('120s')); // Set a 2-minute timeout
app.use((req, res, next) => {
    if (!req.timedout) next();
});

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

// Handle OPTIONS requests separately and quickly
app.options('*', (req, res) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (!origin || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        return res.status(204).end();
    }

    // Return 403 for disallowed origins
    res.status(403).json({
        error: `CORS not allowed from origin: ${origin}`
    });
});

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