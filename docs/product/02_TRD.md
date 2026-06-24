# HealthWeave — Technical Requirements Document (TRD)

**Version:** 1.0
**Status:** Reflects the system as actually implemented (as of 2026-06-24)
**Companion documents:** `01_PRD.md`, `03_APP_FLOW.md`, `04_UI_UX_DESIGN.md`, `05_BACKEND_SCHEMA.md`, `06_IMPLEMENTATION.md`

---

## 1. Architecture Overview

HealthWeave is a **monolithic FastAPI backend** + **React/Vite SPA frontend**, backed by **PostgreSQL** (with `pgvector`, `pg_trgm`, `unaccent` extensions) and **Redis**, deployed on **DigitalOcean App Platform** (Bangalore region) with file storage on **AWS S3 (ap-south-1)**.

```
┌─────────────────┐        HTTPS         ┌──────────────────────────┐
│  React/Vite SPA   │ ───────────────────▶ │   FastAPI Backend (api)  │
│  (static_sites)    │ ◀─────────────────── │   Uvicorn, async         │
└─────────────────┘        REST + SSE      └──────────┬───────────────┘
                                                       │
                  ┌────────────────────────────────────┼────────────────────────────┐
                  ▼                                    ▼                            ▼
        ┌──────────────────┐                 ┌──────────────────┐         ┌──────────────────┐
        │ PostgreSQL 15     │                 │ Redis 7           │         │ AWS S3            │
        │ (managed, DO)     │                 │ (managed, DO)     │         │ ap-south-1         │
        │ + pgvector        │                 │ rate-limit store  │         │ AES256 SSE         │
        └──────────────────┘                 └──────────────────┘         └──────────────────┘
                  │
                  ▼
        ┌──────────────────────────────────────────────────┐
        │ External AI Providers                              │
        │ Anthropic Claude (primary) · OpenAI (fallback +    │
        │ embeddings) · Resend (transactional email)         │
        └──────────────────────────────────────────────────┘
```

### 1.1 Why these choices
- **FastAPI + async SQLAlchemy**: native async I/O suits a workload dominated by external LLM calls (high-latency, high-concurrency-friendly) and OCR document processing.
- **Single backend service, not microservices**: appropriate at current scale; all domains share one transactional database and one deploy unit, minimizing operational overhead for a small team.
- **Background tasks (FastAPI `BackgroundTasks`), not a separate task queue**: the AI pipeline (OCR → biomarkers → scores → alerts → correlations) runs after the request returns, in-process, within the same container. Acceptable at current scale; documented as a scaling risk (see §7).
- **PostgreSQL with pgvector**: avoids a separate vector database by colocating semantic search alongside relational health data — keeps consistency simple (one transaction boundary) at the cost of needing a vector-capable Postgres image.
- **DigitalOcean App Platform**: managed Postgres + managed Redis + auto-deploy-on-push static site + container app, minimizing DevOps surface area for a small team; trades some flexibility for operational simplicity.

---

## 2. Technology Stack

### 2.1 Backend
| Layer | Technology |
|---|---|
| Language/runtime | Python (async), FastAPI |
| ORM | SQLAlchemy (async engine, `AsyncSession`) |
| Database | PostgreSQL 15, extensions: `vector` (pgvector), `pg_trgm`, `unaccent` |
| Migrations | Alembic (baseline + incremental migrations) + defensive runtime migration helpers in `database.py` |
| Cache / rate-limit store | Redis 7 (managed), via `slowapi`, with in-memory fallback if Redis unavailable |
| AuthN | JWT (PyJWT), HS256, bcrypt password hashing (12 rounds default) |
| Rate limiting | `slowapi` — global default 100 req/min, AI-specific 30 req/min, tighter per-route limits on sensitive endpoints |
| File storage | AWS S3 (`ap-south-1`), server-side AES256 encryption |
| Email | Resend API (transactional: password reset, welcome) |
| Primary LLM | Anthropic Claude (`claude-sonnet-4-6`) |
| Fallback LLM | OpenAI GPT-4o |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| Observability | Sentry (`send_default_pii=False`), structured logging |
| WSGI/ASGI server | Uvicorn |

### 2.2 Frontend
| Layer | Technology |
|---|---|
| Framework | React (with `React.lazy` code-splitting per route) |
| Build tool | Vite |
| Routing | `react-router-dom` (`BrowserRouter`) |
| Data fetching/cache | `@tanstack/react-query` (retry:1, staleTime 60s, gcTime 5min) |
| State management | Zustand (with `persist` middleware for auth) |
| HTTP client | Axios, with request/response interceptors for auth + token refresh |
| Styling | Tailwind CSS, custom design tokens (`brand.*` palette, custom shadows/gradients/animations) |
| Charts | Recharts (biomarker trend lines, risk gauges) |
| Icons | `lucide-react` |
| Notifications | `react-hot-toast` |
| Markdown rendering | `react-markdown` (chat responses) |
| File upload UX | `react-dropzone` |

### 2.3 Infrastructure / DevOps
| Component | Detail |
|---|---|
| Hosting | DigitalOcean App Platform, region `blr` (Bangalore) |
| Backend service | Docker container, `basic-s` instance (1GB RAM), 1 instance, health check on `/health` |
| Frontend | Static site, built via `npm run build`, SPA fallback (`error_document: index.html`) |
| Database | DO Managed PostgreSQL 15, `db-s-1vcpu-1gb`, single node, **production: true** (daily backups + standby) |
| Redis | DO Managed Redis 7, `db-s-1vcpu-1gb`, single node |
| CI/CD | `deploy_on_push: true` for both backend and frontend, tracking the active git branch |
| File storage | AWS S3 bucket `healthweave-documents`, region `ap-south-1` (deliberately outside DO, kept in India region for residency) |

---

## 3. System Constraints & Non-Functional Requirements

### 3.1 Performance
- Document upload returns **202 Accepted within seconds**; OCR + AI extraction completes asynchronously (target: under ~60s for typical lab report).
- A hard **commit checkpoint** exists mid-pipeline: core data (record, document, biomarkers) is durably committed **before** secondary AI steps (timeline, scores, alerts, correlations) run — a failure in scoring/correlation must never lose uploaded data.
- OCR/extraction calls implement retry with exponential backoff (max 3 retries) on transient provider errors (rate limit, connection, internal server error); non-retryable errors (bad request) fail fast.
- Truncated LLM JSON responses are salvaged (partial biomarker arrays recovered) rather than discarded outright.

### 3.2 Availability
- Health check endpoint (`/health`) polled every 30s, 40s initial delay, 3 consecutive failures before marked unhealthy (DO App Platform config).
- Single-instance deployment today (`instance_count: 1`) — **no horizontal redundancy**; an instance restart causes a brief outage window. Documented as a scaling gap, not a current SLA violation given pre-production stage.
- Redis-backed rate limiting **degrades gracefully to in-memory** if Redis is unreachable, rather than failing closed.

### 3.3 Security
- All inbound traffic is HTTPS-only (terminated at DO App Platform edge).
- Security headers enforced on every response: CSP, HSTS (2-year max-age, includeSubDomains, preload), X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy.
- CORS restricted to explicit allow-list (`CORS_ORIGINS` env: the DO-assigned frontend URL + the custom domain), credentials allowed, 600s preflight cache.
- GZip compression for responses ≥1024 bytes.
- Generic global exception handler returns 500 without leaking stack traces.
- Swagger/ReDoc auto-docs are gated behind `DEBUG` flag — **disabled in production**.
- Secrets (SECRET_KEY, API keys, S3 credentials, Resend key) are injected as DO "SECRET" type env vars, never committed to source.
- `SECRET_KEY` must be ≥32 characters in production (enforced at config load).
- PHI is explicitly excluded from error telemetry (`Sentry send_default_pii=False`).
- S3 documents are stored with server-side AES256 encryption.

### 3.4 Compliance
- DPDP 2023 (India) is the binding regulatory target — drives the consent-as-first-class-citizen data model (see `01_PRD.md` §4.11 and `05_BACKEND_SCHEMA.md` §Consent).
- Audit logging (`audit_logs` table) is append-only by policy — **rows must never be deleted**; this is a standing operational rule across the entire system, distinct from ordinary data-lifecycle cleanups.
- IP address and user-agent capture on sensitive actions (login, profile reads) respects `X-Forwarded-For` for accuracy behind the load balancer/proxy.

### 3.5 Scalability (current ceiling & known risks)
- Single backend instance with in-process background tasks means **AI-heavy uploads compete with API request-handling threads/event loop** on the same container — under concurrent load this is the most likely first bottleneck. `instance_size_slug: basic-s` was explicitly sized up to accommodate concurrent OCR calls with `max_tokens=16000`.
- No message queue / worker pool (e.g., Celery, SQS) — all "background" work is FastAPI `BackgroundTasks` within the same process, which does not survive process restarts or scale across instances. A production scale-up plan should introduce a real task queue before multi-instance horizontal scaling.
- Database is single-node (no read replica) — acceptable at current scale; a future requirement before significant traffic growth.

---

## 4. API Design Principles

- **Versioned REST API** under `/api/v1/...`, 12 domain routers, ~85 endpoints total (full inventory in `06_IMPLEMENTATION.md`).
- **Consistent RBAC pattern**: route-level `Depends()` helper functions (`_require_doctor`, `_require_role`, `_require_org_admin`) rather than scattered inline checks — keeps authorization logic auditable and centralized per domain.
- **Background-task offloading** for anything LLM-dependent — API responses return immediately with a processing/pending state; clients poll or are notified via subsequent reads.
- **Two-phase persistence**: core relational data commits before optional/derived AI enrichment runs, so a downstream AI failure can never roll back or block primary data capture.
- **SSE streaming** for chat responses, enabling token-by-token rendering in the UI.
- **Pagination** conventions applied uniformly across list endpoints (records, notifications, etc.).
- **Consent-gated reads**: any doctor-facing endpoint touching patient data re-validates an active, non-expired consent and the specific share-flag relevant to the requested data category — enforced server-side, not just hidden in the UI.

---

## 5. Data Architecture (Summary — full detail in `05_BACKEND_SCHEMA.md`)

- **29 tables** across 19 logical domains: identity/auth, profiles, audit, health records/documents, biomarkers/timeline, vitals/visits, medicines/interactions, family/hereditary risk, health scores, predictive alerts/correlations, chat, emergency passports, organizations, doctor profiles, consent, clinical notes, lab requests, invitations, notifications.
- All primary keys are PostgreSQL UUIDs (`uuid.uuid4()` default).
- Heavy use of PostgreSQL `ARRAY` columns (allergies, conditions, tags, codes) and `JSON`/`JSONB` columns (structured_data, extra_data, settings) for flexible, AI-populated fields without constant schema migrations.
- `pgvector` embeddings (1536-dim, matching `text-embedding-3-small`) on `health_records.content_embedding` and `chat_messages.content_embedding` power semantic retrieval.
- `TSVECTOR` full-text search column on `health_records` complements vector search (hybrid retrieval).
- Foreign key cascade policy: `CASCADE` for ownership-chain deletes (deleting a user removes their records, audit logs, chat sessions, etc.); `SET NULL` where the related entity should survive independent of the optional reference (e.g., organization deletion nulls `users.organization_id` rather than deleting users).

---

## 6. AI/ML System Requirements

### 6.1 Provider Strategy
- **Primary**: Anthropic Claude (`claude-sonnet-4-6`) for all extraction, scoring, alerting, correlation, chat, and analysis tasks — including **native PDF document understanding** (no separate OCR engine) and vision-based image extraction.
- **Fallback**: On any Anthropic API exception, the system automatically retries via OpenAI GPT-4o. If neither is configured, the call raises rather than silently degrading.
- **Embeddings**: OpenAI `text-embedding-3-small` exclusively (1536-dim) — Anthropic does not currently provide a first-party embeddings API, hence the split-provider approach.
- A configured-but-unused `GOOGLE_VISION_API_KEY` setting exists in config for historical/optional OCR augmentation; the current OCR pipeline relies entirely on Claude's native document/vision understanding.

### 6.2 Safety & Disclaimer Requirements (hard technical constraint, not a guideline)
- A `MEDICAL_DISCLAIMER` constant is structurally injected into: every `LLMClient.complete()`/`.stream()` call by default (`inject_disclaimer=True`), every predictive alert, every correlation finding, every chat response.
- System prompts for every AI service (prediction engine, correlation engine, lab analysis, medicine interactions, chat) explicitly instruct the model to:
  - Never state a diagnosis — only "risk indicators," "patterns," or "findings suggest."
  - Use probabilistic language ("may," "could indicate") rather than definitive claims.
  - Always recommend professional consultation.
  - Surface confidence levels and data limitations alongside findings.

### 6.3 Structured Output Requirement
- All AI services that feed the UI return **strict JSON schemas** (scores, alerts, correlations, lab analysis, doctor summaries) — never raw narrative text for structured surfaces. This was a deliberate fix applied during this engagement (see `06_IMPLEMENTATION.md` changelog) after a "wall of text" regression where narrative fields degraded into unstructured paragraphs; the system now normalizes/parses both the new structured JSON format and legacy emoji-prefixed narrative text for backward compatibility on the frontend.
- Markdown code-fence stripping and truncated-JSON salvage logic are required wherever LLM output is parsed as JSON, since LLM responses are not 100% well-formed by construction.

### 6.4 Background Pipeline Order (system requirement: must remain ordered and partially fault-tolerant)
1. OCR/extraction (`OCRPipeline.process_document`)
2. Update `HealthRecord` with extracted fields
3. Persist `BiomarkerValue` rows (with explicit type coercion — LLMs sometimes emit numeric values as strings)
4. Auto-compare each new biomarker against most recent prior reading (delta/delta_pct)
5. Generate content embedding (failure here is non-critical and silently caught)
6. Mark `HealthDocument` PROCESSED
7. **Commit** — core data now durable regardless of what follows
8. Create timeline event
9. Recompute health scores
10. Generate predictive alerts
11. Run full correlation analysis (4 sub-analyses)

Any failure in steps 8–11 must not roll back steps 1–7. This ordering and fault-isolation boundary is a hard requirement of the pipeline design, not an implementation detail.

---

## 7. Known Technical Risks / Debt (explicitly surfaced)

| Risk | Detail | Mitigation status |
|---|---|---|
| In-process background tasks | No durable task queue; a container restart mid-processing silently drops that pipeline run (core upload data is safe due to the commit checkpoint, but downstream AI enrichment for that record would simply never run unless manually reprocessed) | Manual `reprocess` endpoint exists as a stop-gap; a real queue (Celery/SQS/Cloud Tasks) is the long-term fix |
| Single backend instance | No horizontal scaling, no zero-downtime deploy guarantee | Acceptable pre-production; revisit before real user load |
| Stateless JWT, no revocation list | A leaked refresh token is valid for its full 30-day life regardless of logout | Acceptable given current threat model; consider a blacklist/short-refresh-rotation if threat model changes |
| `health_scores` composite index without a DB-level UNIQUE constraint | Model has `(user_id, scored_date)` indexed but not uniquely constrained — theoretically allows duplicate same-day score rows if application logic is bypassed | Tracked; recommend adding `unique=True` in a future migration |
| Single-region deployment | All data and compute in India (`blr` + `ap-south-1`) | Intentional for data residency; revisit only if expanding beyond India |
| No email/phone verification gate | `is_verified` flag exists but unused in authorization | Low priority given current trust model; revisit if abuse patterns emerge |
