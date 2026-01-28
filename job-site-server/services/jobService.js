const db = require('../config/database');
const { DatabaseError, NotFoundError } = require('../middleware/errorHandler');
const cache = require('./cacheService');

class JobService {
  /**
   * Get jobs with filters and pagination
   */
  async getJobs(filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    
    // Build cache key
    const cacheKey = `jobs:${JSON.stringify(filters)}:${page}:${limit}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Build query
      let query = `
        SELECT 
          j.id,
          j.job_id,
          j.title,
          j.department,
          j.team,
          j.location,
          j.job_type,
          j.experience_level,
          j.experience_years_min,
          j.experience_years_max,
          j.education_level,
          j.salary_info,
          j.posted_date,
          j.deadline,
          j.is_always_recruiting,
          j.is_remote,
          j.url,
          j.view_count,
          j.created_at,
          c.id as company_id,
          c.name as company_name,
          c.korean_name as company_korean_name,
          c.logo_url as company_logo
        FROM job_postings j
        JOIN companies c ON j.company_id = c.id
        WHERE j.is_active = true
      `;
      
      const conditions = [];
      const values = [];
      let valueIndex = 1;
      
      // Add filters
      if (filters.company) {
        conditions.push(`(c.name ILIKE $${valueIndex} OR c.korean_name ILIKE $${valueIndex})`);
        values.push(`%${filters.company}%`);
        valueIndex++;
      }
      
      if (filters.job_type) {
        conditions.push(`j.job_type = $${valueIndex}`);
        values.push(filters.job_type);
        valueIndex++;
      }
      
      if (filters.experience_level) {
        conditions.push(`j.experience_level = $${valueIndex}`);
        values.push(filters.experience_level);
        valueIndex++;
      }
      
      if (filters.education_level) {
        conditions.push(`j.education_level = $${valueIndex}`);
        values.push(filters.education_level);
        valueIndex++;
      }
      
      if (filters.location) {
        conditions.push(`j.location ILIKE $${valueIndex}`);
        values.push(`%${filters.location}%`);
        valueIndex++;
      }
      
      if (filters.is_remote !== undefined) {
        conditions.push(`j.is_remote = $${valueIndex}`);
        values.push(filters.is_remote);
        valueIndex++;
      }
      
      if (filters.search) {
        conditions.push(`(
          j.title ILIKE $${valueIndex} OR 
          j.department ILIKE $${valueIndex} OR 
          j.content ILIKE $${valueIndex} OR
          j.requirements ILIKE $${valueIndex} OR
          j.responsibilities ILIKE $${valueIndex}
        )`);
        values.push(`%${filters.search}%`);
        valueIndex++;
      }
      
      if (filters.min_salary) {
        conditions.push(`j.salary_info ILIKE $${valueIndex}`);
        values.push(`%${filters.min_salary}%`);
        valueIndex++;
      }
      
      if (filters.posted_after) {
        conditions.push(`j.posted_date >= $${valueIndex}`);
        values.push(filters.posted_after);
        valueIndex++;
      }
      
      if (filters.deadline_before) {
        conditions.push(`(j.deadline <= $${valueIndex} OR j.deadline IS NULL)`);
        values.push(filters.deadline_before);
        valueIndex++;
      }
      
      // Add conditions to query
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }
      
      // Add sorting
      const sortOptions = {
        'date': 'j.posted_date DESC NULLS LAST, j.created_at DESC',
        'views': 'j.view_count DESC',
        'deadline': 'j.deadline ASC NULLS LAST',
        'company': 'c.name ASC, j.posted_date DESC'
      };
      
      const sortBy = sortOptions[filters.sort] || sortOptions.date;
      query += ` ORDER BY ${sortBy}`;
      
      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]*FROM/,
        'SELECT COUNT(*) as total FROM'
      ).replace(/ORDER BY[\s\S]*$/, '');
      
      const countResult = await db.query(countQuery, values);
      const totalCount = parseInt(countResult.rows[0].total);
      
      // Add pagination
      query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      values.push(limit, offset);
      
      // Execute main query
      const result = await db.query(query, values);
      
      // Format response
      const response = {
        jobs: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        filters: filters
      };
      
      // Cache for 2 minutes
      await cache.set(cacheKey, response, 120);
      
      return response;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch jobs: ${error.message}`);
    }
  }
  
  /**
   * Get job by ID
   */
  async getJobById(id) {
    const cacheKey = `job:${id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const query = `
        SELECT 
          j.*,
          c.id as company_id,
          c.name as company_name,
          c.korean_name as company_korean_name,
          c.logo_url as company_logo,
          c.website_url as company_website,
          COALESCE(j.required_skills, '{}') as required_skills,
          COALESCE(j.preferred_skills, '{}') as preferred_skills,
          COALESCE(j.benefits, '{}') as benefits,
          COALESCE(j.hiring_process, '{}') as hiring_process
        FROM job_postings j
        JOIN companies c ON j.company_id = c.id
        WHERE j.id = $1 AND j.is_active = true
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Job');
      }
      
      const job = result.rows[0];
      
      // Get similar jobs
      const similarJobsQuery = `
        SELECT 
          j.id,
          j.title,
          j.department,
          j.location,
          j.job_type,
          j.experience_level,
          c.name as company_name,
          c.logo_url as company_logo
        FROM job_postings j
        JOIN companies c ON j.company_id = c.id
        WHERE 
          j.is_active = true AND
          j.id != $1 AND
          (j.company_id = $2 OR j.department = $3 OR j.job_type = $4)
        ORDER BY 
          CASE 
            WHEN j.company_id = $2 THEN 1
            WHEN j.department = $3 THEN 2
            ELSE 3
          END,
          j.posted_date DESC
        LIMIT 6
      `;
      
      const similarJobs = await db.query(similarJobsQuery, [
        id, 
        job.company_id, 
        job.department,
        job.job_type
      ]);
      
      job.similar_jobs = similarJobs.rows;
      
      // Cache for 5 minutes
      await cache.set(cacheKey, job, 300);
      
      return job;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch job: ${error.message}`);
    }
  }
  
  /**
   * Track job view
   */
  async trackJobView(id, metadata = {}) {
    try {
      // Use transaction for atomic update
      await db.transaction(async (client) => {
        // Update view count
        const updateQuery = `
          UPDATE job_postings 
          SET view_count = view_count + 1 
          WHERE id = $1 AND is_active = true
          RETURNING view_count
        `;
        
        const result = await client.query(updateQuery, [id]);
        
        if (result.rows.length === 0) {
          throw new NotFoundError('Job');
        }
        
        // Log view event (optional, for analytics)
        if (metadata.user_agent || metadata.ip) {
          const logQuery = `
            INSERT INTO job_view_logs (job_id, user_agent, ip_address, referrer, viewed_at)
            VALUES ($1, $2, $3, $4, NOW())
          `;
          
          await client.query(logQuery, [
            id,
            metadata.user_agent || null,
            metadata.ip || null,
            metadata.referrer || null
          ]).catch(err => {
            // Don't fail if logging fails
            console.error('Failed to log job view:', err);
          });
        }
        
        return result.rows[0].view_count;
      });
      
      // Invalidate cache
      await cache.del(`job:${id}`);
      
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to track job view: ${error.message}`);
    }
  }
  
  /**
   * Get job statistics
   */
  async getJobStats() {
    const cacheKey = 'jobs:stats';
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const query = `
        WITH job_stats AS (
          SELECT 
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_week,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_month,
            COUNT(DISTINCT company_id) as companies_hiring,
            COUNT(DISTINCT location) as unique_locations,
            COUNT(DISTINCT department) as unique_departments
          FROM job_postings
        ),
        popular_companies AS (
          SELECT 
            c.name,
            c.logo_url,
            COUNT(j.id) as job_count
          FROM companies c
          JOIN job_postings j ON c.id = j.company_id
          WHERE j.is_active = true
          GROUP BY c.id, c.name, c.logo_url
          ORDER BY job_count DESC
          LIMIT 10
        ),
        job_types_dist AS (
          SELECT 
            job_type,
            COUNT(*) as count
          FROM job_postings
          WHERE is_active = true AND job_type IS NOT NULL
          GROUP BY job_type
        ),
        experience_dist AS (
          SELECT 
            experience_level,
            COUNT(*) as count
          FROM job_postings
          WHERE is_active = true AND experience_level IS NOT NULL
          GROUP BY experience_level
        )
        SELECT 
          js.*,
          COALESCE(
            json_agg(DISTINCT 
              jsonb_build_object(
                'name', pc.name,
                'logo_url', pc.logo_url,
                'job_count', pc.job_count
              )
            ) FILTER (WHERE pc.name IS NOT NULL),
            '[]'::json
          ) as top_companies,
          COALESCE(
            json_object_agg(jt.job_type, jt.count) FILTER (WHERE jt.job_type IS NOT NULL),
            '{}'::json
          ) as job_type_distribution,
          COALESCE(
            json_object_agg(ed.experience_level, ed.count) FILTER (WHERE ed.experience_level IS NOT NULL),
            '{}'::json
          ) as experience_distribution
        FROM job_stats js
        CROSS JOIN popular_companies pc
        CROSS JOIN job_types_dist jt
        CROSS JOIN experience_dist ed
        GROUP BY js.total_jobs, js.active_jobs, js.new_today, 
                 js.new_week, js.new_month, js.companies_hiring,
                 js.unique_locations, js.unique_departments
      `;
      
      const result = await db.query(query);
      const stats = result.rows[0];
      
      // Cache for 30 minutes
      await cache.set(cacheKey, stats, 1800);
      
      return stats;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch job stats: ${error.message}`);
    }
  }
  
  /**
   * Search jobs (full-text search)
   */
  async searchJobs(searchTerm, limit = 20) {
    try {
      const query = `
        SELECT 
          j.id,
          j.title,
          j.department,
          j.location,
          j.job_type,
          j.experience_level,
          j.posted_date,
          c.name as company_name,
          c.logo_url as company_logo,
          ts_rank(
            to_tsvector('korean', j.title || ' ' || COALESCE(j.department, '') || ' ' || COALESCE(j.content, '')),
            plainto_tsquery('korean', $1)
          ) as relevance
        FROM job_postings j
        JOIN companies c ON j.company_id = c.id
        WHERE 
          j.is_active = true AND
          to_tsvector('korean', j.title || ' ' || COALESCE(j.department, '') || ' ' || COALESCE(j.content, ''))
          @@ plainto_tsquery('korean', $1)
        ORDER BY relevance DESC, j.posted_date DESC
        LIMIT $2
      `;
      
      const result = await db.query(query, [searchTerm, limit]);
      return result.rows;
    } catch (error) {
      // Fallback to ILIKE if full-text search fails
      const fallbackQuery = `
        SELECT 
          j.id,
          j.title,
          j.department,
          j.location,
          j.job_type,
          j.experience_level,
          j.posted_date,
          c.name as company_name,
          c.logo_url as company_logo
        FROM job_postings j
        JOIN companies c ON j.company_id = c.id
        WHERE 
          j.is_active = true AND
          (j.title ILIKE $1 OR j.department ILIKE $1 OR j.content ILIKE $1)
        ORDER BY j.posted_date DESC
        LIMIT $2
      `;
      
      const result = await db.query(fallbackQuery, [`%${searchTerm}%`, limit]);
      return result.rows;
    }
  }
}

module.exports = new JobService();