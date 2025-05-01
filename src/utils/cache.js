/**
 * Simple in-memory cache implementation
 */
class Cache {
    constructor() {
        this.items = {};
        this.timeouts = {};
    }

    /**
     * Get an item from cache
     * @param {string} key - Cache key
     * @returns {*} - Cached item or null if not found/expired
     */
    get(key) {
        return this.items[key] || null;
    }

    /**
     * Set an item in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to store
     * @param {number} ttlSeconds - Time to live in seconds
     */
    set(key, value, ttlSeconds) {
        this.items[key] = value;

        // Clear any existing timeout
        if (this.timeouts[key]) {
            clearTimeout(this.timeouts[key]);
        }

        // Set expiration
        if (ttlSeconds) {
            this.timeouts[key] = setTimeout(() => {
                this.delete(key);
            }, ttlSeconds * 1000);
        }
    }

    /**
     * Delete an item from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        delete this.items[key];

        if (this.timeouts[key]) {
            clearTimeout(this.timeouts[key]);
            delete this.timeouts[key];
        }
    }

    /**
     * Clear all items from cache
     */
    clear() {
        this.items = {};

        // Clear all timeouts
        Object.keys(this.timeouts).forEach(key => {
            clearTimeout(this.timeouts[key]);
        });

        this.timeouts = {};
    }
}

// Export a singleton instance
module.exports = new Cache();
