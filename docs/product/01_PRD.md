# HealthWeave — Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Living document — reflects the product as actually built (as of 2026-06-24)
**Owner:** Product / Founding team
**Audience:** Founders, engineering, design, future hires, investors

---

## 1. Product Vision

HealthWeave is an AI-native personal health intelligence platform for the Indian market. It gives every patient a single, lifelong, structured memory of their health — built automatically from the lab reports, prescriptions, scans and discharge summaries they already have — and turns that memory into plain-language insight, predictive risk alerts, and a safe way to share data with doctors and hospitals.

**One-line pitch:** *"Upload your reports. We read them, remember them forever, and tell you what they mean."*

### 1.1 Problem Statement

- Indian patients accumulate health records across many providers (labs, hospitals, clinics, pharmacies) with no central, longitudinal view.
- Lab reports are dense, jargon-heavy PDFs/photos that patients cannot interpret; trends across years are invisible without manual comparison.
- Doctors get fragmented histories at consult time — patients forget medication names, prior values, or family history.
- There is no safe, granular, consent-driven way for a patient to share only the data they choose with a specific doctor or hospital, especially under India's DPDP Act 2023.
- Emergency responders have no fast way to access a patient's critical health facts (blood group, allergies, conditions) when the patient is unconscious or unable to communicate.

### 1.2 Vision / End Goal

A patient's entire health history — labs, prescriptions, scans, vitals, visits, family history — lives in one encrypted, AI-readable timeline that:
1. Builds itself automatically from uploaded documents (OCR + LLM extraction, zero manual data entry).
2. Computes a multi-dimensional "health score" (8–10 organ systems) that updates as new data arrives.
3. Proactively flags risk trends and screening gaps before they become emergencies (predictive, preventive — not diagnostic).
4. Lets the patient have a natural-language conversation with their own data ("Has my cholesterol gone up since last year?").
5. Lets the patient grant doctors and hospitals granular, revocable, time-bound access to exactly the data categories they choose.
6. Gives first responders life-saving facts via a QR code, even if the patient's phone is locked or they're unconscious.
7. Gives doctors a pre-consultation AI summary tailored to their specialization, so the 10-minute consult starts with context instead of history-taking.

### 1.3 Target Markets / Users

| Persona | Role enum | Core need |
|---|---|---|
| **Patient** | `patient` | Understand their own health, track it over time, share safely |
| **Doctor (independent or hospital-affiliated)** | `doctor` | Fast, consented access to a patient's relevant history; AI-assisted pre-consult summaries; clinical note-taking |
| **Hospital/Clinic Admin** | `hospital_admin` | Manage their organization's doctor roster, invitations, and see aggregate stats |
| **Caregiver** (modeled, not yet UI-exposed) | `caregiver` | Manage health records on behalf of a dependent (e.g., parent, child) |
| **Platform Admin / Super Admin** | `admin` / `super_admin` | Operate and govern the platform (role exists in schema; no dedicated UI yet) |
| **Emergency responder** | N/A — unauthenticated | Scan QR code to retrieve life-critical facts about an unconscious/incapacitated patient |

### 1.4 Geographic & Regulatory Context

- Primary market: **India** (region `blr`/Bangalore hosting, INR-oriented features, Indian biomarker naming conventions, 7 Indian languages supported in OCR, GSTIN field on organizations).
- Regulatory anchor: **DPDP (Digital Personal Data Protection) Act, 2023** — drives the consent model, data minimization defaults, and "Zero Data Selling" public commitment.
- Secondary positioning language also references HIPAA-aligned practices (audit logging, encryption) for credibility, though the legal target is DPDP.

---

## 2. Goals & Non-Goals

### 2.1 Goals (what HealthWeave is)
- A **health memory and intelligence layer**, not a hospital information system or EHR replacement.
- A **preventive/predictive** intelligence tool — surfaces risk indicators, trends, and patterns.
- A **patient-owned, consent-first data-sharing platform** between patients and care providers.
- A **multi-portal product**: one engineering platform, three distinct experiences (patient, doctor, hospital admin).

### 2.2 Non-Goals (explicitly out of scope today)
- **Not a diagnostic tool.** Every AI surface (scores, alerts, correlations, chat) is contractually and technically constrained to avoid diagnostic language ("you have X") in favor of probabilistic, educational framing ("risk indicators suggest...").
- **Not a prescribing or e-pharmacy platform.** No medication ordering, no prescription issuance.
- **Not a telemedicine/video-consult product** (no appointment booking, video calls, or payments yet).
- **Not a billing/insurance claims platform**, beyond storing insurance metadata for reference.
- **Not multi-region/multi-country** at this stage — single-region (India) deployment.

---

## 3. Product Pillars (Feature Domains)

These map 1:1 to the platform's actual implemented capabilities:

1. **Document Intelligence (Upload & OCR)** — turn any lab report, prescription, scan, or discharge summary (PDF/image, 7 Indian languages) into structured data automatically.
2. **Biomarker Memory** — canonicalized, time-series storage of every lab value ever recorded, with automatic delta/trend computation against prior readings.
3. **Health Scoring** — 10-dimension AI-computed health score (overall, heart, liver, kidney, metabolic, inflammation, lifestyle, preventive, thyroid, blood) recomputed after every upload.
4. **Predictive Alerts** — AI-generated, prioritized preventive alerts (risk trends, screening gaps, lifestyle flags) with risk level, time horizon, and recommended actions.
5. **Correlation Intelligence** — longitudinal pattern detection: biomarker trend significance, metabolic syndrome risk scoring, disease progression via recurring ICD-10 codes, and medicine-to-biomarker effect correlation.
6. **Lifelong Timeline** — chronological, year-grouped view of every health event with AI-generated yearly narrative summaries and milestone flags.
7. **Conversational AI (Health Chat)** — RAG-powered chat grounded in the patient's own records (vector + full-text retrieval), with streaming responses and source citations.
8. **Lab Report Deep-Analysis** — specialization-aware comprehensive panel analysis, pattern recognition (e.g., metabolic syndrome), prioritized actions, and follow-up test suggestions.
9. **Medicine Intelligence** — canonical drug tracking, AI-detected drug-drug interaction checking (severity-rated), and medicine-biomarker correlation.
10. **Vitals Tracking** — lightweight, frequent self-logging of vitals (glucose, BP, weight, heart rate, SpO2, temperature) distinct from formal lab uploads.
11. **Visit Management** — structured records of clinic/hospital visits, with the ability to link uploaded documents to a specific visit.
12. **Consent & Data Sharing** — granular, revocable, time-bound consent grants to specific doctors, plus a "send report" fast-path for one-off sharing with a doctor or hospital.
13. **Emergency Passport** — offline-capable, QR-code-accessible critical health profile (blood group, allergies, conditions, critical meds, DNR status, emergency contacts) for first responders, with no login required to view.
14. **Doctor Portal** — patient roster (consent-gated), pre-consultation AI summaries, clinical note authoring, lab order requests, patient biomarker views.
15. **Hospital Admin Portal** — organization creation, doctor invitation & onboarding, org-wide statistics.
16. **Family Health Graph** — family member tracking with hereditary risk computation based on relative conditions and age-of-onset.
17. **Notifications** — in-app notification system for consent events, alerts, invitations, and report-ready events.

---

## 4. Detailed Feature Requirements

### 4.1 Document Upload & AI Extraction
**User story:** As a patient, I upload a photo or PDF of any health document and within ~30–60 seconds get structured, explained data without typing anything.

Requirements:
- Accept PDF, JPEG, PNG, WebP, TIFF; reject anything else; enforce 50MB max file size (configurable).
- Auto-classify document type: lab_report, prescription, discharge_summary, scan_report, vaccination, health_package, other.
- Extract: hospital/doctor/patient metadata, biomarkers (name, value, unit, reference range, status, confidence), medicines (dosage, frequency, duration, instructions), diagnoses (with ICD-10 suggestion), 4–6 plain-language key findings, and AI risk flags.
- Canonicalize 200+ biomarker name variants (e.g., "S. Creatinine" → `creatinine`) so the same test from different labs aligns on one timeline.
- Support partial/graceful recovery if the AI response is truncated mid-extraction (salvage whatever biomarkers parsed cleanly rather than failing the whole upload).
- Never block the user — uploads return immediately (202 Accepted) and processing continues server-side; user sees a live "processing" state.
- On completion, automatically: persist biomarkers, compute deltas vs. history, generate a semantic embedding for chat retrieval, create a timeline event, recompute health scores, regenerate predictive alerts, and run correlation analysis — fully automated pipeline, zero extra user action required.

**Acceptance criteria:** A patient who uploads a routine lab PDF sees, within ~1 minute, a structured summary, the relevant biomarkers added to their trend charts, an updated dashboard health score, and (if relevant) a new alert — without manual data entry at any point.

### 4.2 Health Scoring
**User story:** As a patient, I want one number that tells me how my health is doing, broken down by organ system, that updates automatically as I add new data.

Requirements:
- 10 sub-scores (0–100, higher = healthier): overall, heart, liver, kidney, metabolic, inflammation, lifestyle, preventive, thyroid, blood. (`mental_wellness_score` exists in the data model for future use but is not yet populated by the scoring prompt.)
- Each score must come with: a `data_completeness` ratio, a `confidence` ratio, and `contributing_factors` explaining what data drove it.
- An `ai_narrative` must accompany scores in structured form (disclaimer, one/two-sentence summary, key_areas with title/score/status/detail, reassuring_findings, next_steps, data_currency_warning) — never an unstructured wall of text.
- Recomputation is triggered automatically post-upload and can also be manually triggered by the patient ("Refresh scores").
- One score snapshot per user per calendar day (time-series; dashboard shows current vs. most recent prior for trend deltas).

### 4.3 Predictive Alerts
**User story:** As a patient, I want to be warned about emerging risks before they become serious, with a clear explanation and next step — not a diagnosis.

Requirements:
- Up to 6 prioritized alerts per generation cycle, each with: type (risk_trend / preventive / screening_due / lifestyle), category (cardiovascular / metabolic / renal / hepatic / oncology / respiratory / other), title, 1-sentence summary, 2–3 paragraph detailed explanation, risk_level (low/moderate/high/critical), risk_score, confidence, time_horizon, supporting_evidence, recommended_actions, optional specialist referral, and priority (1–10).
- Every alert must carry the medical disclaimer.
- Patient can dismiss alerts (soft state, not deleted) and filter by risk level.
- Inputs: full biomarker history, family hereditary-risk summary, and profile basics (age, gender, blood group, BMI, chronic conditions, allergies) — i.e. alerts get smarter as more context accumulates (uploads, family data, vitals).

### 4.4 Correlation Intelligence
**User story:** As a patient, I want the system to notice patterns across years of data that I would never spot myself.

Requirements — four distinct analyses, each independently triggerable and re-runnable:
1. **Biomarker trend correlation** — only runs on biomarkers with ≥2 readings; computes % change and span; LLM explains significance, direction (improving/stable/worsening/fluctuating), and a preventive suggestion.
2. **Metabolic syndrome risk** — rule-based scan across glucose, HbA1c, triglycerides, HDL, BP using clinical thresholds (fasting glucose >100, HbA1c >5.7%, triglycerides >150, HDL <40, systolic BP >130); flags risk if ≥2 of 5 factors are elevated (requires ≥3 markers available to assess at all).
3. **Disease progression** — detects ICD-10 codes / AI risk flags recurring across ≥2 records over time, building a timeline of condition appearances.
4. **Medicine–biomarker correlation** — joins medicine start/stop dates against biomarker readings to surface positive effects, side effects, or dependency patterns (worsening after stopping a drug).
- All findings ranked and surfaced by priority; each can be independently re-triggered ("Run correlations").
- Correlation runs are **idempotent** by design — re-running deletes prior AI-generated findings for the user before inserting fresh ones (no duplicate accumulation).

### 4.5 Lifelong Timeline
**User story:** As a patient, I want to scroll through my entire health history like a story, organized by year, with an AI summary of what happened that year.

Requirements:
- Every health record automatically produces a timeline event (type mapped from record type — lab_test, medication, imaging, hospitalization, vaccination, consultation, surgery, checkup).
- Events carry severity (info/warning/critical/improvement), tags, and a 1-sentence AI insight.
- Records with risk flags are marked as milestones (visually distinguished).
- Per-year AI narrative summary (3–4 sentences, warm/second-person tone) covering key events, milestones, overall direction, notable patterns.
- Side-by-side AI comparison between any two historical reports (improved/worsened/unchanged values, new findings, overall direction, follow-up recommendation).

### 4.6 Health Chat (Conversational AI)
**User story:** As a patient, I want to ask my own data questions in plain language and get grounded, sourced answers.

Requirements:
- Session-based chat; each session can optionally scope to specific records.
- Retrieval-augmented generation: combines vector similarity search (pgvector cosine distance over record embeddings) with PostgreSQL full-text search, merged and deduplicated, to build context.
- Context includes: relevant records, recent biomarker trends, active medications.
- Must support both streaming (SSE) and non-streaming response delivery.
- Every assistant response carries the medical disclaimer flag and lists source record citations.
- Last 10 messages used as conversation memory per session.

### 4.7 Lab Report Deep-Analysis
**User story:** As a patient (or as a doctor preparing for a consult), I want an analysis of a full lab panel that's relevant to a specific medical specialty, not generic.

Requirements:
- Specialization-aware focus mapping (9 specializations: Cardiologist, Endocrinologist, Diabetologist, Nephrologist, Gastroenterologist, Hematologist, Rheumatologist, Urologist, General Physician), each mapped to its clinically relevant biomarker subset.
- Output: overall_status, headline, panel-by-panel analysis (with per-marker interpretation and trend vs. previous), cross-marker pattern recognition (e.g., "Metabolic Syndrome" with confidence and risk level), prioritized actions with timeframes, positive findings (explicitly called out, not just risks), lifestyle recommendations with evidence basis, suggested follow-up tests with urgency, and a plain-language patient summary.
- Separate "doctor summary" mode: specialization-filtered pre-consultation note (patient snapshot, key findings, abnormal-but-relevant values, relevant active meds, suggested questions to ask, suggested next steps).
- Biomarker-specific trend comparison over time (first vs. latest reading, % delta, status change, trend direction — accounting for markers where "lower is worse," e.g. HDL, hemoglobin, vitamin D).

### 4.8 Medicine Intelligence
**User story:** As a patient on multiple medications, I want to know if any of them interact dangerously, without having to ask a pharmacist every time I get a new prescription.

Requirements:
- Canonical medicine tracking with dosage, frequency, route, duration, prescriber, status (active/stopped/completed/paused/changed), adherence score, and reported side effects.
- AI-driven interaction checking across all currently active medicines (requires ≥2 active); severity-rated (minor/moderate/major/contraindicated) with mechanism explanation, clinical significance (symptoms to watch), and recommendation.
- Re-running interaction checks clears prior AI-sourced results first (idempotent, no duplicate alerts).
- Patient can acknowledge interaction alerts.
- Local medicine master catalog (canonical name, generic/brand names, drug class, ATC code, mechanism, indications, side effects, contraindications, controlled/OTC/Indian-market flags) underlies fuzzy matching from raw extracted names.

### 4.9 Vitals Tracking
**User story:** As a patient managing a chronic condition, I want to log my daily glucose/BP/weight quickly, separate from formal lab uploads.

Requirements:
- Preset vital types (glucose, BP systolic/diastolic, weight, heart rate, SpO2, temperature) with default units.
- Create, list, update, delete entries; date-stamped, with optional notes.
- Visualized as trend lines per vital type alongside formal biomarker charts (BiomarkerTrendChart).
- Summary endpoint aggregates latest values across vital types for dashboard widgets.

### 4.10 Visit Management
**User story:** As a patient, I want to record a doctor visit and link the lab reports/prescriptions that came out of it.

Requirements:
- Capture visit_date, doctor_name, hospital_name, specialization, chief_complaint, diagnosis, notes, follow_up_date.
- Link/unlink any uploaded HealthRecord to a visit (many records can belong to one visit).
- List, view, update, delete visits.

### 4.11 Consent & Data Sharing
**User story:** As a patient, I decide exactly what a specific doctor can see, for how long, and I can revoke it anytime.

Requirements:
- Granular share flags: full_history, biomarkers, prescriptions, lab_reports, scans, mental_health — each independently toggleable, with privacy-conscious defaults (biomarkers/prescriptions/lab_reports default **on**; full_history, scans, mental_health default **off**).
- Consent lifecycle: PENDING (patient-initiated grant, awaiting doctor accept) → ACTIVE (doctor accepts) or REVOKED (doctor rejects, or patient revokes at any time) → EXPIRED (lazy-evaluated on access attempt past `valid_until`).
- Granting new consent to a doctor automatically supersedes (revokes) any prior active/pending consent to that same doctor — no stacking duplicate grants.
- A separate **"Send Report"** fast path lets a patient immediately share with a doctor or hospital without waiting for doctor acceptance — creates an immediately ACTIVE, time-bounded (default 30-day) consent for direct, patient-initiated sharing.
- Doctor access to any patient data must be gated by an active, non-expired consent and the specific share-flag relevant to the data category being requested.
- Optional purpose text and date-bounding (valid_from/valid_until) for audit and compliance purposes.

### 4.12 Emergency Passport
**User story:** As anyone, a first responder finding an unconscious patient should be able to scan a QR code and instantly see blood group, allergies, conditions, and emergency contacts — no login required.

Requirements:
- Patient creates/updates their own passport: blood group, allergies, critical/life-sustaining medicines, chronic conditions, implants, recent surgeries, DNR flag, emergency contacts, insurance basics.
- "Auto-update" action lets the passport refresh itself from the patient's latest uploaded records (profile + biomarker + medicine data) without manual re-entry.
- A unique, unguessable QR token resolves to a **public, unauthenticated** read-only view at `/emergency/:token` — by design, must work even if the responder has no app account.
- An **offline snapshot** (JSON) is embedded directly in the QR payload so the critical facts are available even without network connectivity at the point of care.
- A separate, scoped "emergency" JWT token type (with an `emergency_read` claim) exists for any flows needing temporary scoped access beyond the public QR view.

### 4.13 Doctor Portal
**User story:** As a doctor, I want to see only the patients who've consented to share with me, get an AI pre-consult brief, and document the visit — without juggling a separate EHR.

Requirements:
- Patient roster strictly limited to patients with an active consent naming this doctor (no browsing the platform's full patient base).
- Patient detail view: overview (demographics, conditions, allergies, latest health score + AI narrative, risk indicators), shared records (consent-flag filtered), AI doctor-summary, clinical notes (add/view), biomarker trends (consent-flag filtered) over a selectable time range.
- Clinical note authoring: chief complaint, clinical findings, diagnosis (+ ICD-10), treatment plan, prescribed medications, follow-up date/notes; notes can be marked private (hidden from patient).
- Lab order requests: test list, urgency (routine/urgent/stat), clinical context; result, once uploaded, can later be linked back to the request.
- Doctor self-service profile: specialization, sub-specialization, qualifications, experience, consultation fee, availability, bio, languages spoken — searchable by patients.
- A doctor who is also an org's `hospital_admin` is redirected away from the doctor portal into the admin portal (role exclusivity is enforced, not just suggested).

### 4.14 Hospital Admin Portal
**User story:** As a hospital administrator, I want to onboard my doctors onto the platform and see how actively the org is being used.

Requirements:
- Organization creation (name, type, address, city/state/pincode, contact info, registration number, GSTIN) — admin who creates it becomes the implicit owner.
- Doctor invitation flow: enter email + role (doctor/hospital_admin/staff) → system generates a token-bound invite link with expiry (default 7 days) → invitee completes registration via the invite link.
- Doctor roster view: name, email, department, role badge, join date.
- Org statistics dashboard: total doctors, total patients (via consent), total active consents, total active records — gives the admin a sense of utilization.

### 4.15 Family Health Graph
**User story:** As a patient, I want the system to know my family's health history so it can warn me about hereditary risks.

Requirements:
- Add family members (linked to an existing HealthWeave user account, or as an offline profile with just a name) with relationship type (15 relationship enums: self, spouse, father, mother, son, daughter, brother, sister, grandparents, uncle, aunt, cousin, caregiver, other).
- Per-member: known hereditary conditions, age-at-diagnosis per condition, deceased flag, notes.
- Access-level model for linked family members (view_summary / view_records / full_access / emergency_only) — supports future caregiver workflows.
- Invitation flow for linking a family member's own HealthWeave account.
- **Hereditary risk computation**: AI analyzes condition + age-of-onset patterns across the family graph to produce per-condition risk_level, risk_score with confidence, explanation, preventive actions, and screening recommendations — explicitly recomputable on demand as family data changes.

### 4.16 Notifications
**User story:** As any user, I want to know when something requiring my attention has happened (consent granted/revoked, new alert, invitation, report ready) without having to check every page.

Requirements:
- 8 notification types: report_ready, doctor_access_request, consent_granted, consent_revoked, alert_generated, appointment_reminder, invitation, system.
- Each notification: title, body, optional deep-link action_url, optional structured extra_data, read/unread state with timestamp.
- List (optionally unread-only), get unread count (drives UI badges), mark single as read, mark all as read.

---

## 5. User Roles & Permission Summary

| Capability | Patient | Doctor | Hospital Admin | Public/Unauthenticated |
|---|---|---|---|---|
| Upload/view own records | ✅ | — | — | — |
| View own health scores/alerts/correlations/chat | ✅ | — | — | — |
| Grant/revoke consent to a doctor | ✅ | — | — | — |
| View a patient's data | — | ✅ (consent-gated, flag-scoped) | — | — |
| Add clinical notes / request labs | — | ✅ | — | — |
| Create organization | — | — | ✅ (first admin) | — |
| Invite doctors to org | — | — | ✅ | — |
| View org stats / doctor roster | — | — | ✅ | — |
| View emergency passport via QR | — | — | — | ✅ (token-gated, read-only) |

Role exclusivity is enforced in the frontend route guards and backend RBAC dependencies alike: a `hospital_admin` cannot access doctor routes and vice versa; both are blocked from patient routes unless they also hold a separate patient identity (not currently modeled — roles are mutually exclusive per user account today).

---

## 6. Success Metrics (Product KPIs)

Since this is an early-stage product without production traffic data, the following are the target metrics the platform is instrumented (or should be instrumented) to measure once live:

- **Upload-to-insight latency**: time from document upload to fully processed (OCR + biomarkers + score + alerts + correlations). Target: <90 seconds p95.
- **Extraction accuracy**: AI-reported `extraction_confidence` and `ocr_confidence` distributions; spot-audited against ground truth.
- **Consent funnel conversion**: % of patients who grant at least one doctor consent within 30 days of signup.
- **Alert actionability**: % of alerts marked `is_actioned` vs. dismissed-without-action.
- **Chat engagement**: sessions per active user per month; average messages per session.
- **Doctor portal stickiness**: % of doctors with ≥1 consented patient who return weekly.
- **Time-in-system value**: number of biomarkers with ≥2 readings per user over time (proxy for "the timeline is actually building").

## 7. Compliance & Trust Commitments (Product-Level)

These are user-facing promises that must remain true as the product evolves — verified against the current implementation:

- "AES-256 encrypted" — S3 server-side encryption (SSE-S3/AES256) is applied to every uploaded document.
- "DPDP 2023 compliant" — granular, revocable, purpose-bound consent model; no default full-history sharing.
- "Your data is never sold" — no third-party data-sharing or monetization pathways exist in the codebase today.
- "AI is for informational purposes only" — medical disclaimer is structurally injected into every AI-generated patient-facing output (scores, alerts, correlations, chat, lab analysis).
- Audit trail — sensitive actions (login, profile reads, consent changes) are logged immutably; **audit log rows must never be deleted** (standing compliance constraint).

---

## 8. Open Product Questions / Known Gaps

These are honestly surfaced rather than glossed over, since this PRD is meant to reflect ground truth:

1. **No email/phone verification enforced** — `is_verified` exists on the User model but registration does not require verifying email/phone before full access. A future "verified account" trust signal could use this.
2. **No appointment booking / scheduling** — lab requests and visits are documented retrospectively or as a request, but there's no calendar/booking UX yet.
3. **Caregiver role has no dedicated UI** — modeled in the schema (`caregiver` role, family access levels) but no caregiver-facing portal exists yet.
4. **Mental wellness score** is in the data model but not yet populated by the scoring engine.
5. **No logout/session revocation server-side** — JWT design is fully stateless; a stolen refresh token remains valid until natural expiry (30 days) since there is no token blacklist.
6. **Single-region only** — all infrastructure and data residency assumptions are India-only today.
