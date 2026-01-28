const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// Config
const config = require('./config/environment');
const db = require('./config/database');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { 
  securityHeaders, 
  corsOptions, 
  sqlInjectionCheck, 
  xssProtection,
  securityLogger 
} = require('./middleware/security');

// Routes
const companyRoutes = require('./routes/companyRoutes');
const jobRoutes = require('./routes/jobRoutes');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(xssProtection);

// CORS
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Security logging
app.use(securityLogger);

// SQL injection check
app.use(sqlInjectionCheck);

// API Routes
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Cache stats endpoint (development only)
if (config.isDevelopment) {
  app.get('/api/cache/stats', (req, res) => {
    const cache = require('./services/cacheService');
    res.json({
      success: true,
      data: cache.getStats()
    });
  });
}

// Serve static files in production
if (config.isProduction) {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    await db.testConnection();
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════╗
║         Job Site API Server           ║
║         Version 2.0 - Refactored      ║
╚═══════════════════════════════════════╝

🚀 Server is running on port ${config.port}
🌍 Environment: ${config.nodeEnv}
📊 API Base URL: ${config.api.baseUrl}
🗄️  Database: Connected
💾 Cache: ${config.cache.enabled ? 'Enabled' : 'Disabled'}
🔒 CORS: ${Array.isArray(config.security.corsOrigin) ? config.security.corsOrigin.join(', ') : config.security.corsOrigin}

Available endpoints:
- GET  /api/health          - Health check
- GET  /api/companies       - List all companies
- GET  /api/companies/:id   - Get company details
- GET  /api/jobs            - List jobs with filters
- GET  /api/jobs/:id        - Get job details
- POST /api/jobs/:id/view   - Track job view
      `);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 SIGTERM received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('📡 HTTP server closed');
        
        // Close database connection
        await db.close();
        console.log('🗄️  Database connection closed');
        
        // Clear cache
        const cache = require('./services/cacheService');
        await cache.clear();
        console.log('💾 Cache cleared');
        
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Export app for testing
module.exports = app;

// Start server if not in test mode
if (require.main === module) {
  startServer();
}