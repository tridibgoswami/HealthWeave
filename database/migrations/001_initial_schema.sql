-- HealthWeave – Initial Database Migration
-- Version: 001
-- Description: Complete initial schema

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ──────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'patient',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10) DEFAULT 'unknown',
    height_cm FLOAT,
    weight_kg FLOAT,
    bmi FLOAT,
    primary_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    known_allergies TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    current_medications TEXT[] DEFAULT '{}',
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_valid_until DATE,
    preferred_hospitals TEXT[] DEFAULT '{}',
    primary_physician_name VARCHAR(200),
    primary_physician_phone VARCHAR(20),
    ai_health_summary TEXT,
    ai_summary_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ── Health Records ─────────────────────────────────────────────────────────

CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    record_date DATE NOT NULL,
    hospital_name VARCHAR(300),
    doctor_name VARCHAR(300),
    doctor_specialization VARCHAR(200),
    fhir_resource_type VARCHAR(50),
    fhir_resource_id VARCHAR(200),
    icd10_codes TEXT[] DEFAULT '{}',
    snomed_codes TEXT[] DEFAULT '{}',
    loinc_codes TEXT[] DEFAULT '{}',
    structured_data JSONB DEFAULT '{}',
    ai_summary TEXT,
    ai_tags TEXT[] DEFAULT '{}',
    ai_risk_flags TEXT[] DEFAULT '{}',
    ai_extracted_biomarkers JSONB DEFAULT '{}',
    content_embedding vector(1536),
    search_vector tsvector,
    is_archived BOOLEAN DEFAULT FALSE,
    is_shared_with_family BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_health_records_user_id ON health_records(user_id);
CREATE INDEX idx_health_records_record_date ON health_records(record_date);
CREATE INDEX idx_health_records_record_type ON health_records(record_type);
CREATE INDEX idx_health_records_user_date ON health_records(user_id, record_date);
CREATE INDEX idx_health_records_search_vector ON health_records USING gin(search_vector);
CREATE INDEX idx_health_records_embedding ON health_records USING ivfflat(content_embedding vector_cosine_ops) WITH (lists = 100);

-- Auto-update search_vector
CREATE OR REPLACE FUNCTION health_records_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.ai_summary, '') || ' ' ||
        coalesce(NEW.hospital_name, '') || ' ' ||
        coalesce(NEW.doctor_name, '') || ' ' ||
        array_to_string(NEW.ai_tags, ' ')
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_records_tsvector_update
    BEFORE INSERT OR UPDATE ON health_records
    FOR EACH ROW EXECUTE FUNCTION health_records_search_vector_update();

-- ── Health Documents ───────────────────────────────────────────────────────

CREATE TABLE health_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    storage_key VARCHAR(1000) NOT NULL,
    storage_url VARCHAR(2000),
    checksum_sha256 VARCHAR(64),
    encryption_key_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'uploading',
    ocr_raw_text TEXT,
    ocr_confidence FLOAT,
    ocr_language VARCHAR(10),
    ocr_processed_at TIMESTAMPTZ,
    page_count INTEGER,
    thumbnail_key VARCHAR(1000),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Biomarker Values ───────────────────────────────────────────────────────

CREATE TABLE biomarker_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    canonical_name VARCHAR(200),
    loinc_code VARCHAR(20),
    value_numeric FLOAT,
    value_text VARCHAR(200),
    unit VARCHAR(50),
    reference_range_low FLOAT,
    reference_range_high FLOAT,
    reference_range_text VARCHAR(100),
    status VARCHAR(20),
    interpretation TEXT,
    measured_at DATE NOT NULL,
    source_lab VARCHAR(300)
);

CREATE INDEX idx_biomarker_user_id ON biomarker_values(user_id);
CREATE INDEX idx_biomarker_canonical_name ON biomarker_values(canonical_name);
CREATE INDEX idx_biomarker_measured_at ON biomarker_values(measured_at);
CREATE INDEX idx_biomarker_user_name_date ON biomarker_values(user_id, canonical_name, measured_at);

-- ── Timeline Events ────────────────────────────────────────────────────────

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    year INTEGER,
    month INTEGER,
    event_type VARCHAR(50) NOT NULL,
    event_title VARCHAR(500) NOT NULL,
    event_summary TEXT,
    event_icon VARCHAR(50),
    severity VARCHAR(20),
    tags TEXT[] DEFAULT '{}',
    ai_insight TEXT,
    is_milestone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_user_id ON timeline_events(user_id);
CREATE INDEX idx_timeline_event_date ON timeline_events(event_date);
CREATE INDEX idx_timeline_year ON timeline_events(year);
CREATE INDEX idx_timeline_user_date ON timeline_events(user_id, event_date);

-- ── Medicine Entries ───────────────────────────────────────────────────────

CREATE TABLE medicine_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_name VARCHAR(500) NOT NULL,
    canonical_name VARCHAR(300),
    generic_name VARCHAR(300),
    brand_name VARCHAR(300),
    drug_class VARCHAR(200),
    atc_code VARCHAR(20),
    dosage VARCHAR(100),
    dosage_numeric FLOAT,
    dosage_unit VARCHAR(20),
    frequency VARCHAR(100),
    frequency_code VARCHAR(20),
    route VARCHAR(50),
    duration_days INTEGER,
    total_quantity INTEGER,
    prescribed_for TEXT,
    prescribed_by VARCHAR(300),
    prescribed_date DATE,
    start_date DATE,
    end_date DATE,
    stopped_date DATE,
    stopped_reason TEXT,
    status VARCHAR(20) DEFAULT 'active',
    is_recurring BOOLEAN DEFAULT FALSE,
    adherence_score FLOAT,
    side_effects_reported TEXT[] DEFAULT '{}',
    ai_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medicine_user_id ON medicine_entries(user_id);
CREATE INDEX idx_medicine_canonical_name ON medicine_entries(canonical_name);
CREATE INDEX idx_medicine_status ON medicine_entries(status);

-- ── Family Members ─────────────────────────────────────────────────────────

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_name VARCHAR(200),
    relationship VARCHAR(50) NOT NULL,
    access_level VARCHAR(30) DEFAULT 'view_summary',
    known_conditions TEXT[] DEFAULT '{}',
    age_at_diagnosis JSONB DEFAULT '{}',
    is_deceased BOOLEAN DEFAULT FALSE,
    notes TEXT,
    is_invitation_pending BOOLEAN DEFAULT FALSE,
    invitation_token VARCHAR(200),
    invitation_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ── Health Scores ──────────────────────────────────────────────────────────

CREATE TABLE health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scored_date DATE NOT NULL,
    overall_score FLOAT,
    heart_score FLOAT,
    liver_score FLOAT,
    kidney_score FLOAT,
    metabolic_score FLOAT,
    inflammation_score FLOAT,
    lifestyle_score FLOAT,
    preventive_score FLOAT,
    mental_wellness_score FLOAT,
    thyroid_score FLOAT,
    blood_score FLOAT,
    score_deltas JSONB DEFAULT '{}',
    contributing_factors JSONB DEFAULT '{}',
    ai_narrative TEXT,
    data_completeness FLOAT,
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_scores_user_id ON health_scores(user_id);
CREATE INDEX idx_health_scores_scored_date ON health_scores(scored_date);
CREATE UNIQUE INDEX idx_health_scores_user_date ON health_scores(user_id, scored_date);

-- ── Predictive Alerts ──────────────────────────────────────────────────────

CREATE TABLE predictive_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    detailed_explanation TEXT,
    risk_level VARCHAR(20),
    risk_score FLOAT,
    confidence FLOAT,
    time_horizon VARCHAR(50),
    supporting_evidence JSONB DEFAULT '[]',
    recommended_actions TEXT[] DEFAULT '{}',
    consult_specialist VARCHAR(200),
    medical_disclaimer TEXT,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    is_actioned BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_predictive_alerts_user_id ON predictive_alerts(user_id);

-- ── Correlation Findings ───────────────────────────────────────────────────

CREATE TABLE correlation_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    finding_type VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    clinical_significance TEXT,
    entities_involved JSONB DEFAULT '[]',
    time_span_start DATE,
    time_span_end DATE,
    data_points_count INTEGER,
    correlation_coefficient FLOAT,
    p_value FLOAT,
    confidence FLOAT,
    ai_explanation TEXT,
    preventive_suggestion TEXT,
    medical_disclaimer TEXT,
    is_reviewed BOOLEAN DEFAULT FALSE,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat ───────────────────────────────────────────────────────────────────

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    session_type VARCHAR(50) DEFAULT 'general',
    context_record_ids UUID[] DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    has_medical_disclaimer BOOLEAN DEFAULT FALSE,
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    content_embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);

-- ── Emergency Passport ─────────────────────────────────────────────────────

CREATE TABLE emergency_passports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    allergies TEXT[] DEFAULT '{}',
    current_critical_medicines JSONB DEFAULT '[]',
    chronic_conditions TEXT[] DEFAULT '{}',
    implants TEXT[] DEFAULT '{}',
    recent_surgeries TEXT[] DEFAULT '{}',
    do_not_resuscitate BOOLEAN DEFAULT FALSE,
    emergency_contacts JSONB DEFAULT '[]',
    insurance_info JSONB DEFAULT '{}',
    qr_token VARCHAR(200) UNIQUE,
    qr_code_url VARCHAR(1000),
    qr_generated_at TIMESTAMPTZ,
    offline_snapshot JSONB,
    snapshot_updated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_passports_qr_token ON emergency_passports(qr_token);

-- ── Audit Logs ─────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(200),
    ip_address VARCHAR(45),
    user_agent TEXT,
    extra_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ── Timeline Year Summaries ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timeline_year_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    ai_year_summary TEXT,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- ── Family Hereditary Risks ────────────────────────────────────────────────

CREATE TABLE family_hereditary_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    condition VARCHAR(200) NOT NULL,
    icd10_code VARCHAR(20),
    affected_relatives JSONB DEFAULT '[]',
    risk_level VARCHAR(20),
    risk_score JSONB,
    ai_explanation TEXT,
    preventive_actions TEXT[] DEFAULT '{}',
    screening_recommendations TEXT[] DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    next_compute_at TIMESTAMPTZ
);

COMMIT;
