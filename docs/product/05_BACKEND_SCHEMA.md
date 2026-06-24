# HealthWeave — Backend Schema, Authentication & Data Storage

**Version:** 1.0
**Status:** Reflects the actual database schema and auth implementation (as of 2026-06-24)
**Database:** PostgreSQL 15 with `vector` (pgvector), `pg_trgm`, `unaccent` extensions

---

## 1. Schema Overview

**29 tables** across 19 logical domains. All primary keys are PostgreSQL UUIDs (`uuid.uuid4()` default, native `UUID` column type). All tables carry `created_at` (`server_default=func.now()`); most carry `updated_at` (auto-updated on write). No soft-deletes — referential integrity is enforced via explicit `CASCADE` / `SET NULL` foreign-key policies.

| # | Table | Domain | Model file |
|---|---|---|---|
| 1 | `users` | Identity & Auth | `models/user.py` |
| 2 | `user_profiles` | Profiles & Demographics | `models/user.py` |
| 3 | `audit_logs` | Audit & Compliance | `models/user.py` |
| 4 | `health_records` | Health Records | `models/health_record.py` |
| 5 | `health_documents` | Health Records | `models/health_record.py` |
| 6 | `biomarker_values` | Biomarkers & Timeline | `models/health_record.py` |
| 7 | `timeline_events` | Biomarkers & Timeline | `models/health_record.py` |
| 8 | `manual_vital_entries` | Vitals & Visits | `models/vitals.py` |
| 9 | `document_comments` | Vitals & Visits | `models/vitals.py` |
| 10 | `patient_visits` | Vitals & Visits | `models/vitals.py` |
| 11 | `medicine_entries` | Medicines | `models/medicine.py` |
| 12 | `medicine_interaction_alerts` | Medicines | `models/medicine.py` |
| 13 | `medicine_master_catalog` | Medicines | `models/medicine.py` |
| 14 | `family_members` | Family & Hereditary Risk | `models/family.py` |
| 15 | `family_hereditary_risks` | Family & Hereditary Risk | `models/family.py` |
| 16 | `health_scores` | Health Intelligence | `models/intelligence.py` |
| 17 | `predictive_alerts` | Health Intelligence | `models/intelligence.py` |
| 18 | `correlation_findings` | Health Intelligence | `models/intelligence.py` |
| 19 | `chat_sessions` | Conversational AI | `models/intelligence.py` |
| 20 | `chat_messages` | Conversational AI | `models/intelligence.py` |
| 21 | `emergency_passports` | Emergency | `models/intelligence.py` |
| 22 | `organizations` | Organizations | `models/organization.py` |
| 23 | `doctor_profiles` | Organizations | `models/organization.py` |
| 24 | `organization_members` | Organizations | `models/organization.py` |
| 25 | `patient_consents` | Consent & Access | `models/organization.py` |
| 26 | `clinical_notes` | Care Documentation | `models/organization.py` |
| 27 | `lab_requests` | Care Documentation | `models/organization.py` |
| 28 | `invitations` | Onboarding | `models/organization.py` |
| 29 | `notifications` | Messaging | `models/organization.py` |

### 1.1 Special data types in use
- **PostgreSQL `ARRAY`** — used in 11+ tables for lists that don't need their own join table (allergies, chronic conditions, tags, ICD-10 codes, qualifications, brand names, etc.). Trade-off accepted: simpler schema and queries vs. less normalized than a many-to-many join table; appropriate because these lists are always read/written wholesale per parent row, never queried/joined independently.
- **`JSON`/`JSONB`** — used for AI-shaped, evolving structures that would otherwise require frequent migrations (`structured_data`, `ai_extracted_biomarkers`, `biomarker_changes`, `score_deltas`, `contributing_factors`, `supporting_evidence`, `entities_involved`, `extra_data`, `settings`, `offline_snapshot`, `emergency_contacts`).
- **`pgvector` `Vector(1536)`** — semantic embeddings on `health_records.content_embedding` and `chat_messages.content_embedding`, dimension fixed to match OpenAI `text-embedding-3-small`.
- **`TSVECTOR`** — full-text search column on `health_records.search_vector`, paired with vector search for hybrid retrieval in the RAG chat pipeline.

---

## 2. Domain-by-Domain Table Reference

### 2.1 Identity & Authentication

**`users`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `email` | String(255), unique, indexed | |
| `phone` | String(20), unique, indexed, nullable | |
| `hashed_password` | String(255) | bcrypt hash |
| `role` | Enum `UserRole` | `patient` (default) / `doctor` / `caregiver` / `hospital_admin` / `admin` / `super_admin` |
| `organization_id` | UUID FK → `organizations.id`, SET NULL | added via runtime migration |
| `is_active` | Boolean, default True | deactivation flag — false blocks login (403) |
| `is_verified` | Boolean, default False | **not currently enforced anywhere** in authorization logic |
| `email_verified_at` / `phone_verified_at` | timestamptz, nullable | unused fields, reserved for future verification flow |
| `reset_token` | String(100), indexed, nullable | added via runtime migration |
| `reset_token_expires_at` | timestamptz, nullable | added via runtime migration |
| `created_at` / `updated_at` / `last_login_at` | timestamptz | |

Relationships (all CASCADE on user delete unless noted): `profile` (1:1), `health_records` (1:many), `family_members` (1:many, as owner), `audit_logs` (1:many), `emergency_passport` (1:1), `health_scores` (1:many), `chat_sessions` (1:many).

**`user_profiles`** — 1:1 with `users` (unique FK). Demographics (name, DOB, gender enum, blood group enum, height/weight/BMI), locale (language, timezone, city/state/country — defaults `"en"`/`"Asia/Kolkata"`/`"India"`), clinical context arrays (`known_allergies`, `chronic_conditions`, `current_medications`), emergency contact fields, insurance fields, preferred hospitals array, primary physician fields, and AI-maintained `ai_health_summary` + `ai_summary_updated_at`.

**`audit_logs`** — `user_id` FK (CASCADE), `action`, `resource`, `resource_id`, `ip_address`, `user_agent`, `extra_data` JSON, `created_at`. An Alembic migration (0002) extends this with an `outcome` column and additional indexes (`ix_audit_user_created`, `ix_audit_resource`, `ix_audit_action`) beyond what the SQLAlchemy model declares directly — **rows in this table must never be deleted**, by standing compliance policy.

### 2.2 Health Records & Documents

**`health_records`** — the core unit of the system; every uploaded document or logged medical event becomes one row.

Key columns: `user_id` (FK, indexed), `record_type` (enum: lab_report/prescription/scan/discharge_summary/vaccination/doctor_visit/surgery/symptom_log/vital_reading/health_package/insurance_document/other), `title`, `description`, `record_date` (indexed), `hospital_name`, `doctor_name`, `doctor_specialization`, FHIR-alignment fields (`fhir_resource_type`, `fhir_resource_id`), clinical coding arrays (`icd10_codes`, `snomed_codes`, `loinc_codes`), `structured_data` JSON (full OCR/AI extraction payload), `ai_summary`, `ai_tags`, `ai_risk_flags`, `ai_extracted_biomarkers` JSON, `visit_id` (FK → `patient_visits`, SET NULL, added via runtime migration), `biomarker_changes` JSON (auto-computed delta vs. prior readings, added via runtime migration), `content_embedding` Vector(1536), `search_vector` TSVECTOR, `is_archived`, `is_shared_with_family`.

Indexes: GIN index on `search_vector`; composite `(user_id, record_date)`.

Relationships (all CASCADE): `documents` (1:many → `health_documents`), `biomarker_values` (1:many), `medicine_entries` (1:many), `timeline_events` (1:many).

**`health_documents`** — the raw file layer, separate from the structured `health_records` row so one record can in principle have multiple source files. Columns: `record_id`/`user_id` FK (CASCADE), `file_name`, `file_size_bytes`, `mime_type`, `storage_key`/`storage_url` (S3), `checksum_sha256`, `encryption_key_id`, `status` (enum: uploading/processing/processed/failed/archived), `ocr_raw_text`, `ocr_confidence`, `ocr_language`, `ocr_processed_at`, `page_count`, `thumbnail_key`.

### 2.3 Biomarkers & Timeline

**`biomarker_values`** — the time-series backbone of the entire product. One row per extracted lab value per document. Columns: `record_id`/`user_id` FK (CASCADE, `user_id` indexed), `name` (as extracted), `canonical_name` (normalized, indexed), `loinc_code`, `value_numeric`, `value_text`, `unit`, `reference_range_low`/`high`/`text`, `status` (normal/high/low/critical), `interpretation`, `measured_at` (indexed), `source_lab`.

**Composite index `(user_id, canonical_name, measured_at)`** is the single most important index in the schema — it's what makes "show me every HbA1c reading this user has ever had, in order" an efficient query, and it underlies the entire trend/correlation/scoring pipeline.

**`timeline_events`** — a denormalized projection of `health_records`, purpose-built so the timeline UI never needs to JOIN against the heavier records table. Columns: `user_id`/`record_id` FK (CASCADE), `event_date` (indexed), `year`/`month` (year indexed separately for annual rollups), `event_type`, `event_title`, `event_summary`, `event_icon`, `severity` (info/warning/critical/improvement), `tags` array, `ai_insight`, `is_milestone`. Composite index `(user_id, event_date)`.

### 2.4 Vitals & Visits

**`manual_vital_entries`** — lightweight, high-frequency self-logged vitals, intentionally separate from the heavier `health_records`/`biomarker_values` path (no document, no OCR, no AI extraction — just a number). Columns: `user_id` FK (CASCADE), `entry_date`, `biomarker_name`, `value_numeric`, `unit`, `notes`. Two composite indexes: `(user_id, biomarker_name)` and `(user_id, entry_date)`.

**`patient_visits`** — groups related `health_records` under a single clinic/hospital visit. Columns: `user_id` FK (CASCADE), `visit_date`, `doctor_name`, `hospital_name`, `specialization`, `chief_complaint`, `diagnosis`, `notes`, `follow_up_date`. Composite index `(user_id, visit_date)`. Referenced by `health_records.visit_id`.

**`document_comments`** — patient's own notes attached to a record. Columns: `record_id` FK (CASCADE, indexed), `user_id` FK (CASCADE), `comment_text`.

### 2.5 Medicines & Drug Intelligence

**`medicine_entries`** — one row per prescribed medicine line item. Columns include raw vs. canonical/generic/brand naming, `drug_class`, `atc_code`, structured dosage (`dosage`, `dosage_numeric`, `dosage_unit`), `frequency`/`frequency_code` (SIG codes), `route`, `duration_days`, `total_quantity`, `prescribed_for`/`prescribed_by`/`prescribed_date`, lifecycle dates (`start_date`/`end_date`/`stopped_date`/`stopped_reason`), `status` (enum: active/stopped/completed/paused/changed), `is_recurring`, `adherence_score`, `side_effects_reported` array, `ai_notes`. Composite index `(user_id, canonical_name)`.

**`medicine_interaction_alerts`** — links two `medicine_entries` rows (`medicine_a_id`/`medicine_b_id`, both CASCADE) with `severity` (minor/moderate/major/contraindicated), `description`, `clinical_significance`, `recommendation`, `source` ("AI"/"DrugBank"/"FDA"), `is_acknowledged`/`acknowledged_at`. Indexed on `user_id`.

**`medicine_master_catalog`** — a reference/lookup table (not user-scoped), `canonical_name` unique, generic/brand names, drug class, ATC code, mechanism of action, common indications/side effects/contraindications, and India-market flags (`is_controlled`, `is_otc`, `is_indian_market`). Backs fuzzy name-matching from AI-extracted raw medicine names.

### 2.6 Family Health & Hereditary Risk

**`family_members`** — `user_id` (owner, CASCADE) + optional `linked_user_id` (SET NULL, if the family member also has their own HealthWeave account) + optional `member_name` (offline profile). `relationship` enum (15 values: self/spouse/father/mother/son/daughter/brother/sister/grandfather/grandmother/uncle/aunt/cousin/caregiver/other). `access_level` enum (view_summary default / view_records / full_access / emergency_only) governs what a *linked* family member can see of the owner's data. `known_conditions` array, `age_at_diagnosis` JSON (`{condition: age}`), `is_deceased`, invitation fields (`is_invitation_pending`, `invitation_token`, `invitation_accepted_at`).

**`family_hereditary_risks`** — AI-computed, per `user_id` (CASCADE) and `condition` (with optional `icd10_code`). `affected_relatives` JSON array, `risk_level`, `risk_score` JSON (`{value, confidence}`), `ai_explanation`, `preventive_actions`/`screening_recommendations` arrays, `computed_at`/`next_compute_at` for scheduled recomputation.

### 2.7 Health Intelligence & Scoring

**`health_scores`** — one time-series row per `user_id` per `scored_date` (composite index, **not** DB-uniquely-constrained — see `02_TRD.md` §7 risk register). 10 dimension scores (`overall_score`, `heart_score`, `liver_score`, `kidney_score`, `metabolic_score`, `inflammation_score`, `lifestyle_score`, `preventive_score`, `mental_wellness_score` [reserved, not yet populated], `thyroid_score`, `blood_score`), `score_deltas` JSON, `contributing_factors` JSON, `ai_narrative` text, `data_completeness`, `confidence`.

**`predictive_alerts`** — `user_id` (CASCADE), `alert_type`, `category`, `title`, `summary`, `detailed_explanation`, `risk_level`, `risk_score`, `confidence`, `time_horizon`, `supporting_evidence` JSON, `recommended_actions` array, `consult_specialist`, `medical_disclaimer`, `is_dismissed`/`dismissed_at`, `is_actioned`, `generated_at`, `expires_at`. Composite index `(user_id, alert_type)`.

**`correlation_findings`** — `user_id` (CASCADE), `finding_type` (biomarker_correlation/metabolic_syndrome_risk/disease_progression/medicine_biomarker_correlation), `title`, `description`, `clinical_significance`, `entities_involved` JSON, `time_span_start`/`end`, `data_points_count`, `correlation_coefficient`, `p_value`, `confidence`, `ai_explanation`, `preventive_suggestion`, `medical_disclaimer`, `is_reviewed`, `computed_at`.

### 2.8 Conversational AI

**`chat_sessions`** — `user_id` (CASCADE), `title`, `session_type` (general/report_analysis/symptom_query), `context_record_ids` UUID array, `message_count`, `is_active`.

**`chat_messages`** — `session_id` FK (CASCADE, indexed), `role` (user/assistant), `content`, `sources` JSON array, `has_medical_disclaimer`, token/latency telemetry (`input_tokens`, `output_tokens`, `latency_ms`), `content_embedding` Vector(1536).

### 2.9 Emergency

**`emergency_passports`** — 1:1 with `users` (unique FK, CASCADE). `blood_group`, `allergies` array, `current_critical_medicines` JSON, `chronic_conditions` array, `implants` array, `recent_surgeries` array, `do_not_resuscitate` boolean, `emergency_contacts` JSON array, `insurance_info` JSON, `qr_token` (unique, indexed), `qr_code_url`, `qr_generated_at`, `offline_snapshot` JSON (the full payload embedded directly in the QR for offline access), `snapshot_updated_at`, `is_active`.

### 2.10 Organizations & Enterprise

**`organizations`** — `name`, `slug` (unique), `org_type` enum (hospital default/clinic/diagnostic_center/pharmacy/other), address fields, contact fields, `registration_number`, `gstin` (India-specific), `is_active`/`is_verified`, `settings` JSON, `created_by` FK → `users` (SET NULL).

**`doctor_profiles`** — 1:1 with `users` (unique FK, CASCADE), optional `organization_id` (SET NULL). `medical_registration_number`, `specialization`/`sub_specialization`, `qualifications` array, `experience_years`, `consultation_fee`, `available_days` array, `available_hours`, `bio`, `languages_spoken` array.

**`organization_members`** — links `organization_id` + `user_id` (both CASCADE) with `role` (doctor default/hospital_admin/staff), `department`, `joined_at`, `is_active`. **Unique composite index** `(organization_id, user_id)` — prevents duplicate membership rows.

### 2.11 Patient Consent & Access Control

**`patient_consents`** — the access-control backbone of doctor/hospital data sharing. `patient_id` (CASCADE, indexed), `doctor_id` (nullable, CASCADE), `organization_id` (nullable, CASCADE). `status` enum (`pending`/`active` default/`revoked`/`expired`). Granular boolean share flags: `share_full_history` (default **False**), `share_biomarkers` (default **True**), `share_prescriptions` (default **True**), `share_lab_reports` (default **True**), `share_scans` (default **False**), `share_mental_health` (default **False**). `valid_from` (default today), `valid_until` (nullable = indefinite), `purpose` text, `granted_at`/`revoked_at`. Composite index `(patient_id, doctor_id)`.

The default-flag posture is a deliberate privacy decision: routine clinical categories (biomarkers, prescriptions, lab reports) are shared by default once a patient grants any consent at all, while the most sensitive categories (full history, imaging/scans, mental health) require explicit, separate opt-in.

### 2.12 Clinical Notes & Care Documentation

**`clinical_notes`** — `patient_id` + `doctor_id` (both CASCADE, both indexed), optional `organization_id` (SET NULL). `visit_date`, `chief_complaint`, `clinical_findings`, `diagnosis`, `icd10_codes` array, `treatment_plan`, `medications_prescribed` JSON array, `follow_up_date`/`follow_up_notes`, `is_private` (hides the note from the patient-facing view — doctor-to-doctor/internal use).

**`lab_requests`** — `patient_id` (CASCADE, indexed), `doctor_id` (CASCADE), optional `organization_id` (SET NULL). `tests_requested` array, `urgency` (routine default/urgent/stat), `clinical_notes`, `requested_at`, `fulfilled_at`, `linked_record_id` (SET NULL → `health_records`, populated once results are uploaded).

### 2.13 Onboarding & Messaging

**`invitations`** — `organization_id` (CASCADE), `invited_by` (SET NULL → `users`), `email`, `role` (doctor default/hospital_admin/staff), `token` (unique, indexed), `status` enum (pending default/accepted/expired/revoked), `expires_at`, `accepted_at`/`accepted_by`.

**`notifications`** — `user_id` (CASCADE, indexed), `type` enum (report_ready/doctor_access_request/consent_granted/consent_revoked/alert_generated/appointment_reminder/invitation/system), `title`, `body`, `action_url`, `extra_data` JSON, `is_read`/`read_at`. Composite index `(user_id, is_read)` — directly optimizes the "unread count" query that drives notification badges across all three shells.

---

## 3. Authentication Flow (Detailed)

### 3.1 Registration — `POST /api/v1/auth/register`
- Rate limit: 60/min.
- Validates a password complexity regex requiring lowercase, uppercase, and (digit or special character), 8–72 characters.
- Hashes password via bcrypt (`BCRYPT_ROUNDS`, default 12).
- Creates role-specific records in one transaction:
  - **Patient**: `User` + `UserProfile`.
  - **Doctor**: `User` + `UserProfile` + `DoctorProfile` (specialization, registration number, qualifications, experience, fees, availability, bio, languages).
  - **Hospital Admin**: `User` + `UserProfile` only (the organization itself is created later, inside the admin portal).
- `is_verified` defaults to `False` and is **not currently checked anywhere** — no verification gate blocks login or feature access today.
- A welcome email is dispatched via Resend post-registration; failure to send **never blocks** the registration response (fire-and-forget, errors swallowed and logged).

### 3.2 Login — `POST /api/v1/auth/login`
- Rate limit: 60/min.
- bcrypt time-constant password comparison (`bcrypt.checkpw`).
- `is_active=False` → 403 (account deactivated).
- On success: updates `last_login_at`, writes an `audit_logs` row (action="login", with IP — respecting `X-Forwarded-For` — and user agent), issues access + refresh JWTs.
- Failure path returns a single generic message ("Invalid credentials") regardless of whether the email didn't exist or the password was wrong — **no user-enumeration signal**.

### 3.3 JWT Specification

| Token type | Algorithm | Claims | Expiry | Notes |
|---|---|---|---|---|
| Access | HS256 | `sub`, `type:"access"`, `iat`, `exp`, `jti`, `roles` | 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`) | Sent as `Authorization: Bearer` on every API call |
| Refresh | HS256 | `sub`, `type:"refresh"`, `iat`, `exp`, `jti` | 30 days (`REFRESH_TOKEN_EXPIRE_DAYS`) | Stateless — validity checked purely by signature + expiry, no DB lookup, no blacklist |
| Emergency | HS256 | includes `scope:"emergency_read"` | `EMERGENCY_TOKEN_EXPIRE_HOURS` | Scoped token type for time-limited emergency-context access flows, distinct from the public QR passport view |

`SECRET_KEY` signs all token types; enforced to be ≥32 characters in production at config load. There is **no server-side session store or revocation list** — logout is purely a client-side token-discard action (see `02_TRD.md` §3.3/§7 for the accepted risk this implies).

### 3.4 Token Refresh — `POST /api/v1/auth/refresh`
- Rate limit: 20/min. Validates `type=="refresh"`, re-issues a new access token. Fully stateless — no DB round-trip beyond decoding the JWT.

### 3.5 Forgot / Reset Password
- `POST /api/v1/auth/forgot-password` (5/min): always returns an identical message whether or not the email exists (anti-enumeration). Generates `secrets.token_urlsafe(32)`, stores it unencrypted in `users.reset_token` with a 2-hour expiry in `users.reset_token_expires_at`, emails a link `{APP_BASE_URL}/reset-password?token=...` via Resend.
- `POST /api/v1/auth/reset-password` (5/min): validates token value + expiry, rehashes the new password via bcrypt, **clears** `reset_token`/`reset_token_expires_at` (enforcing one-time use).

### 3.6 Role-Based Access Control (RBAC)
- `UserRole` enum: `PATIENT`, `DOCTOR`, `CAREGIVER`, `HOSPITAL_ADMIN`, `ADMIN`, `SUPER_ADMIN`.
- Implemented via FastAPI `Depends()` helper functions rather than scattered inline checks:
  - `_require_doctor()` — allows `DOCTOR`, `HOSPITAL_ADMIN`, `SUPER_ADMIN`.
  - `_require_role(*roles)` — generic multi-role allow-list check, reusable per-route.
  - `_require_org_admin()` — org-scoped check; `SUPER_ADMIN` bypasses the org-membership requirement.
- Enforcement happens **server-side on every request** — frontend route guards (`Protected`/`DoctorProtected`/`AdminProtected`) are a UX convenience layer only, never the actual security boundary.

---

## 4. Consent & Data-Access Model (Detailed)

### 4.1 Lifecycle
```
   patient grants consent
            │
            ▼
        PENDING ──── doctor rejects ───▶ REVOKED
            │
       doctor accepts
            │
            ▼
        ACTIVE ──── patient revokes ───▶ REVOKED
            │
     valid_until passes
       (checked lazily,
       on next access attempt)
            │
            ▼
        EXPIRED
```
- Granting a **new** consent to a doctor automatically revokes any prior active/pending consent to that same doctor first — exactly one live consent relationship per (patient, doctor) pair at any time, never a stack of duplicates.
- The **"Send Report"** flow (`consent.py` send-report endpoint) is a deliberate exception: it creates an immediately **ACTIVE** (not PENDING) consent, time-bounded by default to 30 days, for one-off patient-initiated sharing with a doctor or hospital that bypasses the doctor-acceptance step — appropriate because the patient is actively pushing data out, not granting standing access.
- Expiry is **lazy**, not a background job: a consent past its `valid_until` is only flipped to `EXPIRED` semantics at the moment a doctor attempts to use it (`_check_consent()` gate), which then denies access (403) rather than allowing a stale grant through.

### 4.2 Enforcement Points
- `_check_consent(patient_id, doctor_id)` — the universal gate function called at the top of every doctor-facing patient-data endpoint; returns the live consent row or raises 403.
- Granular per-category enforcement layered on top: even with an active consent, each specific data category (biomarkers/prescriptions/lab_reports/scans/full_history/mental_health) is checked against its specific share-flag before that category's data is returned — a doctor with consent but `share_scans=False` simply never receives scan data in any response, regardless of which endpoint they call.

---

## 5. Data Protection & Storage

- **Documents**: stored in AWS S3 (`ap-south-1`), uploaded with server-side encryption (SSE-S3, AES256) applied at write time (`storage_service.py`). `checksum_sha256` captured for integrity verification; `encryption_key_id` reserved for future per-document key rotation.
- **Passwords**: bcrypt, 12 rounds default, never stored or logged in plaintext at any point.
- **Reset tokens**: stored unencrypted but are single-use, cryptographically random (`secrets.token_urlsafe(32)`), and short-lived (2 hours) — accepted risk given the threat model (a token compromise window is small and the token alone cannot authenticate without also controlling the user's inbox).
- **PII in observability**: Sentry is configured with `send_default_pii=False` — no patient-identifying or health data is sent to error tracking, by policy.
- **Transport**: HTTPS-only at the edge; HSTS enforced (2-year max-age, includeSubDomains, preload).
- **Audit immutability**: `audit_logs` is the one table in the schema with a standing "never delete rows" compliance rule, distinct from ordinary data lifecycle management elsewhere in the system.

---

## 6. Migration Strategy

- **Alembic** manages the formal migration history (baseline `0001_establish_baseline.py`, incremental migrations such as `0002` which extended `audit_logs`).
- A secondary, **defensive runtime migration mechanism** exists in `database.py` (`_run_migrations`) that applies a small set of additive, idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`-style changes at application startup (e.g., `users.organization_id`, `users.reset_token*`, `health_records.visit_id`, `health_records.biomarker_changes`, and the `ConsentStatus.PENDING` enum value). This pattern was used to ship small additive schema changes quickly without a full Alembic migration cycle during active early development — **new schema changes going forward should prefer a proper Alembic migration**, with the runtime mechanism reserved for narrow, truly additive, backward-compatible cases.
- Required PostgreSQL extensions (`vector`, `pg_trgm`, `unaccent`) are provisioned as part of database initialization, not assumed to pre-exist on the managed Postgres instance.
