-- HealthWeave Database Initialization
-- Run automatically on first PostgreSQL container start

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search configuration for medical documents
-- Merges English + unaccented dictionary for Indian name support
CREATE TEXT SEARCH CONFIGURATION healthweave_medical (COPY = english);

-- Timeline year summaries table (created separately as it's a materialized cache)
CREATE TABLE IF NOT EXISTS timeline_year_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    year INTEGER NOT NULL,
    ai_year_summary TEXT,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

COMMENT ON DATABASE healthweave IS 'HealthWeave AI Personal Health Intelligence Platform';
