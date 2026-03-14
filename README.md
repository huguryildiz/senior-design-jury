# TEDU Capstone Portal

A lightweight evaluation system used for TED University Electrical & Electronics Engineering senior design poster days.

---

## Overview

The portal supports two types of users:

- **Jurors** — faculty members who evaluate student project groups during poster day. Each juror scores groups across four criteria: Technical Content, Written Communication, Oral Communication, and Teamwork.
- **Administrators** — department coordinators who set up semesters, manage projects and jurors, monitor evaluation progress, and view analytics.

All evaluation data is stored in Supabase. The system is optimized for reliability during live evaluation sessions — minimal moving parts, no complex infrastructure.

---

## Main Features

- **Jury evaluation flow** — PIN-authenticated step-by-step scoring interface
- **Admin dashboard** — multi-tab view with overview, scores, rankings, and analytics
- **Project rankings** — sorted by average total score across all jurors
- **Analytics charts** — MÜDEK outcome overview, trend across semesters, competency radar, criterion box plots, juror consistency heatmap
- **Score grid** — detailed per-juror, per-project score matrix with export
- **CSV import** — bulk import of projects and jurors from spreadsheet exports
- **Evaluation lock/unlock** — admin can open and close edit windows for individual jurors
- **Excel export** — styled `.xlsx` export of the full score grid

---

## Architecture

**Frontend:** React 18 + Vite — single-page application, no server-side rendering.

**Database:** Supabase PostgreSQL with Row-Level Security.

**Backend logic:** Supabase RPC functions — all data operations go through named PostgreSQL functions. No custom backend server.

**Routing:** State-based UI routing (`"home" | "jury" | "admin"`) instead of React Router. Intentional for this use case — see [docs/tech_debt_register.md](docs/tech_debt_register.md).

**Auth:**
- Jurors: 4-digit PIN issued per semester, rate-limited in the database
- Admin: password verified per-call via RPC (`rpc_admin_login`)

---

## Repository Structure

```
tedu-capstone-portal/
├── src/
│   ├── admin/          Admin dashboard tabs, hooks, and utilities
│   ├── jury/           Jury evaluation flow (5-step)
│   ├── charts/         Analytics chart components
│   ├── shared/         API client, stats, shared UI components
│   ├── components/     Toast system, admin dialogs
│   ├── styles/         CSS files (one per major area)
│   ├── lib/            Supabase client initialization
│   ├── config.js       Single source of truth — criteria, MÜDEK outcomes
│   ├── App.jsx         Root component and page routing
│   ├── AdminPanel.jsx  Admin panel root
│   └── JuryForm.jsx    Jury evaluation root
│
├── docs/               Project documentation
│   ├── architecture.md
│   ├── implementation_plan.md
│   ├── release_blockers.md
│   ├── tech_debt_register.md
│   ├── test_plan.md
│   └── audit/
│
├── tools/
│   └── prompts/        Reusable Claude session prompts
│
├── .claude/
│   ├── skills/         Claude workflow skill definitions
│   └── hooks/          QA and pre-commit checklists
│
├── sql/                Supabase SQL migrations
├── e2e/                Playwright end-to-end tests
└── scripts/            Utility scripts
```

---

## Jury Evaluation Flow

1. Juror enters their name and department
2. Juror receives or enters a 4-digit PIN
3. Juror selects the active semester
4. Juror scores each assigned project group
5. Scores are submitted to Supabase and reflected immediately in the admin dashboard

---

## Admin Dashboard

| Tab | Contents |
|---|---|
| Overview | Juror completion status, evaluation progress summary |
| Scores | Full score grid — per-juror, per-project, with freeze and export |
| Rankings | Projects sorted by average total score |
| Analytics | MÜDEK outcome charts, trend analysis, juror consistency heatmap |
| Settings | Manage semesters, projects, jurors, permissions, and security |

---

## Development

**Prerequisites:** Node.js, a Supabase project, `.env.local` with credentials.

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle
npm run build

# Run unit tests
npm test -- --run

# Run E2E tests (requires E2E Supabase project)
npm run e2e
```

**Environment variables** (`.env.local`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Database schema and RPC functions are in `sql/`. Apply them in order via the Supabase SQL editor. See `sql/README.md` for details.

---

## Design Principles

- **Reliability during evaluation sessions** — simple data flow, no complex state, predictable behavior
- **Minimal dependencies** — React, Vite, Supabase client, and a handful of focused libraries
- **Simple architecture** — all backend logic in Supabase RPC functions; no custom server to maintain
- **Maintainability for academic use** — clear documentation, single source of truth for configuration

---

## Known Tradeoffs

See [docs/tech_debt_register.md](docs/tech_debt_register.md) for full rationale on each decision.

| Tradeoff | Reason |
|---|---|
| State-based routing instead of React Router | No URL-sharing or deep-linking requirements |
| 4-digit PIN for jurors | Usability — shorter codes reduce errors during live events |
| Stateless admin password per RPC | Acceptable for a single-admin internal tool |
| Admin panel optimized for desktop | Admin operates from a department computer |
| No client-side caching | Fresh data preferred during live evaluation |

---

## License

Internal academic project.

TED University — Department of Electrical and Electronics Engineering
