<p align="center">
  <img src="src/assets/vera_logo_white.png" alt="VERA" width="520">
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
  <img src="https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind 4">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright">
</p>

---

## Overview

VERA is a multi-tenant evaluation platform purpose-built for academic jury events — capstone poster days, senior design presentations, hackathon judging, and any structured multi-juror assessment workflow.

Jurors scan a QR code, authenticate with a PIN, score projects against a configurable rubric, and submit — from any device, with no app install. Administrators see live score grids, real-time rankings, and accreditation-aligned analytics the moment evaluations begin.

The platform handles the full operational lifecycle: period setup, project and juror management, criteria configuration, live monitoring, audit trails, and formatted exports — all within a single, tenant-isolated workspace.

---

## Why VERA

Evaluation days are high-stakes and time-constrained. Dozens of jurors rotate across project stations under tight schedules. The tools typically used — paper rubrics, shared spreadsheets, manual compilation — introduce friction at every stage.

**VERA removes that friction.**

- Jurors get a guided, step-locked mobile flow that eliminates scoring errors and lost forms.
- Administrators get a live operational dashboard — not a spreadsheet updated after the fact.
- Results, rankings, and accreditation reports are available the moment the last score is submitted.
- Every action is logged, every tenant is isolated, and every score is auto-saved on blur.

---

## Capabilities

### Jury Evaluation Flow

A guided, mobile-first scoring experience with no signup required. Jurors authenticate via QR-delivered entry tokens and 4-digit PINs (bcrypt-hashed, rate-limited). The evaluation follows a strict step sequence — identity, period selection, PIN verification, project scoring, and submission — with auto-save on every field blur and tab-hide event.

### Admin Dashboard

19 dedicated admin views covering the full operational surface: live score grids, project rankings, juror activity monitoring, evaluation analytics, criteria management, period configuration, entry token control, audit logs, and XLSX exports. All data streams through Supabase Realtime for live visibility during evaluation events.

### Multi-Tenant Architecture

Each organization operates in complete isolation — periods, projects, jurors, criteria, and scores are scoped to a single tenant. Super-admins manage the global tenant lifecycle. Tenant applications follow a structured approval workflow: anonymous registration, admin review, server-side user provisioning via Edge Function.

### Configurable Evaluation Framework

Criteria labels, weights, rubric bands, and accreditation outcome mappings are fully configurable per evaluation period. Defaults ship with a 100-point rubric (Technical 30, Written 30, Oral 30, Teamwork 10), but any structure is supported. Per-period framework selection (MUDEK, ABET, or custom) drives how analytics and outcome reports render.

### Analytics and Reporting

11 purpose-built chart components cover score distributions, attainment rates, threshold gap analysis, outcome heatmaps, juror consistency matrices, programme averages, and submission timelines. All charts render against the accreditation framework configured for the active period. Rankings, score details, and evaluation grids export to formatted XLSX.

### Security and Auditability

Row-Level Security on every table. JWT-authenticated admin RPCs routed through Supabase Edge Functions to keep secrets server-side. Juror PINs are bcrypt-hashed with a 3-attempt lockout. Entry tokens carry a 24-hour TTL and are individually revocable. Every critical admin operation — PIN resets, evaluation locks, deletions — is recorded in a structured audit log.

---

## Roles

| Role | Scope |
|---|---|
| **Juror** | QR/token entry, PIN auth, guided project scoring, submission |
| **Tenant Admin** | Manage periods, projects, jurors, criteria; view analytics; export data |
| **Super Admin** | Global tenant management, application approvals, cross-tenant oversight |

---

## Technical Foundation

| | |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS 4, Recharts, custom SVG charts |
| **Backend** | Supabase — PostgreSQL, PL/pgSQL RPCs, Row-Level Security, Realtime |
| **Auth** | Supabase Auth (email/password, Google OAuth, 30-day sessions) · Juror: QR token + bcrypt PIN |
| **Edge Functions** | Deno — application approval, password reset, status notifications |
| **Testing** | Vitest + Testing Library (unit), Playwright (E2E), vitest-axe (a11y) |
| **Data** | TanStack Table, react-window, Zod validation, xlsx-js-style export |
| **UI** | lucide-react, cmdk, Vaul drawers, @dnd-kit, Embla Carousel, Sonner toasts |

### Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                       │
│                                                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │ Jury Flow│  │ Admin Panel│  │ Auth (OAuth/PIN/JWT) │ │
│  └─────┬────┘  └─────┬──────┘  └──────────┬───────────┘ │
│        └──────────────┼───────────────────-┘             │
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

All database access is mediated through `src/shared/api/` — components never call Supabase directly.

### API Layer

VERA exposes its backend through Supabase's PostgREST interface and named PL/pgSQL RPC functions. The frontend consumes these through a centralised API layer that enforces a strict boundary: no component ever calls `supabase.rpc()` directly.

```text
src/shared/api/
├── index.js                  # Public surface — all exports aggregated here
├── core/
│   ├── client.js             # Supabase client initialisation (prod + demo dual-client)
│   └── retry.js              # withRetry() — exponential backoff, skips AbortError
├── transport.js              # RPC dispatch: callAdminRpcV2 (JWT) + callAdminRpc (legacy)
├── fieldMapping.js           # UI ↔ DB field translation (design→written, delivery→oral)
├── juryApi.js                # Jury session, scoring, and submission RPCs
│
└── admin/                    # Domain-scoped admin API — one file per resource
    ├── auth.js               # Admin authentication + security state
    ├── profiles.js           # User profile management
    ├── organizations.js      # Tenant lifecycle (create, disable, archive)
    ├── periods.js            # Evaluation period CRUD + eval-lock
    ├── projects.js           # Project CRUD + CSV import
    ├── jurors.js             # Juror CRUD + PIN reset + edit-mode toggle
    ├── scores.js             # Score queries, upserts, grid data
    ├── tokens.js             # Entry token generation, revocation, TTL
    ├── frameworks.js         # Accreditation framework configuration
    ├── audit.js              # Audit log queries
    └── export.js             # XLSX export data preparation
```

**Conventions:**

- **Naming**: Admin RPCs follow `rpc_admin_*` (JWT-authenticated via `auth.uid()` + `_assert_tenant_admin()`). Jury RPCs follow `rpc_jury_*` (token + PIN authenticated).
- **Transport**: In production, admin RPCs route through a Supabase Edge Function so `rpc_secret` never reaches the browser. In development, calls go direct.
- **Resilience**: `withRetry(fn, { maxAttempts, delayMs })` wraps score upserts and project listing. Retries only on transient network errors — never on `AbortError` or business-logic failures.
- **Field mapping**: The API layer translates between UI field names (`design`, `delivery`) and database column names (`written`, `oral`) in a single location. Components work exclusively with UI names.

---

## Project Structure

```text
src/
├── App.jsx                  # Root — state-based page routing
├── config.js                # Criteria, outcomes, rubric bands (single source of truth)
│
├── admin/                   # Admin panel — 121 files
│   ├── pages/               # 19 page components
│   ├── hooks/               # 20 data and state hooks
│   ├── drawers/             # 16 side-panel editors
│   ├── modals/              # 9 dialog components
│   ├── components/          # Shared admin UI (avatars, switchers, activity)
│   ├── layout/              # Header, sidebar, shell
│   ├── criteria/            # Rubric editor decomposition
│   ├── selectors/           # Filter pipelines and data selectors
│   ├── analytics/           # Dataset builders and export
│   ├── settings/            # PIN reset, audit card, backup
│   └── utils/               # Score helpers, export, persistence
│
├── jury/                    # Jury evaluation flow — 29 files
│   ├── steps/               # 8 step components (identity → done)
│   ├── hooks/               # 12 focused sub-hooks
│   └── utils/               # Score snapshots, progress tracking
│
├── auth/                    # Authentication — 11 files
│   ├── screens/             # Login, register, reset, profile, pending
│   ├── components/          # Tenant search dropdown
│   └── AuthProvider.jsx     # Session, OAuth, remember-me, tenant context
│
├── landing/                 # Landing page and showcase carousel
│
├── shared/
│   ├── api/                 # Centralised Supabase API (17 files, 11 domains)
│   ├── ui/                  # 16 shared UI primitives
│   ├── hooks/               # Mobile detection, pagination, toasts, focus trap
│   ├── lib/                 # Supabase client, demo mode, utilities
│   ├── schemas/             # Zod boundary validation
│   ├── types/               # TypeScript declarations
│   └── storage/             # Local/session storage helpers
│
├── charts/                  # 11 chart components + utilities
├── styles/                  # Tailwind + component CSS
└── test/                    # Test infrastructure (setup, QA catalog)

sql/
├── migrations/              # 000–009: sequential schema migrations (3,000 lines)
└── seeds/                   # Demo seed data

supabase/functions/          # 4 Deno Edge Functions
e2e/                         # 7 Playwright E2E specs
scripts/                     # Report generation, seed tooling
docs/                        # Architecture, deployment, QA, implementation reports
```

**254 source files** across the frontend. **3,000 lines** of SQL migrations. **7 E2E scenarios** covering auth, import/export, jury flow, session locking, and tenant isolation.

---

## Getting Started

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

## Entry Points

| URL | Purpose |
|---|---|
| `vera-eval.app` | Landing page |
| `vera-eval.app?admin` | Admin login |
| `vera-eval.app?eval=TOKEN` | Jury gate — QR / entry-token verification |
| `vera-eval.app?explore` | Demo mode — sandbox database, auto-login |

---

## Deployment

VERA is deployed on **Vercel** (frontend) with **Supabase** (backend, auth, edge functions). The architecture is designed for single-command deployment — `vercel --prod` serves the Vite build, and Supabase manages the database, auth, and serverless functions independently.

See [`docs/deployment/`](docs/deployment/) for environment variable reference, Supabase setup, and Vercel configuration.

---

## Documentation

| | |
|---|---|
| [`docs/architecture/`](docs/architecture/) | System overview, database schema |
| [`docs/deployment/`](docs/deployment/) | Supabase setup, Vercel config, environment variables |
| [`docs/qa/`](docs/qa/) | Unit test guide, E2E guide, smoke test plan, QA workbook |

---

<p align="center">
  <strong>VERA</strong> &mdash; Visual Evaluation, Reporting & Analytics<br>
  <sub>First deployed at TED University. Designed for any institution that evaluates with juries.</sub>
</p>
