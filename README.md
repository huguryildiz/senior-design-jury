<p align="center">
  <img src="src/assets/vera_logo_white.png" alt="VERA Logo" width="600">
</p>

<h3 align="center">Academic Jury Evaluation Platform</h3>

<p align="center">
  Structured, transparent, and scalable capstone project assessment — built for universities.
</p>

<p align="center">
  <a href="https://vera-eval.app"><img src="https://img.shields.io/badge/Production-vera--eval.app-0f172a?style=for-the-badge&logo=vercel&logoColor=white" alt="Production"></a>
  &nbsp;
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18">
  &nbsp;
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  &nbsp;
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  &nbsp;
  <img src="https://img.shields.io/badge/Tests-Vitest%20%2B%20Playwright-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Tests">
</p>

---

## Why VERA?

Capstone evaluation events are high-stakes, time-constrained, and involve dozens of jurors moving across project stations. Paper rubrics get lost, spreadsheets lag behind, and results take days to compile.

**VERA replaces all of that.** Jurors scan a QR code, authenticate with a PIN, score projects on a guided rubric, and submit — all from their phone or tablet. Admins see live rankings, analytics, and accreditation-ready reports as scores come in.

---

## Features

| Feature | Description |
|---|---|
| **QR / token jury entry** | Jurors scan a QR code or follow a link — no sign-up, no app download |
| **PIN-based juror auth** | 4-digit PINs per juror per period; bcrypt-hashed, rate-limited (3 failures → 15 min lockout) |
| **Guided evaluation flow** | Identity → period → PIN → project scoring → submission — step-locked, no skipping |
| **Configurable rubric** | Technical (0–30), Written (0–30), Oral (0–30), Teamwork (0–10) — fully customizable per period |
| **Real-time auto-save** | Scores persist on field blur and tab-hide; no data lost if browser closes |
| **Live admin dashboard** | Score grid, rankings, overview metrics, and analytics charts — updated via Supabase Realtime |
| **Multi-tenant architecture** | Each organization has isolated periods, projects, jurors, and criteria |
| **Google OAuth + email login** | Admins sign in with Google or email/password; remember-me for 30-day sessions |
| **Self-service registration** | Admins apply for access; existing admins approve and provision new tenant accounts |
| **MÜDEK outcome tracking** | Criteria mapped to 18 MÜDEK learning outcomes with achievement-level reporting |
| **XLSX export** | Score details, evaluation grid, and rankings — downloadable as formatted Excel files |
| **Audit log** | Every critical admin operation recorded with actor, action, and timestamp |
| **Entry token security** | 24-hour TTL, revocable tokens with active session tracking |
| **Accreditation framework** | Per-period framework selection (MÜDEK / ABET / custom); analytics render per framework |

---

## User Roles

| Role | Access |
|---|---|
| **Juror** | Token entry → PIN auth → score assigned project groups → submit evaluations |
| **Tenant Admin** | Manage periods, projects, jurors within their organization; view analytics; export data |
| **Super Admin** | Global scope — manage all tenants, approve applications, cross-tenant analytics |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 6 |
| Styling | Plain CSS with custom design tokens (shadcn-inspired palette) |
| Backend | Supabase (PostgreSQL + Row-Level Security + PL/pgSQL RPCs) |
| Auth | Supabase Auth — email/password, Google OAuth · Juror: QR token + 4-digit PIN (bcrypt) |
| API | Supabase PostgREST + `rpc_admin_*` / `rpc_jury_*` named functions; Edge Function proxy in production |
| Edge Functions | Deno (application approval, password reset email, status notifications) |
| Unit Tests | Vitest + Testing Library · `qaTest()` wrapper enforces QA catalog IDs |
| E2E Tests | Playwright |
| Export | xlsx-js-style |
| Drag & Drop | @dnd-kit |
| Charts | Custom SVG components |
| Icons | lucide-react |
| Virtual Scrolling | react-window |
| Validation | Zod |

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                      React SPA (Vite)                         │
│                                                               │
│   ┌──────────┐   ┌────────────┐   ┌────────────────────────┐ │
│   │ JuryFlow │   │ AdminPanel │   │ Auth (Google/Email/PIN) │ │
│   └────┬─────┘   └─────┬──────┘   └──────────┬─────────────┘ │
│        │               │                      │               │
│        └───────────────┼──────────────────────┘               │
│                        │                                      │
│               src/shared/api/                                 │
│         (all Supabase calls here — never from components)     │
└────────────────────────┬──────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────────┐
           │             │                 │
           ▼             ▼                 ▼
    ┌────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Supabase   │ │ RPC Functions│ │ Edge         │
    │ Auth (JWT) │ │ (PL/pgSQL)   │ │ Functions    │
    └────────────┘ └──────┬───────┘ │ (Deno / TS)  │
                          │         └──────────────┘
                   ┌──────┴──────┐
                   │ PostgreSQL  │
                   │  + RLS      │
                   └─────────────┘
```

### State-based routing

No React Router. `App.jsx` manages a `page` state value:

| Value | Screen |
|---|---|
| `home` | Landing page |
| `jury_gate` | QR / entry-token verification |
| `jury` | Guided jury evaluation flow |
| `admin` | Admin panel |
| `demo_login` | Demo auto-login |

Query-parameter entry points: `?eval=TOKEN` → jury gate · `?admin` → admin login · `?explore` → demo admin (auto-login).

---

## API Layer

All Supabase access is centralised in `src/shared/api/`. Components never call `supabase.rpc()` directly.

```text
src/shared/api/
├── index.js              # Public surface — import everything from here
├── core/
│   ├── client.js         # Supabase client (prod vs. demo dual-client)
│   └── retry.js          # withRetry() — exponential backoff for transient errors
├── transport.js          # callAdminRpc (v1 password) + callAdminRpcV2 (v2 JWT)
├── fieldMapping.js       # UI key ↔ DB column mapping (design→written, delivery→oral)
├── adminApi.js           # 40+ admin RPC wrappers — fully JSDoc'd
├── juryApi.js            # Jury session, scoring, submit RPCs
├── semesterApi.js        # Period queries
└── admin/                # Modular admin API (one file per domain)
    ├── auth.js
    ├── profiles.js
    ├── tenants.js
    ├── scores.js
    ├── semesters.js
    ├── projects.js
    ├── jurors.js
    ├── tokens.js
    ├── export.js
    └── audit.js
```

**Key conventions:**

- `rpc_admin_*` functions (v2) use `auth.uid()` + `_assert_tenant_admin()` — JWT-authenticated
- Production admin RPCs route through the `rpc-proxy` Edge Function so `rpc_secret` never reaches the browser
- `withRetry(fn, { maxAttempts, delayMs })` — applied to `upsertScore` and `listProjects`; skips `AbortError` and business-logic errors

---

## Project Structure

```text
src/
├── App.jsx               # Root — state-based routing
├── main.jsx
├── config.js             # Criteria, MÜDEK outcomes, colors — single source of truth
│
├── admin/
│   ├── pages/            # OverviewPage, ScoresTab, AnalyticsTab, HeatmapPage,
│   │                     # ReviewsPage, RankingsPage, EntryControlPage, AuditLogPage,
│   │                     # ExportPage, SettingsPage, PinBlockingPage, AdminPanel
│   ├── components/       # UserAvatarMenu, PendingReviewGate, TenantSwitcher,
│   │                     # JurorActivity, LastActivity, CompletionStrip, MudekManager
│   ├── hooks/            # 19 hooks: useAdminData, useAdminRealtime, useManageSemesters,
│   │                     # useManageJurors, useManageProjects, useManageOrganizations,
│   │                     # useSettingsCrud, useAnalyticsData, useGridSort, …
│   ├── utils/            # scoreHelpers, adminUtils, persist, exportXLSX, projectHelpers
│   ├── layout/           # AdminLayout, AdminHeader, AdminSidebar
│   ├── criteria/         # CriteriaManager decomposition (editor, form hook, helpers)
│   ├── selectors/        # filterPipeline, gridSelectors, projectSelectors …
│   ├── analytics/        # analyticsDatasets, export, UI components
│   ├── settings/         # PinResetDialog, AuditLogCard, ExportBackupPanel
│   ├── drawers/          # 16 side-panel drawer components
│   ├── modals/           # 9 modal components
│   └── __tests__/        # 23+ unit tests
│
├── jury/
│   ├── JuryFlow.jsx
│   ├── JuryGatePage.jsx
│   ├── useJuryState.js   # Thin orchestrator wiring all jury sub-hooks
│   ├── hooks/            # useJurorIdentity, useJurorSession, useJuryLoading,
│   │                     # useJuryScoring, useJuryEditState, useJuryWorkflow,
│   │                     # useJuryAutosave, useJuryHandlers (+ 3 handler sub-hooks)
│   ├── steps/            # InfoStep, SemesterStep, PinStep, PinRevealStep,
│   │                     # EvalStep, DoneStep, ProgressCheckStep
│   └── __tests__/
│
├── auth/
│   ├── screens/          # LoginScreen, RegisterScreen, ForgotPasswordScreen,
│   │                     # ResetPasswordScreen, CompleteProfileScreen, PendingReviewScreen
│   ├── components/       # TenantSearchDropdown
│   ├── AuthProvider.jsx  # Supabase Auth context — session, OAuth, remember-me, tenant
│   ├── useAuth.js
│   └── index.js          # Barrel: re-exports AuthProvider, useAuth
│
├── landing/
│   ├── LandingPage.jsx
│   └── components/AdminShowcaseCarousel.jsx
│
├── shared/
│   ├── api/              # See API Layer section above
│   ├── ui/               # Icons, Modal, Drawer, ConfirmDialog, ConfirmModal, Tooltip,
│   │                     # AlertCard, LevelPill, ErrorBoundary, AutoGrow,
│   │                     # MinimalLoaderOverlay, EntityMeta, DemoAdminLoader …
│   ├── hooks/            # use-mobile, use-pagination, useToast
│   ├── lib/              # supabaseClient, demoMode, utils (cn)
│   ├── storage/          # localStorage / sessionStorage helpers + keys
│   ├── criteria/         # Shared criteria utilities
│   ├── schemas/          # Zod boundary schemas (criteria template validation)
│   ├── types/            # TypeScript .d.ts declarations
│   └── __tests__/        # Shared utility tests, App storage tests, a11y tests
│
├── charts/               # Custom SVG chart components (Radar, BoxPlot, Heatmap, Trend …)
├── assets/               # Logos, images
├── styles/               # CSS: layout, components, drawers, jury, charts, per-page
└── test/                 # Test infrastructure: setup.js, qaTest.js, qa-catalog.json

sql/
├── migrations/           # 001–023: apply in order — canonical DB schema
└── seeds/                # Multi-tenant demo seed (6 orgs, 20 jurors, realistic scores)

supabase/functions/
├── rpc-proxy/            # Injects RPC_SECRET server-side; routes admin RPCs
├── approve-admin-application/   # Creates Supabase Auth user on admin approval
├── password-reset-email/        # Sends reset email via Resend API
├── password-changed-notify/     # Notifies user of password change
└── notify-application/          # Notifies applicant of status change

scripts/
└── update_generator.js   # Dev utility

docs/
├── architecture/         # System overview, database schema
├── deployment/           # Environment setup, Supabase, Vercel, Git workflow
├── qa/                   # Vitest guide, E2E guide, smoke test plan, QA workbook
└── superpowers/          # Implementation reports and migration plans
```

---

## Security

| Layer | Mechanism |
|---|---|
| **Row-Level Security** | All tables RLS-enforced; only `SECURITY DEFINER` RPCs can access data |
| **Admin auth** | Supabase Auth (JWT) — email/password + Google OAuth; 30-day remember-me sessions |
| **RPC proxy** | Production admin RPCs route through Edge Function — `rpc_secret` never reaches the browser |
| **Juror PIN** | Bcrypt-hashed; 3 incorrect attempts → 15-minute lockout |
| **Entry tokens** | 24h TTL, revocable, hash-verified; delivered via QR code or `?eval=TOKEN` |
| **Tenant isolation** | Multi-tenant RLS — every row scoped to `tenant_id`; cross-tenant access impossible |
| **Application workflow** | Anonymous registration → admin approval → server-side user creation (Edge Function) |
| **Audit log** | PIN resets, eval-lock toggles, deletions — all recorded in `audit_logs` with actor + timestamp |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_RPC_SECRET=<vault-rpc_secret-value>   # dev only — injected via Edge Function in production
```

### 3. Bootstrap the database

Apply migrations in order in the Supabase SQL Editor:

```bash
# 001_core_schema → 023_entry_token_security
# Each file in sql/migrations/ is idempotent and self-documented.
```

### 4. Run the dev server

```bash
npm run dev          # localhost:5173
npm test             # unit tests (watch mode)
npm test -- --run    # unit tests (single run, CI-style)
npm run build        # production build
```

### 5. E2E tests

Copy `.env.e2e.example` → `.env.e2e.local`, then:

```bash
npm run e2e          # Playwright E2E suite
npm run e2e:report   # open HTML report
```

---

## URL Routing

VERA uses query-parameter-based routing (no React Router):

| URL | Page |
|---|---|
| `vera-eval.app` | Landing page |
| `vera-eval.app?admin` | Admin login |
| `vera-eval.app?eval=TOKEN` | Jury gate (QR / entry-token) |
| `vera-eval.app?explore` | Demo admin (sandbox database, auto-login) |
| `vera-eval.app?type=recovery` | Password reset flow |

Admin panel internal state uses `?tab=` and `?view=` params with browser back/forward support.

---

## Default Evaluation Criteria

| Criterion | Max Score |
|---|---|
| Technical Content | 30 |
| Written Communication | 30 |
| Oral Communication | 30 |
| Teamwork | 10 |
| **Total** | **100** |

Criteria labels, weights, rubric bands, and accreditation outcome mappings are fully configurable per evaluation period via the admin panel. The schema is defined in `src/config.js`.

---

## Branding

| | |
|---|---|
| Product name | **VERA** |
| Full name | **Visual Evaluation, Reporting & Analytics** |
| Institutional deployment | **TEDU VERA** (or `<University> VERA`) |

---

<p align="center">
  Built with Supabase, React, and Vite<br>
  <sub>First deployed at TED University · Designed for broader university and competition adoption</sub>
</p>
