// src/admin/__tests__/export.test.js
// ============================================================
// Export utilities — filename pattern, grid headers, ranking tie ranks.
// ============================================================

import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mock xlsx-js-style before importing utils ─────────────────────────────

let capturedSheets = [];

vi.mock("xlsx-js-style", () => {
  const utils = {
    aoa_to_sheet: vi.fn((data) => ({ __data: data })),
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    book_append_sheet: vi.fn((wb, ws, name) => {
      capturedSheets.push({ ws, name });
    }),
  };
  return {
    default: { utils, writeFile: vi.fn() },
    utils,
    writeFile: vi.fn(),
  };
});

// Dynamic import of xlsx-js-style after mock so we can access spies
import { buildExportFilename, exportGridXLSX, exportRankingsXLSX } from "../xlsx/exportXLSX.js";

// ── buildExportFilename — pure function ──────────────────────────────────

describe("buildExportFilename", () => {
  qaTest("export.filename.01", () => {
    // Set a fixed time for deterministic output
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:42:00.000Z"));

    const name = buildExportFilename("rankings", "2026 Spring");

    // Pattern: vera_{type}_{semester}_{YYYY-MM-DD}_{HHMM}.xlsx
    expect(name).toMatch(/^vera_rankings_2026-spring_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
    expect(name).toContain("vera_rankings_2026-spring_");
    expect(name).toContain(".xlsx");

    vi.useRealTimers();
  });
});

// ── exportGridXLSX — header construction ─────────────────────────────────

describe("exportGridXLSX", () => {
  beforeEach(() => {
    capturedSheets = [];
    vi.clearAllMocks();
  });

  qaTest("export.grid.01", async () => {
    // Headers must include fixed columns + one column per group
    const groups = [
      { id: "g1", groupNo: 1 },
      { id: "g2", groupNo: 2 },
    ];
    const exportRows = [
      { name: "Alice", dept: "EE", statusLabel: "Completed", scores: { g1: 80, g2: 75 } },
    ];

    await exportGridXLSX(exportRows, groups, { semesterName: "2026 Spring" });

    // aoa_to_sheet is called with [headers, ...dataRows]
    const XLSX = await import("xlsx-js-style");
    const calls = XLSX.utils.aoa_to_sheet.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const sheetData = calls[0][0];
    const headers = sheetData[0];

    expect(headers).toContain("Juror");
    expect(headers).toContain("Institution / Department");
    expect(headers).toContain("Status");
    expect(headers).toContain("Group 1");
    expect(headers).toContain("Group 2");
  });

  qaTest("export.grid.02", async () => {
    // The rows passed to exportGridXLSX must be exactly the visible (filtered) rows
    const groups = [{ id: "g1", groupNo: 1 }];
    const filteredRows = [
      { name: "Bob", dept: "CS", statusLabel: "Completed", scores: { g1: 90 } },
    ];

    await exportGridXLSX(filteredRows, groups, { semesterName: "2026 Spring" });

    const XLSX = await import("xlsx-js-style");
    const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    // headers + 1 data row (only Bob)
    expect(sheetData).toHaveLength(2);
    expect(sheetData[1][0]).toBe("Bob");
  });
});

// ── exportRankingsXLSX — tie rank values ─────────────────────────────────

describe("exportRankingsXLSX", () => {
  beforeEach(() => {
    capturedSheets = [];
    vi.clearAllMocks();
  });

  qaTest("export.rank.01", async () => {
    // Two tied projects must both have rank 1 in the export; next gets rank 3
    const criteria = [{ id: "technical", label: "Technical", max: 30 }];
    const ranked = [
      { groupNo: 1, name: "Alpha", students: "", totalAvg: 90, avg: { technical: 25 } },
      { groupNo: 2, name: "Beta",  students: "", totalAvg: 90, avg: { technical: 25 } },
      { groupNo: 3, name: "Gamma", students: "", totalAvg: 80, avg: { technical: 20 } },
    ];

    await exportRankingsXLSX(ranked, criteria, { semesterName: "2026 Spring" });

    const XLSX = await import("xlsx-js-style");
    const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    // sheetData[0] = headers, sheetData[1..3] = data rows
    const rankAlpha = sheetData[1][0];
    const rankBeta  = sheetData[2][0];
    const rankGamma = sheetData[3][0];

    expect(rankAlpha).toBe(1); // tied first
    expect(rankBeta).toBe(1);  // tied first
    expect(rankGamma).toBe(3); // competition ranking — skips rank 2
  });
});
