# Architecture — VERA (TEDU Capstone Jury Evaluation Portal)

## Overview

Single-page React application (Vite) communicating with a Supabase backend
exclusively through PostgreSQL RPC functions. No traditional REST API, no
custom backend server.

---

## State-Based Routing

`App.jsx` manages a top-level `page` state with four values:
`"home" | "jury_gate" | "jury" | "admin"`.

```text
home  ──→  jury_gate  ──→  jury   (JuryForm.jsx)
home  ──→  admin               (AdminPanel.jsx, password-gated)
```

**`jury_gate`** is the QR / entry-token verification screen. Jurors land here
when they follow the QR code link (`?t=<token>`) or visit `/jury-entry`.
The gate verifies the token and, on success, grants jury access. It is never
persisted to localStorage — navigating away clears it.

**Why no React Router?** This tool has no URL-sharing or deep-linking
requirements. Evaluators open the app on a shared device, complete the flow,
and leave. State-based routing keeps the bundle smaller and eliminates
browser-history complexity in a multi-step evaluation flow.

---

## Demo Mode

Controlled by two environment variables set at build time:

| Variable | Effect |
| --- | --- |
| `VITE_DEMO_MODE=true` | Enables demo mode — pre-fills the admin password field and skips `jury_gate` |
| `VITE_DEMO_ADMIN_PASSWORD` | The password pre-filled in demo mode |

In demo mode the `jury_gate` step is bypassed and the "Start Evaluation" button
navigates directly to `jury`. This is the only behavioral difference from a
standard deployment.

---

## Admin Panel Architecture

Three main tabs. **Scores** has four sub-tabs.

```text
App.jsx
└── AdminPanel.jsx                  ← receives adminPass via prop (useRef in App)
    ├── OverviewTab.jsx             ← summary metrics, juror activity
    ├── ScoresTab.jsx               ← sub-tab container
    │   ├── RankingsTab.jsx         ← project rankings
    │   ├── AnalyticsTab.jsx        ← MÜDEK charts (lazy-loaded)
    │   │   └── src/charts/*        ← individual chart components
    │   ├── ScoreGrid.jsx           ← live score matrix
    │   └── ScoreDetails.jsx        ← filterable per-row score table
    └── SettingsPage.jsx            ← manage semesters, projects, jurors
        ├── ManageSemesterPanel.jsx
        ├── ManageProjectsPanel.jsx
        ├── ManageJurorsPanel.jsx
        └── ManagePermissionsPanel.jsx
```

### Admin hooks (`src/admin/hooks/`)

All Settings state lives in focused hooks, not in `SettingsPage.jsx`:

- `useAdminData` — score data loading + project summary
- `useAdminRealtime` — Supabase Realtime subscription
- `useAdminTabs` + `useResultsViewState` — tab + sub-tab navigation
- `useAnalyticsData` — trend chart data
- `useSettingsCrud` — thin orchestrator wiring the four domain hooks
- `useManageSemesters` — semester CRUD + eval-lock state
- `useManageProjects` — project CRUD
- `useManageJurors` — juror CRUD + PIN reset + edit-mode toggle
- `useDeleteConfirm` — cross-cutting delete dialog
- `useAuditLogFilters` — audit log pagination + filtering
- `useScoreDetailsFilters` — score details filter/sort/pagination

### Admin password flow

1. User enters password on login screen
2. `rpc_admin_login` verifies it; password stored in `useRef` (never in React
   state or localStorage)
3. Every subsequent admin RPC call passes the password as `p_admin_password`
4. On logout or auth failure, ref is cleared

---

## Jury Evaluation Flow

`useJuryState.js` is a thin orchestrator — state is split across focused
sub-hooks. Step components are dumb (receive state + callbacks via hook).

```text
JuryGatePage.jsx                    ← QR / entry-token verification
└── (on success) → JuryForm.jsx
    └── useJuryState.js             ← orchestrates 7 sub-hooks
        ├── InfoStep.jsx            ← "identity": juror name + department
        ├── SemesterStep.jsx        ← "semester": select active semester
        ├── PinStep.jsx             ← "pin": 4-digit PIN entry
        ├── PinRevealStep.jsx       ← "pin_reveal": PIN display (first login only)
        ├── (progress_check)        ← internal gate, no dedicated component
        ├── EvalStep.jsx            ← "eval": score all projects
        │   └── SheetsProgressDialog   ← submission progress
        └── DoneStep.jsx            ← "done": confirmation screen
```

Step sequence:

```text
"identity" → "semester" → ("pin" | "pin_reveal") → "progress_check" → "eval" → "done"
```

`SemesterStep` auto-advances when exactly one active semester exists.
`PinRevealStep` is shown only on first login when the PIN has not yet been
acknowledged.

**Sub-hooks** (`src/jury/hooks/`):

- `useJurorIdentity` — juror name, dept, auth error
- `useJurorSession` — PIN / session token
- `useJuryLoading` — semester/project loading + abort ref
- `useJuryScoring` — scoring state + pending refs
- `useJuryEditState` — edit/lock state + polling effect
- `useJuryWorkflow` — step navigation, derived values
- `useJuryAutosave` — `writeGroup`, visibility auto-save
- `useJuryHandlers` — cross-hook callbacks

**State persistence:** `juror_id` and `semester_id` survive page refreshes via
`localStorage` for same-device convenience. Cleared on final submission.

---

## Supabase RPC Integration

All backend communication goes through `src/shared/api/`. Components never
call `supabase.rpc()` directly.

```text
Component
  → src/shared/api/<module>.js function
    → callAdminRpc / supabase.rpc(...)
      → PostgreSQL function (RLS-enforced)
        → returns data
      → api normalizes field names (fieldMapping.js)
    → component receives normalized data
```

**API module structure** (`src/shared/api/`):

- `index.js` — re-exports everything; import from here
- `adminApi.js` — all admin RPC wrappers (40+ functions, JSDoc'd)
- `juryApi.js` — jury RPC wrappers
- `semesterApi.js` — semester queries
- `fieldMapping.js` — UI ↔ DB field name translation
- `core/client.js` — Supabase client init + proxy config
- `core/retry.js` — `withRetry` helper

**Field name normalization** happens exclusively in `fieldMapping.js`:

- DB `written` → UI `design`
- DB `oral` → UI `delivery`

### Auth model

- Jurors: entry token (QR/URL) + 4-digit PIN verified via `rpc_verify_juror_pin`
  (rate-limited in DB — 3 failures → 15-minute lockout per semester)
- Admin: password passed per-call to protected RPCs (stateless, stored in `useRef`)
- RLS: all tables protected; access granted only through SECURITY DEFINER RPC
  functions

**Production security:** In production, all admin RPC calls go through the
`rpc-proxy` Supabase Edge Function (`supabase/functions/rpc-proxy/index.ts`).
This keeps the `RPC_SECRET` out of the browser — it lives in Supabase Vault.
In development, RPCs are called directly using `VITE_RPC_SECRET` from
`.env.local`.

---

## Chart Analytics System

Charts live in `src/charts/`. Each file exports a primary component and some
export a `*Print` variant for print/PDF rendering.

```text
src/charts/
├── chartUtils.jsx              ← CHART_OUTCOMES, OUTCOMES, shared SVG helpers
├── OutcomeTrendChart.jsx       ← cross-semester outcome trend (line chart)
├── OutcomeByGroupChart.jsx     ← per-group outcome breakdown
├── CompetencyRadarChart.jsx    ← radar chart per criterion
├── CriterionBoxPlotChart.jsx   ← score distribution box plots
├── JurorHeatmapChart.jsx       ← juror consistency heatmap
├── RubricAchievementChart.jsx  ← MÜDEK achievement band chart
└── MudekBadge.jsx              ← outcome code badge component
```

Data flows: `AnalyticsTab.jsx` fetches data via the API, then passes it as
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

**Never hardcode criterion IDs or max scores in components.** Always import
from `config.js`.

---

## Source Layout

```text
src/
├── App.jsx                 ← root, state-based routing (home/jury_gate/jury/admin)
├── AdminPanel.jsx          ← admin interface root
├── JuryForm.jsx            ← jury flow root
├── config.js               ← evaluation criteria, MÜDEK outcomes, colors
├── admin/
│   ├── hooks/              ← 12 focused hooks (useManageSemesters, useAdminData, etc.)
│   ├── components/
│   │   ├── analytics/      ← AnalyticsHeader and related sub-components
│   │   └── details/        ← ScoreDetailsFilters, ScoreDetailsTable
│   ├── settings/           ← PinResetDialog, EvalLockConfirmDialog, AuditLogCard, ExportBackupPanel
│   ├── xlsx/               ← exportXLSX.js (all XLSX export functions)
│   └── utils/              ← auditUtils.js, sorting helpers
├── jury/
│   ├── useJuryState.js     ← orchestrator for jury flow
│   ├── hooks/              ← 8 focused hooks (useJuryScoring, useJuryAutosave, etc.)
│   ├── utils/              ← scoreState.js, progress.js, scoreSnapshot.js
│   └── JuryGatePage.jsx    ← QR / entry-token verification
├── charts/                 ← modular SVG chart components
├── components/
│   ├── admin/              ← AdminSecurityPanel, DeleteConfirmDialog
│   └── toast/              ← Toast notification system
├── shared/
│   ├── api/                ← modularized API (adminApi, juryApi, semesterApi, fieldMapping)
│   ├── api.js              ← legacy re-export shim
│   ├── ErrorBoundary.jsx
│   ├── Icons.jsx
│   └── stats.js, dateBounds.js, semesterSort.js, scrollIndicators.js, useFocusTrap.js
├── lib/
│   └── supabaseClient.js   ← Supabase client initialization
├── styles/                 ← one CSS file per major area
└── test/                   ← qaTest helper, qa-catalog.json, setup.js
```

---

## Styling

Plain CSS files in `src/styles/`. Each major area has its own file:

| File | Scope |
| --- | --- |
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

- **Unit tests** — Vitest + Testing Library. 306 tests across 37 files in
  `src/admin/__tests__/`, `src/jury/__tests__/`, `src/shared/__tests__/`, and
  `src/test/`.
- **E2E tests** — Playwright. 6 spec files in `e2e/`. 9 of 10 tests pass;
  1 skipped (requires a locked semester in the demo DB).
- **Reporting** — Allure dashboard via
  `npm run test:report && npm run allure:generate`. Excel reports via
  `npm run report:all`.
- **CI** — GitHub Actions runs unit tests on every push/PR. E2E job is
  currently disabled (`if: false`) — run locally with `npm run e2e`.

See [docs/qa/vitest-guide.md](../qa/vitest-guide.md) and [docs/qa/e2e-guide.md](../qa/e2e-guide.md) for full testing guides.
