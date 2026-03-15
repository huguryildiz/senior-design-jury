# Test Plan

## Overview

Testing strategy for the TEDU Capstone Portal. The project uses Vitest for unit/integration tests and Playwright for E2E tests.

---

## Test Layers

### 1. Unit Tests (Vitest + Testing Library)

**Location:** `src/admin/__tests__/`, `src/jury/__tests__/`, `src/test/`

**Run:**
```bash
npm test              # watch mode
npm test -- --run     # single run
```

#### Jury Flow Tests

| Test file | What it covers |
|---|---|
| `jury/__tests__/PinStep.test.jsx` | PIN input, validation, error states |
| `jury/__tests__/InfoStep.test.jsx` | Name/department form, validation |
| `jury/__tests__/EvalStep.test.jsx` | Score entry, submit behavior |
| `jury/__tests__/DoneStep.test.jsx` | Completion confirmation rendering |
| `jury/__tests__/SheetsProgressDialog.test.jsx` | Batch submission progress UI |
| `jury/__tests__/useJuryState.test.js` | State machine transitions |
| `jury/__tests__/smoke.test.jsx` | Basic render smoke tests |

#### Admin Dashboard Tests

| Test file | What it covers |
|---|---|
| `admin/__tests__/OverviewTab.test.jsx` | Overview stats rendering |
| `admin/__tests__/RankingsTab.test.jsx` | Rankings table rendering |
| `admin/__tests__/ScoreDetails.test.jsx` | Score detail panel |
| `admin/__tests__/ManageJurorsPanel.test.jsx` | Juror management CRUD UI |
| `admin/__tests__/ManagePermissionsPanel.test.jsx` | Permission toggle UI |
| `admin/__tests__/ManageProjectsPanel.test.jsx` | Project management, CSV import |
| `admin/__tests__/ManageSemesterPanel.test.jsx` | Semester management UI |
| `admin/__tests__/AdminSecurityPanel.test.jsx` | Security settings UI |
| `admin/__tests__/smoke.test.jsx` | Basic render smoke tests |

#### Utility Tests

| Test file | What it covers |
|---|---|
| `admin/__tests__/scoreHelpers.test.js` | Score calculation functions |
| `admin/__tests__/utils.test.js` | Admin utility functions |
| `admin/__tests__/useGridSort.test.js` | Grid sorting hook |
| `admin/__tests__/useScoreGridData.test.jsx` | Score grid data hook |

---

### 2. E2E Tests (Playwright)

**Location:** `e2e/`

**Run:**
```bash
npm run e2e
```

**Prerequisites:** Requires separate E2E Supabase project. Set in `.env.local`:
```
E2E_SUPABASE_URL=...
E2E_SUPABASE_ANON_KEY=...
E2E_ADMIN_PASSWORD=...
E2E_JUROR_NAME=...
E2E_JUROR_DEPT=...
E2E_JUROR_PIN=...
```

| Test file | What it covers |
|---|---|
| `e2e/admin-login.spec.ts` | Admin password login flow |
| `e2e/jury-flow.spec.ts` | Full jury evaluation flow (PIN → Info → Semester → Eval → Done) |

---

### 3. Reporting (Allure)

```bash
npm run test:report          # run tests + generate raw results
npm run allure:generate      # build HTML dashboard
npm run allure:open          # open in browser
```

Or one-liner:
```bash
npm run test:report && npm run allure:generate && npm run allure:open
```

---

## Manual QA Checklist

Run before each evaluation event.

### Pre-Event Setup
- [ ] Correct semester is active in admin Settings
- [ ] All projects are imported/created for the semester
- [ ] All jurors are created and assigned to the semester
- [ ] Admin can log in with the current password
- [ ] Juror can enter PIN and reach evaluation screen

### Jury Flow
- [ ] PIN entry — correct PIN accepts, wrong PIN rejects with error
- [ ] PIN lockout activates after N failed attempts
- [ ] Name and department fields required before proceeding
- [ ] All projects listed in evaluation screen
- [ ] Score sliders/inputs accept values within valid range
- [ ] Comment field accepts and saves text
- [ ] Final submission button works and shows Done screen

### Admin Panel
- [ ] Overview tab loads with correct juror count and completion stats
- [ ] Scores tab shows all submitted evaluations
- [ ] Rankings tab shows projects sorted by average total
- [ ] Analytics charts render without errors (no blank/broken charts)
- [ ] CSV project import: valid CSV imports correctly
- [ ] CSV project import: invalid CSV shows warning, does not crash
- [ ] Juror PIN reset works and new PIN is displayed
- [ ] Edit mode enable/disable for juror works

### Export
- [ ] Excel export from Scores tab downloads a valid `.xlsx` file
- [ ] Backup export (Settings → Security) produces a downloadable JSON

### Post-Event
- [ ] All jurors show "final_submitted" status
- [ ] Scores are visible in Rankings and Analytics tabs
- [ ] Export completed for records

---

## Analytics Chart Rendering Checks

Run after any changes to `src/charts/`:

- [ ] OutcomeOverviewChart renders with mock data (no blank state)
- [ ] OutcomeTrendChart renders with 2+ semesters of data
- [ ] CompetencyRadarChart renders per-project
- [ ] CriterionBoxPlotChart renders with score distribution
- [ ] JurorHeatmapChart renders with multiple jurors and projects
- [ ] RubricAchievementChart renders achievement bands
- [ ] All charts render `ChartEmpty` placeholder when data is absent

---

## CSV Import Validation

Test cases for `ManageProjectsPanel.jsx` CSV import:

| Input | Expected behavior |
|---|---|
| Valid CSV with all columns | All rows imported |
| Missing header row | Import fails with clear error |
| Duplicate group_no | Upsert — existing record updated |
| Row with empty project_title | Row skipped with warning |
| Mixed separator formats in students column | Normalized by `normalizeStudents()` |
| Large CSV (50+ rows) | All rows processed without timeout |
