/**
 * Simple logging utility
 */
class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };

        // Set default log level based on environment
        this.level = process.env.NODE_ENV === 'production'
            ? this.logLevels.INFO
            : this.logLevels.DEBUG;
    }

    /**
     * Format log message with timestamp
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @returns {string} - Formatted log message
     */
    _formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${message}`;
    }

    /**
     * Log error message
     * @param {...any} args - Arguments to log
     */
    error(...args) {
        if (this.level >= this.logLevels.ERROR) {
            console.error(this._formatMessage('ERROR', args.join(' ')));
        }
    }

    /**
     * Log warning message
     * @param {...any} args - Arguments to log
     */
    warn(...args) {
        if (this.level >= this.logLevels.WARN) {
            console.warn(this._formatMessage('WARN', args.join(' ')));
        }
    }

    /**
     * Log info message
     * @param {...any} args - Arguments to log
     */
    info(...args) {
        if (this.level >= this.logLevels.INFO) {
            console.info(this._formatMessage('INFO', args.join(' ')));
        }
    }

    /**
     * Log debug message
     * @param {...any} args - Arguments to log
     */
    debug(...args) {
        if (this.level >= this.logLevels.DEBUG) {
            console.debug(this._formatMessage('DEBUG', args.join(' ')));
        }
    }
}

// Export a singleton instance
module.exports = new Logger();
