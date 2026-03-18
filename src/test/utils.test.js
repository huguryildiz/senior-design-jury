// src/test/utils.test.js
import { describe, it, expect, vi } from "vitest";

// Icons are pulled in transitively via scoreHelpers — mock them.
vi.mock("../shared/Icons", () => ({
  CheckCircle2Icon: "span", CheckIcon: "span", SendIcon: "span",
  Clock3Icon: "span", CircleIcon: "span", CircleDotDashedIcon: "span", PencilIcon: "span",
}));

import {
  parseCsv,
  tsToMillis,
  formatTs,
  cmp,
  rowKey,
  adminCompletionPct,
  dedupeAndSort,
} from "../admin/utils";
import { buildExportFilename } from "../admin/xlsx/exportXLSX";

// ── parseCsv ──────────────────────────────────────────────────
describe("parseCsv", () => {
  it("parses a basic comma-separated row", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("supports semicolon as delimiter", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('"Smith, John",EE,2025')).toEqual([["Smith, John", "EE", "2025"]]);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    expect(parseCsv('"say ""hello""",ok')).toEqual([['say "hello"', "ok"]]);
  });

  it("ignores empty trailing lines", () => {
    const result = parseCsv("a,b\n1,2\n");
    expect(result.length).toBe(2);
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n")).toEqual([]);
  });
});

// ── tsToMillis ────────────────────────────────────────────────
describe("tsToMillis", () => {
  it("returns 0 for null or empty input", () => {
    expect(tsToMillis(null)).toBe(0);
    expect(tsToMillis("")).toBe(0);
  });

  it("parses ISO 8601 strings", () => {
    const ms = tsToMillis("2025-03-12T10:00:00.000Z");
    expect(ms).toBeGreaterThan(0);
    expect(new Date(ms).getUTCFullYear()).toBe(2025);
  });

  it("parses EU dot format: dd.mm.yyyy HH:mm", () => {
    const ms = tsToMillis("12.03.2025 10:30");
    expect(ms).toBeGreaterThan(0);
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(12);
  });

  it("parses EU slash format: dd/mm/yyyy HH:mm (legacy)", () => {
    const ms = tsToMillis("12/03/2025 10:30");
    expect(ms).toBeGreaterThan(0);
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getDate()).toBe(12);
  });

  it("returns 0 for an unparseable string", () => {
    expect(tsToMillis("not a date")).toBe(0);
  });
});

// ── formatTs ──────────────────────────────────────────────────
describe("formatTs", () => {
  it("returns '—' for null or empty input", () => {
    expect(formatTs(null)).toBe("—");
    expect(formatTs("")).toBe("—");
  });

  it("returns already-formatted DD.MM.YYYY HH:mm strings unchanged", () => {
    expect(formatTs("12.03.2025 10:30")).toBe("12.03.2025 10:30");
    expect(formatTs("01.01.2025 09:05")).toBe("01.01.2025 09:05");
  });

  it("strips seconds from DD.MM.YYYY HH:mm:ss strings", () => {
    expect(formatTs("12.03.2025 10:30:45")).toBe("12.03.2025 10:30");
  });
});

// ── cmp ───────────────────────────────────────────────────────
describe("cmp", () => {
  it("compares numbers numerically", () => {
    expect(cmp(1, 2)).toBeLessThan(0);
    expect(cmp(2, 1)).toBeGreaterThan(0);
    expect(cmp(5, 5)).toBe(0);
  });

  it("compares numeric strings as numbers", () => {
    expect(cmp("10", "9")).toBeGreaterThan(0); // numeric: 10 > 9, not lexical
  });

  it("compares non-numeric strings lexicographically (case-insensitive)", () => {
    expect(cmp("apple", "banana")).toBeLessThan(0);
    expect(cmp("Banana", "apple")).toBeGreaterThan(0);
  });

  it("handles null and undefined gracefully", () => {
    expect(() => cmp(null, "a")).not.toThrow();
    expect(() => cmp(undefined, undefined)).not.toThrow();
  });
});

// ── rowKey ────────────────────────────────────────────────────
describe("rowKey", () => {
  it("returns jurorId when present", () => {
    expect(rowKey({ jurorId: "uuid-123", juryName: "Alice", juryDept: "EE" })).toBe("uuid-123");
  });

  it("builds name__dept key when jurorId is absent", () => {
    expect(rowKey({ juryName: "Alice Smith", juryDept: "EE" })).toBe("alice smith__ee");
  });

  it("normalises name and dept to lowercase and trimmed", () => {
    expect(rowKey({ juryName: "  BOB  ", juryDept: "  CS  " })).toBe("bob__cs");
  });

  it("handles missing dept", () => {
    expect(rowKey({ juryName: "Alice" })).toBe("alice__");
  });
});

// ── adminCompletionPct ────────────────────────────────────────
describe("adminCompletionPct", () => {
  const fullRow = { technical: 25, design: 20, delivery: 20, teamwork: 8, total: 73 };
  const emptyRow = { technical: null, design: null, delivery: null, teamwork: null, total: null };
  const zeroRow = { technical: 0, design: 0, delivery: 0, teamwork: 0, total: 0 };
  const partialRow = { technical: 20, design: null, delivery: null, teamwork: null, total: null };

  it("returns 0 when totalProjects is 0", () => {
    expect(adminCompletionPct([fullRow], 0)).toBe(0);
  });

  it("returns 100 when all criteria are filled for all projects", () => {
    expect(adminCompletionPct([fullRow, fullRow], 2)).toBe(100);
  });

  it("returns 0 when all criteria are null (empty rows)", () => {
    expect(adminCompletionPct([emptyRow], 1)).toBe(0);
  });

  it("counts zero-value scores as filled (regression: was broken with > 0 check)", () => {
    expect(adminCompletionPct([zeroRow], 1)).toBe(100);
  });

  it("counts partial rows proportionally", () => {
    // partialRow has 1 of 4 criteria filled → 25%
    expect(adminCompletionPct([partialRow], 1)).toBe(25);
  });

  it("handles empty rows array", () => {
    expect(adminCompletionPct([], 3)).toBe(0);
  });
});

// ── dedupeAndSort ─────────────────────────────────────────────
describe("dedupeAndSort", () => {
  const base = {
    juryName: "Alice", juryDept: "EE", projectId: "p1", projectName: "Proj A",
    total: 80, updatedAt: "12.03.2025 10:00", updatedMs: 1741773600000,
  };

  it("returns empty array for null or empty input", () => {
    expect(dedupeAndSort(null)).toEqual([]);
    expect(dedupeAndSort([])).toEqual([]);
  });

  it("keeps a single row unchanged", () => {
    expect(dedupeAndSort([base])).toHaveLength(1);
  });

  it("deduplicates: keeps the row with the latest timestamp", () => {
    const older = { ...base, updatedMs: 1741770000000, total: 70 }; // earlier
    const newer = { ...base, updatedMs: 1741773600000, total: 80 }; // later
    const result = dedupeAndSort([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(80);
  });

  it("keeps rows for different projects as separate entries", () => {
    const row2 = { ...base, projectId: "p2", projectName: "Proj B" };
    expect(dedupeAndSort([base, row2])).toHaveLength(2);
  });

  it("filters out rows with no name, no project name, and zero total", () => {
    const ghost = { juryName: "", projectName: "", total: 0, updatedMs: 0 };
    expect(dedupeAndSort([ghost])).toHaveLength(0);
  });
});

// ── buildExportFilename ───────────────────────────────────────
describe("buildExportFilename", () => {
  it("produces a filename matching the expected pattern", () => {
    const name = buildExportFilename("details", "2025 Fall");
    expect(name).toMatch(/^vera_details_2025-fall_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
  });

  it("sanitises special characters in semester name", () => {
    const name = buildExportFilename("grid", "Fall/2025!");
    expect(name).not.toMatch(/[!/ ]/);
  });

  it("falls back gracefully when inputs are missing", () => {
    expect(() => buildExportFilename()).not.toThrow();
    const name = buildExportFilename();
    expect(name).toMatch(/^vera_/);
  });
});
