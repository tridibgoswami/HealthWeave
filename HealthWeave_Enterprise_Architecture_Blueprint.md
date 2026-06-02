# HealthWeave — Enterprise Architecture Blueprint
## A Complete Technical & Strategic Design Guide

**Version:** 1.0  
**Date:** June 2026  
**Classification:** Confidential — Internal Strategy Document  

---

## TABLE OF CONTENTS

1. [Client Segments & Deployment Philosophy](#part-1)
2. [Access Channels — How Each Client Uses the Product](#part-2)
3. [Multi-Tenancy Architecture](#part-3)
4. [Security Architecture](#part-4)
5. [Infrastructure Architecture](#part-5)
6. [Scalability Architecture](#part-6)
7. [Integration Architecture](#part-7)
8. [Enterprise Onboarding & Commercial Architecture](#part-8)
9. [Compliance & Regulatory Roadmap](#part-9)
10. [Product Evolution Roadmap](#part-10)
11. [Team Structure for Scale](#part-11)
12. [Architecture Decision Matrix](#part-12)

---

## PART 1: CLIENT SEGMENTS & DEPLOYMENT PHILOSOPHY {#part-1}

### 1.1 The Three Core Client Archetypes

Before choosing infrastructure, you must understand who pays you, how they consume data,
and what they legally require.

---

#### Archetype A — Enterprise (Hospitals, Diagnostic Chains, Corporates)

These clients have 50 to 50,000+ users. They have compliance officers, IT departments,
and existing systems (HIS, LIS, EMR, PACS). They demand:

- Contractual SLAs (99.9% or 99.99% uptime)
- Data residency guarantees (patient data stays in their country/region)
- Integration with their existing hospital systems
- Custom branding (white-label)
- Dedicated support and onboarding
- Audit trails for regulators
- Role-based access for doctors, nurses, admins, billing staff

#### Archetype B — Individual Doctors / Small Clinics (SMB)

Solo practitioners or small clinics with 1–20 staff. They want simplicity, fast setup,
and affordable monthly billing. They do not want to manage infrastructure. They need:

- Simple web browser access (no IT team required)
- Patient management in their clinic workflow
- Ability to receive patient-shared reports
- Prescription and lab request workflows
- Mobile access while doing rounds

#### Archetype C — Individual Patients (B2C / Retail)

Consumers managing their own health. They are used to Gmail, Dropbox, and Paytm UX patterns.
They want:

- Free tier with upgrade option
- Mobile-first experience
- Family health management
- Upload and understand their own reports
- Share records with any doctor
- Emergency QR code for accidents

---

### 1.2 Deployment Model Decision Matrix

| Client Type | Recommended Model | Who Hosts | Data Location |
|---|---|---|---|
| Large Hospital Chain (500+ beds) | Dedicated SaaS Tenant or Private Cloud | You host, isolated environment | Client's chosen region |
| Diagnostic Chain (Apollo, SRL) | Dedicated SaaS Tenant | You host, isolated DB | India region |
| Corporate Wellness | Shared SaaS (multi-tenant) | You host | India region |
| Government Hospital | On-Premise / Private Cloud | Client's NIC/data center | Client-controlled |
| Individual Doctor | Shared SaaS (multi-tenant) | You host | India region |
| Individual Patient | Shared SaaS (multi-tenant) | You host | India region |
| International Hospitals | Regional SaaS deployment | You host, region-specific | Client's country |

**The Guiding Principle:** Start with a well-architected multi-tenant SaaS. Build the ability
to "eject" any tenant into an isolated environment when they demand it (large enterprise
contracts). Never build on-premise first — it will kill your startup velocity.

---

## PART 2: ACCESS CHANNELS — HOW EACH CLIENT USES THE PRODUCT {#part-2}

### 2.1 Individual Patients — The B2C Channel

**Primary Access: Progressive Web App (PWA) + Native Mobile App**

- **Browser (PWA):** Works like Gmail — users visit `app.healthweave.in`, log in, and access
  everything. The PWA installs to their phone home screen without going through the App Store.
  This is your fastest path to users.
- **Native iOS/Android App:** Build this in Phase 2 (React Native or Flutter reusing your
  existing API). Offers push notifications, biometric login, offline access to emergency
  passport, camera-direct document scanning.
- **WhatsApp Bot (Phase 2):** For non-smartphone users or quick interactions —
  "Send me my last blood sugar reading."
- **No desktop-only approach** — 85% of Indian users access health apps on mobile.

**Freemium Structure:**

| Feature | Free Tier | Pro (₹299/month) | Family (₹699/month) |
|---|---|---|---|
| Record Uploads | 10 records | Unlimited | Unlimited |
| AI Chat | 3 sessions/day | Unlimited | Unlimited |
| Health Score | Basic | Full intelligence suite | Full intelligence suite |
| Emergency Passport | Yes | Yes | Yes |
| Family Members | Self only | Self only | Up to 6 members |
| Processing Priority | Standard | Priority | Priority |
| Caregiver Access | No | No | Yes |

---

### 2.2 Individual Doctors / Small Clinics — The SMB Channel

**Primary Access: Web Browser (SaaS)**

Doctors visit `clinic.healthweave.in` or a white-labeled `yourname.healthweave.in`.
This works exactly like a CRM — no installation, any browser, any device.

**Workflow in the Clinic:**

1. Patient walks in → doctor opens their HealthWeave dashboard
2. Patient shares their records via consent (one-time OTP on phone)
3. Doctor sees AI-summarized patient history, biomarker trends, last 5 visits
4. Doctor adds clinical notes, requests labs, writes prescriptions
5. All of this auto-populates in the patient's timeline
6. Follow-up reminder sent automatically to patient

**Mobile App for Doctors:** A lighter "Doctor Mode" app for ward rounds, quick notes,
viewing critical patients. Not the full desktop workflow.

**Pricing:** ₹1,999–₹4,999/month per doctor. Billed per seat. Free for patients who are
referred by enrolled doctors (acquisition lever).

---

### 2.3 Hospitals & Diagnostic Centers — The Enterprise Channel

**Three Sub-Modes of Access:**

**Mode 1 — HealthWeave as the Primary System (Greenfield)**

For hospitals without an existing HIS or those wanting to replace it. HealthWeave becomes
their core patient data platform. Users access it via browser at their hospital's domain
(e.g., `max-hospitals.healthweave.com` or a fully white-labeled `records.maxhealthcare.com`).

**Mode 2 — HealthWeave as the Intelligence Layer (Overlay/Integration)**

For hospitals with existing HIS (Practo, Jiviti, Athena, Epic). HealthWeave connects via
HL7 FHIR APIs and adds the AI intelligence layer on top. Doctors still use their familiar
HIS but HealthWeave powers the AI summaries, risk predictions, and patient-facing portal.

**Mode 3 — Embedded Widget**

HealthWeave's AI summaries, biomarker trends, and risk scores are embedded directly into
the hospital's existing software via iFrame or Web Components. Minimal disruption to
their workflow.

**For Diagnostic Centers (Apollo Diagnostics, SRL, Dr. Lal Path):**

- Automated report upload via SFTP or FHIR/HL7 integration from their LIS
- Patient gets instant AI explanation of their report
- Doctor gets digital structured data instead of PDFs
- The diagnostic center's brand is front and center (white-label)
- They pay per-report-processed or flat monthly enterprise fee

---

### 2.4 Corporate Wellness Programs

Large corporates (Infosys, TCS, HDFC Bank) offer health benefits to employees. HealthWeave
becomes their employee health platform.

- Single Sign-On (SSO) via corporate Azure AD / Google Workspace
- Anonymized aggregate health dashboards for HR (population health)
- Individual employees get full private health records — HR cannot see individual data
- Annual health check integration — employee gets AI-explained results same day
- Compliance with corporate health data policies

---

## PART 3: MULTI-TENANCY ARCHITECTURE {#part-3}

### 3.1 Tenancy Strategy — The Silo vs. Pool vs. Bridge Decision

**Chosen Model: Pooled Multi-Tenancy with Isolated Tiers**

This is the gold standard for healthcare SaaS.

**Tier 1 — Shared Pool (SMB + B2C)**

All individual patients and small clinics share the same database, application servers,
and infrastructure. Row-level security using `tenant_id` (or `organization_id`) ensures
data isolation. Every database query is automatically scoped to the tenant.
This is cost-efficient and covers 95% of your clients.

**Tier 2 — Dedicated Database, Shared App (Mid-Market)**

Hospital chains with 1,000–10,000 patients get their own isolated PostgreSQL database
(or schema) but share the same application servers and API layer. Their data never touches
another tenant's database. Configuration, workflows, and AI models can be customized
per tenant.

**Tier 3 — Fully Isolated Environment (Enterprise/Government)**

Large government hospitals or highly regulated enterprises get their own complete deployment:
separate Kubernetes namespace or cluster, separate database, separate AI processing pipeline.
Their data is physically isolated. This is offered at a significant premium (₹50L+ annual
contract).

**How the Routing Works:**

```
Incoming Request
      ↓
API Gateway (reads subdomain or JWT claim)
      ↓
Tenant Router
      ↓
┌─────────────────────────────────────┐
│  Tier 1       │  Tier 2   │  Tier 3 │
│  Shared Pool  │  Ded. DB  │  Isolated│
│  (B2C + SMB)  │  (Mid)    │  (Entpr) │
└─────────────────────────────────────┘
```

---

### 3.2 Organization Hierarchy in the Data Model

```
HealthWeave Platform
│
├── Organization (Hospital / Clinic / Diagnostic Center / Corporate)
│   ├── Organization Members (Doctors, Admins, Nurses, Billing Staff)
│   ├── Departments (Cardiology, Radiology, Pathology)
│   ├── Patients (with consent-based access)
│   └── Organization Settings (branding, workflows, integrations)
│
├── Individual Doctors (solo, not part of an org)
│
└── Individual Patients (B2C, self-managed)
```

Every piece of data — health record, AI result, chat message — carries an `owner_user_id`
and an optional `organization_id`. Access control checks both before returning any data.

---

## PART 4: SECURITY ARCHITECTURE {#part-4}

Security in healthcare is non-negotiable. A single breach ends your company.

### 4.1 The Seven Layers of Security

---

#### Layer 1 — Network Security

- All traffic terminates at a managed WAF (Web Application Firewall) — Cloudflare Enterprise
  or AWS WAF
- WAF blocks OWASP Top 10 attacks (SQLi, XSS, CSRF, etc.) before they reach your servers
- DDoS protection at network edge (Cloudflare Spectrum for volumetric attacks)
- Private networking: API servers, databases, and AI workers are NEVER on the public
  internet — only the load balancer is publicly exposed
- VPC (Virtual Private Cloud) with strict security groups — database port 5432 is only
  accessible from the API server's private subnet

---

#### Layer 2 — Identity & Authentication

- JWT tokens with short expiry (15 minutes access token, 7-day refresh token with rotation)
- Multi-Factor Authentication (MFA) mandatory for all doctors, hospital staff, and admins
- Hardware security key support (FIDO2/WebAuthn) for super-admins and compliance officers
- Biometric authentication on mobile apps
- Social login (Google) for patients, but with FIDO2 option
- SSO via SAML 2.0 or OIDC for enterprise clients using Azure AD, Okta, or Google Workspace
- Session management: concurrent session limits, geographic anomaly detection

---

#### Layer 3 — Authorization & Access Control

- Role-Based Access Control (RBAC) with fine-grained permissions
- Attribute-Based Access Control (ABAC) for sensitive records — e.g., HIV status only
  visible to certain specializations with patient explicit consent
- Consent management: patients control exactly which doctor can see which category of
  records for how long
- Break-glass access: emergency override for critical care with full audit trail and
  post-event review

**Roles in the System:**

| Role | Description | Permissions |
|---|---|---|
| `super_admin` | HealthWeave platform admin | Everything |
| `hospital_admin` | Manages org settings and members | Org-scoped full access |
| `doctor` | Clinical care provider | Consented patient records + clinical notes |
| `nurse` | Clinical support | Limited clinical access, no AI insights |
| `radiologist` | Radiology specialist | Scan records only |
| `patient` | Record owner | Full access to own records, controls consent |
| `caregiver` | Family member or proxy | Patient-controlled permissions |
| `billing_staff` | Financial operations | Insurance documents only, no clinical data |
| `diagnostic_tech` | Lab/radiology technician | Uploads results, cannot read AI analysis |

---

#### Layer 4 — Data Encryption

- **Encryption in Transit:** TLS 1.3 everywhere. No HTTP anywhere in the system.
- **Encryption at Rest:** AES-256 for all database storage, S3 bucket encryption
- **Field-Level Encryption:** Particularly sensitive fields (HIV status, mental health,
  reproductive health) encrypted with a per-patient key stored in a separate Key
  Management Service (KMS — AWS KMS or HashiCorp Vault)
- **Document Storage:** Files (PDFs, images) stored in encrypted S3 with pre-signed URLs
  (time-limited, single-use). Files are never publicly accessible.
- **Key Rotation:** Encryption keys rotated every 90 days automatically
- **Envelope Encryption:** Data encrypted with a data key, which is encrypted with a
  master key (KMS). Allows re-encryption without re-encrypting all data.

---

#### Layer 5 — Application Security

- Input validation on every API endpoint (Pydantic schemas on the backend)
- SQL injection prevention via ORM (never raw string SQL in production)
- CORS policy: only your known domains are whitelisted
- Content Security Policy headers (implemented in your backend)
- Rate limiting: per-IP, per-user, per-organization (implemented)
- File upload security: virus scanning (ClamAV) + MIME type validation + file size
  limits before any processing
- AI prompt injection prevention: user input to Claude API is sanitized and wrapped
  with system context that cannot be overridden by user content
- Dependency scanning: automated alerts for vulnerable npm/Python packages
  (GitHub Dependabot + Snyk)

---

#### Layer 6 — Audit & Compliance

- **Immutable audit log:** every data access, modification, and deletion is logged with
  timestamp, user, IP, user agent. Logs are write-once (cannot be deleted or modified
  even by admins)
- **Audit log storage:** separate, append-only database or cloud storage (S3 with
  Object Lock)
- **Data access reports:** patients can download a full report of who accessed their
  data and when
- **DPDP 2023 compliance:**
  - Right to access own data
  - Right to correction
  - Right to erasure (with healthcare data retention caveats)
  - Consent management
  - Data Fiduciary registration
- HL7 FHIR R4 compliance for interoperability
- ISO 27001 certification (target in Year 2)
- SOC 2 Type II certification (target in Year 2 for US market)

---

#### Layer 7 — Infrastructure Security

- **Secrets management:** no secrets in code or environment files — use AWS Secrets
  Manager or HashiCorp Vault
- **Vulnerability scanning:** automated container image scanning before deployment
  (Trivy/Snyk)
- **Penetration testing:** quarterly external pen test, annual comprehensive security audit
- **Zero-trust networking:** all internal service-to-service communication requires
  mTLS (mutual TLS)
- **Immutable infrastructure:** no SSH to production servers. All changes via CI/CD
  pipeline. Infrastructure as Code (Terraform).

---

### 4.2 Data Residency Strategy

| Market | Regulation | Region | Cloud Provider |
|---|---|---|---|
| India | DPDP 2023 | AWS Mumbai (ap-south-1) | AWS or Azure India |
| European Union | GDPR | AWS Frankfurt (eu-central-1) | AWS or Azure Europe |
| United States | HIPAA | AWS US East (us-east-1) | AWS (with BAA) |
| Middle East | Local data sovereignty | AWS Bahrain | AWS or Azure UAE |
| Southeast Asia | Local regulations | AWS Singapore | AWS |

**The architecture uses a Regional Deployment Model** — each region is a fully independent
deployment of the entire stack. A global traffic manager routes users to the nearest region.
Cross-region data transfer is prohibited by default and requires explicit legal agreement.

---

## PART 5: INFRASTRUCTURE ARCHITECTURE {#part-5}

### 5.1 The Phased Infrastructure Evolution

| Phase | Timeline | Platform | Users | Monthly Cost |
|---|---|---|---|---|
| Phase 0 | Now | DigitalOcean App Platform | 0–1,000 | ₹8K–15K |
| Phase 1 | Month 3–6 | DigitalOcean Kubernetes or AWS EKS | 1K–10K | ₹40K–80K |
| Phase 2 | Month 6–18 | AWS EKS Production-Grade | 10K–100K | ₹2L–8L |
| Phase 3 | Month 18–36 | Multi-region AWS | 100K–1M+ | ₹15L–50L |

---

### 5.2 The Complete Infrastructure Stack (Phase 2 Target)

#### Networking & Entry Layer

```
Internet
    ↓
Cloudflare (DNS + CDN + WAF + DDoS + SSL termination)
    ↓
AWS Application Load Balancer
    ↓
Kubernetes Ingress Controller (NGINX or AWS ALB Ingress)
    ↓
Kubernetes Services → Pods
```

---

#### Compute Layer

- **AWS EKS (Elastic Kubernetes Service):** manages all containers
- **Auto Scaling Groups for worker nodes:** scale from 3 to 100 nodes automatically
- **Spot Instances** for AI/ML batch workloads (50–70% cost reduction)
- **On-demand instances** for API servers (predictable, never interrupted)

---

#### Application Services (Kubernetes Pods)

| Service | Description | Scaling |
|---|---|---|
| API Service | FastAPI application | HPA: 2–20 pods based on CPU/request rate |
| Background Workers | Document processing, AI analysis | 2–50 pods based on queue depth |
| AI Processing Service | Claude API calls | Queue-based, scale on queue length |
| Notification Service | Email, SMS, push notifications | Isolated pool, 2–10 pods |
| Scheduler | Cron jobs: health scores, alerts | Single pod with leader election |
| WebSocket Service | Real-time AI chat streaming | Sticky sessions, 2–10 pods |

---

#### Data Layer

| Component | Technology | Purpose |
|---|---|---|
| Primary Database | AWS RDS PostgreSQL (Multi-AZ) | All structured data |
| Read Replicas | RDS Read Replicas (1–5) | Reporting, analytics queries |
| Cache | AWS ElastiCache Redis (Multi-AZ) | Sessions, rate limits, caching |
| Document Storage | AWS S3 + CloudFront | PDFs, images, scans |
| Search | AWS OpenSearch | Full-text search across records |
| Vector Search | pgvector on RDS | Semantic/AI similarity search |
| Time Series | AWS Timestream or InfluxDB | Vitals tracking (optimized) |
| Connection Pool | PgBouncer or RDS Proxy | Multiplexes 1000 → 50 DB connections |

---

#### AI/ML Layer

| Component | Technology | Purpose |
|---|---|---|
| Primary LLM | Claude API (Anthropic) | Document analysis, AI chat, insights |
| LLM Gateway | LiteLLM or custom | Rate limiting, cost tracking, caching, fallback |
| Prompt Store | Git-versioned | All system prompts versioned and A/B tested |
| Prompt Cache | Anthropic cache prefix | 90% cost reduction on repeated system prompts |
| Batch Processor | Celery + SQS | Off-peak AI workloads (2 AM–6 AM) |
| Cost Monitor | Custom dashboard | Per-tenant AI spend tracking |

---

#### Message Queue & Event Bus

| Component | Technology | Purpose |
|---|---|---|
| Task Queue | AWS SQS | Document uploads, AI processing, notifications |
| Event Fan-out | AWS SNS | One event triggers multiple consumers |
| Scheduler | AWS EventBridge | Cron-like scheduled jobs |
| Celery Broker | Redis | Task management for Python workers |

---

#### Observability Stack

| Component | Tool | Purpose |
|---|---|---|
| Metrics | Prometheus + Grafana | CPU, memory, requests, errors, latency |
| Logging | ELK Stack / CloudWatch | Centralized logs, retention policies |
| Tracing | AWS X-Ray / Jaeger | Distributed request tracing |
| Alerting | PagerDuty / OpsGenie | On-call rotation, incident management |
| Uptime | Pingdom / UptimeRobot | External checks every 60 seconds |
| RUM | Datadog or New Relic | Real user experience monitoring |
| Error Tracking | Sentry | Frontend and backend error capture |

---

#### CI/CD Pipeline

```
Developer pushes code
        ↓
GitHub Actions (unit tests + integration tests + E2E Playwright tests)
        ↓
Docker build + push to AWS ECR (container registry)
        ↓
ArgoCD detects new image tag in GitOps repo
        ↓
Kubernetes rolling update (zero downtime)
   - 1 new pod starts, receives traffic
   - 1 old pod drains and stops
   - Repeat until all pods updated
        ↓
Health checks pass → deployment complete
        ↓         (or)
Health checks fail → automatic rollback to previous version
```

---

### 5.3 High Availability & Zero Downtime Design

#### The 99.99% Uptime Strategy (52 minutes of downtime per year)

**Multi-AZ Deployment:**
- All critical services run in at least 2 Availability Zones simultaneously
- AWS RDS Multi-AZ: automatic failover in 60–120 seconds if primary DB fails
- Redis ElastiCache Multi-AZ: automatic failover
- If one entire AZ (data center) goes down, system continues from the other AZ
  without manual intervention

**Multi-Region Disaster Recovery:**

| Metric | Target |
|---|---|
| Recovery Time Objective (RTO) | 15 minutes |
| Recovery Point Objective (RPO) | 5 minutes |
| Primary Region | AWS Mumbai (ap-south-1) |
| DR Region | AWS Singapore (ap-southeast-1) |
| DB Replication | Continuous RDS replication to DR region |
| Backup Frequency | Automated daily snapshots + continuous PITR |
| Backup Testing | Automated weekly test restore |
| Failover Type | Manual (Year 1) → Automatic (Year 2) |

**Database Backup Strategy:**

- Automated daily snapshots (RDS automated backups, 35-day retention)
- Point-in-time recovery: restore to any second in the last 35 days
- Cross-region backup replication: Mumbai backups copied to Singapore nightly
- S3 cross-region replication for all uploaded documents
- Disaster recovery drill: quarterly simulated failover test

**Graceful Degradation (What Works When Something Fails):**

| Component Down | User Impact | System Behavior |
|---|---|---|
| Claude API | AI features unavailable | Record upload, viewing, emergency passport still work |
| Redis | Slight slowdown | Falls back to DB-level rate limiting |
| Notification Service | Delayed notifications | Actions complete, notifications queued |
| Search | Search unavailable | Browse by date/type still works |
| One AZ | None | Automatic failover, zero user impact |

**Zero-Downtime Deployment Rules:**

1. Database migrations are always additive (never DROP column without grace period)
2. New column = nullable with default OR two-phase migration
3. API changes are backward-compatible (version old endpoints, not delete them)
4. Blue-green deployments for risky database changes
5. Canary deployments for new features: 5% → 25% → 100% traffic over hours
6. Feature flags for instant rollback without code deployment

---

## PART 6: SCALABILITY ARCHITECTURE {#part-6}

### 6.1 Traffic & Infrastructure Scaling Projections

| Metric | 1,000 users | 10,000 users | 100,000 users | 1M users |
|---|---|---|---|---|
| Concurrent users (peak) | 50 | 500 | 5,000 | 50,000 |
| API requests/second | 10 | 100 | 1,000 | 10,000 |
| DB connections needed | 20 | 200 | 2,000 | 20,000 |
| AI API calls/day | 500 | 5,000 | 50,000 | 500,000 |
| Document storage | 100 GB | 1 TB | 10 TB | 100 TB |
| Infra cost estimate | ₹15K/mo | ₹80K/mo | ₹5L/mo | ₹40L/mo |
| Claude API cost | ₹5K/mo | ₹50K/mo | ₹4L/mo | ₹35L/mo |

### 6.2 Horizontal vs. Vertical Scaling Decision

**Scale Horizontally (add more machines):**
- API servers (stateless FastAPI pods)
- Background workers (Celery)
- AI processing workers
- Database read replicas

**Scale Vertically (bigger machine):**
- Primary PostgreSQL database (more RAM = better caching)
- Redis (single node handles millions of ops/second)
- Scale vertically first, then add replicas/cluster

### 6.3 Caching Strategy

| Cache Target | TTL | Reason |
|---|---|---|
| User profile (GET /auth/me) | 5 minutes | Every authenticated request calls this |
| Health scores | 1 hour | Computed, doesn't change by the minute |
| Risk predictions | 6 hours | Expensive to compute |
| Organization settings | 30 minutes | Rarely changes |
| Biomarker trends | 2 hours | Historical data, stable |
| Alert list | 15 minutes | Near-real-time acceptable |
| Health records list | 0 (no cache) | Must be fresh, security-sensitive |
| Individual records | 0 (no cache) | Must be fresh, security-sensitive |

### 6.4 Async Processing Architecture

**Never make users wait for heavy operations.**

```
User uploads PDF
      ↓
API accepts in < 200ms → returns {status: "processing", record_id: "..."}
      ↓
Document → SQS Queue
      ↓
OCR Worker picks up → extracts text (30–90 seconds)
      ↓
AI Analysis Worker → Claude analyzes, extracts biomarkers (20–40 seconds)
      ↓
Intelligence Worker → updates health score, risk predictions (5–10 seconds)
      ↓
Notification Worker → push notification + email to patient
      ↓
Patient opens app → sees fully processed results
```

### 6.5 AI Cost Management at Scale

| Strategy | Description | Cost Reduction |
|---|---|---|
| Prompt Caching | Cache system prompts at Anthropic | 70–90% on cached tokens |
| Model Tiering | Use smaller model for simple tasks | 80% for eligible tasks |
| Batch Processing | Run non-urgent AI at 2–6 AM | 50% via off-peak scheduling |
| Per-Tenant Budgets | Track and throttle per client | Prevents cost surprises |
| Preprocessing | Extract simple values before LLM | Eliminates unnecessary LLM calls |
| Result Caching | Cache AI results for unchanged data | Avoids re-processing |

---

## PART 7: INTEGRATION ARCHITECTURE {#part-7}

### 7.1 Hospital System Integration Standards

#### HL7 FHIR R4 (Primary Standard — Modern Systems)

All modern hospital systems are moving to FHIR. Expose FHIR-compliant endpoints:

| Endpoint | Direction | Purpose |
|---|---|---|
| `GET /fhir/Patient/{id}` | Outbound | Patient demographics in FHIR format |
| `POST /fhir/DiagnosticReport` | Inbound | Lab reports from LIS |
| `GET /fhir/Observation/{id}` | Outbound | Biomarker readings |
| `POST /fhir/MedicationRequest` | Inbound/Outbound | Prescription integration |
| `GET /fhir/Condition` | Outbound | Diagnoses and conditions |
| `POST /fhir/DocumentReference` | Inbound | Document uploads from any system |

#### HL7 v2 (Legacy Systems — Many Indian Hospitals)

Many Indian hospitals still use HL7 v2 over MLLP. An HL7 v2 adapter translates
old-format messages into your internal format. This unlocks large hospital contracts.

#### DICOM (Radiology Integration)

| Component | Technology | Purpose |
|---|---|---|
| DICOM Storage | AWS HealthImaging | Store CT, MRI, X-ray images |
| DICOM Viewer | Cornerstone.js (frontend) | Display images in browser |
| DICOM Worklist | Custom adapter | Receive orders from PACS |
| AI on DICOM | Separate AI pipeline | Radiology report analysis |

#### SFTP Automated Upload (Fallback for Non-API Systems)

For diagnostic centers not ready for API integration:
- HealthWeave provides a secure SFTP endpoint
- They drop PDF/HL7 files into a designated folder nightly
- Automated ingestion, processing, and patient matching (name + DOB + phone)
- Delivery confirmation report sent back daily

---

### 7.2 Integration Marketplace (Phase 2)

Pre-built connectors activatable in one click:

| Connector | Type | Value |
|---|---|---|
| Practo Connect | Appointment data | Patient visit history |
| Thyrocare Direct | Lab results API | Auto-post when resulted |
| Apollo LIS | Internal integration | Apollo hospital chain |
| ABDM / ABHA ID | India national health ID | Regulatory compliance + trust |
| TPA Integration | Insurance APIs | Cashless pre-authorization |
| Google Fit / Apple Health | Wearables | Step count, heart rate, sleep |
| Aarogya Setu | Govt health platform | Vaccination records |
| WhatsApp Business | Messaging | Patient notifications, reminders |

---

### 7.3 ABDM (Ayushman Bharat Digital Mission) Integration

Critical for the Indian market — this is India's national health data infrastructure.

| ABDM Component | What It Means for HealthWeave |
|---|---|
| ABHA ID | Patients link their national health ID to HealthWeave |
| PHR App Certification | HealthWeave certified as a Personal Health Record app |
| Health Locker | HealthWeave becomes a registered health locker |
| Consent Manager | Advanced tier — manage consent across the healthcare ecosystem |
| HIU (Health Information User) | Hospitals can request patient records via ABDM |
| HIP (Health Information Provider) | HealthWeave provides records back to ABDM ecosystem |

---

## PART 8: ENTERPRISE ONBOARDING & COMMERCIAL ARCHITECTURE {#part-8}

### 8.1 The Enterprise Sales & Technical Onboarding Journey

| Phase | Duration | Activities |
|---|---|---|
| Discovery | Week 1–2 | CTO meeting, understand current systems, security questionnaire |
| Proof of Concept | Week 3–6 | Sandbox environment, integration test, AI demo on their data |
| Contracting | Week 7–10 | MSA, DPA, SLA agreement, BAA (if HIPAA) |
| Implementation | Week 11–20 | Integration dev, staff training, parallel running |
| Go-Live | Week 20 | Cutover with rollback plan |
| Ongoing | Continuous | Quarterly business reviews, dedicated CSM |

**Key Documents Required for Enterprise Contracts:**

- MSA (Master Services Agreement)
- DPA (Data Processing Agreement) — critical for DPDP/HIPAA
- SLA Agreement (uptime guarantee, support tiers, penalty clauses)
- BAA (Business Associate Agreement) for HIPAA clients
- Security questionnaire responses
- Penetration test report (last 6 months)
- ISO 27001 / SOC 2 certificate (when available)
- Data flow diagram showing exactly where patient data is stored and processed

---

### 8.2 Pricing Architecture

#### B2C — Patient Plans

| Plan | Price | Target |
|---|---|---|
| Free | ₹0 | Acquisition, viral growth |
| Pro | ₹299/month | Chronic disease patients, seniors |
| Family | ₹699/month | Families with dependents |
| Annual (Pro) | ₹2,990/year | Retention (2 months free) |
| Annual (Family) | ₹6,990/year | Retention (2 months free) |

#### B2B — Doctor/Clinic Plans

| Plan | Price | Seats |
|---|---|---|
| Solo Practice | ₹1,999/month | 1 doctor |
| Small Clinic | ₹4,999/month | Up to 5 doctors |
| Large Clinic | ₹9,999/month | Up to 15 doctors |
| Annual discount | 20% off | All plans |

#### B2B Enterprise — Hospitals & Diagnostics

| Tier | Price Model | Notes |
|---|---|---|
| Small Hospital (< 100 beds) | ₹50,000/month | Per-bed pricing |
| Medium Hospital (100–500 beds) | ₹1.5L–5L/month | Custom contract |
| Large Chain (500+ beds) | ₹10L+/month | Custom + % of cost savings |
| Diagnostic Center | ₹2–5 per report processed | Usage-based |
| Corporate Wellness | ₹100–200 per employee/year | Per-seat annual |
| Government / Tender | Project-based | Separate bid process |

#### SLA Tiers

| Tier | Uptime SLA | Support Response | Price Premium |
|---|---|---|---|
| Standard | 99.5% | Email, 48 hours | Included |
| Professional | 99.9% | Email + chat, 8 hours | +20% |
| Enterprise | 99.95% | Dedicated, 4 hours | +50% |
| Mission Critical | 99.99% | Dedicated 24/7, 1 hour | Custom |

---

## PART 9: COMPLIANCE & REGULATORY ROADMAP {#part-9}

### 9.1 India-Specific Compliance

#### DPDP Act 2023 (Digital Personal Data Protection)

| Requirement | Implementation | Timeline |
|---|---|---|
| Consent management | Already in schema | Done |
| Data Principal rights (access, correction, erasure) | API endpoints | Phase 1 |
| Data Fiduciary registration | DPBI registration | On rule notification |
| Data Protection Officer appointment | Hire / designate | Year 1 |
| Breach notification (72 hours) | Incident response plan | Year 1 |
| Data retention policies | Automated deletion jobs | Phase 2 |

#### ABDM Compliance

| Milestone | Description | Timeline |
|---|---|---|
| ABHA ID integration | Patient links national health ID | Phase 1 |
| PHR App certification | Certified personal health record app | Phase 2 |
| HIU registration | Can request patient records via ABDM | Phase 2 |
| HIP registration | Can provide records to ABDM ecosystem | Phase 2 |
| Consent Manager | Full consent management across ecosystem | Year 2+ |

#### Telemedicine Practice Guidelines 2020

- AI must include clear disclaimers (not a replacement for medical advice) ✓
- Clinical decision support cannot override physician judgment — UI must reinforce this ✓
- All AI-generated insights must be clearly labeled as AI-generated ✓

---

### 9.2 International Compliance Targets

| Standard | Market | Timeline | Key Requirements |
|---|---|---|---|
| HIPAA | United States | Year 2 | BAA with AWS, audit controls, breach notification |
| GDPR | European Union | Year 2–3 | DPIA, right to erasure, SCCs |
| ISO 27001 | Global (enterprise requirement) | Year 2 | ISMS, 6–12 month certification |
| SOC 2 Type II | US / Global enterprise | Year 2 | Security, availability, confidentiality controls |
| PIPEDA | Canada | Year 3 | Privacy policy, consent, breach notification |

---

## PART 10: PRODUCT EVOLUTION ROADMAP {#part-10}

### Phase 1 — Foundation (Now to Month 6)

**Core Features (Building Now):**
- Core record management ✓
- AI document analysis ✓
- Health intelligence dashboard ✓
- Emergency passport ✓
- Doctor portal ✓
- Consent management ✓
- Vitals manual entry ✓
- Comments on records ✓
- Biomarker comparison table ✓
- Visit segregation ✓

**Technical Targets:**
- 100% E2E test coverage
- Sub-2-second API response times p99
- DPDP-compliant consent flows
- ABDM ABHA ID basic integration
- Mobile-responsive PWA
- Performance budget: < 3 second LCP on mobile

---

### Phase 2 — Growth (Month 6–18)

**Product Features:**
- Native iOS/Android app (React Native)
- HL7 FHIR R4 API (hospital integrations)
- Diagnostic center bulk processing pipeline
- WhatsApp bot for record sharing and reminders
- Telemedicine integration (video consultation within platform)
- Advanced AI: radiology report analysis, ECG interpretation
- Offline mode for emergency passport
- Multi-language support (Hindi, Tamil, Telugu, Bengali)
- DICOM viewer for radiology reports
- Family account management
- Wearable integration (Google Fit, Apple Health)

**Technical Targets:**
- Migrate to Kubernetes (AWS EKS)
- ISO 27001 certification initiation
- ABDM PHR App certification
- Penetration test and remediation
- Automated disaster recovery testing

---

### Phase 3 — Enterprise Scale (Month 18–36)

**Product Features:**
- Multi-region deployment (India primary, Singapore DR)
- Government hospital ABDM Consent Manager registration
- HIPAA compliance for US hospitals and NRI patients
- AI model fine-tuning on anonymized Indian health data
- Predictive analytics for hospital operations
  (bed management, readmission prediction)
- Medical device integration (glucometers, BP monitors via Bluetooth/API)
- Population health analytics for corporates and insurers
- Genomics data integration (basic 23andMe / GenomePatri import)
- IPO-readiness: SOC 2 Type II, financial audit trails

**Technical Targets:**
- 99.99% uptime SLA capability
- Active-passive multi-region architecture
- ISO 27001 certification complete
- SOC 2 Type II audit complete
- Sub-500ms API response times p99

---

## PART 11: TEAM STRUCTURE FOR SCALE {#part-11}

### Year 1 (0–50K Users)

| Role | Count | Focus |
|---|---|---|
| Full-stack engineer | 2 | Product features |
| Backend engineer (Python) | 1 | API and AI integration |
| DevOps / Cloud (part-time) | 1 | Infrastructure, CI/CD |
| Product manager | 1 | Roadmap, prioritization |
| Designer (UI/UX) | 1 | User experience |
| **Total** | **6** | |

### Year 2 (50K–500K Users)

| Team | Count | Focus |
|---|---|---|
| Platform (infra, security, observability) | 3 | Reliability, scale |
| Patient experience | 3 | B2C product |
| Doctor portal | 2 | B2B SMB product |
| Enterprise integrations | 3 | Hospital/LIS/FHIR |
| AI/ML | 2 | Prompt engineering, fine-tuning |
| QA automation | 2 | Test coverage |
| DevOps / SRE | 2 | Operations |
| Sales engineering | 2 | Pre-sales technical support |
| Customer success | 3 | Enterprise onboarding |
| **Total** | **22** | |

### Year 3 (500K+ Users)

Add dedicated: security team (3), compliance/legal (2), data engineering (3),
regional teams per geography (5+ each).

---

## PART 12: ARCHITECTURE DECISION MATRIX {#part-12}

### Technology Choices by Phase

| Decision | Phase 0 (Now) | Phase 1 (6 months) | Phase 2 (18 months) |
|---|---|---|---|
| **Hosting** | DigitalOcean App Platform | DO Kubernetes or AWS EKS | Multi-region AWS |
| **Database** | DO Managed PostgreSQL | AWS RDS Multi-AZ | RDS + Read Replicas |
| **Storage** | DO Spaces / S3 | AWS S3 + CloudFront | S3 Multi-region |
| **Search** | pgvector | pgvector + OpenSearch | OpenSearch cluster |
| **Queue** | Celery/Redis | AWS SQS + Celery | AWS SQS + ECS Workers |
| **Auth** | JWT + slowapi | JWT + MFA + SSO (SAML) | Full IAM + FIDO2 |
| **Multi-tenancy** | org_id row-level | Dedicated DB option | Full isolated tier |
| **AI** | Direct Claude API | LLM Gateway + caching | Fine-tuned + multi-model |
| **Compliance** | Basic headers | DPDP + ABDM | HIPAA + ISO 27001 |
| **Deployment** | Manual + DO CI | GitOps + ArgoCD | Blue-green + Canary |
| **Monitoring** | Basic | Datadog or Grafana | Full observability stack |
| **Infra Cost** | ₹8K/month | ₹80K/month | ₹5L–15L/month |

---

### The Build vs. Buy Matrix

| Component | Build | Buy/Use | Reason |
|---|---|---|---|
| Core health record logic | ✓ Build | | Competitive differentiator |
| AI analysis prompts | ✓ Build | | Core IP |
| Biomarker extraction | ✓ Build | | Indian lab format specific |
| LLM (language model) | | ✓ Claude API | Not your core competency |
| Authentication | | ✓ (own JWT) | Augment with Auth0 for enterprise SSO |
| Email delivery | | ✓ AWS SES / SendGrid | Commodity |
| SMS | | ✓ Twilio / MSG91 | Commodity |
| Payment processing | | ✓ Razorpay | Compliance burden |
| Video consultation | | ✓ Daily.co / Whereby | Commodity |
| OCR | | ✓ AWS Textract / Google Vision | Better accuracy |
| DICOM viewing | | ✓ Cornerstone.js | Complex, solved problem |
| Search | | ✓ OpenSearch | Optimized at scale |
| Monitoring | | ✓ Datadog / Grafana | Operational complexity |

---

## THE SINGLE MOST IMPORTANT ARCHITECTURAL DECISIONS

### Decision 1: SaaS First, On-Premise Never (in Year 1)

Do not let any enterprise client convince you to build on-premise software in Year 1.
It will bifurcate your codebase, triple your support burden, and kill your ability to
ship product improvements quickly.

The answer to "can we host it ourselves?" is:
*"We offer a dedicated, fully isolated cloud environment that meets your data residency
requirements — it is more secure than your own data center because our team monitors it
24/7, applies security patches within hours, and maintains a dedicated security posture
that no hospital IT team can match."*

---

### Decision 2: Build Multi-Tenancy Right from Day One

Row-level security with `organization_id` on every table. No exceptions.
Every query is scoped. Every API response is filtered. An audit that finds a data leak
between tenants ends your business immediately in healthcare.

---

### Decision 3: Your AI Data Strategy Is Your Moat

Every record processed, every biomarker extracted, every interaction pattern — with
appropriate anonymization and explicit consent — trains better models than anyone
else who has not touched Indian healthcare data at your scale.

When you have 1 million records processed, your AI understands Indian diet patterns,
Indian lab reference ranges, Indian medication brands, and Indian disease prevalence
in a way no American or European model does. This is defensible, compounding,
and irreplaceable.

**Guard and grow this asset. It is worth more than your code.**

---

### Decision 4: Compliance Is a Product Feature, Not a Tax

Hospitals and enterprise clients do not buy software. They buy trust.
Your ISO 27001 certificate, your DPDP compliance, your ABDM certification —
these are not checkboxes. They are your sales collateral and your moat.

Start compliance work in Year 1 even when it feels premature.
It takes 12–18 months to get certified. You want the certificate ready
when your first ₹1 crore annual contract is on the table.

---

## APPENDIX: GLOSSARY

| Term | Definition |
|---|---|
| HIS | Hospital Information System — core hospital management software |
| LIS | Laboratory Information System — manages lab orders and results |
| PACS | Picture Archiving and Communication System — stores medical images |
| EMR / EHR | Electronic Medical/Health Record |
| HL7 FHIR | Health Level 7 Fast Healthcare Interoperability Resources — data standard |
| DICOM | Digital Imaging and Communications in Medicine — imaging standard |
| ABDM | Ayushman Bharat Digital Mission — India's national digital health initiative |
| ABHA | Ayushman Bharat Health Account — India's national health ID |
| DPDP | Digital Personal Data Protection Act 2023 (India) |
| HIPAA | Health Insurance Portability and Accountability Act (US) |
| GDPR | General Data Protection Regulation (EU) |
| BAA | Business Associate Agreement — HIPAA-required contract |
| DPA | Data Processing Agreement — GDPR/DPDP-required contract |
| MSA | Master Services Agreement — enterprise contract framework |
| SLA | Service Level Agreement — uptime and support guarantees |
| RTO | Recovery Time Objective — how fast to restore after failure |
| RPO | Recovery Point Objective — maximum acceptable data loss |
| MFA | Multi-Factor Authentication |
| SSO | Single Sign-On |
| SAML | Security Assertion Markup Language — enterprise SSO protocol |
| OIDC | OpenID Connect — modern SSO protocol |
| WAF | Web Application Firewall |
| mTLS | Mutual TLS — both parties verify identity |
| KMS | Key Management Service — manages encryption keys |
| RBAC | Role-Based Access Control |
| ABAC | Attribute-Based Access Control |
| HPA | Horizontal Pod Autoscaler (Kubernetes) |
| EKS | Elastic Kubernetes Service (AWS managed Kubernetes) |
| RDS | Relational Database Service (AWS managed PostgreSQL/MySQL) |
| CDN | Content Delivery Network |
| PWA | Progressive Web App — installable web application |
| LCP | Largest Contentful Paint — web performance metric |
| PITR | Point-In-Time Recovery — restore DB to any past second |
| CSM | Customer Success Manager |
| TPA | Third Party Administrator (insurance) |
| NIC | National Informatics Centre (Indian government IT) |

---

*Document End*

**HealthWeave Enterprise Architecture Blueprint v1.0**  
*Confidential — For Internal Strategy Use Only*  
*© 2026 HealthWeave. All rights reserved.*
