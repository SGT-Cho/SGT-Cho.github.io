const express = require('express');
const router = express.Router();
const jobService = require('../services/jobService');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validateJobQuery, validateIdParam, validateJobView } = require('../middleware/validation');
const { rateLimiters } = require('../middleware/security');
const fs = require('fs');
const path = require('path');

/**
 * @route   GET /api/jobs
 * @desc    Get jobs with filters and pagination
 * @access  Public
 */
router.get('/',
  rateLimiters.api,
  validateJobQuery,
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    
    const result = await jobService.getJobs(filters, { page, limit });
    
    // Set response headers for pagination
    res.set({
      'X-Total-Count': result.pagination.total,
      'X-Page': result.pagination.page,
      'X-Per-Page': result.pagination.limit,
      'X-Total-Pages': result.pagination.pages
    });
    
    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * @route   GET /api/jobs/search
 * @desc    Full-text search jobs
 * @access  Public
 */
router.get('/search',
  rateLimiters.search,
  asyncHandler(async (req, res) => {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const jobs = await jobService.searchJobs(q, limit);
    
    res.json({
      success: true,
      query: q,
      count: jobs.length,
      data: jobs
    });
  })
);

/**
 * @route   GET /api/jobs/stats
 * @desc    Get job statistics
 * @access  Public
 */
router.get('/stats',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const stats = await jobService.getJobStats();
    
    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job by ID
 * @access  Public
 */
router.get('/:id',
  rateLimiters.api,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const job = await jobService.getJobById(req.params.id);
    
    res.json({
      success: true,
      data: job
    });
  })
);

/**
 * @route   GET /api/jobs/:id/pdf
 * @desc    Get job as PDF
 * @access  Public
 */
router.get('/:id/pdf',
  rateLimiters.api,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const job = await jobService.getJobById(req.params.id);
    
    if (!job.pdf_path) {
      return res.status(404).json({ 
        success: false,
        error: 'PDF not available for this job' 
      });
    }
    
    // PDF 파일 경로 구성
    const crawlerDir = '/crawler';
    const pdfPath = path.join(crawlerDir, job.company_name.toLowerCase() + '_jobs', 'pdfs', job.pdf_path);
    
    // 파일 존재 확인
    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF file not found: ${pdfPath}`);
      return res.status(404).json({ 
        success: false,
        error: 'PDF file not found' 
      });
    }
    
    // PDF 파일 스트리밍
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${job.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.pdf"`);
    
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
  })
);

/**
 * @route   POST /api/jobs/:id/view
 * @desc    Track job view
 * @access  Public
 */
router.post('/:id/view',
  rateLimiters.jobView,
  validateJobView,
  asyncHandler(async (req, res) => {
    const metadata = {
      user_agent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      referrer: req.get('referrer')
    };
    
    await jobService.trackJobView(req.params.id, metadata);
    
    res.json({
      success: true,
      message: 'View tracked successfully'
    });
  })
);

/**
 * @route   GET /api/jobs/filters/options
 * @desc    Get available filter options
 * @access  Public
 */
router.get('/filters/options',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    // This could be cached heavily as it doesn't change often
    const options = {
      job_types: [
        { value: '정규직', label: '정규직' },
        { value: '계약직', label: '계약직' },
        { value: '인턴', label: '인턴' },
        { value: '파트타임', label: '파트타임' },
        { value: '프리랜서', label: '프리랜서' }
      ],
      experience_levels: [
        { value: '신입', label: '신입' },
        { value: '경력', label: '경력' },
        { value: '신입/경력', label: '신입/경력' },
        { value: '인턴', label: '인턴' },
        { value: '전체', label: '전체' }
      ],
      education_levels: [
        { value: '고졸', label: '고졸' },
        { value: '초대졸', label: '초대졸' },
        { value: '대졸', label: '대졸' },
        { value: '석사', label: '석사' },
        { value: '박사', label: '박사' },
        { value: '무관', label: '무관' }
      ],
      sort_options: [
        { value: 'date', label: '최신순' },
        { value: 'views', label: '조회순' },
        { value: 'deadline', label: '마감일순' },
        { value: 'company', label: '회사명순' }
      ]
    };
    
    res.json({
      success: true,
      data: options
    });
  })
);

module.exports = router;