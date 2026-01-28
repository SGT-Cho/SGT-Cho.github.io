-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    korean_name VARCHAR(255),
    logo_url TEXT,
    website_url TEXT,
    careers_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job postings table
CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    job_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    department VARCHAR(255),
    team VARCHAR(255),
    location VARCHAR(255),
    job_type VARCHAR(100),
    experience_level VARCHAR(100),
    experience_years_min INTEGER,
    experience_years_max INTEGER,
    education_level VARCHAR(100),
    salary_info JSONB,
    description TEXT,
    requirements TEXT[],
    preferred_qualifications TEXT[],
    benefits TEXT[],
    hiring_process TEXT[],
    posted_date DATE,
    deadline DATE,
    is_always_recruiting BOOLEAN DEFAULT FALSE,
    is_remote BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    url TEXT UNIQUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, job_id)
);

-- Crawl logs table for tracking
CREATE TABLE IF NOT EXISTS crawl_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    status VARCHAR(50),
    jobs_found INTEGER DEFAULT 0,
    jobs_created INTEGER DEFAULT 0,
    jobs_updated INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_job_postings_company_id ON job_postings(company_id);
CREATE INDEX idx_job_postings_is_active ON job_postings(is_active);
CREATE INDEX idx_job_postings_posted_date ON job_postings(posted_date);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_job_type ON job_postings(job_type);
CREATE INDEX idx_job_postings_experience_level ON job_postings(experience_level);

-- Full text search support
CREATE INDEX idx_job_postings_title_gin ON job_postings USING gin(to_tsvector('english', title));
CREATE INDEX idx_job_postings_description_gin ON job_postings USING gin(to_tsvector('english', description));

-- Insert sample companies
INSERT INTO companies (name, korean_name, logo_url, website_url, careers_url) VALUES
    ('Naver', '네이버', 'https://example.com/naver-logo.png', 'https://www.naver.com', 'https://recruit.navercorp.com'),
    ('Kakao', '카카오', 'https://example.com/kakao-logo.png', 'https://www.kakaocorp.com', 'https://careers.kakao.com'),
    ('Line Plus', '라인플러스', 'https://example.com/line-logo.png', 'https://linepluscorp.com', 'https://careers.linecorp.com'),
    ('Coupang', '쿠팡', 'https://example.com/coupang-logo.png', 'https://www.coupang.com', 'https://www.coupang.jobs'),
    ('Woowa Brothers', '우아한형제들', 'https://example.com/baemin-logo.png', 'https://www.woowahan.com', 'https://career.woowahan.com'),
    ('Daangn', '당근', 'https://example.com/daangn-logo.png', 'https://www.daangn.com', 'https://about.daangn.com/jobs'),
    ('Toss', '토스', 'https://example.com/toss-logo.png', 'https://toss.im', 'https://toss.im/career'),
    ('Zigbang', '직방', 'https://example.com/zigbang-logo.png', 'https://www.zigbang.com', 'https://www.zigbang.com/recruit'),
    ('Yanolja', '야놀자', 'https://example.com/yanolja-logo.png', 'https://www.yanolja.com', 'https://careers.yanolja.co'),
    ('Moloco', '몰로코', 'https://example.com/moloco-logo.png', 'https://www.moloco.com', 'https://www.moloco.com/careers'),
    ('Dunamu', '두나무', 'https://example.com/dunamu-logo.png', 'https://www.dunamu.com', 'https://careers.dunamu.com'),
    ('Sendbird', '센드버드', 'https://example.com/sendbird-logo.png', 'https://sendbird.com', 'https://sendbird.com/careers')
ON CONFLICT (name) DO NOTHING;