const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('../config/environment');

/**
 * Rate limiting configurations
 */
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.security.rateLimitWindow,
    max: options.max || config.security.rateLimitMax,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later.',
          retryAfter: Math.round(options.windowMs / 1000) || 900
        }
      });
    }
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  }),
  
  // Stricter limit for job view tracking
  jobView: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many view requests'
  }),
  
  // Search endpoint rate limiter
  search: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests'
  })
};

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: !config.isDevelopment,
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.security.corsOrigin === '*') {
      return callback(null, true);
    }
    
    if (config.security.corsOrigin.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400 // 24 hours
};

/**
 * SQL injection prevention middleware
 * This is a basic check - we should rely on parameterized queries
 */
const sqlInjectionCheck = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b)/i,
    /(--|\/\*|\*\/|xp_|sp_)/i,
    /(\bor\b\s*\d+\s*=\s*\d+)/i,
    /(\band\b\s*\d+\s*=\s*\d+)/i
  ];
  
  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };
  
  // Check query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (checkValue(value)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid characters in request'
        }
      });
    }
  }
  
  // Check body if exists
  if (req.body) {
    const checkObject = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (checkObject(value)) return true;
        } else if (checkValue(value)) {
          return true;
        }
      }
      return false;
    };
    
    if (checkObject(req.body)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid characters in request'
        }
      });
    }
  }
  
  next();
};

/**
 * XSS prevention middleware
 */
const xssProtection = (req, res, next) => {
  // Set additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * Request logging for security monitoring
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      duration
    };
    
    // Log security-relevant events
    if (res.statusCode >= 400) {
      console.log('Security Event:', JSON.stringify(logData));
    }
  });
  
  next();
};

module.exports = {
  rateLimiters,
  securityHeaders,
  corsOptions,
  sqlInjectionCheck,
  xssProtection,
  securityLogger
};