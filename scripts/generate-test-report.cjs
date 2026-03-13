#!/usr/bin/env node
// scripts/generate-test-report.cjs
// Reads vitest JSON output → produces a styled Excel report.
// Usage: node scripts/generate-test-report.cjs
// Input:  test-results/results.json
// Output: test-results/test-report.xlsx

"use strict";

const { readFileSync, mkdirSync } = require("fs");
const path = require("path");
const XlsxStyle = require("xlsx-js-style");

// ── Config ────────────────────────────────────────────────────────────────────

const INPUT  = path.resolve(__dirname, "../test-results/results.json");
const OUTPUT = path.resolve(__dirname, "../test-results/test-report.xlsx");

// Map filename (without .test.jsx) → friendly module name
const MODULE_MAP = {
  ManageSemesterPanel:    "Semester Management",
  ManageProjectsPanel:    "Group Management",
  ManageJurorsPanel:      "Juror Management",
  ManagePermissionsPanel: "Permissions Management",
  AdminSecurityPanel:     "Admin Security",
  RankingsTab:            "Rankings",
  ScoreDetails:           "Score Details",
  useGridSort:            "Grid Sort (Hook)",
  useScoreGridData:       "Grid Data (Hook)",
  OverviewTab:            "Overview",
  smoke:                  "Smoke Tests",
  scoreHelpers:           "Score Helpers",
  utils:                  "Utilities",
};

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
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function moduleFromPath(filePath) {
  const base = path.basename(filePath).replace(/\.(test|spec)\.(jsx?|tsx?)$/, "");
  return MODULE_MAP[base] || base;
}

function cell(value, style) {
  return style ? { v: value, s: style } : value;
}

function totalDurationSec(testResults) {
  return (
    testResults.reduce((acc, r) => acc + Math.max(0, (r.endTime || 0) - (r.startTime || 0)), 0) / 1000
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

const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
const durationSec = totalDurationSec(report.testResults || []);
const overallPass = report.success !== false && (report.numFailedTests || 0) === 0;

const summaryRows = [
  [cell("TEDU Capstone Portal — Test Report", { font: { bold: true, sz: 14 }, fill: { fgColor: { rgb: "1F4E79" } }, font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } } }), ""],
  ["", ""],
  [cell("Field", S.header), cell("Value", S.header)],
  [cell("Report Generated",  S.summaryKey), cell(now,                              S.summaryVal)],
  [cell("Total Test Suites", S.summaryKey), cell(report.numTotalTestSuites ?? "—", S.summaryVal)],
  [cell("Total Tests",       S.summaryKey), cell(report.numTotalTests      ?? "—", S.summaryVal)],
  [cell("Passed",            S.summaryKey), cell(report.numPassedTests     ?? "—", S.summaryVal)],
  [cell("Failed",            S.summaryKey), cell(report.numFailedTests     ?? "—", S.summaryVal)],
  [cell("Duration (s)",      S.summaryKey), cell(durationSec,                      S.summaryVal)],
  [cell("Overall Status",    S.summaryKey), cell(
    overallPass ? "✅ ALL PASSED" : "❌ FAILURES DETECTED",
    overallPass ? S.summaryStatusPass : S.summaryStatusFail
  )],
];

const summarySheet = XlsxStyle.utils.aoa_to_sheet(summaryRows);
summarySheet["!cols"] = [{ wch: 22 }, { wch: 36 }];
summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

// ── Sheet 2: Test Results ─────────────────────────────────────────────────────

const headerRow = [
  cell("#",               S.header),
  cell("File",            S.header),
  cell("Module",          S.header),
  cell("Suite",           S.header),
  cell("Test Name",       S.header),
  cell("Status",          S.header),
  cell("Duration (ms)",   S.header),
  cell("Failure Message", S.header),
];

const dataRows = [];
let idx = 0;

for (const suite of (report.testResults || [])) {
  const file   = path.basename(suite.testFilePath || "");
  const module = moduleFromPath(suite.testFilePath || "");

  for (const t of (suite.assertionResults || [])) {
    idx++;
    const isPassed = t.status === "passed";
    const failMsg  = (t.failureMessages || []).join(" | ").replace(/\n/g, " ").slice(0, 500);

    dataRows.push([
      idx,
      file,
      module,
      (t.ancestorTitles || []).join(" › "),
      t.title || "",
      cell(isPassed ? "PASS" : "FAIL", isPassed ? S.pass : S.fail),
      t.duration ?? 0,
      failMsg,
    ]);
  }
}

const testSheet = XlsxStyle.utils.aoa_to_sheet([headerRow, ...dataRows]);
testSheet["!cols"] = [
  { wch: 5  }, // #
  { wch: 42 }, // File
  { wch: 26 }, // Module
  { wch: 46 }, // Suite
  { wch: 62 }, // Test Name
  { wch: 8  }, // Status
  { wch: 13 }, // Duration
  { wch: 50 }, // Failure Message
];

// ── Sheet 3: Module Summary ───────────────────────────────────────────────────

const moduleStats = {};
for (const suite of (report.testResults || [])) {
  const mod = moduleFromPath(suite.testFilePath || "");
  if (!moduleStats[mod]) moduleStats[mod] = { total: 0, passed: 0, failed: 0 };
  for (const t of (suite.assertionResults || [])) {
    moduleStats[mod].total++;
    if (t.status === "passed") moduleStats[mod].passed++;
    else                       moduleStats[mod].failed++;
  }
}

const moduleHeaderRow = [
  cell("Module",          S.header),
  cell("Total Tests",     S.header),
  cell("Passed",          S.header),
  cell("Failed",          S.header),
  cell("Pass Rate",       S.header),
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

// ── Write Workbook ────────────────────────────────────────────────────────────

const wb = XlsxStyle.utils.book_new();
XlsxStyle.utils.book_append_sheet(wb, summarySheet,  "Summary");
XlsxStyle.utils.book_append_sheet(wb, moduleSheet,   "By Module");
XlsxStyle.utils.book_append_sheet(wb, testSheet,     "All Tests");

XlsxStyle.writeFile(wb, OUTPUT);

console.log(`✅ Excel report → ${OUTPUT}`);
console.log(`   ${idx} tests | ${report.numPassedTests ?? "?"} passed | ${report.numFailedTests ?? "?"} failed`);
