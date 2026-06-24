# HealthWeave — UI/UX Design Document

**Version:** 1.0
**Status:** Reflects the actual implemented design system (as of 2026-06-24)
**Source:** `frontend/tailwind.config.js`, `frontend/src/index.css`, component implementations

---

## 1. Design Philosophy

HealthWeave's visual language is built to make clinical data feel **calm, legible, and trustworthy** rather than sterile (typical hospital software) or gimmicky (typical consumer health apps). Three principles guide every screen:

1. **Structure over walls of text.** AI narrative output is never rendered as a single paragraph blob — it's decomposed into titled sections with icons (disclaimer, reassuring findings, next steps, risk areas), because clinical information that isn't visually triaged gets skimmed and missed. This was a deliberate, enforced product fix (see `AiNarrative.tsx`).
2. **Color carries clinical meaning, consistently.** The same red/amber/green/blue semantic mapping is used everywhere — health scores, alert severities, consent flags, document status — so a user builds pattern recognition across the whole app rather than relearning color meaning per screen.
3. **Role identity through accent color, not layout reinvention.** All three portals (patient, doctor, admin) share the same shell skeleton, card system, typography, and spacing scale — only the accent hue changes (blue → emerald → purple). This keeps engineering and design effort low while still giving each portal a distinct, recognizable identity.

---

## 2. Design Tokens

### 2.1 Color Palette (`brand.*` namespace, Tailwind config)

| Token | Hex | Usage |
|---|---|---|
| `brand-dark` | `#0A0F1E` | Deepest background (hero panels, patient sidebar gradient end) |
| `brand-navy` | `#0F172A` | Sidebar base, dark panel backgrounds |
| `brand-slate` | `#1E293B` | Mid-dark surface |
| `brand-blue` | `#0066FF` | **Primary action color** — patient portal accent, links, primary buttons |
| `brand-blue-dark` | `#0052CC` | Hover/active state for primary blue |
| `brand-cyan` | `#06B6D4` | Secondary accent, gradient partner to blue |
| `brand-orange` | `#F97316` | Warning-tier accent |
| `brand-green` | `#10B981` | Success / positive / "normal" status |
| `brand-red` | `#EF4444` | Error / critical status |
| `brand-amber` | `#F59E0B` | Caution / moderate-risk status |

**Portal accent overlay** (applied to shells, not in Tailwind config — implemented per-component):
- Patient portal: blue/cyan (`brand-blue`, `brand-cyan`)
- Doctor portal: emerald (`emerald-500`/`emerald-400`, gradient `#064E3B → #022C22`)
- Hospital admin portal: purple (`purple-500`/`purple-300`, gradient `#1E1B4B → #0F0C2E`)

### 2.2 Semantic Status Colors (used consistently across health scores, alerts, document status, consent)

| Meaning | Color | Typical threshold |
|---|---|---|
| Excellent / Normal / Active | Green (`brand-green`) | Score ≥70, status="normal", consent ACTIVE |
| Caution / Moderate | Amber (`brand-amber`) | Score 50–70, status="high"/"low", risk="moderate" |
| Critical / Error / Revoked | Red (`brand-red`) | Score <50, status="critical", risk="critical", consent REVOKED |
| Informational | Blue (`brand-blue`) | severity="info", default AI narrative sections |
| Neutral/Pending | Slate gray | status="processing", consent PENDING |

### 2.3 Gradients (`backgroundImage` tokens)
- `hero-gradient` — 135°, dark navy → slate → blue (hero sections, dark marketing panels)
- `card-gradient` — 135°, blue → cyan (premium/highlighted cards)
- `orange-gradient` — 135°, orange → red (warning-tier cards)
- `green-gradient` — 135°, green → cyan (success-tier cards)
- `sidebar-gradient` — 180°, navy → dark (default sidebar background)

### 2.4 Shadows
- `card` — subtle resting elevation (`0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)`)
- `card-hover` — elevated interactive state (`0 10px 40px rgba(0,0,0,.10), 0 4px 12px rgba(0,0,0,.06)`)
- `blue-glow` — accent glow for active nav items / primary buttons (`0 0 20px rgba(0,102,255,.25)`)
- `score-ring` — elevation specifically for score-ring components
- `sidebar` — directional depth for fixed sidebars (`4px 0 24px rgba(0,0,0,.15)`)

### 2.5 Motion
- `fade-up` (0.4s ease-out, translateY 16px→0) — default entrance animation for cards/sections
- `pulse-slow` (3s ease-in-out infinite) — used on critical alerts to draw attention without being frantic
- `shimmer` (2s linear infinite) — skeleton loading state sweep

### 2.6 Typography
- **Font:** Inter, with system-ui fallback.
- Headings use tight letter-spacing (`tracking-tight`, ~-0.02em) for a modern, confident feel rather than default browser spacing.
- Section labels (e.g., sidebar group headers) use a distinct micro-typography pattern: 10px, bold, uppercase, wide letter-spacing (`0.1em`), low-contrast slate-400 — deliberately quiet so it doesn't compete with actual content.

### 2.7 Spatial system
- Corner radii scale by component size: `rounded-xl` (buttons/inputs) → `rounded-2xl` (cards/modals) → `rounded-3xl` (large hero/section containers). This creates a visual hierarchy where "more important/larger" containers feel softer and more enclosing.
- Standard paddings: `px-4 py-2.5` (buttons), `px-6 py-4` (card interior), `gap-3` (flex item spacing) — kept consistent across all three portals.

---

## 3. Component System (`@layer components` utility classes)

| Class | Purpose |
|---|---|
| `.hw-card` | The base card: white, `rounded-2xl`, `border-slate-100`, `shadow-card` resting → `shadow-card-hover` on hover. Used everywhere a discrete block of content needs visual containment. |
| `.section-label` | Quiet uppercase micro-label for grouping (see §2.6). |
| `.badge-blue` / `.badge-green` / `.badge-orange` / `.badge-red` / `.badge-amber` | Status pill pattern: light tint background + matching saturated text + subtle matching border. Used for risk levels, document status, consent status, role badges. |
| `.nav-item` (+ `.nav-item-active` / `.nav-item-inactive`) | Sidebar navigation item base. Inactive: slate-400 text, hover lightens. Active: solid brand-color background + white text + glow shadow — unmistakably "you are here." |
| `.hw-input` | Form input base: slate border, rounded-xl, blue focus ring (`ring-2 ring-blue-50` + `border-brand-blue`), slate-400 placeholder. |
| `.btn-primary` | The one primary CTA pattern app-wide: blue→darker-blue gradient, white text, rounded-xl, glow shadow on hover, 50%-opacity + not-allowed cursor when disabled. |
| `.skeleton` | Loading placeholder: light slate background, `animate-pulse`. |

**Design rule enforced by this system:** there is exactly one primary button style and one card style across all three portals — visual consistency is achieved through shared utility classes, not per-page custom CSS.

---

## 4. Layout Patterns (Shells)

### 4.1 Patient Shell (`AppShell` + `Sidebar` + `BottomNav` + `MobileHeader`)
- **Desktop (lg+):** fixed 260px dark-gradient sidebar, always visible, containing logo, 13 nav items (with an alert-count badge on "Alerts"), a visually separated Emergency section, and a user-identity footer (avatar, name, email, logout).
- **Mobile:** sidebar becomes an off-canvas drawer (slide-in transform + dimmed overlay, closed by default); a slim dark `MobileHeader` (logo left, alert bell + avatar/hamburger right) replaces it at the top; a `BottomNav` (4 primary destinations, AI Chat visually elevated/featured as a raised circular button) anchors the bottom, with safe-area-inset padding for notched devices and a "More" bottom-sheet for the remaining 9 destinations.
- Main content area is independently scrollable; mobile content gets extra bottom padding (`pb-20`) so it never sits under the fixed bottom nav.

### 4.2 Doctor Shell (`DoctorShell`)
- Always-visible 240px fixed sidebar (no mobile drawer behavior implemented — doctor portal is desktop-first), emerald gradient, 3 nav items + back-to-home + user footer.
- Sticky top header bar: stethoscope icon + "Doctor Portal" label (emerald) on the left, notification bell (with unread badge) + doctor name/avatar on the right.

### 4.3 Admin Shell (`AdminShell`)
- Identical structural pattern to `DoctorShell`, purple gradient instead of emerald, 4 nav items, and an additional "Organization" identity block shown above the nav (org name surfaced persistently once one exists).

**Design rationale:** Doctor and Admin shells were deliberately built desktop-first (clinical/admin work happens at a desk), while the Patient shell is mobile-first-responsive (patients check their health on their phone). This asymmetry is intentional, not an oversight — it should be preserved in future iterations rather than "fixed" toward full responsiveness on the professional portals unless a real mobile clinical use case emerges.

---

## 5. Key UI Patterns by Function

### 5.1 AI Narrative Rendering (`AiNarrative.tsx`)
The single most important UX pattern in the product, because it's the primary surface where the AI "speaks" to the user. Rules:
- Parse two formats for backward compatibility: the current structured JSON (`summary`, `key_areas[]`, `reassuring_findings[]`, `next_steps[]`, `data_currency_warning`) and a legacy emoji-prefixed plain-text format (auto-split into sections by emoji/header pattern).
- Each section gets an icon + tone mapped by semantic title-matching: "Disclaimer" → slate + AlertTriangle; "Reassuring" → emerald + CheckCircle2; "Next Steps"/"Recommendation" → indigo + ListChecks; "Risk"/"Attention"/"Gap" → amber + AlertTriangle; anything else → blue + Sparkles (default/general insight tone).
- Rendered as discrete cards with tinted backgrounds/borders matching the tone — never as one undifferentiated paragraph block.

### 5.2 Score Visualization (`HealthScoreCard`, dashboard score rings)
- SVG ring (20×20 viewBox-scaled), score number centered, ring color driven by the same 3-tier threshold used everywhere (≥70 green / 50–70 amber / <50 red).
- A grade label beneath translates the number into language (Excellent/Good/Fair/Poor/Critical) — numbers alone are not trusted to communicate severity to a non-clinical user.
- A small delta indicator (▲/▼/—) shows movement vs. the previous snapshot, so the user's first read is "am I trending better or worse," not just "what's my number today."

### 5.3 Risk Visualization (`RiskGauge`)
- A 3/4-circle (270°) gauge rather than a full circle — deliberately leaves a visual "gap" at the bottom, which reads as "this is a meter, not a clock," avoiding confusion with a literal time display.
- Same red/orange/amber/green semantic coloring as scores, but inverted in meaning (high risk = red, same as low health score = red) — color meaning is "bad direction" consistently, never reused for a different polarity.

### 5.4 Alert & Finding Cards
- Color-coded left/top bar by severity (not the whole card background) — keeps the card readable while still giving an unmissable severity cue at a glance, especially important when scanning a list of 5–6 alerts quickly.
- Collapsed by default with title + 1-sentence summary; expand reveals full explanation, evidence, and recommended actions — respects that most users want the headline first and the clinical detail on demand, not forced.
- Critical-severity cards use the `pulse-slow` animation — slow and subtle by design, to signal urgency without becoming an anxiety-inducing flashing element in a health context.

### 5.5 Document Upload Feedback
- Per-file progress through 4 named states (pending → uploading → processing → done) rather than a single percentage bar — explicitly tells the user *what kind* of work is happening (uploading bytes vs. AI reading the document), which matters because the AI step takes much longer than the network upload and an undifferentiated progress bar would appear to "stall."

### 5.6 Trend Charts (Recharts, `BiomarkerPage`, `VitalsPage`)
- Reference range rendered as a shaded band behind the line, not just an axis label — lets the user see "in range vs. out of range" as a spatial relationship to their own data points, not a number they have to cross-reference mentally.
- Point color follows the same status semantic (normal/high/low/critical) as everywhere else in the app.

### 5.7 Chat Interface (`HealthChat`)
- User messages left-aligned, assistant messages right-aligned with markdown rendering and source citations beneath — sources are visually subordinate (small, muted) so they don't compete with the answer itself but remain available for the user who wants to verify.
- Empty-state suggested-question chips lower the barrier to the first interaction (a blank chat box is famously intimidating in health contexts).

---

## 6. Responsive Strategy

- **Mobile-first base styles**, progressively enhanced at Tailwind's `lg` (1024px) breakpoint for desktop layout changes (sidebar becomes fixed/persistent, bottom nav disappears, grids go from 1 to 2–4 columns).
- `sm`/`md`/`xl`/`2xl` breakpoints are used sparingly — the app deliberately optimizes for two real device classes (phone, desktop) rather than every intermediate tablet size, which matches actual observed usage patterns for a personal-health app (checked on the go, managed in depth at a desk).
- Patient portal: fully responsive, mobile-first, as described in §4.1.
- Doctor/Admin portals: desktop-first by design (see §4.3 rationale) — not yet optimized for phone use; this is a known, accepted gap rather than a bug.

---

## 7. Accessibility & Trust Signals (as implemented)

- Color is never the *only* signal — every status color pairing also carries an icon and/or text label (e.g., risk badges show both color and the word "Critical"/"High"/etc.), reducing reliance on color perception alone.
- Trust/compliance messaging (AES-256, DPDP 2023, "never sold") is placed directly adjacent to the highest-anxiety actions — login screen, password fields — rather than buried in a separate legal page, on the premise that health-data trust signals matter most at the exact moment a user is asked to hand over credentials or sensitive information.
- Medical disclaimer is visually distinguished (its own icon/tone in `AiNarrative`) rather than appended as fine print, in line with the product's hard requirement that AI output never read as definitive medical advice (see `02_TRD.md` §6.2).

---

## 8. Design System Governance (recommendations for continued consistency)

These are not yet formal rules in the codebase but are implied by the existing patterns and should be treated as binding for future additions:
1. Any new status/severity surface must reuse the existing red/amber/green/blue 4-color semantic system — do not introduce a 5th meaning-color without updating this document.
2. Any new portal-specific UI must reuse `AppShell`/`DoctorShell`/`AdminShell` structural patterns (fixed sidebar + top bar/header + scrollable content) rather than inventing a new shell shape — accent color is the only intended axis of portal differentiation.
3. Any new AI-generated narrative surface must go through the same structured-JSON + `AiNarrative`-style rendering pattern — free-text paragraph dumps from an LLM should never reach the UI directly (this was a real regression once; see `06_IMPLEMENTATION.md` changelog).
4. New primary actions should reuse `.btn-primary`; introduce a secondary/tertiary button utility class only when a second tier of emphasis is genuinely needed, rather than ad hoc one-off button styling per page.
