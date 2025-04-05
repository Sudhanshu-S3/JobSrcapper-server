const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create write streams
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
    path.join(logsDir, 'error.log'),
    { flags: 'a' }
);

// Format date for logs
function formatDate() {
    return new Date().toISOString();
}

// Logger implementation
const logger = {
    info(message, ...args) {
        const logEntry = `[${formatDate()}] INFO: ${message}`;
        console.log(logEntry);
        if (args.length) console.log(...args);
        accessLogStream.write(logEntry + (args.length ? ` ${JSON.stringify(args)}` : '') + '\n');
    },

    warn(message, ...args) {
        const logEntry = `[${formatDate()}] WARN: ${message}`;
        console.warn(logEntry);
        if (args.length) console.warn(...args);
        accessLogStream.write(logEntry + (args.length ? ` ${JSON.stringify(args)}` : '') + '\n');
    },

    error(message, ...args) {
        const logEntry = `[${formatDate()}] ERROR: ${message}`;
        console.error(logEntry);
        if (args.length) console.error(...args);
        errorLogStream.write(logEntry + (args.length ? ` ${JSON.stringify(args)}` : '') + '\n');
    }
};

module.exports = logger;