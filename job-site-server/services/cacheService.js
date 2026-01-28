const config = require('../config/environment');

/**
 * Simple in-memory cache service
 * Can be replaced with Redis for production
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.enabled = config.cache.enabled;
    
    // Stats
    this.hits = 0;
    this.misses = 0;
    
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.enabled) return null;
    
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      return null;
    }
    
    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      this.timers.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return item.value;
  }
  
  /**
   * Set value in cache
   */
  async set(key, value, ttl = config.cache.ttl) {
    if (!this.enabled) return;
    
    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const expiry = ttl ? Date.now() + (ttl * 1000) : null;
    
    this.cache.set(key, {
      value,
      expiry,
      created: Date.now()
    });
    
    // Set auto-delete timer
    if (ttl) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      
      this.timers.set(key, timer);
    }
  }
  
  /**
   * Delete value from cache
   */
  async del(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    
    return this.cache.delete(key);
  }
  
  /**
   * Delete values matching pattern
   */
  async delPattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      await this.del(key);
    }
    
    return keysToDelete.length;
  }
  
  /**
   * Clear all cache
   */
  async clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
    
    return {
      enabled: this.enabled,
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * Estimate memory usage
   */
  getMemoryUsage() {
    let bytes = 0;
    
    for (const [key, item] of this.cache) {
      // Rough estimation
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(item.value).length * 2;
      bytes += 24; // Object overhead
    }
    
    return {
      bytes,
      mb: (bytes / 1024 / 1024).toFixed(2)
    };
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache) {
      if (item.expiry && item.expiry < now) {
        this.cache.delete(key);
        const timer = this.timers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(key);
        }
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}

// Redis cache implementation (for production)
class RedisCacheService {
  constructor(redisClient) {
    this.client = redisClient;
    this.enabled = config.cache.enabled;
  }
  
  async get(key) {
    if (!this.enabled || !this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  async set(key, value, ttl = config.cache.ttl) {
    if (!this.enabled || !this.client) return;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
  
  async del(key) {
    if (!this.client) return;
    
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      return 0;
    }
  }
  
  async delPattern(pattern) {
    if (!this.client) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error('Redis delPattern error:', error);
      return 0;
    }
  }
  
  async clear() {
    if (!this.client) return;
    
    try {
      await this.client.flushdb();
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }
  
  async getStats() {
    if (!this.client) {
      return { enabled: false, connected: false };
    }
    
    try {
      const info = await this.client.info();
      return {
        enabled: this.enabled,
        connected: true,
        info
      };
    } catch (error) {
      return {
        enabled: this.enabled,
        connected: false,
        error: error.message
      };
    }
  }
}

// Export appropriate cache service based on configuration
let cacheService;

if (config.cache.redisUrl) {
  // Use Redis in production
  try {
    const redis = require('redis');
    const client = redis.createClient({
      url: config.cache.redisUrl
    });
    
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    client.connect().then(() => {
      console.log('Redis cache connected');
    });
    
    cacheService = new RedisCacheService(client);
  } catch (error) {
    console.warn('Redis not available, falling back to memory cache');
    cacheService = new CacheService();
  }
} else {
  // Use in-memory cache for development
  cacheService = new CacheService();
  console.log('Using in-memory cache');
}

module.exports = cacheService;