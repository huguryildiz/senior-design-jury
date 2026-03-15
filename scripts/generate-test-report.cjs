#!/usr/bin/env node
// scripts/generate-test-report.cjs
// Reads vitest JSON output → produces a styled Excel report with QA metadata.
// Usage: node scripts/generate-test-report.cjs
// Input:  test-results/results.json
// Output: test-results/test-report.xlsx

"use strict";

const { readFileSync, mkdirSync } = require("fs");
const path = require("path");
const XlsxStyle = require("xlsx-js-style");

// ── Config ────────────────────────────────────────────────────────────────────

const _now    = new Date();
const ts      = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-${String(_now.getDate()).padStart(2,"0")}_${String(_now.getHours()).padStart(2,"0")}-${String(_now.getMinutes()).padStart(2,"0")}`;
const INPUT   = path.resolve(__dirname, "../test-results/results.json");
const OUTPUT  = path.resolve(__dirname, `../test-results/test-report-${ts}.xlsx`);
const CATALOG = path.resolve(__dirname, "../src/test/qa-catalog.json");

// Fallback module name derived from file path (used when catalog has no entry).
const MODULE_MAP = {
  ManageSemesterPanel:    "Settings / Semesters",
  ManageProjectsPanel:    "Settings / Groups",
  ManageJurorsPanel:      "Settings / Jurors",
  ManagePermissionsPanel: "Settings / Permissions",
  AdminSecurityPanel:     "Settings / Security",
  RankingsTab:            "Scores / Rankings",
  ScoreDetails:           "Scores / Details",
  useGridSort:            "Scores / Grid",
  useScoreGridData:       "Scores / Grid",
  OverviewTab:            "Overview Dashboard",
  smoke:                  "Overview Dashboard",
  scoreHelpers:           "Core Logic",
  utils:                  "Core Logic",
};

// ── Load QA Catalog ───────────────────────────────────────────────────────────

let catalog = [];
try {
  catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
} catch {
  console.warn("⚠️  qa-catalog.json not found — QA metadata columns will be empty.");
}

// Primary index: scenario title → meta entry
// When two entries share the same scenario, describeGroup disambiguates.
const metaByScenario = {};
const metaByDescribeAndScenario = {};

for (const m of catalog) {
  if (!metaByScenario[m.scenario]) metaByScenario[m.scenario] = m;
  if (m.describeGroup) {
    metaByDescribeAndScenario[`${m.describeGroup}||${m.scenario}`] = m;
  }
}

/**
 * Find the best-matching catalog entry for a test result row.
 * Tries the composite (describeGroup + title) key first, then falls
 * back to title-only.
 */
function findMeta(title, ancestorTitles) {
  const describe0 = (ancestorTitles || [])[0] || "";
  return (
    metaByDescribeAndScenario[`${describe0}||${title}`] ||
    metaByScenario[title] ||
    null
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  header: {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: "1F4E79" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      bottom: { style: "thin", color: { rgb: "FFFFFF" } },
      right:  { style: "thin", color: { rgb: "FFFFFF" } },
    },
  },
  headerAlt: {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: "375623" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      bottom: { style: "thin", color: { rgb: "FFFFFF" } },
      right:  { style: "thin", color: { rgb: "FFFFFF" } },
    },
  },
  pass: {
    font: { bold: true, color: { rgb: "1B6B3A" } },
    fill: { fgColor: { rgb: "D6F0E0" } },
    alignment: { horizontal: "center" },
  },
  fail: {
    font: { bold: true, color: { rgb: "7B1818" } },
    fill: { fgColor: { rgb: "F4CCCC" } },
    alignment: { horizontal: "center" },
  },
  critical: {
    font: { bold: true, color: { rgb: "7B1818" } },
    fill: { fgColor: { rgb: "FDE9D9" } },
    alignment: { horizontal: "center" },
  },
  normal: {
    alignment: { horizontal: "center" },
  },
  minor: {
    font: { color: { rgb: "595959" } },
    alignment: { horizontal: "center" },
  },
  wrap: {
    alignment: { wrapText: true, vertical: "top" },
  },
  summaryKey: {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: "D9E2F3" } },
    alignment: { horizontal: "left" },
  },
  summaryVal: {
    font: { sz: 11 },
    alignment: { horizontal: "left" },
  },
  summaryStatusPass: {
    font: { bold: true, color: { rgb: "1B6B3A" }, sz: 12 },
    fill: { fgColor: { rgb: "D6F0E0" } },
  },
  summaryStatusFail: {
    font: { bold: true, color: { rgb: "7B1818" }, sz: 12 },
    fill: { fgColor: { rgb: "F4CCCC" } },
  },
  coverageStrong: {
    font: { bold: true, color: { rgb: "1B6B3A" } },
    alignment: { horizontal: "center" },
  },
  coverageMedium: {
    font: { color: { rgb: "7D4E00" } },
    alignment: { horizontal: "center" },
  },
  coverageLow: {
    font: { color: { rgb: "595959" } },
    alignment: { horizontal: "center" },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function moduleFromPath(filePath) {
  const base = path.basename(filePath).replace(/\.(test|spec)\.(jsx?|tsx?)$/, "");
  return MODULE_MAP[base] || base;
}

function cell(value, style) {
  return style ? { v: value ?? "", s: style } : (value ?? "");
}

function wrapCell(value) {
  return cell(value ?? "", S.wrap);
}

function severityStyle(sev) {
  if (sev === "critical" || sev === "blocker") return S.critical;
  if (sev === "minor" || sev === "trivial")   return S.minor;
  return S.normal;
}

function coverageStyle(strength) {
  if (strength === "Strong") return S.coverageStrong;
  if (strength === "Medium") return S.coverageMedium;
  return S.coverageLow;
}

function totalDurationSec(testResults) {
  return (
    testResults.reduce(
      (acc, r) => acc + Math.max(0, (r.endTime || 0) - (r.startTime || 0)),
      0
    ) / 1000
  ).toFixed(2);
}

// ── Read JSON ─────────────────────────────────────────────────────────────────

let report;
try {
  report = JSON.parse(readFileSync(INPUT, "utf8"));
} catch (err) {
  console.error(`❌ Cannot read ${INPUT}: ${err.message}`);
  process.exit(1);
}

mkdirSync(path.dirname(OUTPUT), { recursive: true });

// ── Sheet 1: Summary ──────────────────────────────────────────────────────────

const now        = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
const durationSec = totalDurationSec(report.testResults || []);
const overallPass = report.success !== false && (report.numFailedTests || 0) === 0;

const summaryRows = [
  [cell("TEDU Capstone Portal — Test Report", {
    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1F4E79" } },
  }), ""],
  ["", ""],
  [cell("Field", S.header), cell("Value", S.header)],
  [cell("Report Generated",  S.summaryKey), cell(now,                              S.summaryVal)],
  [cell("Total Test Suites", S.summaryKey), cell(report.numTotalTestSuites ?? "—", S.summaryVal)],
  [cell("Total Tests",       S.summaryKey), cell(report.numTotalTests      ?? "—", S.summaryVal)],
  [cell("Passed",            S.summaryKey), cell(report.numPassedTests     ?? "—", S.summaryVal)],
  [cell("Failed",            S.summaryKey), cell(report.numFailedTests     ?? "—", S.summaryVal)],
  [cell("Duration (s)",      S.summaryKey), cell(durationSec,                      S.summaryVal)],
  [cell("QA Annotated Tests",S.summaryKey), cell(catalog.length,                   S.summaryVal)],
  [cell("Overall Status",    S.summaryKey), cell(
    overallPass ? "✅ ALL PASSED" : "❌ FAILURES DETECTED",
    overallPass ? S.summaryStatusPass : S.summaryStatusFail,
  )],
];

const summarySheet = XlsxStyle.utils.aoa_to_sheet(summaryRows);
summarySheet["!cols"]   = [{ wch: 24 }, { wch: 36 }];
summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

// ── Sheet 2: All Tests (with QA metadata) ─────────────────────────────────────

const allTestsHeader = [
  cell("#",                S.header),
  cell("Module",           S.header),
  cell("Area",             S.header),
  cell("Story",            S.header),
  cell("Test Scenario",    S.header),
  cell("Status",           S.header),
  cell("Severity",         S.header),
  cell("Coverage",         S.header),
  cell("Why It Matters",   S.header),
  cell("Risk",             S.header),
  cell("Duration (ms)",    S.header),
  cell("Suite",            S.header),
  cell("File",             S.header),
];

const allTestsRows = [];
let idx = 0;

for (const suite of (report.testResults || [])) {
  const file          = path.basename(suite.testFilePath || "");
  const fallbackModule = moduleFromPath(suite.testFilePath || "");

  for (const t of (suite.assertionResults || [])) {
    idx++;
    const isPassed = t.status === "passed";
    const meta     = findMeta(t.title, t.ancestorTitles);

    allTestsRows.push([
      idx,
      meta?.module           || fallbackModule,
      meta?.area             || "",
      meta?.story            || "",
      t.title                || "",
      cell(isPassed ? "PASS" : "FAIL", isPassed ? S.pass : S.fail),
      cell(meta?.severity    || "",    meta ? severityStyle(meta.severity) : {}),
      cell(meta?.coverageStrength || "", meta ? coverageStyle(meta.coverageStrength) : {}),
      wrapCell(meta?.whyItMatters || ""),
      wrapCell(meta?.risk         || ""),
      t.duration ?? 0,
      (t.ancestorTitles || []).join(" › "),
      file,
    ]);
  }
}

const allTestsSheet = XlsxStyle.utils.aoa_to_sheet([allTestsHeader, ...allTestsRows]);
allTestsSheet["!cols"] = [
  { wch: 5  }, // #
  { wch: 22 }, // Module
  { wch: 28 }, // Area
  { wch: 36 }, // Story
  { wch: 58 }, // Test Scenario
  { wch: 8  }, // Status
  { wch: 10 }, // Severity
  { wch: 10 }, // Coverage
  { wch: 52 }, // Why It Matters
  { wch: 52 }, // Risk
  { wch: 13 }, // Duration
  { wch: 42 }, // Suite
  { wch: 38 }, // File
];

// ── Sheet 3: Module Summary ───────────────────────────────────────────────────

const moduleStats = {};
for (const suite of (report.testResults || [])) {
  for (const t of (suite.assertionResults || [])) {
    const meta = findMeta(t.title, t.ancestorTitles);
    const mod  = meta?.module || moduleFromPath(suite.testFilePath || "");
    if (!moduleStats[mod]) moduleStats[mod] = { total: 0, passed: 0, failed: 0 };
    moduleStats[mod].total++;
    if (t.status === "passed") moduleStats[mod].passed++;
    else                       moduleStats[mod].failed++;
  }
}

const moduleHeaderRow = [
  cell("Module",      S.header),
  cell("Total Tests", S.header),
  cell("Passed",      S.header),
  cell("Failed",      S.header),
  cell("Pass Rate",   S.header),
];

const moduleDataRows = Object.entries(moduleStats)
  .sort((a, b) => b[1].total - a[1].total)
  .map(([mod, s]) => {
    const rate = s.total > 0 ? ((s.passed / s.total) * 100).toFixed(0) + "%" : "—";
    return [
      mod,
      s.total,
      cell(s.passed, s.passed === s.total ? S.pass : S.summaryVal),
      cell(s.failed, s.failed > 0 ? S.fail : S.summaryVal),
      rate,
    ];
  });

const moduleSheet = XlsxStyle.utils.aoa_to_sheet([moduleHeaderRow, ...moduleDataRows]);
moduleSheet["!cols"] = [{ wch: 28 }, { wch: 13 }, { wch: 10 }, { wch: 10 }, { wch: 11 }];

// ── Sheet 4: QA Coverage (annotated tests only, business-readable) ────────────

const qaHeader = [
  cell("ID",             S.headerAlt),
  cell("Module",         S.headerAlt),
  cell("Area",           S.headerAlt),
  cell("Story",          S.headerAlt),
  cell("Test Scenario",  S.headerAlt),
  cell("Severity",       S.headerAlt),
  cell("Coverage",       S.headerAlt),
  cell("Why It Matters", S.headerAlt),
  cell("Risk",           S.headerAlt),
  cell("Result",         S.headerAlt),
];

// Build a map of scenario → pass/fail from the actual run
const resultByScenario = {};
const resultByDescribeAndScenario = {};
for (const suite of (report.testResults || [])) {
  for (const t of (suite.assertionResults || [])) {
    const describe0 = (t.ancestorTitles || [])[0] || "";
    resultByScenario[t.title] = t.status;
    resultByDescribeAndScenario[`${describe0}||${t.title}`] = t.status;
  }
}

function getResult(meta) {
  const compositeKey = meta.describeGroup
    ? `${meta.describeGroup}||${meta.scenario}`
    : null;
  const status =
    (compositeKey && resultByDescribeAndScenario[compositeKey]) ||
    resultByScenario[meta.scenario] ||
    "unknown";
  return status;
}

const qaRows = catalog.map((meta) => {
  const status   = getResult(meta);
  const isPassed = status === "passed";
  return [
    meta.id,
    meta.module,
    meta.area,
    meta.story,
    meta.scenario,
    cell(meta.severity,         severityStyle(meta.severity)),
    cell(meta.coverageStrength, coverageStyle(meta.coverageStrength)),
    wrapCell(meta.whyItMatters),
    wrapCell(meta.risk),
    cell(
      isPassed ? "PASS" : status === "unknown" ? "—" : "FAIL",
      isPassed ? S.pass : status === "unknown" ? {} : S.fail,
    ),
  ];
});

const qaSheet = XlsxStyle.utils.aoa_to_sheet([qaHeader, ...qaRows]);
qaSheet["!cols"] = [
  { wch: 26 }, // ID
  { wch: 22 }, // Module
  { wch: 28 }, // Area
  { wch: 36 }, // Story
  { wch: 58 }, // Test Scenario
  { wch: 10 }, // Severity
  { wch: 10 }, // Coverage
  { wch: 52 }, // Why It Matters
  { wch: 52 }, // Risk
  { wch: 8  }, // Result
];

// ── Write Workbook ────────────────────────────────────────────────────────────

const wb = XlsxStyle.utils.book_new();
XlsxStyle.utils.book_append_sheet(wb, summarySheet, "Summary");
XlsxStyle.utils.book_append_sheet(wb, moduleSheet,  "By Module");
XlsxStyle.utils.book_append_sheet(wb, allTestsSheet,"All Tests");
XlsxStyle.utils.book_append_sheet(wb, qaSheet,      "QA Coverage");

XlsxStyle.writeFile(wb, OUTPUT);

console.log(`✅ Excel report → ${OUTPUT}`);
console.log(
  `   ${idx} tests | ${report.numPassedTests ?? "?"} passed | ` +
  `${report.numFailedTests ?? "?"} failed | ${catalog.length} QA-annotated`
);
