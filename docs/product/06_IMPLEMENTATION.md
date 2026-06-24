# HealthWeave — Implementation Reference

**Version:** 1.0
**Status:** Reflects the system as actually implemented (as of 2026-06-24)
**Companion documents:** `01_PRD.md`, `02_TRD.md`, `03_APP_FLOW.md`, `04_UI_UX_DESIGN.md`, `05_BACKEND_SCHEMA.md`

This document is the engineering-facing companion to the product documents above. It inventories every backend API endpoint actually registered in the running application, and records the implementation history (what shipped, why, and what regressed and was fixed) so the rationale behind current behavior isn't lost to tribal memory.

---

## 1. API Endpoint Inventory

All routes are mounted under `settings.API_V1_PREFIX` (`/api/v1`) in `backend/app/main.py`. There are **12 routers, 64 endpoints** in total. Each router is owned by one domain and uses a consistent `Depends()`-based RBAC pattern (`_require_doctor`, `_require_org_admin`, `get_current_user`, etc.) rather than inline auth checks.

### 1.1 `auth` — `/api/v1/auth` (`auth.py`) — public + session

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/register` | Create account (patient/doctor/hospital_admin), returns token pair | Public |
| POST | `/login` | Email+password → access + refresh JWT pair | Public |
| POST | `/refresh` | Exchange refresh token for a new access/refresh pair | Public (valid refresh token) |
| POST | `/forgot-password` | Issue password-reset token, email via Resend; anti-enumeration generic response | Public |
| POST | `/reset-password` | Consume one-time reset token, set new password | Public (valid reset token) |
| GET | `/me` | Return current authenticated user's profile | Authenticated |

### 1.2 `records` — `/api/v1/records` (`health_records.py`) — patient document lifecycle

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/upload` | Upload a document (PDF/JPG/PNG/WebP, ≤50MB server-enforced); returns 202, kicks off background OCR pipeline | Patient |
| GET | `/` | List/search/filter the caller's records (paginated) | Patient |
| GET | `/{record_id}` | Record detail incl. extracted biomarkers, AI summary, status | Owner |
| GET | `/{record_id}/file` | Signed/proxied retrieval of the underlying S3 file | Owner |
| POST | `/{record_id}/reprocess` | Re-run the OCR/extraction pipeline (manual stop-gap for dropped background runs) | Owner |
| DELETE | `/{record_id}` | Hard-delete a record and its derived data | Owner |
| GET | `/biomarkers/trends` | Cross-record biomarker trend data for charting | Patient |
| POST | `/{record_id}/comments` | Add a comment to a record | Owner |
| GET | `/{record_id}/comments` | List comments on a record | Owner |
| PUT | `/comments/{comment_id}` | Edit own comment | Comment owner |
| DELETE | `/comments/{comment_id}` | Delete own comment | Comment owner |

### 1.3 `chat` — `/api/v1/chat` (`ai_chat.py`) — RAG health assistant

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/sessions` | Create a new chat session | Patient |
| GET | `/sessions` | List the caller's chat sessions | Patient |
| POST | `/sessions/{session_id}/messages` | Send a message; SSE-streamed token-by-token AI response with source citations | Session owner |
| GET | `/sessions/{session_id}/messages` | Fetch message history for a session | Session owner |

### 1.4 `intelligence` — `/api/v1/intelligence` (`intelligence.py`) — scores, alerts, correlations, predictions

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health-scores` | Latest/historical 8-organ + overall scores | Patient |
| POST | `/health-scores/compute` | Force score recomputation | Patient |
| GET | `/alerts` | List predictive alerts | Patient |
| POST | `/alerts/generate` | Force alert generation | Patient |
| POST | `/alerts/{alert_id}/dismiss` | Dismiss an alert | Patient |
| GET | `/correlations` | List correlation findings | Patient |
| POST | `/correlations/run` | Force a full correlation analysis run (4 sub-analyses) | Patient |
| GET | `/doctor-summary` | AI-generated specialization-aware clinical summary | Patient/Doctor (consent-gated) |
| GET | `/lab-analysis/{record_id}` | Deep AI analysis of a single lab report | Owner |
| GET | `/biomarker-trend/{biomarker_name}` | Single-biomarker trend series | Patient |
| GET | `/timeline` | Lifetime health timeline events | Patient |
| GET | `/timeline/compare` | Compare timeline windows (e.g., year over year) | Patient |
| GET | `/biomarker-trends` | Multi-biomarker trend data | Patient |
| GET | `/risk-predictions` | AI disease-risk predictions | Patient |
| POST | `/risk-predictions/run` | Force risk-prediction recomputation | Patient |
| GET | `/medicine-interactions` | List flagged medicine interactions | Patient |
| POST | `/medicine-interactions/check` | Force an interaction check against current medicines | Patient |
| POST | `/medicine-interactions/{interaction_id}/acknowledge` | Acknowledge/dismiss an interaction alert | Patient |
| GET | `/knowledge-graph` | Cross-entity health knowledge graph (biomarkers/conditions/medicines) for visualization | Patient |

### 1.5 `emergency` — `/api/v1/emergency` (`emergency.py`) — passport

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/passport/{qr_token}` | **Fully public** — first-responder view (blood group, allergies, meds, conditions, DNR) | Public |
| GET | `/my-passport` | Caller's own passport data | Patient |
| POST | `/my-passport` | Create/update passport | Patient |
| POST | `/my-passport/auto-update` | Re-sync passport fields from latest uploaded records | Patient |

### 1.6 `organizations` — `/api/v1/organizations` (`organizations.py`) — hospital admin

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/search` | Search organizations by name/city (used by patient "Send Report" flow) | Authenticated |
| GET | `/departments` | List department options | Authenticated |
| POST | `/` | Create an organization (first action for a new hospital admin) | Hospital admin |
| GET | `/me` | Caller's organization details | Org member |
| GET | `/{org_id}/members` | Roster of org members | Org admin |
| POST | `/{org_id}/invite` | Generate a token-bound invite link (default 7-day expiry) | Org admin |
| POST | `/invitations/accept` | Accept an invite, attach to org as `OrganizationMember` | Public (valid invite token) |
| GET | `/{org_id}/stats` | Utilization stats (doctor/patient/consent/record counts) | Org admin |

### 1.7 `doctor` — `/api/v1/doctor` (`doctor.py`) — doctor portal

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/search` | Patient-facing search for doctors by name/specialization/email | Patient |
| GET | `/profile` | Caller's doctor profile | Doctor |
| PUT | `/profile` | Update doctor profile | Doctor |
| GET | `/patients` | List patients with an active consent naming this doctor (never a full directory) | Doctor |
| GET | `/requests` | Pending consent requests addressed to this doctor | Doctor |
| POST | `/requests/{consent_id}/accept` | Accept a consent request | Doctor |
| POST | `/requests/{consent_id}/reject` | Reject a consent request | Doctor |
| GET | `/patients/{patient_id}/summary` | Consent-gated patient overview (demographics, conditions, score, AI narrative) | Doctor + active consent |
| GET | `/patients/{patient_id}/biomarkers` | Consent-gated biomarker trends | Doctor + active consent + `share_biomarkers` |
| POST | `/patients/{patient_id}/notes` | Add a clinical note | Doctor + active consent |
| GET | `/patients/{patient_id}/notes` | List clinical notes | Doctor + active consent |
| POST | `/patients/{patient_id}/lab-requests` | Request a lab test for the patient | Doctor + active consent |

### 1.8 `consent` — `/api/v1/consent` (`consent.py`) — sharing & access control

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/grant` | Patient grants a doctor access (per-category flags, optional duration/purpose) | Patient |
| GET | `/` | List the caller's consents (patient: granted; doctor: received) | Authenticated |
| POST | `/send-report` | Fast-path one-off share to a doctor or hospital, bypassing the request/accept cycle | Patient |
| POST | `/revoke` | Revoke an active consent | Patient (grantor) |

### 1.9 `notifications` — `/api/v1/notifications` (`notifications.py`)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/` | List notifications (paginated) | Authenticated |
| GET | `/unread-count` | Unread badge count | Authenticated |
| POST | `/{notification_id}/read` | Mark one notification read | Owner |
| POST | `/mark-all-read` | Mark all read | Authenticated |

### 1.10 `vitals` — `/api/v1/vitals` (`vitals.py`) — daily self-tracking

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/presets` | Vital-type presets (glucose/BP/weight/HR/SpO2/temp) | Authenticated |
| POST | `/` | Log a vital entry | Patient |
| GET | `/` | List vital entries | Patient |
| GET | `/summary` | Latest-value summary per vital type | Patient |
| PUT | `/{entry_id}` | Edit a past entry | Owner |
| DELETE | `/{entry_id}` | Delete a past entry | Owner |

### 1.11 `visits` — `/api/v1/visits` (`visits.py`) — clinic visit log

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/` | Log a visit (doctor, hospital, complaint, diagnosis, follow-up) | Patient |
| GET | `/` | List visits | Patient |
| GET | `/{visit_id}` | Visit detail | Owner |
| PUT | `/{visit_id}` | Edit a visit | Owner |
| DELETE | `/{visit_id}` | Delete a visit | Owner |
| POST | `/{visit_id}/records/{record_id}` | Link an uploaded record to a visit | Owner |
| DELETE | `/{visit_id}/records/{record_id}` | Unlink a record from a visit | Owner |

### 1.12 `family` — `/api/v1/family` (`family.py`) — hereditary risk graph

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/members` | Add a family member (relation, conditions) | Patient |
| GET | `/members` | List family members | Patient |
| GET | `/hereditary-risks` | AI-computed hereditary risk flags from family graph | Patient |
| POST | `/hereditary-risks/compute` | Force recomputation | Patient |

---

## 2. Background Pipeline Implementation

The document-upload pipeline (`POST /records/upload` → `BackgroundTasks`) is the most architecturally significant piece of implemented logic. It executes, in order, inside the same process as the API request handler:

1. `OCRPipeline.process_document()` — Claude native PDF/vision understanding, with retry+backoff (max 3) on transient provider errors, automatic Anthropic→OpenAI fallback, and truncated-JSON salvage.
2. Update `HealthRecord` with extracted structured fields.
3. Persist `BiomarkerValue` rows, with explicit numeric coercion (LLMs sometimes emit numbers as strings).
4. Auto-compare each new biomarker against the patient's most recent prior reading of the same type (delta, delta_pct).
5. Generate a `pgvector` content embedding for the record (best-effort; failure here is caught and logged, never blocks the pipeline).
6. Mark `HealthDocument.status = PROCESSED`.
7. **Commit.** This is the durability checkpoint — everything before this line is now safe regardless of what happens next.
8. Create a `TimelineEvent`.
9. Recompute `HealthScore` rows (8-organ + overall).
10. Generate `PredictiveAlert` rows.
11. Run the full correlation analysis (`CorrelationEngine`, 4 sub-analyses: biomarker correlation, metabolic syndrome risk, disease progression, medicine-biomarker linkage) — wired to run automatically post-upload as of this engagement (previously required a manual `/correlations/run` call).

A failure in steps 8–11 is caught and logged per-step; it never rolls back or blocks steps 1–7. The manual `POST /records/{record_id}/reprocess` endpoint exists specifically to recover a record whose downstream enrichment (8–11) was dropped by a container restart, since there is no durable task queue (see `02_TRD.md` §7).

---

## 3. Implementation Changelog

This section records concrete engineering changes made during the current engagement, in chronological order, including regressions caught and fixed. It exists so future contributors understand *why* certain code paths look the way they do, not just what they currently do.

### 3.1 Foundational hardening (early engagement)
- Fixed a startup crash caused by a duplicate `audit_logs` table definition.
- Switched transactional email provider from SendGrid to Resend.
- Added S3/DigitalOcean Spaces-compatible file storage configuration; later corrected to point at the real AWS S3 bucket rather than DO Spaces (`fe219f59`) — a deployment-config bug, not a code bug, but one that silently misrouted all uploaded files until caught.
- Hardened the DO deployment for production patient onboarding (security headers, CORS allow-list, rate limiting with in-memory fallback when Redis is unreachable — `bd63cd1d` fixed a login/register 500 caused by exactly this Redis-unreachable case not degrading gracefully at the time).
- Fixed OCR truncation on large lab panels — the core upload→summary bug that, left unfixed, would silently drop biomarkers from longer reports.

### 3.2 Feature build-out
- Implemented vitals, visits, comments, and biomarker auto-compare (backend + partial frontend), then completed the corresponding frontend pages.
- Added the doctor-patient connection request flow (request → accept/reject) as the consent-gated alternative to the instant "Send Report" path.
- Added a comprehensive lab analysis engine producing specialization-aware doctor summaries (`GET /intelligence/doctor-summary`, `GET /intelligence/lab-analysis/{record_id}`).
- Fixed the biomarker extraction pipeline to commit core data *before* the timeline step, establishing the durability checkpoint described in §2 above — this directly prevented a class of bug where a downstream AI failure could roll back or lose already-extracted biomarker data.
- Fixed a missing `family` router registration (the router existed but was never mounted in `main.py`) and a hardcoded forgot-password URL that would have broken password reset in any non-default environment.
- Fixed a biomarker-trends 500 error and a Sentry CSP violation flagged during hardening.
- Implemented an enterprise mobile-responsive layout for the patient portal (bottom navigation, off-canvas sidebar drawer) — the asymmetry vs. the desktop-first doctor/admin portals (see `04_UI_UX_DESIGN.md` §4.3) was set at this point and is intentional.

### 3.3 Quality/regression fixes (most recent, this engagement)
- **Dashboard "wall of text" narrative regression (fixed, `c5ac2c99`):** AI-generated health narratives had degraded into single undifferentiated paragraph blobs on the dashboard, defeating the structured-rendering design intent (`AiNarrative.tsx`). Fixed by rendering AI health narratives as structured, titled sections (disclaimer / reassuring findings / next steps / risk areas) with semantic icon+color mapping, and by clarifying the empty-state message for trend charts with insufficient data. This is the regression referenced in `04_UI_UX_DESIGN.md` §5.1 and the governance rule in §8.3 ("any new AI-generated narrative surface must go through the same structured-JSON + `AiNarrative`-style rendering pattern — free-text paragraph dumps from an LLM should never reach the UI directly").
- **Health scores silently failing to update same-day (fixed, `a5cfd02f`):** when multiple reports landed for a patient on the same calendar date, score recomputation was silently no-op'ing instead of updating the existing same-day row, because `health_scores` has a non-unique composite index on `(user_id, scored_date)` rather than a unique constraint with proper upsert logic. Patched at the application layer; the underlying schema gap (no DB-level `UNIQUE` constraint) remains tracked as a known risk — see `02_TRD.md` §7 and `05_BACKEND_SCHEMA.md`.
- **Narrative formatting + auto-correlation + password reset + send-report AI summary (`14cdccf`, most recent commit on this branch):**
  - Re-verified and finalized the structured narrative rendering fix above against the latest dashboard code path.
  - Wired the correlation engine to run automatically as pipeline step 11 on every successful upload (previously correlations only ran on an explicit `POST /intelligence/correlations/run` call, meaning a patient who never opened the Insights page would never get correlation findings generated at all).
  - Completed the password-reset flow end-to-end: `POST /auth/forgot-password` now sends a real Resend email with a working reset link, `POST /auth/reset-password` consumes the one-time token, and the frontend `/reset-password?token=...` page was wired to the live API instead of being a stub.
  - Enhanced the patient "Send Report" flow (`POST /consent/send-report`) with a frontend "Use AI Summary" button that prefills the message field from the patient's latest AI health narrative — prefill only, never auto-send, so the patient retains editorial control before sharing.

### 3.4 Testing infrastructure
- A Playwright E2E + API test suite with GitHub Actions CI was added early in the project (`aae4d94a`), followed by two rounds of test-stabilization fixes (`972afc4c` resolving 34 failing tests, `3f183d8d` resolving the remaining 7) — this is the regression-prevention mechanism that should be run before any further push, consistent with the project's "don't fix one thing and break another" standing policy.

---

## 4. Implementation Conventions Worth Preserving

- **RBAC via `Depends()` helpers, never inline checks.** Every router uses `_require_doctor` / `_require_org_admin` / `get_current_user`-style dependencies. New endpoints should follow this pattern rather than checking `current_user.role == "..."` inline, to keep authorization auditable in one place per domain.
- **Consent re-validated server-side on every doctor-facing read**, never trusted from a prior check or cached client state — see `_check_consent()` in `05_BACKEND_SCHEMA.md` §4.
- **Two-phase persistence is mandatory for any new AI-derived pipeline step.** If a future feature adds another post-commit enrichment step (step 12+), it must follow the same fault-isolation rule: catch and log, never roll back steps 1–7.
- **All structured AI output must validate against a strict JSON schema before reaching the frontend.** Markdown code-fence stripping and truncated-JSON salvage are required wherever a new LLM call is parsed as JSON — this is not optional boilerplate, it is the reason the wall-of-text regression in §3.3 happened in the first place when a code path skipped it.
