# HealthWeave — App Flow: Features & Navigation

**Version:** 1.0
**Status:** Reflects the application as actually implemented (as of 2026-06-24)
**Scope:** Every route, every protected boundary, every page-level user journey

---

## 1. Top-Level Navigation Map

HealthWeave is a single React SPA serving **three distinct portals** from one codebase, switched by user role. All routing logic lives in `frontend/src/App.tsx`.

```
                              ┌───────────────────────┐
                              │   Public (no login)     │
                              │  /, /login, /register*, │
                              │  /reset-password, /join, │
                              │  /emergency/:token       │
                              └───────────┬───────────┘
                                          │ login/register
                                          ▼
                          ┌───────────────────────────────┐
                          │        RoleRedirect (/app)      │
                          │  routes by user.role             │
                          └─────┬───────────┬───────────────┘
                  patient       │           │ doctor              │ hospital_admin
                  (default)     │           │                      │
                                ▼           ▼                      ▼
                    ┌─────────────────┐ ┌───────────────────┐ ┌───────────────────┐
                    │ Patient Portal    │ │ Doctor Portal       │ │ Hospital Admin     │
                    │ (AppShell)         │ │ (DoctorShell)        │ │ Portal (AdminShell) │
                    │ 14 routes           │ │ 3 routes              │ │ 3 routes             │
                    └─────────────────┘ └───────────────────┘ └───────────────────┘
```

### 1.1 Route Protection Components

Three guard components wrap their respective route trees and decide what renders:

| Guard | Logic | Redirect targets |
|---|---|---|
| `Protected` | Not authenticated → redirect; else render inside `AppShell` | `/login` |
| `DoctorProtected` | Not authenticated → `/login`; role is `hospital_admin` → `/admin/dashboard`; else render inside `DoctorShell` | `/login` or `/admin/dashboard` |
| `AdminProtected` | Not authenticated → `/login`; role is `doctor` → `/doctor/dashboard`; else render inside `AdminShell` | `/login` or `/doctor/dashboard` |

`RoleRedirect` (mounted at `/app`) and the catch-all `*` route both resolve to the correct home for the signed-in user's role — patients land on `/dashboard`, doctors on `/doctor/dashboard`, hospital admins on `/admin/dashboard`.

On every app load, a `useEffect` checks `localStorage` for `hw_access_token`; if present and the store hasn't already hydrated the user, it calls `fetchMe()` to silently restore the session before any route guard evaluates.

---

## 2. Public / Unauthenticated Flows

### 2.1 Landing Page (`/`)
Marketing site, no auth. Sections in order: sticky scroll-aware navbar → hero (headline + CTA + app mockup) → stats bar (50K+ reports, 200+ biomarkers, 8 organ systems, 99.9% accuracy) → feature grid (6 pillars: AI Report Reader, 8-Organ Health Score, Lifetime Timeline, Predictive Alerts, Emergency Passport, AI Assistant) → "How It Works" 4-step flow (Upload → AI Reads → Scores Computed → Insights) → audience tabs (Patients / Doctors / Hospitals / First Responders) → AI capabilities grid → security/compliance section (AES-256, DPDP 2023, Zero Data Selling, RBAC) → testimonials → final CTA → footer.

### 2.2 Authentication

**Login (`/login`)**
- Email + password form → `useAuthStore().login()` → on success, a `useEffect` watching the `user` object redirects by role (doctor → `/doctor/dashboard`, hospital_admin → `/admin/dashboard`, else → `/dashboard`).
- Inline "Forgot password?" toggles the same panel into a forgot-password sub-flow (no route change): email input → `authApi.forgotPassword(email)` → generic confirmation message regardless of whether the email exists (anti-enumeration).
- Error banner renders any auth failure inline (generic "Invalid credentials" message, never reveals which field was wrong).

**Password reset (`/reset-password?token=...`)**
- Standalone page reached via the emailed link. Token (from query string) + new password form → `authApi.resetPassword({ token, new_password })`. One-time-use token; success routes back to `/login`.

**Registration choice (`/register`)** → role picker → branches to:
- `/register/patient` — `Register.tsx`: email, password, first/last name, phone. Split layout with feature callouts (AI report reading, 8-organ score, lifetime timeline, AI alerts, privacy commitments).
- `/register/doctor` — `RegisterDoctor.tsx`: adds specialization, medical registration number, qualifications, organization name (optional — doctor can register independent of a hospital).
- `/register/hospital` — `RegisterHospital.tsx`: registers the hospital admin identity; organization itself is created afterward inside the admin portal (`/admin/dashboard`), not at registration time.

All three registration flows ultimately call `useAuthStore().register()` with role-specific payloads, then auto-login and redirect by role exactly like the login flow.

**Organization invitation acceptance (`/join?token=...`)**
- `JoinPage.tsx` — a doctor/staff member who received an invite link from a hospital admin lands here, sets a password and completes their profile, and is attached to the inviting organization as an `OrganizationMember`.

**Emergency passport (`/emergency/:token`)**
- Fully public, no authentication, no app shell. Renders blood group, allergies, current medications, chronic conditions, and DNR status for first responders. Designed to load fast and work from a phone camera QR scan in a high-stress, time-critical situation.

---

## 3. Patient Portal (`AppShell`, 14 routes)

All patient routes are wrapped in `Protected` → `AppShell`, which renders a fixed left sidebar on desktop (lg+) and a mobile header + bottom nav + slide-out "more" sheet on mobile.

### 3.1 Navigation structure (Sidebar / BottomNav)
Primary sidebar items, in order: Dashboard → Upload Records → My Records → Daily Vitals → My Visits → Health Timeline → AI Assistant → Alerts (badge-counted) → Health Intelligence → Biomarker Trends → Risk Predictions → My Consents → Send Report. A separate visually-distinct section holds Emergency Passport (red accent). A final link returns to the public landing page.

Mobile bottom nav surfaces only the 4 highest-frequency destinations (Home, Upload, **AI Chat** — visually featured/elevated, Alerts) plus a "More" sheet for everything else.

### 3.2 Page-by-page flow

**`/dashboard` — Dashboard.tsx**
Entry point after login. Hero greeting + overall health score ring (color thresholds: <50 red, 50–70 amber, ≥70 green) → 8-organ score grid with mini rings and trend deltas vs. previous snapshot → quick-action cards to Upload/Chat/Timeline/Alerts → sidebar widgets: top-3 alerts (with risk badges), 4 most recent records, AI chat CTA. A "Refresh scores" button calls `intelligenceApi.computeScores()` then refetches after a short delay.

**`/upload` — UploadPage.tsx**
Drag-and-drop (`DocumentUpload` component, `react-dropzone`) accepting PDF/JPG/PNG/WebP up to 10MB client-side (50MB enforced server-side). User optionally selects record type and fills hospital/doctor name. Upload progress states: pending → uploading (35→65%) → processing (85%) → done. On completion, `AnalysisResult` renders extracted biomarkers, key findings, risk flags, and AI summary inline — the patient sees the AI's reading of their own report immediately, without navigating away.

**`/records` (MyRecordsPage.tsx)**
Browse/search/filter all uploaded documents by type; status badges (processed/processing/failed); delete with confirmation; reprocess a failed/stale extraction; click through to record detail (comments via `CommentSection`).

**`/vitals` (VitalsPage.tsx)**
Quick daily logging of glucose/BP/weight/heart rate/SpO2/temperature against presets; trend chart per vital; edit/delete past entries.

**`/visits` (VisitsPage.tsx)**
Log a clinic/hospital visit (doctor, hospital, specialization, complaint, diagnosis, follow-up date); link/unlink any of the patient's uploaded records to the visit, building a "what happened at this appointment" view.

**`/timeline` (TimelinePage.tsx)**
Full chronological history via `HealthTimeline` component, grouped by year with an AI-generated year summary; each event shows severity-colored dot, icon by event type, expandable AI insight, milestone highlighting for risk-flagged events.

**`/chat` (ChatPage.tsx)**
Creates a new chat session on mount (`chatApi.createSession()`), then renders `HealthChat`. Suggested-question chips for first-time/empty sessions; streamed token-by-token AI responses; markdown rendering; source record citations under each answer.

**`/alerts` (AlertsPage.tsx)**
Filterable by risk level (all/critical/high/moderate/low); each `AlertCard` shows color-coded severity bar, expandable detailed explanation, recommended actions, optional specialist referral, and a dismiss action. Critical alerts pulse to draw attention.

**`/insights` (InsightsPage.tsx)**
Two sections: (1) Findings — biomarker correlations, metabolic syndrome risk, disease progression, medicine-biomarker links, each with a confidence bar and expandable explanation; (2) Drug Interactions — severity-tiered (contraindicated/major/moderate/minor) with clinical significance and recommendation. Independent "refresh" actions trigger `runCorrelations()` / `checkMedicineInteractions()`.

**`/biomarkers` (BiomarkerPage.tsx)**
Dropdown selects any biomarker the patient has ≥1 reading for; renders a Recharts line chart with reference-range shading, status-colored points, trend direction icon, and a toggleable raw-data table.

**`/risk` (RiskPage.tsx)**
List of AI risk predictions per condition; `RiskGauge` (3/4-circle gauge) visualizes risk score; expandable cards show confidence, key indicators, recommended actions, specialist consult suggestion. "Refresh" re-triggers `runRiskPredictions()`.

**`/consent` (ConsentPage.tsx)**
Lists active/pending consents with revoke action; "Grant Access" form: doctor email + per-category share toggles (full history, biomarkers, prescriptions, lab reports, scans) + optional duration + optional purpose text.

**`/send-report` (SendReportPage.tsx)**
Fast-path one-off sharing, bypassing the consent-request/accept cycle. Two modes — search a doctor (`DoctorSearch`, min 2 chars, by name/specialization/email) or a hospital (`HospitalSearch`, by org name/city). A message field auto-fills from the patient's latest AI health narrative via a "Use AI Summary" button (prefills, does not auto-send — patient can edit before sending). Share-category checkboxes mirror the consent model.

**`/passport` (PassportPage.tsx)**
View/create/edit the Emergency Passport; displays the generated QR code linking to the public `/emergency/:token` view; "Auto-update" button re-syncs the passport from the latest uploaded records without manual re-entry.

---

## 4. Doctor Portal (`DoctorShell`, 3 routes)

Emerald-themed fixed sidebar (Dashboard, My Patients, My Profile) + top header with notification bell and doctor identity.

**`/doctor/dashboard` (DoctorDashboard.tsx)**
"Good morning, Dr. X" greeting; stat cards (active patients, new notifications, active consents); recent-patients mini-table (top 3, with consent date and "full history" badge); recent-notifications list (top 3); link to full patient list.

**`/doctor/patients` (DoctorPatients.tsx)**
Searchable (name/email) list of every patient who has an active consent naming this doctor — **never a browsable directory of all platform patients**. Each card: avatar, name/email, blood group, top-2 chronic conditions, consent date, full-history indicator. Empty state explains that patients must initiate consent (the doctor cannot solicit access directly through the platform).

**`/doctor/patients/:patientId` (DoctorPatientView.tsx)**
Tabbed detail view:
- *Overview*: demographics, chronic conditions, allergies, latest health score (color-coded), AI narrative, highlighted risk indicators.
- *Records*: consent-flag-filtered list of shared documents with AI summaries.
- *Notes*: add a clinical note (chief complaint, findings, diagnosis, treatment plan, follow-up date) and view prior notes.
- *Biomarkers*: trend charts over a selectable time window, again consent-flag-filtered.

All data on this page is server-side gated by `_check_consent()` and per-category flag checks — the page simply renders whatever the API permits; there is no client-side-only access control to bypass.

---

## 5. Hospital Admin Portal (`AdminShell`, 3 routes)

Purple-themed fixed sidebar (Dashboard, Doctors, Invite Doctor, Organization) + top header with notification bell and admin identity.

**`/admin/dashboard` (AdminDashboard.tsx)**
If the admin has no organization yet: a creation form (name, city, state, phone) is shown front-and-center — this is the **first thing a new hospital admin does** after registering. Once an org exists: org identity card + utilization stats (total doctors, total patients via consent, active consents, active records) + quick links to invite a doctor or view the roster.

**`/admin/doctors` (AdminDoctors.tsx)**
Roster of the org's members (avatar, name, email, department, role badge, join date); "Invite Doctor" CTA; empty state for a brand-new org.

**`/admin/invite` (AdminInvite.tsx)**
Form: invitee email + role (Doctor / Hospital Admin / Staff). On submit, generates a token-bound invite link (`/join?token=...`) with a visible expiry (default 7 days) and a one-click copy-to-clipboard action — the admin is expected to send this link to the invitee via their own channel (email/WhatsApp); the platform does not auto-email the invite today.

---

## 6. Cross-Cutting Flows

### 6.1 Session restoration & token refresh
On every API call, an Axios request interceptor attaches `Authorization: Bearer <access_token>` from `localStorage`. On a 401 response, a response interceptor transparently calls `/auth/refresh` with the stored refresh token, updates both tokens, and retries the original request once. If refresh itself fails, the session is cleared and the user is redirected to `/login` — this happens silently mid-navigation, so a user never sees a raw 401 error during normal use.

### 6.2 Notifications
A bell icon (with unread-count badge) is present in all three shells. Clicking surfaces the notification list (report ready, consent granted/revoked, alert generated, invitation, etc.); each can deep-link via `action_url` to the relevant page (e.g., a "consent granted" notification could link a doctor straight to that patient's view).

### 6.3 Logout
Available from the user footer in every shell (sidebar bottom on desktop, "More" sheet on mobile for patients). Clears both tokens from `localStorage` and resets the Zustand auth store; no server-side session invalidation occurs (stateless JWT design — see `02_TRD.md` §3.3 and §7).

### 6.4 Role exclusivity enforcement
A user account has exactly one role at a time. If a `hospital_admin` somehow navigates to a `/doctor/*` URL, `DoctorProtected` immediately redirects them to `/admin/dashboard` (and vice versa for a `doctor` hitting `/admin/*`). This is enforced identically at the route-guard layer and, more importantly, again server-side by the RBAC dependencies on every API call — the frontend redirect is a UX nicety, not the actual security boundary.
