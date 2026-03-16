# TEDU VERA — E2E Test Guide

Playwright-based end-to-end tests. Runs in a real browser against the real
Supabase demo database.

---

## Setup

Playwright is already defined in `package.json`. Before running for the first
time, download browser binaries:

```bash
npx playwright install
```

---

## Commands

```bash
# Run all E2E tests (headless)
npm run e2e

# Open HTML report (results from last run)
npm run e2e:report

# Run with live UI — watch every step
npx playwright test --ui

# Run a specific file
npx playwright test e2e/jury-flow.spec.ts

# Re-run only failed tests
npx playwright test --last-failed

# Run in headed mode (browser visible)
npx playwright test --headed
```

---

## Environment Variables

Some tests require real credentials. Add to `.env.local`:

```env
# Required for admin tests
E2E_ADMIN_PASSWORD=your_admin_password

# Required for jury full-flow test (jury.e2e.01)
E2E_JUROR_NAME=Test Juror
E2E_JUROR_DEPT=EE
E2E_JUROR_PIN=1234
E2E_SEMESTER_NAME=2026 Spring

# Required for lock test (jury.e2e.02) — semester must be locked in DB
E2E_LOCKED=true
```

If an env var is missing, the relevant test is automatically **skipped** — no
CI failure.

---

## Test Files

| File | Test ID | Scenario |
| --- | --- | --- |
| `e2e/jury-flow.spec.ts` | — | InfoStep UI smoke tests |
| `e2e/jury-flow.spec.ts` | `jury.e2e.01` | Juror identity → PIN → semester → eval screen |
| `e2e/jury-lock.spec.ts` | `jury.e2e.02` | Locked semester → banner visible, inputs disabled |
| `e2e/admin-login.spec.ts` | — | Admin panel login smoke |
| `e2e/admin-results.spec.ts` | `admin.e2e.02` | Admin → Scores → Rankings tab loads |
| `e2e/admin-export.spec.ts` | `admin.e2e.03` | Rankings → Excel button → `.xlsx` downloaded |
| `e2e/admin-import.spec.ts` | `admin.e2e.01` | Settings → Projects → CSV import dialog opens |

---

## HTML Report

After running `npm run e2e`:

```bash
npm run e2e:report
```

Opens `http://localhost:9323` in the browser. What you can see:

- **pass / fail / skip** status and duration for each test
- **Screenshots on failure** — the exact moment it broke
- **Video recording** — full screen capture of the test run
- **Trace viewer** — step-by-step which element was clicked, which assertion was
  expected

To open the trace viewer, click a failed test → `Traces` tab.

---

## Skip Logic

Tests fall into two categories:

**Always runs** (no env var required):

- InfoStep UI tests — pure HTML interaction
- Admin login — if `E2E_ADMIN_PASSWORD` is set

**Credentials gated** (skipped if env var is missing):

- `jury.e2e.01` — requires `E2E_JUROR_PIN` + `E2E_SEMESTER_NAME`
- `jury.e2e.02` — also requires `E2E_LOCKED=true`

In CI, if only `E2E_ADMIN_PASSWORD` is defined, admin tests run and jury flow
tests are skipped — this is expected behavior.

---

## Playwright Config

Settings in `playwright.config.ts`:

| Setting | Value |
| --- | --- |
| Browser | Chromium |
| Base URL | `http://localhost:5173` (or `E2E_BASE_URL`) |
| Timeout | 30 seconds / test |
| Retry (CI) | 2 |
| Screenshot | On failure only |
| Video | Retained on failure |
| Web server | `npm run dev` started automatically |

---

## Excel Reports

To export test results to Excel:

```bash
# E2E results only → test-results/e2e-report-YYYY-MM-DD_HHMM.xlsx
npm run e2e:excel

# Unit test results only → test-results/test-report-YYYY-MM-DD_HHMM.xlsx
npm run test:report && node scripts/generate-test-report.cjs

# Both at once — generate everything in one command
npm run report:all
```

`npm run e2e` must be run before `npm run e2e:excel` — the JSON output is read
from `test-results/playwright-results.json`.

Excel files are written to `test-results/`:

| File | Contents |
| --- | --- |
| `test-results/e2e-report-*.xlsx` | E2E: Summary + all tests (status, duration, error) |
| `test-results/test-report-*.xlsx` | Unit: Summary + per-module + QA coverage |

---

## Quick Check — Before Poster Day

```bash
# 1. Unit tests — all must pass
npm test -- --run

# 2. E2E — admin tests + UI smoke
npm run e2e

# 3. Open report and review
npm run e2e:report

# 4. (Optional) Generate Excel output
npm run report:all
```

These commands cover the full automated test suite.
