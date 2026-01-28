const testUtils = require('./setup');

describe('Job Site API Tests', () => {
  let seedData;
  
  beforeAll(async () => {
    await testUtils.setup();
    seedData = await testUtils.seedData();
  });
  
  afterAll(async () => {
    await testUtils.teardown();
  });
  
  describe('Health Check', () => {
    test('GET /api/health should return healthy status', async () => {
      const res = await testUtils.request()
        .get('/api/health')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('healthy');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.uptime).toBeGreaterThan(0);
    });
  });
  
  describe('Companies API', () => {
    test('GET /api/companies should return all companies', async () => {
      const res = await testUtils.request()
        .get('/api/companies')
        .expect(200);
      
      testUtils.expectSuccess(res);
      expect(res.body.count).toBe(3);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('active_jobs');
    });
    
    test('GET /api/companies/:id should return company details', async () => {
      const companyId = seedData.companyIds[0];
      const res = await testUtils.request()
        .get(`/api/companies/${companyId}`)
        .expect(200);
      
      testUtils.expectSuccess(res);
      expect(res.body.data.name).toBe('Test Company 1');
      expect(res.body.data.total_jobs).toBe(2);
      expect(res.body.data.recent_jobs).toBeDefined();
    });
    
    test('GET /api/companies/:id with invalid ID should return 400', async () => {
      const res = await testUtils.request()
        .get('/api/companies/invalid')
        .expect(400);
      
      testUtils.expectError(res, 400, 'VALIDATION_ERROR');
    });
    
    test('GET /api/companies/search should search companies', async () => {
      const res = await testUtils.request()
        .get('/api/companies/search?q=Test')
        .expect(200);
      
      testUtils.expectSuccess(res);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.query).toBe('Test');
    });
  });
  
  describe('Jobs API', () => {
    test('GET /api/jobs should return paginated jobs', async () => {
      const res = await testUtils.request()
        .get('/api/jobs')
        .expect(200);
      
      testUtils.expectSuccess(res);
      expect(res.body.jobs).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
      expect(res.headers['x-total-count']).toBe('3');
    });
    
    test('GET /api/jobs with filters should work', async () => {
      const res = await testUtils.request()
        .get('/api/jobs?job_type=정규직&location=Seoul')
        .expect(200);
      
      testUtils.expectSuccess(res);
      expect(res.body.jobs).toHaveLength(2);
      res.body.jobs.forEach(job => {
        expect(job.job_type).toBe('정규직');
        expect(job.location).toBe('Seoul');
      });
    });
    
    test('GET /api/jobs/:id should return job details', async () => {
      const jobsRes = await testUtils.request().get('/api/jobs');
      const jobId = jobsRes.body.jobs[0].id;
      
      const res = await testUtils.request()
        .get(`/api/jobs/${jobId}`)
        .expect(200);
      
      testUtils.expectSuccess(res);
      expect(res.body.data.title).toBeDefined();
      expect(res.body.data.company_name).toBeDefined();
      expect(res.body.data.similar_jobs).toBeDefined();
    });
    
    test('POST /api/jobs/:id/view should track view', async () => {
      const jobsRes = await testUtils.request().get('/api/jobs');
      const jobId = jobsRes.body.jobs[0].id;
      
      const res = await testUtils.request()
        .post(`/api/jobs/${jobId}/view`)
        .set('User-Agent', 'Test Browser')
        .expect(200);
      
      testUtils.expectSuccess(res);
      
      // Verify view count increased
      const jobRes = await testUtils.request().get(`/api/jobs/${jobId}`);
      expect(jobRes.body.data.view_count).toBeGreaterThan(0);
    });
  });
  
  describe('Validation Tests', () => {
    test('Invalid pagination should return 400', async () => {
      const res = await testUtils.request()
        .get('/api/jobs?page=-1')
        .expect(400);
      
      testUtils.expectError(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.field).toBe('page');
    });
    
    test('Invalid limit should return 400', async () => {
      const res = await testUtils.request()
        .get('/api/jobs?limit=1000')
        .expect(400);
      
      testUtils.expectError(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.field).toBe('limit');
    });
    
    test('Invalid job type filter should return 400', async () => {
      const res = await testUtils.request()
        .get('/api/jobs?job_type=invalid')
        .expect(400);
      
      testUtils.expectError(res, 400, 'VALIDATION_ERROR');
    });
  });
  
  describe('Security Tests', () => {
    test('SQL injection attempt should be blocked', async () => {
      const res = await testUtils.request()
        .get("/api/jobs?search='; DROP TABLE users--")
        .expect(400);
      
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });
    
    test('Rate limiting should work', async () => {
      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          testUtils.request()
            .post('/api/jobs/1/view')
            .set('User-Agent', 'Test')
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
    
    test('CORS headers should be set', async () => {
      const res = await testUtils.request()
        .get('/api/health')
        .expect(200);
      
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
    
    test('Security headers should be set', async () => {
      const res = await testUtils.request()
        .get('/api/health')
        .expect(200);
      
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
  
  describe('Error Handling', () => {
    test('404 for unknown routes', async () => {
      const res = await testUtils.request()
        .get('/api/unknown')
        .expect(404);
      
      testUtils.expectError(res, 404, 'NOT_FOUND');
    });
    
    test('Invalid JSON should return 400', async () => {
      const res = await testUtils.request()
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      expect(res.body.error).toBeDefined();
    });
  });
  
  describe('Cache Tests', () => {
    test('Repeated requests should use cache', async () => {
      // First request
      const start1 = Date.now();
      const res1 = await testUtils.request()
        .get('/api/companies')
        .expect(200);
      const time1 = Date.now() - start1;
      
      // Second request (should be cached)
      const start2 = Date.now();
      const res2 = await testUtils.request()
        .get('/api/companies')
        .expect(200);
      const time2 = Date.now() - start2;
      
      // Cached request should be faster
      expect(time2).toBeLessThan(time1);
      expect(res1.body).toEqual(res2.body);
    });
    
    test('Cache stats should work in development', async () => {
      if (process.env.NODE_ENV === 'development') {
        const res = await testUtils.request()
          .get('/api/cache/stats')
          .expect(200);
        
        testUtils.expectSuccess(res);
        expect(res.body.data.hits).toBeDefined();
        expect(res.body.data.misses).toBeDefined();
      }
    });
  });
});