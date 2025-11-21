const NodeCache = require('node-cache');
const crypto = require('crypto');

/**
 * Cache Manager
 * Provides multi-layer caching with configurable TTLs for news sources
 */

class CacheManager {
  constructor(options = {}) {
    this.enabled = process.env.ENABLE_CACHE === 'true' || options.enabled !== false;

    // Default TTLs in seconds
    this.ttls = {
      rss: parseInt(process.env.CACHE_TTL_RSS || options.ttlRSS || '21600'), // 6 hours
      newsapi: parseInt(process.env.CACHE_TTL_NEWSAPI || options.ttlNewsAPI || '86400'), // 24 hours
      processed: parseInt(process.env.CACHE_TTL_PROCESSED || options.ttlProcessed || '86400') // 24 hours
    };

    // Initialize cache instances
    this.rssCache = new NodeCache({
      stdTTL: this.ttls.rss,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Better performance, but be careful with mutations
    });

    this.newsapiCache = new NodeCache({
      stdTTL: this.ttls.newsapi,
      checkperiod: 600,
      useClones: false
    });

    this.processedCache = new NodeCache({
      stdTTL: this.ttls.processed,
      checkperiod: 600,
      useClones: false
    });

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    // Setup event listeners for monitoring
    this.setupEventListeners();

    if (this.enabled) {
      console.log('✅ Cache enabled with TTLs:', {
        rss: `${this.ttls.rss}s (${this.ttls.rss / 3600}h)`,
        newsapi: `${this.ttls.newsapi}s (${this.ttls.newsapi / 3600}h)`,
        processed: `${this.ttls.processed}s (${this.ttls.processed / 3600}h)`
      });
    } else {
      console.log('⚠️  Cache disabled');
    }
  }

  /**
   * Setup event listeners for cache monitoring
   */
  setupEventListeners() {
    const caches = [
      { name: 'RSS', cache: this.rssCache },
      { name: 'NewsAPI', cache: this.newsapiCache },
      { name: 'Processed', cache: this.processedCache }
    ];

    caches.forEach(({ name, cache }) => {
      cache.on('expired', (key, value) => {
        console.log(`🕐 ${name} cache key expired: ${key}`);
      });

      cache.on('del', (key, value) => {
        this.stats.deletes++;
      });
    });
  }

  /**
   * Generates a cache key from parameters
   * @param {string} prefix - Key prefix (e.g., 'source', 'processed')
   * @param {Object} params - Parameters to include in key
   * @returns {string} - Cache key
   */
  generateKey(prefix, params) {
    const paramsString = JSON.stringify(params);
    const hash = crypto.createHash('md5').update(paramsString).digest('hex').substring(0, 8);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${prefix}:${hash}:${date}`;
  }

  /**
   * Gets a value from the appropriate cache
   * @param {string} type - Cache type ('rss', 'newsapi', 'processed')
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null
   */
  get(type, key) {
    if (!this.enabled) {
      return null;
    }

    try {
      const cache = this.getCacheByType(type);
      const value = cache.get(key);

      if (value !== undefined) {
        this.stats.hits++;
        console.log(`💾 Cache HIT [${type}]: ${key}`);
        return value;
      }

      this.stats.misses++;
      console.log(`❌ Cache MISS [${type}]: ${key}`);
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error(`⚠️  Cache GET error [${type}]:`, error.message);
      return null;
    }
  }

  /**
   * Sets a value in the appropriate cache
   * @param {string} type - Cache type ('rss', 'newsapi', 'processed')
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Optional custom TTL in seconds
   * @returns {boolean} - True if successful
   */
  set(type, key, value, ttl = null) {
    if (!this.enabled) {
      return false;
    }

    try {
      const cache = this.getCacheByType(type);
      const success = cache.set(key, value, ttl || this.ttls[type]);

      if (success) {
        this.stats.sets++;
        console.log(`💾 Cache SET [${type}]: ${key} (TTL: ${ttl || this.ttls[type]}s)`);
      }

      return success;
    } catch (error) {
      this.stats.errors++;
      console.error(`⚠️  Cache SET error [${type}]:`, error.message);
      return false;
    }
  }

  /**
   * Deletes a value from cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @returns {number} - Number of deleted keys
   */
  delete(type, key) {
    if (!this.enabled) {
      return 0;
    }

    try {
      const cache = this.getCacheByType(type);
      const deleted = cache.del(key);
      console.log(`🗑️  Cache DELETE [${type}]: ${key}`);
      return deleted;
    } catch (error) {
      this.stats.errors++;
      console.error(`⚠️  Cache DELETE error [${type}]:`, error.message);
      return 0;
    }
  }

  /**
   * Checks if a key exists in cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(type, key) {
    if (!this.enabled) {
      return false;
    }

    const cache = this.getCacheByType(type);
    return cache.has(key);
  }

  /**
   * Gets cache instance by type
   * @param {string} type - Cache type
   * @returns {NodeCache}
   */
  getCacheByType(type) {
    switch (type) {
      case 'rss':
        return this.rssCache;
      case 'newsapi':
        return this.newsapiCache;
      case 'processed':
        return this.processedCache;
      default:
        throw new Error(`Unknown cache type: ${type}`);
    }
  }

  /**
   * Clears all caches
   */
  flush() {
    this.rssCache.flushAll();
    this.newsapiCache.flushAll();
    this.processedCache.flushAll();
    console.log('🗑️  All caches flushed');
  }

  /**
   * Clears a specific cache type
   * @param {string} type - Cache type to clear
   */
  flushType(type) {
    const cache = this.getCacheByType(type);
    cache.flushAll();
    console.log(`🗑️  ${type} cache flushed`);
  }

  /**
   * Gets cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      enabled: this.enabled,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      errors: this.stats.errors,
      hitRate: `${hitRate}%`,
      sizes: {
        rss: this.rssCache.keys().length,
        newsapi: this.newsapiCache.keys().length,
        processed: this.processedCache.keys().length,
        total: this.rssCache.keys().length + this.newsapiCache.keys().length + this.processedCache.keys().length
      },
      ttls: this.ttls
    };
  }

  /**
   * Logs cache statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log('\n📊 Cache Statistics:');
    console.log(`   Enabled: ${stats.enabled}`);
    console.log(`   Hit Rate: ${stats.hitRate} (${stats.hits} hits / ${stats.misses} misses)`);
    console.log(`   Sets: ${stats.sets}, Deletes: ${stats.deletes}, Errors: ${stats.errors}`);
    console.log(`   Cache Sizes: RSS=${stats.sizes.rss}, NewsAPI=${stats.sizes.newsapi}, Processed=${stats.sizes.processed} (Total: ${stats.sizes.total})`);
  }

  /**
   * Gets all keys from all caches
   * @returns {Object} - Keys grouped by cache type
   */
  getAllKeys() {
    return {
      rss: this.rssCache.keys(),
      newsapi: this.newsapiCache.keys(),
      processed: this.processedCache.keys()
    };
  }

  /**
   * Wrapper function to cache results of an async operation
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to execute if cache miss
   * @param {number} ttl - Optional custom TTL
   * @returns {Promise<any>} - Cached or fresh result
   */
  async wrap(type, key, fn, ttl = null) {
    // Check cache first
    const cached = this.get(type, key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute function
    try {
      const result = await fn();

      // Cache the result
      if (result !== null && result !== undefined) {
        this.set(type, key, result, ttl);
      }

      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }
}

// Singleton instance
let cacheManagerInstance = null;

/**
 * Gets the singleton cache manager instance
 * @returns {CacheManager}
 */
function getCacheManager() {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

module.exports = {
  CacheManager,
  getCacheManager
};
