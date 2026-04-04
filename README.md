<p align="center">
  <img src="src/assets/vera_logo_dark.png" alt="VERA" width="520">
</p>

<p align="center">
  <strong>Visual Evaluation, Reporting & Analytics</strong><br>
  <sub>The structured evaluation platform for academic juries, capstone assessments, and accreditation workflows.</sub>
</p>

<p align="center">
  <a href="https://vera-eval.app"><img src="https://img.shields.io/badge/vera--eval.app-0f172a?style=for-the-badge&logo=vercel&logoColor=white" alt="vera-eval.app"></a>
  &nbsp;
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright">
</p>

<br>

<p align="center">
  <em>
    VERA replaces paper rubrics, shared spreadsheets, and manual score compilation<br>
    with a guided digital workflow — from QR scan to accreditation report.
  </em>
</p>

---

## ✨ Overview

VERA is a multi-tenant evaluation platform purpose-built for academic jury events — capstone poster days, senior design presentations, hackathon judging, and any structured multi-juror assessment workflow.

Jurors scan a QR code, authenticate with a PIN, score projects against a configurable rubric, and submit — from any device, with no app install. Administrators see live score grids, real-time rankings, and accreditation-aligned analytics the moment evaluations begin.

The platform handles the full operational lifecycle: evaluation period setup, project and juror management, criteria configuration, live monitoring, audit trails, and formatted exports — all within a single, tenant-isolated workspace.

---

## 🚀 Why VERA

Evaluation days are high-stakes and time-constrained. Dozens of jurors rotate across project stations under tight schedules. Paper rubrics get lost. Spreadsheets lag behind. Manual compilation delays results for hours — or days.

- **Zero-friction jury entry** — QR code to first score in under 60 seconds. No signup, no app install.
- **Live operational visibility** — Administrators see scores populate in real time, not after the event.
- **Instant results** — Rankings, analytics, and accreditation reports are available the moment the last score is submitted.
- **Auto-save everything** — Every score is persisted on field blur and tab-hide. No lost work, ever.
- **Full auditability** — Every admin action is logged. Every tenant is isolated. Every PIN is hashed.

---

## 🧩 Core Capabilities

### Guided Jury Flow

A mobile-first scoring experience with no signup required. Jurors authenticate via QR-delivered entry tokens and 4-digit PINs. The evaluation follows a strict step sequence — identity, period selection, PIN verification, project scoring, and submission — with auto-save on every field blur and tab-hide event.

### Live Admin Dashboard

19 dedicated admin views covering the full operational surface: live score grids, project rankings, juror activity monitoring, evaluation analytics, criteria management, period configuration, entry token control, audit logs, and XLSX exports.

Data updates are event-driven, not polled. `useAdminRealtime` subscribes to `score_sheets`, `score_sheet_items`, `juror_period_auth`, `projects`, `periods`, and `jurors` via Supabase Realtime. Any DB change triggers a debounced re-fetch (600 ms) so score totals and juror status reflect live activity within roughly one second — with no periodic polling. A manual Refresh button is also available in the header for on-demand re-fetch.

### Configurable Evaluation Framework

Criteria labels, weights, rubric bands, and accreditation outcome mappings are fully configurable per evaluation period. Defaults ship with a 100-point rubric (Technical 30, Written 30, Oral 30, Teamwork 10), but any structure is supported. Per-period framework selection (MÜDEK, ABET, or custom) drives how analytics and outcome reports render.

### Analytics & Reporting

11 purpose-built chart components cover score distributions, attainment rates, threshold gap analysis, outcome heatmaps, juror consistency matrices, programme averages, and submission timelines. All charts render against the accreditation framework configured for the active period. Rankings, score details, and evaluation grids export to formatted XLSX.

### Multi-Tenant Operations

Each organization operates in complete isolation — periods, projects, jurors, criteria, and scores are scoped to a single tenant. Super-admins manage the global tenant lifecycle. Tenant applications follow a structured approval workflow: anonymous registration → admin review → server-side user provisioning via Edge Function.

---

## 🧭 Experience by Role

**Juror**
Scan a QR code or enter a token. Authenticate with a 4-digit PIN. Score assigned projects against a guided rubric with per-criterion descriptors. Submit when done. The entire flow runs on any device browser — no accounts, no installs, no training required.

**Tenant Admin**
Manage evaluation periods, projects, jurors, and criteria for your organization. Monitor live scoring activity during events. View rankings, analytics, and accreditation outcome reports. Export results to XLSX. Control entry tokens and review audit logs.

**Super Admin**
Oversee all tenant organizations. Approve or reject new tenant applications. Manage the global lifecycle — activate, disable, or archive tenants. Cross-tenant oversight without accessing tenant-scoped data.

---

## 🏗️ Technical Foundation

| Layer | Stack |
|---|---|
| **Frontend** | React 18 · Vite · Recharts · Custom SVG charts |
| **Backend** | Supabase — PostgreSQL · PL/pgSQL RPCs · Row-Level Security · Realtime |
| **Auth** | Supabase Auth (email/password, Google OAuth, 30-day sessions) · Juror: QR token + bcrypt PIN |
| **Edge Functions** | Deno — application approval, password reset, status notifications |
| **Testing** | Vitest + Testing Library (unit) · Playwright (E2E) · vitest-axe (a11y) |
| **Data** | TanStack Table · react-window · Zod validation · xlsx-js-style export |
| **UI** | lucide-react · cmdk · Vaul drawers · @dnd-kit · Embla Carousel · Sonner toasts |

### Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                       │
│                                                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │ Jury Flow│  │ Admin Panel│  │ Auth (OAuth/PIN/JWT) │ │
│  └─────┬────┘  └─────┬──────┘  └──────────┬───────────┘ │
│        └──────────────┼────────────────────┘             │
│                       │                                  │
│              src/shared/api/                              │
│        (centralised API layer — 40+ RPC wrappers)        │
└───────────────────────┬──────────────────────────────────┘
                        │
          ┌─────────────┼────────────────┐
          ▼             ▼                ▼
   ┌────────────┐ ┌───────────┐  ┌──────────────┐
   │ Supabase   │ │ PL/pgSQL  │  │ Edge         │
   │ Auth (JWT) │ │ RPCs      │  │ Functions    │
   └────────────┘ └─────┬─────┘  │ (Deno)       │
                        │        └──────────────┘
                  ┌─────┴─────┐
                  │ PostgreSQL│
                  │ + RLS     │
                  └───────────┘
```

All database access is mediated through `src/shared/api/` — components never call Supabase directly. In production, admin RPCs route through a Supabase Edge Function so secrets never reach the browser.

---

## 🔐 Security & Control

- **Row-Level Security** on every table — tenant isolation enforced at the database level
- **JWT-authenticated admin RPCs** routed through Edge Functions to keep secrets server-side
- **Juror PINs** are bcrypt-hashed with a 3-attempt lockout
- **Entry tokens** carry a 24-hour TTL and are individually revocable
- **Google OAuth + email/password** with 30-day session persistence
- **Structured audit log** — PIN resets, evaluation locks, deletions, and all critical admin operations are recorded
- **Tenant application workflow** — server-side user provisioning via Edge Function, never client-side

---

## 📦 Project Structure

```text
src/
├── App.jsx                  # Root — state-based page routing
├── config.js                # Criteria, outcomes, rubric bands (single source of truth)
│
├── admin/                   # Admin panel (121 files)
│   ├── pages/               # 19 page components
│   ├── hooks/               # Data and state hooks
│   ├── drawers/             # Side-panel editors
│   ├── modals/              # Dialog components
│   ├── criteria/            # Rubric editor
│   ├── analytics/           # Dataset builders and export
│   └── ...                  # layout, selectors, settings, utils
│
├── jury/                    # Jury evaluation flow (29 files)
│   ├── steps/               # 8 step components (identity → done)
│   ├── hooks/               # 12 focused sub-hooks
│   └── utils/               # Score snapshots, progress tracking
│
├── auth/                    # Authentication (11 files)
│   ├── screens/             # Login, register, reset, pending
│   └── AuthProvider.jsx     # Session, OAuth, remember-me, tenant context
│
├── shared/
│   ├── api/                 # Centralised Supabase API (18 files, 11 domains)
│   ├── ui/                  # 16 shared UI primitives
│   └── ...                  # hooks, lib, schemas, types, storage
│
├── charts/                  # 11 chart components + utilities
├── landing/                 # Landing page
└── styles/                  # Component CSS

sql/migrations/              # 10 sequential schema migrations (000–009)
sql/seeds/                   # Demo seed data
supabase/functions/          # 4 Deno Edge Functions
e2e/                         # 7 Playwright E2E specs
docs/                        # Architecture, deployment, QA documentation
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- A Supabase project (PostgreSQL 15+)

### Install

```bash
npm install
```

### Configure

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_RPC_SECRET=<rpc-secret>        # dev only — injected server-side in production
```

### Database

Apply migrations sequentially in the Supabase SQL Editor:

```text
sql/migrations/000_drop_all.sql → 009_security_hash_tokens.sql
```

### Run

```bash
npm run dev              # Development server — localhost:5173
npm run build            # Production build
npm test -- --run        # Unit tests (single run)
npm run e2e              # Playwright E2E suite
```

---

## 🌐 Entry Points

| URL | Purpose |
|---|---|
| `vera-eval.app` | Landing page |
| `vera-eval.app?admin` | Admin login |
| `vera-eval.app?eval=TOKEN` | Jury gate — QR / entry-token verification |
| `vera-eval.app?explore` | Demo mode — sandbox database, auto-login |

---

## 📖 Documentation

| Directory | Contents |
|---|---|
| [`docs/architecture/`](docs/architecture/) | System overview, database schema |
| [`docs/deployment/`](docs/deployment/) | Supabase setup, Vercel config, environment variables |
| [`docs/qa/`](docs/qa/) | Unit test guide, E2E guide, smoke test plan, QA workbook |
| [`docs/superpowers/`](docs/superpowers/) | Architectural decision records, migration plans, feature specs |

---

## 🚢 Deployment

VERA is deployed on **Vercel** (frontend) with **Supabase** (backend, auth, edge functions). Single-command deployment — `vercel --prod` serves the Vite build. Supabase manages the database, auth, and serverless functions independently.

See [`docs/deployment/`](docs/deployment/) for the full environment variable reference and configuration guide.

---

<p align="center">
  <strong>VERA</strong> · Visual Evaluation, Reporting & Analytics<br>
  <sub>First deployed at TED University. Built for any institution that evaluates with juries.</sub>
</p>
