// Server-side cache implementation for API responses
// Uses in-memory cache with TTL (Time To Live)

class ApiCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Generate cache key from request parameters
     */
    generateKey(prefix, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${prefix}:${sortedParams}`;
    }

    /**
     * Get item from cache
     */
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * Set item in cache with TTL
     */
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Clear specific key or all cache
     */
    clear(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Clean expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Create singleton instance
const apiCache = new ApiCache();

// Cleanup expired entries every hour
setInterval(() => {
    apiCache.cleanup();
    console.log('Cache cleanup completed. Current size:', apiCache.getStats().size);
}, 60 * 60 * 1000);

module.exports = apiCache;
