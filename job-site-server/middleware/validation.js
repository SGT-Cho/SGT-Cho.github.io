const { ValidationError } = require('./errorHandler');

/**
 * Validation rules
 */
const rules = {
  // Pagination
  page: (value) => {
    const page = parseInt(value);
    if (isNaN(page) || page < 1) {
      throw new ValidationError('Page must be a positive integer', 'page');
    }
    return page;
  },
  
  limit: (value, max = 100) => {
    const limit = parseInt(value);
    if (isNaN(limit) || limit < 1 || limit > max) {
      throw new ValidationError(`Limit must be between 1 and ${max}`, 'limit');
    }
    return limit;
  },
  
  // ID validation
  id: (value) => {
    const id = parseInt(value);
    if (isNaN(id) || id < 1) {
      throw new ValidationError('Invalid ID format', 'id');
    }
    return id;
  },
  
  // String validation
  string: (value, field, options = {}) => {
    if (!value && options.required) {
      throw new ValidationError(`${field} is required`, field);
    }
    
    if (value) {
      value = value.trim();
      
      if (options.minLength && value.length < options.minLength) {
        throw new ValidationError(
          `${field} must be at least ${options.minLength} characters`, 
          field
        );
      }
      
      if (options.maxLength && value.length > options.maxLength) {
        throw new ValidationError(
          `${field} must be at most ${options.maxLength} characters`, 
          field
        );
      }
      
      if (options.pattern && !options.pattern.test(value)) {
        throw new ValidationError(`${field} has invalid format`, field);
      }
    }
    
    return value;
  },
  
  // Enum validation
  enum: (value, field, allowedValues) => {
    if (value && !allowedValues.includes(value)) {
      throw new ValidationError(
        `${field} must be one of: ${allowedValues.join(', ')}`, 
        field
      );
    }
    return value;
  },
  
  // Array validation
  array: (value, field, options = {}) => {
    if (!value) return [];
    
    // Handle comma-separated strings
    if (typeof value === 'string') {
      value = value.split(',').map(v => v.trim()).filter(Boolean);
    }
    
    if (!Array.isArray(value)) {
      throw new ValidationError(`${field} must be an array`, field);
    }
    
    if (options.maxLength && value.length > options.maxLength) {
      throw new ValidationError(
        `${field} cannot have more than ${options.maxLength} items`, 
        field
      );
    }
    
    return value;
  },
  
  // Date validation
  date: (value, field) => {
    if (!value) return null;
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`${field} is not a valid date`, field);
    }
    
    return date;
  },
  
  // Boolean validation
  boolean: (value) => {
    if (value === 'true' || value === '1' || value === true) return true;
    if (value === 'false' || value === '0' || value === false) return false;
    return null;
  }
};

/**
 * Sanitization functions
 */
const sanitize = {
  // Escape HTML special characters
  html: (value) => {
    if (!value) return value;
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },
  
  // SQL safe string (basic)
  sql: (value) => {
    if (!value) return value;
    return value.replace(/['";\\]/g, '');
  },
  
  // Remove non-alphanumeric except common punctuation
  alphanumeric: (value) => {
    if (!value) return value;
    return value.replace(/[^a-zA-Z0-9가-힣\s\-_,.]/g, '');
  },
  
  // Trim whitespace
  trim: (value) => {
    if (!value) return value;
    return value.trim();
  }
};

/**
 * Validation middleware for job queries
 */
function validateJobQuery(req, res, next) {
  try {
    // Pagination
    req.query.page = rules.page(req.query.page || 1);
    req.query.limit = rules.limit(req.query.limit || 20, 100);
    
    // Filters
    req.query.company = rules.string(req.query.company, 'company', { maxLength: 100 });
    req.query.job_type = rules.enum(req.query.job_type, 'job_type', 
      ['정규직', '계약직', '인턴', '파트타임', '프리랜서']
    );
    req.query.experience_level = rules.enum(req.query.experience_level, 'experience_level',
      ['신입', '경력', '신입/경력', '인턴', '전체']
    );
    req.query.education_level = rules.enum(req.query.education_level, 'education_level',
      ['고졸', '초대졸', '대졸', '석사', '박사', '무관']
    );
    req.query.location = rules.string(req.query.location, 'location', { maxLength: 100 });
    req.query.search = rules.string(req.query.search, 'search', { maxLength: 200 });
    
    // Sanitize string inputs
    if (req.query.company) req.query.company = sanitize.alphanumeric(req.query.company);
    if (req.query.location) req.query.location = sanitize.alphanumeric(req.query.location);
    if (req.query.search) req.query.search = sanitize.alphanumeric(req.query.search);
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validation middleware for company queries
 */
function validateCompanyQuery(req, res, next) {
  try {
    req.query.active_only = rules.boolean(req.query.active_only);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validation middleware for ID parameters
 */
function validateIdParam(req, res, next) {
  try {
    req.params.id = rules.id(req.params.id);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validation middleware for job view tracking
 */
function validateJobView(req, res, next) {
  try {
    req.params.id = rules.id(req.params.id);
    
    // Optional: validate user agent, referrer, etc.
    const userAgent = req.get('user-agent');
    if (!userAgent || userAgent.length < 10) {
      throw new ValidationError('Invalid request', 'user-agent');
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  rules,
  sanitize,
  validateJobQuery,
  validateCompanyQuery,
  validateIdParam,
  validateJobView
};