// src/admin/__tests__/auditUtils.test.js
// ============================================================
// Unit tests for audit utility pure functions extracted in
// Phase 4 — Admin Layer Decomposition.
//
// All functions are pure (no React, no Supabase) and can be
// tested without mocking the API layer.
// ============================================================

import { describe, expect, it } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  parseSearchDateParts,
  parseAuditDateString,
  getAuditDateRangeError,
  buildAuditParams,
  normalizeStudentNames,
  AUDIT_PAGE_SIZE,
} from "../utils/auditUtils.js";

// ── Mock dateBounds (avoids VITE_SUPABASE_URL requirement) ───────────────
// auditUtils.js imports APP_DATE_MIN_YEAR / MAX_YEAR from shared/dateBounds.
// dateBounds has no Supabase dependency so no mock is needed; Vitest resolves
// the file path directly.

// ── parseSearchDateParts ──────────────────────────────────────────────────

describe("parseSearchDateParts", () => {
  qaTest("auditUtils.parse.01", () => {
    const result = parseSearchDateParts("15 jan 2025");
    expect(result).toEqual({ day: 15, month: 1, year: 2025 });
  });

  qaTest("auditUtils.parse.02", () => {
    const result = parseSearchDateParts("15.01.2025");
    expect(result).toEqual({ day: 15, month: 1, year: 2025 });
  });

  it("returns null for empty string", () => {
    expect(parseSearchDateParts("")).toBeNull();
    expect(parseSearchDateParts(null)).toBeNull();
  });

  it("parses month-only query", () => {
    const result = parseSearchDateParts("jan");
    expect(result).toEqual({ day: null, month: 1, year: null });
  });

  it("parses ISO-style yyyy-mm-dd", () => {
    const result = parseSearchDateParts("2025-01-15");
    expect(result).toEqual({ day: 15, month: 1, year: 2025 });
  });
});

// ── parseAuditDateString ──────────────────────────────────────────────────

describe("parseAuditDateString", () => {
  qaTest("auditUtils.parse.03", () => {
    const result = parseAuditDateString("2025-01-15T14:30");
    expect(result).not.toBeNull();
    expect(result.isDateOnly).toBe(false);
    expect(typeof result.ms).toBe("number");
    // Should be in the year 2025
    expect(new Date(result.ms).getFullYear()).toBe(2025);
    expect(new Date(result.ms).getMonth()).toBe(0); // January
    expect(new Date(result.ms).getDate()).toBe(15);
    expect(new Date(result.ms).getHours()).toBe(14);
    expect(new Date(result.ms).getMinutes()).toBe(30);
  });

  qaTest("auditUtils.parse.04", () => {
    // Year 1800 is before APP_DATE_MIN_YEAR (2020)
    const result = parseAuditDateString("1800-01-01");
    expect(result).toBeNull();
  });

  it("returns null for empty/null input", () => {
    expect(parseAuditDateString("")).toBeNull();
    expect(parseAuditDateString(null)).toBeNull();
  });

  it("parses date-only ISO string", () => {
    const result = parseAuditDateString("2025-06-15");
    expect(result).not.toBeNull();
    expect(result.isDateOnly).toBe(true);
  });

  it("returns null for invalid date parts", () => {
    // Month 13 is invalid
    expect(parseAuditDateString("2025-13-01")).toBeNull();
  });

  it("returns null for invalid time parts", () => {
    // Hour 25 is invalid
    expect(parseAuditDateString("2025-01-15T25:00")).toBeNull();
  });
});

// ── getAuditDateRangeError ────────────────────────────────────────────────

describe("getAuditDateRangeError", () => {
  qaTest("auditUtils.range.01", () => {
    const error = getAuditDateRangeError({
      startDate: "2025-06-01",
      endDate: "2025-01-01",
    });
    expect(typeof error).toBe("string");
    expect(error.length).toBeGreaterThan(0);
  });

  it("returns empty string for valid range", () => {
    const error = getAuditDateRangeError({
      startDate: "2025-01-01",
      endDate: "2025-06-01",
    });
    expect(error).toBe("");
  });

  it("returns empty string when both dates are absent", () => {
    const error = getAuditDateRangeError({ startDate: "", endDate: "" });
    expect(error).toBe("");
  });

  it("returns error for unrecognized date format", () => {
    const error = getAuditDateRangeError({
      startDate: "not-a-date",
      endDate: "",
    });
    expect(error.length).toBeGreaterThan(0);
  });
});

// ── buildAuditParams ──────────────────────────────────────────────────────

describe("buildAuditParams", () => {
  const defaultFilters = { startDate: "", endDate: "" };

  qaTest("auditUtils.params.01", () => {
    const params = buildAuditParams(defaultFilters, AUDIT_PAGE_SIZE, null, "15 jan");
    expect(params.searchDay).toBe(15);
    expect(params.searchMonth).toBe(1);
    expect(params.searchYear).toBeNull();
  });

  it("sets correct limit", () => {
    const params = buildAuditParams(defaultFilters, AUDIT_PAGE_SIZE, null, "");
    expect(params.limit).toBe(AUDIT_PAGE_SIZE);
  });

  it("uses AUDIT_PAGE_SIZE as default when limit is falsy", () => {
    const params = buildAuditParams(defaultFilters, null, null, "");
    expect(params.limit).toBe(AUDIT_PAGE_SIZE);
  });

  it("sets startAt from filter startDate", () => {
    const params = buildAuditParams(
      { startDate: "2025-01-01", endDate: "" },
      AUDIT_PAGE_SIZE,
      null,
      ""
    );
    expect(params.startAt).not.toBeNull();
    // ISO string is UTC; just verify it parses back to the correct date
    expect(typeof params.startAt).toBe("string");
    expect(new Date(params.startAt).getTime()).toBeGreaterThan(0);
  });

  it("expands date-only endDate to end of day", () => {
    const params = buildAuditParams(
      { startDate: "", endDate: "2025-01-15" },
      AUDIT_PAGE_SIZE,
      null,
      ""
    );
    expect(params.endAt).not.toBeNull();
    // End of day: time should be 23:59:59.999 → endAt > startAt of same day
    const endMs = new Date(params.endAt).getTime();
    const startOfDay = new Date("2025-01-15").getTime();
    expect(endMs).toBeGreaterThan(startOfDay);
  });

  it("passes cursor fields through", () => {
    const cursor = { beforeAt: "2025-01-10T00:00:00Z", beforeId: "abc" };
    const params = buildAuditParams(defaultFilters, AUDIT_PAGE_SIZE, cursor, "");
    expect(params.beforeAt).toBe("2025-01-10T00:00:00Z");
    expect(params.beforeId).toBe("abc");
  });

  it("sets search to null when searchText is empty", () => {
    const params = buildAuditParams(defaultFilters, AUDIT_PAGE_SIZE, null, "");
    expect(params.search).toBeNull();
  });
});

// ── normalizeStudentNames ─────────────────────────────────────────────────

describe("normalizeStudentNames", () => {
  qaTest("auditUtils.normalize.01", () => {
    const result = normalizeStudentNames("Alice ; Bob\nCarol");
    expect(result).toBe("Alice; Bob; Carol");
  });

  it("handles comma separators", () => {
    expect(normalizeStudentNames("Alice, Bob, Carol")).toBe("Alice; Bob; Carol");
  });

  it("handles pipe separators", () => {
    expect(normalizeStudentNames("Alice|Bob|Carol")).toBe("Alice; Bob; Carol");
  });

  it("handles ampersand separators", () => {
    expect(normalizeStudentNames("Alice & Bob")).toBe("Alice; Bob");
  });

  it("collapses multiple separators", () => {
    expect(normalizeStudentNames("Alice;; Bob")).toBe("Alice; Bob");
  });

  it("trims whitespace from each name", () => {
    expect(normalizeStudentNames("  Alice  ;  Bob  ")).toBe("Alice; Bob");
  });

  it("handles dash separator", () => {
    expect(normalizeStudentNames("Alice - Bob")).toBe("Alice; Bob");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeStudentNames("")).toBe("");
    expect(normalizeStudentNames(null)).toBe("");
  });
});
