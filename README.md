<p align="center">
  <img src="src/assets/vera_logo_white.png" alt="VERA Logo" width="600">
</p>

# VERA

**TEDU Capstone Jury Evaluation Platform** · *Verdict & Evaluation Ranking Assistant (VERA)*

VERA is a multi-tenant academic jury evaluation platform built for universities and departments that need a structured, transparent, and scalable way to assess capstone and senior design projects.

---

First developed for TED University, VERA helps jurors evaluate student teams through a guided scoring experience and gives administrators a central workspace for managing semesters, organizations, jurors, projects, rankings, analytics, and accreditation-oriented reporting.

## Overview

During evaluation events such as poster day, faculty jurors move across project
stations, assess teams using configurable rubric criteria, and submit scores
through VERA’s guided evaluation flow.

Administrators manage the full process from the admin panel, including
organizations, semesters, juror assignments, project records, rankings,
analytics, and MÜDEK-aligned outcome reporting.

**Usage pattern:** VERA is used most intensively during a focused academic
evaluation window each term, typically covering preparation, evaluation day,
and immediate post-event review.

---

## Core Features

- **QR / token jury entry** — jurors scan a QR code or follow a link with a session token to gain access; no public sign-up
- **PIN-based juror authentication** — 4-digit PINs assigned per juror per semester; bcrypt-hashed, rate-limited (3 failures → 15-minute lockout)
- **Guided evaluation flow** — identity → semester selection → PIN entry → project scoring → submission
- **4-criteria rubric scoring** — Technical Content (0–30), Written Communication (0–30), Oral Communication (0–30), Teamwork (0–10)
- **Auto-save on blur and tab-hide** — scores written to Supabase on field blur and `visibilitychange`
- **Admin dashboard** — live score grid, rankings, overview metrics, analytics charts
- **MÜDEK outcome tracking** — criteria mapped to 18 MÜDEK outcome codes; achievement level reporting
- **XLSX export** — score details, evaluation grid, rankings — all downloadable as formatted Excel files
- **Audit log** — all critical admin operations recorded with actor, action, and timestamp
- **Semester and juror management** — create/edit/delete semesters, projects, and jurors; manage eval lock per semester

---

## User Roles

| Role | Access |
|---|---|
| **Juror** | Gains access via QR/token link, authenticates via PIN, scores assigned project groups, submits evaluations |
| **Admin** | Full access — manages semesters, projects, jurors, views analytics, exports data, resets PINs, locks evaluations |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Supabase (PostgreSQL + RPC functions + RLS) |
| Auth | Admin: RPC password · Juror: QR token + 4-digit PIN (bcrypt) |
| Unit tests | Vitest + Testing Library |
| E2E tests | Playwright |
| Export | xlsx-js-style |
| Drag-and-drop | @dnd-kit |
| Charts | Custom SVG components (no Recharts) |
| Icons | lucide-react |
| Virtual scrolling | react-window |

---

## Project Structure

```text
src/
├── App.jsx                 # Root — state-based routing (home / jury_gate / jury / admin)
├── AdminPanel.jsx          # Admin interface root
├── JuryForm.jsx            # Jury flow root
├── config.js               # Evaluation criteria, MÜDEK outcomes, colors (single source of truth)
├── admin/
│   ├── hooks/              # 12 focused hooks (useManageSemesters, useManageJurors, etc.)
│   ├── components/         # analytics/, details/ sub-components
│   ├── settings/           # PinResetDialog, AuditLogCard, ExportBackupPanel
│   ├── xlsx/               # exportXLSX.js — Excel export utilities
│   └── utils/              # auditUtils, sorting helpers
├── jury/
│   ├── useJuryState.js     # Thin orchestrator for jury flow state
│   ├── hooks/              # 7 focused hooks (useJuryScoring, useJuryAutosave, etc.)
│   ├── utils/              # scoreState.js, progress.js, scoreSnapshot.js
│   ├── JuryGatePage.jsx    # QR / entry token verification
│   ├── PinStep.jsx         # PIN entry
│   ├── PinRevealStep.jsx   # PIN reveal (first login)
│   ├── InfoStep.jsx        # Name + department
│   ├── SemesterStep.jsx    # Semester selection
│   └── EvalStep.jsx        # Score entry
├── charts/                 # Analytics chart components (Radar, BoxPlot, Heatmap, Outcome, Trend)
├── components/
│   ├── admin/              # AdminSecurityPanel
│   └── toast/              # Toast notification system
└── shared/
    ├── api/                # Modularized API layer (adminApi, juryApi, semesterApi, fieldMapping)
    ├── api.js              # Re-export shim → shared/api/index.js
    ├── ErrorBoundary.jsx   # Top-level error boundary
    └── stats.js            # Statistical calculations
sql/
└── 000_bootstrap.sql       # Full DB schema, tables, RPC functions, grants
supabase/
└── functions/rpc-proxy/    # Edge Function — routes admin RPCs, injects RPC_SECRET server-side
```

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_RPC_SECRET=<vault-rpc_secret-value>   # dev only
```

Create a `rpc_secret` secret in Supabase Vault and match its value to `VITE_RPC_SECRET`.

### 3. Bootstrap the database

Run in Supabase SQL Editor:

```sql
-- Full schema
\i sql/000_bootstrap.sql

-- Set initial admin password
SELECT rpc_admin_bootstrap_password('strong-admin-password');
```

The admin password can also be changed from the admin panel → Security tab after first login.

### 4. Run the dev server

```bash
npm run dev          # localhost:5173
npm test             # unit tests (watch mode)
npm test -- --run    # unit tests (single run, CI-style)
npm run build        # production build
```

### 5. E2E tests

E2E tests require a separate `.env.e2e.local` file (copy from `.env.e2e.example`):

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_RPC_SECRET=...
E2E_ADMIN_PASSWORD=<admin-password>
E2E_JUROR_NAME=Test Juror
E2E_JUROR_DEPT=EE
E2E_JUROR_PIN=1234
```

```bash
npm run e2e          # Playwright E2E tests
npm run e2e:report   # open HTML report
```

---

## Evaluation Criteria

| Criterion | Max Score |
|---|---|
| Technical Content | 30 |
| Written Communication | 30 |
| Oral Communication | 30 |
| Teamwork | 10 |
| **Total** | **100** |

Criterion definitions, rubric bands, and MÜDEK outcome mappings are defined in `src/config.js`.

---

## Security

- **RLS** — Row-level security enforced; only `SECURITY DEFINER` RPC functions can access tables
- **Admin auth** — Password passed as parameter on every RPC call; stored in `useRef`, never in state or localStorage
- **RPC proxy** — In production, admin RPCs route through a Supabase Edge Function so `rpc_secret` never reaches the browser
- **PIN auth** — Bcrypt-hashed; 3 incorrect attempts trigger a 15-minute lockout
- **Entry token** — Jury access requires a valid short-lived token (QR code or URL param `?t=`)
- **Audit log** — All critical operations (PIN resets, eval lock, deletions) recorded in `audit_logs`

---

## Test Status

```text
Unit:  306/306 ✓  (37 test files)
E2E:     9/10  ✓  (1 skipped — requires locked semester)
```

---

## Documentation

Project documentation is available in the `docs/` directory:

| Folder | Contents |
| --- | --- |
| [`docs/architecture/`](docs/architecture/) | System overview, database schema |
| [`docs/deployment/`](docs/deployment/) | Environment variables, Supabase setup, Vercel deployment, Git workflow |
| [`docs/qa/`](docs/qa/) | Vitest guide, E2E guide, smoke test plan, QA workbook, session records |
| [`docs/refactor/`](docs/refactor/) | Phase 0–6 refactor documentation |
| [`docs/audit/`](docs/audit/) | Dated production audit reports (gitignored) |
| [`docs/reports/`](docs/reports/) | Tech debt register, release blockers (gitignored) |

---

## Branding

| Usage | Name |
|---|---|
| Product name | **VERA** |
| Institutional deployment | **TEDU VERA** |
| Full expansion | **VERA — Verdict & Evaluation Ranking Assistant** |
| Suggested repo name | `VERA` |

VERA is the product brand. TEDU VERA is the name used in institutional or formal contexts (reports, headers, documentation).
