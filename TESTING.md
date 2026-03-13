# Testing

## Quick start

```bash
npm test              # watch mode (development)
npm test -- --run     # single run, no watch
```

---

## Allure Interactive Dashboard

Allure provides a browser-based dashboard showing total tests, pass/fail status,
duration, suite breakdown, and individual test details with history tracking.

> **Prerequisite:** Java must be installed (`java -version`).
> On macOS: `brew install openjdk`

### Generate and open

```bash
# 1. Run tests and produce raw results
npm run test:report

# 2. Build the HTML report from the results
npm run allure:generate

# 3. Open the dashboard in your browser
npm run allure:open
```

Or as a one-liner:

```bash
npm run test:report && npm run allure:generate && npm run allure:open
```

### What you see in the dashboard

| Section | Description |
|---------|-------------|
| Overview | Total / passed / failed / broken counts, pass rate ring |
| Suites | Tests grouped by file → describe block → test name |
| Timeline | When each test ran and how long it took |
| Behaviors | Tests grouped by feature (based on describe labels) |
| Categories | Failure categories (assertion errors, crashes, etc.) |

### Config file

Allure uses a separate Vitest config so the default `npm test` stays fast:

```
vitest.config.allure.mjs   ← adds AllureReporter + allure-vitest/setup
vite.config.js             ← used by npm test (no Allure overhead)
```

### Generated directories (git-ignored)

```
allure-results/   ← raw JSON results produced by test:report
allure-report/    ← final HTML report produced by allure:generate
```

---

## Excel Report (CI)

Every CI run uploads a styled Excel artifact (`test-report-<run_number>.xlsx`)
to GitHub Actions → Actions tab → select run → Artifacts section.

To generate locally:

```bash
mkdir -p test-results
npm test -- --run --reporter=json --outputFile=test-results/results.json
node scripts/generate-test-report.cjs
# → test-results/test-report.xlsx
```
