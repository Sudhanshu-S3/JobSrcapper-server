class Cache {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();

        // Run cleanup every 15 minutes
        setInterval(() => this.cleanup(), 15 * 60 * 1000);
    }

    get(key) {
        // Check if key exists and hasn't expired
        if (this.cache.has(key)) {
            const timestamp = this.timestamps.get(key);
            if (timestamp > Date.now()) {
                return this.cache.get(key);
            } else {
                // If expired, remove it
                this.cache.delete(key);
                this.timestamps.delete(key);
            }
        }
        return null;
    }

    set(key, value, ttlSeconds = 3600) {
        this.cache.set(key, value);
        // Store expiration timestamp
        this.timestamps.set(key, Date.now() + (ttlSeconds * 1000));
    }

    cleanup() {
        const now = Date.now();
        for (const [key, timestamp] of this.timestamps.entries()) {
            if (timestamp <= now) {
                this.cache.delete(key);
                this.timestamps.delete(key);
            }
        }
    }
}

module.exports = new Cache();