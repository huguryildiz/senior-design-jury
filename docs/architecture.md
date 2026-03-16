# Architecture — TEDU Capstone Portal

## Overview

Single-page React application (Vite) communicating with a Supabase backend
exclusively through PostgreSQL RPC functions. No traditional REST API, no custom
backend server.

---

## State-Based Routing

`App.jsx` manages a top-level `page` state with three values: `"home"`,
`"jury"`, `"admin"`.

```text
home  ──→  jury   (JuryForm.jsx)
home  ──→  admin  (AdminPanel.jsx, password-gated)
```

**Why no React Router?** This tool has no URL-sharing or deep-linking
requirements. Evaluators open the app on a shared device, complete the flow, and
leave. State-based routing keeps the bundle smaller and eliminates
browser-history complexity in a multi-step evaluation flow.

---

## Admin Panel Architecture

```text
App.jsx
└── AdminPanel.jsx                  ← receives adminPass via prop (useRef in App)
    ├── OverviewTab.jsx             ← summary stats, juror activity
    ├── ScoresTab.jsx               ← score grid with freeze/export
    │   ├── ScoreGrid.jsx
    │   ├── ScoreDetails.jsx
    │   └── useScoreGridData.js     ← data loading, filtering, sorting
    ├── RankingsTab.jsx             ← project rankings
    ├── AnalyticsTab.jsx            ← MÜDEK charts (lazy-rendered)
    │   └── src/charts/*            ← individual chart components
    └── SettingsPage.jsx            ← manage semesters, projects, jurors
        ├── ManageSemesterPanel.jsx
        ├── ManageProjectsPanel.jsx
        ├── ManageJurorsPanel.jsx
        └── ManagePermissionsPanel.jsx
```

**Admin password flow:**

1. User enters password on login screen
2. `rpc_admin_login` verifies it; password stored in `useRef` (never in React
state)
3. Every subsequent admin RPC call passes the password as `p_admin_password`
4. On logout or auth failure, ref is cleared and localStorage entry removed

---

## Jury Evaluation Flow

```text
JuryForm.jsx
└── useJuryState.js                 ← state machine for 5-step flow
    ├── PinStep.jsx                 ← 4-digit PIN entry
    ├── InfoStep.jsx                ← name + department
    ├── SemesterStep.jsx            ← active semester selection
    ├── EvalStep.jsx                ← score all projects
    │   └── SheetsProgressDialog   ← submission progress
    └── DoneStep.jsx                ← confirmation screen
```

**State persistence:** `juror_id` and `semester_id` survive page refreshes via
`localStorage` for same-device convenience. Cleared on final submission.

---

## Supabase RPC Integration

All backend communication goes through `src/shared/api.js`. Components never call
`supabase.rpc()` directly.

```text
Component
  → api.js function
    → supabase.rpc("rpc_function_name", { params })
      → PostgreSQL function (RLS-enforced)
        → returns data
      → api.js normalizes field names
    → component receives typed data
```

**Field name normalization** happens exclusively in `api.js`:

- DB `written` → UI `design`
- DB `oral` → UI `delivery`

**Auth model:**

- Jurors: 4-digit PIN verified via `rpc_verify_juror_pin` (rate-limited in DB)
- Admin: password passed per-call to protected RPCs (stateless)
- RLS: all tables protected; access granted only through specific RPC
functions

---

## Chart Analytics System

Charts live in `src/charts/`. Each file exports a primary component and a
`*Print` variant for print/PDF rendering.

```text
src/charts/
├── index.js                    ← barrel export (re-exported by src/Charts.jsx shim)
├── chartUtils.jsx              ← CHART_OUTCOMES, OUTCOMES, shared SVG helpers
├── OutcomeOverviewChart.jsx    ← MÜDEK outcome overview (bar chart)
├── OutcomeTrendChart.jsx       ← cross-semester outcome trend (line chart)
├── OutcomeByGroupChart.jsx     ← per-group outcome breakdown
├── CompetencyRadarChart.jsx    ← radar chart per criterion
├── CriterionBoxPlotChart.jsx   ← score distribution box plots
├── JurorHeatmapChart.jsx       ← juror consistency heatmap
├── RubricAchievementChart.jsx  ← MÜDEK achievement band chart
└── MudekBadge.jsx              ← outcome code badge component
```

`src/Charts.jsx` is a compatibility shim: `export * from "./charts/index"`. It
preserves any old import paths.

Data flows: `AnalyticsTab.jsx` fetches data via `adminGetScores`,
`adminGetOutcomeTrends`, `adminProjectSummary` from `api.js`, then passes it as
props to chart components. Charts are pure rendering components with no data
fetching.

---

## Configuration

`src/config.js` is the single source of truth for:

- Evaluation criteria (id, label, color, max score, MÜDEK codes, rubric bands)
- MÜDEK outcome definitions (18 outcomes, EN + TR text)
- `TOTAL_MAX` (derived: sum of all criteria max scores = 100)
- `MUDEK_THRESHOLD` (70 — reference line on outcome charts)
- `BAND_COLORS` (achievement band color tokens)

**Never hardcode criterion IDs or max scores in components.** Always import from
`config.js`.

---

## Styling

Plain CSS files in `src/styles/`. Each major area has its own file:

| File | Scope |
|---|---|
| `home.css` | Landing page |
| `jury.css` | Jury evaluation flow |
| `admin-layout.css` | Admin panel layout |
| `admin-dashboard.css` | Admin tab content |
| `admin-matrix.css` | Score grid |
| `admin-manage.css` | Settings panels |
| `shared.css` | Cross-cutting tokens and utilities |
| `toast.css` | Toast notifications |

---

## Testing Architecture

- **Unit tests** — Vitest + Testing Library. Live in `src/admin/__tests__/` and `src/jury/__tests__/`.
- **E2E tests** — Playwright. Live in `e2e/`. Require a separate E2E Supabase
  project (env vars `E2E_SUPABASE_*`).
- **Reporting** — Allure dashboard via
  `npm run test:report && npm run allure:generate`.
- **Pre-push hook** — `.githooks/pre-push` runs E2E tests before push.
