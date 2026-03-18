# TEDU VERA — Unit Test Guide (Vitest)

Vitest-based unit tests. Runs in jsdom — no real browser, no network. All 37 test
files, 306 tests. Every test must pass before a commit.

---

## Setup

No extra install needed — Vitest is already in `package.json`. Tests run through
Vite's transform pipeline.

**No `.env.local` required.** Supabase is mocked in every test file that
imports from `src/shared/api.js`.

---

## Commands

```bash
# Watch mode — re-runs on save (default for local dev)
npm test

# Single run, CI-style
npm test -- --run

# Single file
npm test -- --run src/jury/__tests__/useJuryState.test.js

# Run with Allure reporter → test-results/allure-results/
npm run test:report

# Generate + open Allure HTML report
npm run allure:generate && npm run allure:open
```

---

## Config

Two config files:

| File | Used by | Purpose |
| --- | --- | --- |
| `vite.config.js` (test block) | `npm test` | Default — fast, no Allure overhead |
| `vitest.config.allure.mjs` | `npm run test:report` | Adds Allure reporter, outputs to `test-results/` |

Both use:

- **Environment:** jsdom
- **Setup file:** `src/test/setup.js` — loads `@testing-library/jest-dom`, runs
  `cleanup()` after each test, polyfills `Blob.prototype.text()` for file
  upload tests
- **Excludes:** `node_modules/`, `e2e/` (Playwright tests are never run under
  Vitest)

---

## qaTest Pattern

All new tests use `qaTest()` instead of bare `it()`:

```js
import { qaTest } from "../../test/qaTest.js";

qaTest("grid.filter.03", () => {
  // test body — no need to repeat the scenario text here
});
```

`qaTest` looks up the ID in `src/test/qa-catalog.json` and:

- Uses `meta.scenario` as the test name
- Attaches Allure annotations (module, area, story, severity, description) when the Allure runtime is active
- **Throws at module load time** if the ID is missing from the catalog — add the
  entry before writing the test

Plain `it()` is fine for low-level pure-function tests that don't need a
catalog entry.

---

## Supabase Mock Pattern

Every test file that imports anything from `src/shared/api/` must mock `supabaseClient`:

```js
vi.mock("../../lib/supabaseClient", () => ({ supabase: {} }));
```

Without this, Vitest throws `VITE_SUPABASE_URL is required` at import time
because `.env.local` is not loaded in the test environment.

---

## Test Files

### Jury — Hook (32 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/jury/__tests__/useJuryState.test.js` | 14 | PIN lockout flow, `isScoreFilled`, `normalizeScoreValue` clamping, jury flow state transitions |
| `src/jury/__tests__/useJuryState.writeGroup.test.js` | 18 | `writeGroup()` happy path, deduplication via `lastWrittenRef`, save status (`saving`/`saved`/`error`), semester lock response, score normalization on blur, auto-done transition, edit mode flow, cancel submit |

### Jury — Components (33 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/jury/__tests__/EvalStep.test.jsx` | 8 | Smoke render, group navigation (prev/next), submit button visibility, lock state (inputs disabled), group synced banner |
| `src/jury/__tests__/ScoringGrid.test.jsx` | 7 | ARIA labels on score inputs and comment textarea, `handleScore`/`handleScoreBlur` callbacks, lockActive disables all inputs, rubric button, total score display |
| `src/jury/__tests__/InfoStep.test.jsx` | 9 | Submit guard (both name + dept required), error banner, project count label (singular/plural), Enter key submission |
| `src/jury/__tests__/PinRevealStep.test.jsx` | 6 | Displays all 4 PIN digits, Continue disabled until checkbox checked, clipboard copy failure message, Return Home button presence/absence |
| `src/jury/__tests__/DoneStep.test.jsx` | 4 | Title variants (submit vs edit mode), Edit My Scores button visibility, score summary display |
| `src/jury/__tests__/PinStep.test.jsx` | 4 | Attempt counter, lockout screen, `navigator.vibrate` safety (not available in jsdom) |
| `src/jury/__tests__/SheetsProgressDialog.test.jsx` | 3 | Juror status chip rendering (pending/in-progress/done), SemesterStep single-semester auto-advance |
| `src/jury/__tests__/GroupStatusPanel.test.jsx` | 2 | Save error banner display, retry behavior |
| `src/jury/__tests__/EvalHeader.test.jsx` | 2 | SaveIndicator `aria-live` region (saving/saved states) |
| `src/jury/__tests__/smoke.test.jsx` | 1 | All 5 jury step components render without crashing |

### Admin — Hook & Data (24 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/admin/__tests__/useGridSort.test.js` | 17 | Score range filter (min/max/both/none/boundary), sort toggle cycle (asc → desc → none), multi-column sort, filter + sort combined |
| `src/admin/__tests__/useScoreGridData.test.jsx` | 7 | Data loading, `groupAverages` edge cases (empty groups, all-null, mixed null/zero, single juror) |

### Admin — Pure Functions (15 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/test/scoreHelpers.test.js` | 17 | `getCellState` (all 6 states), `getPartialTotal` (null handling, partial sums), juror workflow state precedence matrix |
| `src/admin/__tests__/export.test.js` | 4 | `buildExportFilename` format, `exportGridXLSX` sheet structure and cell values, `exportRankingsXLSX` output |
| `src/admin/__tests__/overviewMetrics.test.js` | 3 | `computeOverviewMetrics`: completion %, juror activity counts, zero-project edge case |
| `src/admin/__tests__/scoreHelpers.test.js` | 3 | `getCellState` resolution, `getPartialTotal` with mixed null/numeric, juror workflow state precedence |
| `src/admin/__tests__/utils.test.js` | 5 | CSV parsing (quoted fields, multiline, semicolons), row key stability, completion %, dedup logic, timestamp formatting |

### Admin — Components (73 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/test/utils.test.js` | 36 | `parseCsv` (delimiter, quoting, escaping, empty input), `tsToMillis`, timestamp formatting, row dedup, completion %, key building |
| `src/admin/__tests__/ManageSemesterPanel.test.jsx` | 11 | Sort order (name/date/active), set active behavior, delete guard (can't delete active semester), smoke renders |
| `src/admin/__tests__/smoke.test.jsx` | 11 | CompletionStrip variants (0%/50%/100%), JurorActivity chip states (not started/in-progress/done) |
| `src/admin/__tests__/ManagePermissionsPanel.test.jsx` | 10 | `canEnableEdit` gate conditions, lock eval toggle, force-close confirmation flow |
| `src/admin/__tests__/ManageProjectsPanel.test.jsx` | 10 | CSV import validation (missing columns, duplicate IDs, invalid format), import summary display, CRUD smoke |
| `src/admin/__tests__/ManageJurorsPanel.test.jsx` | 9 | Juror CSV import validation, PIN reset button, CRUD smoke |
| `src/admin/__tests__/RankingsTab.test.jsx` | 7 | Rankings render, competition ranking (1,1,3 not dense 1,1,2), export button, result consistency |
| `src/admin/__tests__/AdminSecurityPanel.test.jsx` | 6 | Password strength (too short, no uppercase, no number, too common), successful password change flow |
| `src/admin/__tests__/OverviewTab.test.jsx` | 5 | Metrics display, completion strip, juror activity section |
| `src/admin/__tests__/ScoreDetails.test.jsx` | 8 | Filter by juror/project, empty state, data consistency across view modes |
| `src/admin/__tests__/PinResetDialog.test.jsx` | 8 | Confirmation step (renders, cancel, confirm), result step (success/failure display), loading state, stale state guard |

### Shared (20 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/shared/__tests__/withRetry.test.js` | 3 | Retries on `TypeError` and network errors, does not retry `AbortError`, does not retry business errors |
| `src/shared/__tests__/api.env.test.js` | 2 | Dev-mode console warning when `VITE_RPC_SECRET` is missing, no warning in prod mode |
| `src/shared/__tests__/ErrorBoundary.test.jsx` | 1 | Renders fallback UI when a child component throws |

### Accessibility (9 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/test/a11y.test.jsx` | 9 | axe-core audits for ScoringGrid (normal + locked), PinRevealStep (with/without back button), dialog ARIA roles, form labels, `aria-live` banner, skip navigation |

### ARIA / DOM Behavior (4 tests)

| File | Tests | What it covers |
| --- | --- | --- |
| `src/admin/__tests__/ScoreGrid.aria.test.jsx` | 3 | ARIA roles on grid cells, `aria-sort` attribute on sorted column |
| `src/admin/__tests__/ScoreGrid.momentum.test.js` | 1 | `transitionend` handler guard — does not throw when element is disconnected from DOM |

---

## Excel Reports

After a test run with the Allure reporter:

```bash
# 1. Run tests with Allure output
npm test:report

# 2. Generate HTML report from results
npm run allure:generate

# 3. Open in browser
npm run allure:open

# 4. Export unit test results to Excel
node scripts/generate-test-report.cjs
# → test-results/test-report-YYYY-MM-DD_HHMM.xlsx
```

The Excel file contains a Summary sheet and a per-module breakdown with QA
coverage metrics.

---

## Quick Check — Before Poster Day

```bash
# Run all 306 unit tests — all must pass
npm test -- --run

# Then run E2E
npm run e2e

# Full Excel report for both suites
npm run report:all
```
