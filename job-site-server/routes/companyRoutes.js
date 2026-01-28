const express = require('express');
const router = express.Router();
const companyService = require('../services/companyService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateCompanyQuery, validateIdParam } = require('../middleware/validation');
const { rateLimiters } = require('../middleware/security');

/**
 * @route   GET /api/companies
 * @desc    Get all companies with job counts
 * @access  Public
 */
router.get('/', 
  rateLimiters.api,
  validateCompanyQuery,
  asyncHandler(async (req, res) => {
    const { active_only } = req.query;
    
    const companies = await companyService.getAllCompanies({
      activeOnly: active_only
    });
    
    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
  })
);

/**
 * @route   GET /api/companies/search
 * @desc    Search companies
 * @access  Public
 */
router.get('/search',
  rateLimiters.search,
  asyncHandler(async (req, res) => {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const companies = await companyService.searchCompanies(q, limit);
    
    res.json({
      success: true,
      query: q,
      count: companies.length,
      data: companies
    });
  })
);

/**
 * @route   GET /api/companies/:id
 * @desc    Get company by ID
 * @access  Public
 */
router.get('/:id',
  rateLimiters.api,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const company = await companyService.getCompanyById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }
    
    res.json({
      success: true,
      data: company
    });
  })
);

/**
 * @route   GET /api/companies/:id/stats
 * @desc    Get company statistics
 * @access  Public
 */
router.get('/:id/stats',
  rateLimiters.api,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const stats = await companyService.getCompanyStats(req.params.id);
    
    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route   GET /api/companies/:id/jobs
 * @desc    Get jobs for a specific company
 * @access  Public
 */
router.get('/:id/jobs',
  rateLimiters.api,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const jobService = require('../services/jobService');
    const { page = 1, limit = 20, ...filters } = req.query;
    
    // Add company filter
    filters.company_id = req.params.id;
    
    const result = await jobService.getJobs(filters, { page, limit });
    
    res.json({
      success: true,
      ...result
    });
  })
);

module.exports = router;