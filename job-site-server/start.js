#!/usr/bin/env node

/**
 * Job Site API Server for Blog Integration
 * Runs on port 5001
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8000', 'https://sgtcho.com'],
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Import routes - API 경로 직접 정의
const companiesRouter = require('./routes/companyRoutes');
const jobsRouter = require('./routes/jobRoutes');

// Error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/filters', (req, res) => {
  res.json({
    job_types: ['정규직', '계약직', '인턴', '파트타임'],
    experience_levels: ['신입', '경력', '경력무관'],
    education_levels: ['고졸', '학사', '석사', '박사', '무관'],
    locations: ['Seoul', 'Pangyo', 'Busan', 'Daegu', 'Incheon']
  });
});

app.use('/api/companies', companiesRouter);
app.use('/api/jobs', jobsRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection if enabled
    if (process.env.DB_ENABLED === 'true') {
      const Database = require('./config/database');
      const db = Database.getInstance();
      await db.testConnection();
      console.log('✅ Database connected successfully');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Job Site API Server running on http://localhost:${PORT}`);
      console.log('📝 API endpoints:');
      console.log(`   - GET /api/health`);
      console.log(`   - GET /api/companies`);
      console.log(`   - GET /api/jobs`);
      console.log(`   - GET /api/filters`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();