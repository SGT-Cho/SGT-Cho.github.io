// Test setup and utilities
const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const cache = require('../services/cacheService');

// Load test environment
require('dotenv').config({ path: '.env.test' });

// Test utilities
const testUtils = {
  // Create test request
  request: () => request(app),
  
  // Setup before tests
  async setup() {
    // Clear cache
    await cache.clear();
    
    // Reset database (be careful in production!)
    if (process.env.NODE_ENV === 'test') {
      try {
        await db.query('TRUNCATE TABLE job_postings, companies, crawl_logs CASCADE');
        console.log('Test database cleared');
      } catch (error) {
        console.error('Failed to clear test database:', error);
      }
    }
  },
  
  // Cleanup after tests
  async teardown() {
    await cache.clear();
    await db.close();
  },
  
  // Seed test data
  async seedData() {
    // Insert test companies
    const companies = [
      { name: 'Test Company 1', korean_name: '테스트회사1', website_url: 'https://test1.com' },
      { name: 'Test Company 2', korean_name: '테스트회사2', website_url: 'https://test2.com' },
      { name: 'Test Company 3', korean_name: '테스트회사3', website_url: 'https://test3.com' }
    ];
    
    const companyIds = [];
    for (const company of companies) {
      const result = await db.query(
        'INSERT INTO companies (name, korean_name, website_url) VALUES ($1, $2, $3) RETURNING id',
        [company.name, company.korean_name, company.website_url]
      );
      companyIds.push(result.rows[0].id);
    }
    
    // Insert test jobs
    const jobs = [
      {
        company_id: companyIds[0],
        job_id: 'TEST001',
        title: 'Backend Developer',
        department: 'Engineering',
        location: 'Seoul',
        job_type: '정규직',
        experience_level: '경력',
        url: 'https://test1.com/jobs/1',
        is_active: true
      },
      {
        company_id: companyIds[0],
        job_id: 'TEST002',
        title: 'Frontend Developer',
        department: 'Engineering',
        location: 'Seoul',
        job_type: '정규직',
        experience_level: '신입',
        url: 'https://test1.com/jobs/2',
        is_active: true
      },
      {
        company_id: companyIds[1],
        job_id: 'TEST003',
        title: 'Product Manager',
        department: 'Product',
        location: 'Busan',
        job_type: '계약직',
        experience_level: '경력',
        url: 'https://test2.com/jobs/1',
        is_active: true
      }
    ];
    
    for (const job of jobs) {
      await db.query(
        `INSERT INTO job_postings (
          company_id, job_id, title, department, location,
          job_type, experience_level, url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        Object.values(job)
      );
    }
    
    return { companyIds, jobCount: jobs.length };
  },
  
  // Helper to check response
  expectSuccess(res) {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  },
  
  // Helper to check error
  expectError(res, statusCode, errorCode) {
    expect(res.status).toBe(statusCode);
    expect(res.body.error).toBeDefined();
    if (errorCode) {
      expect(res.body.error.code).toBe(errorCode);
    }
  }
};

module.exports = testUtils;