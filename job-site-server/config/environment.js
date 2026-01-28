require('dotenv').config();

/**
 * Environment configuration and validation
 */
const config = {
  // Server config
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Database config
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'job_crawler',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },
  
  // API config
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100,
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
  },
  
  // Security config
  security: {
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  },
  
  // Cache config
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    redisUrl: process.env.REDIS_URL,
  },
  
  // Logging config
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  }
};

/**
 * Validate required environment variables
 */
function validateConfig() {
  const required = ['DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate numeric values
  if (config.api.maxPageSize < 1 || config.api.maxPageSize > 1000) {
    throw new Error('MAX_PAGE_SIZE must be between 1 and 1000');
  }
  
  if (config.security.rateLimitMax < 1) {
    throw new Error('RATE_LIMIT_MAX must be greater than 0');
  }
}

// Validate on startup
if (config.isProduction) {
  validateConfig();
}

module.exports = config;