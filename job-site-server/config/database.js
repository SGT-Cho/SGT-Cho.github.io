const { Pool } = require('pg');
require('dotenv').config();

/**
 * Database configuration with connection pooling
 */
class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'job_crawler',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Error handling
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('Database connected successfully:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /**
   * Execute query with automatic retry
   */
  async query(text, params, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.pool.query(text, params);
      } catch (error) {
        console.error(`Query attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close pool
   */
  async close() {
    await this.pool.end();
  }
}

// Export singleton instance
module.exports = new Database();