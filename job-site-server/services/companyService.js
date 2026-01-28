const db = require('../config/database');
const { DatabaseError } = require('../middleware/errorHandler');
const cache = require('./cacheService');

class CompanyService {
  /**
   * Get all companies with job counts
   */
  async getAllCompanies(options = {}) {
    const cacheKey = `companies:all:${JSON.stringify(options)}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.korean_name,
          c.logo_url,
          c.website_url,
          c.description,
          COUNT(DISTINCT j.id) as total_jobs,
          COUNT(DISTINCT CASE WHEN j.is_active = true THEN j.id END) as active_jobs,
          COUNT(DISTINCT j.location) as location_count,
          ARRAY_AGG(DISTINCT j.job_type) FILTER (WHERE j.job_type IS NOT NULL) as job_types,
          MAX(j.created_at) as latest_job_date
        FROM companies c
        LEFT JOIN job_postings j ON c.id = j.company_id
        ${options.activeOnly ? 'WHERE EXISTS (SELECT 1 FROM job_postings jp WHERE jp.company_id = c.id AND jp.is_active = true)' : ''}
        GROUP BY c.id, c.name, c.korean_name, c.logo_url, c.website_url, c.description
        ORDER BY active_jobs DESC, c.name ASC
      `;
      
      const result = await db.query(query);
      
      // Process results
      const companies = result.rows.map(company => ({
        ...company,
        job_types: company.job_types || [],
        latest_job_date: company.latest_job_date || null
      }));
      
      // Cache for 5 minutes
      await cache.set(cacheKey, companies, 300);
      
      return companies;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch companies: ${error.message}`);
    }
  }
  
  /**
   * Get company by ID with detailed information
   */
  async getCompanyById(id) {
    const cacheKey = `company:${id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const companyQuery = `
        SELECT 
          c.*,
          COUNT(DISTINCT j.id) as total_jobs,
          COUNT(DISTINCT CASE WHEN j.is_active = true THEN j.id END) as active_jobs,
          COUNT(DISTINCT j.department) as department_count,
          COUNT(DISTINCT j.location) as location_count,
          ARRAY_AGG(DISTINCT j.department) FILTER (WHERE j.department IS NOT NULL) as departments,
          ARRAY_AGG(DISTINCT j.location) FILTER (WHERE j.location IS NOT NULL) as locations,
          ARRAY_AGG(DISTINCT j.job_type) FILTER (WHERE j.job_type IS NOT NULL) as job_types
        FROM companies c
        LEFT JOIN job_postings j ON c.id = j.company_id
        WHERE c.id = $1
        GROUP BY c.id
      `;
      
      const result = await db.query(companyQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const company = result.rows[0];
      
      // Get recent jobs
      const recentJobsQuery = `
        SELECT 
          id,
          job_id,
          title,
          department,
          location,
          job_type,
          experience_level,
          posted_date,
          deadline,
          view_count
        FROM job_postings
        WHERE company_id = $1 AND is_active = true
        ORDER BY posted_date DESC
        LIMIT 10
      `;
      
      const recentJobs = await db.query(recentJobsQuery, [id]);
      
      const companyData = {
        ...company,
        departments: company.departments || [],
        locations: company.locations || [],
        job_types: company.job_types || [],
        recent_jobs: recentJobs.rows
      };
      
      // Cache for 5 minutes
      await cache.set(cacheKey, companyData, 300);
      
      return companyData;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch company: ${error.message}`);
    }
  }
  
  /**
   * Get company statistics
   */
  async getCompanyStats(id) {
    const cacheKey = `company:stats:${id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const statsQuery = `
        WITH job_stats AS (
          SELECT 
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_jobs_week,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_jobs_month,
            AVG(view_count) as avg_views,
            MAX(view_count) as max_views,
            COUNT(DISTINCT department) as departments,
            COUNT(DISTINCT location) as locations
          FROM job_postings
          WHERE company_id = $1
        ),
        popular_jobs AS (
          SELECT 
            title,
            view_count,
            id
          FROM job_postings
          WHERE company_id = $1 AND is_active = true
          ORDER BY view_count DESC
          LIMIT 5
        )
        SELECT 
          js.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', pj.id,
                'title', pj.title,
                'views', pj.view_count
              )
            ) FILTER (WHERE pj.id IS NOT NULL),
            '[]'::json
          ) as popular_jobs
        FROM job_stats js
        CROSS JOIN popular_jobs pj
        GROUP BY js.total_jobs, js.active_jobs, js.new_jobs_week, 
                 js.new_jobs_month, js.avg_views, js.max_views,
                 js.departments, js.locations
      `;
      
      const result = await db.query(statsQuery, [id]);
      const stats = result.rows[0] || {
        total_jobs: 0,
        active_jobs: 0,
        new_jobs_week: 0,
        new_jobs_month: 0,
        avg_views: 0,
        max_views: 0,
        departments: 0,
        locations: 0,
        popular_jobs: []
      };
      
      // Cache for 10 minutes
      await cache.set(cacheKey, stats, 600);
      
      return stats;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch company stats: ${error.message}`);
    }
  }
  
  /**
   * Search companies
   */
  async searchCompanies(searchTerm, limit = 10) {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.korean_name,
          c.logo_url,
          COUNT(DISTINCT CASE WHEN j.is_active = true THEN j.id END) as active_jobs
        FROM companies c
        LEFT JOIN job_postings j ON c.id = j.company_id
        WHERE 
          c.name ILIKE $1 OR 
          c.korean_name ILIKE $1 OR
          c.description ILIKE $1
        GROUP BY c.id
        ORDER BY 
          CASE 
            WHEN c.name ILIKE $2 THEN 1
            WHEN c.korean_name ILIKE $2 THEN 2
            ELSE 3
          END,
          active_jobs DESC
        LIMIT $3
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const exactPattern = searchTerm;
      
      const result = await db.query(query, [searchPattern, exactPattern, limit]);
      return result.rows;
    } catch (error) {
      throw new DatabaseError(`Failed to search companies: ${error.message}`);
    }
  }
}

module.exports = new CompanyService();