// src/admin/__tests__/HeatmapPage.aria.test.jsx
// ============================================================
// HeatmapPage — ARIA role regression tests (TC-018).
// Verifies that role="grid" and role="rowheader" are preserved.
// ============================================================

import { render } from "@testing-library/react";
import { describe, expect, vi, afterEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks ─────────────────────────────────────────────────────

vi.mock("@/shared/lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../config", () => ({
  CRITERIA: [
    { id: "technical", label: "Technical", max: 30 },
    { id: "design",    label: "Design",    max: 30 },
    { id: "delivery",  label: "Delivery",  max: 30 },
    { id: "teamwork",  label: "Teamwork",  max: 10 },
  ],
  TOTAL_MAX: 100,
}));

vi.mock("../scoreHelpers", () => ({
  getCellState:    () => "empty",
  getPartialTotal: () => 0,
}));

vi.mock("../useHeatmapData", () => ({
  useHeatmapData: () => ({
    lookup:           {},
    jurorFinalMap:    new Map(),
    jurorWorkflowMap: new Map(),
    groupAverages:    [],
    buildExportRows:  vi.fn(() => []),
  }),
}));

vi.mock("../useGridSort", () => ({
  useGridSort: (_jurors, _groups) => ({
    sortGroupId:           null,
    sortGroupDir:          "desc",
    sortJurorDir:          "asc",
    sortMode:              "none",
    jurorFilter:           "",
    groupScoreFilters:     {},
    visibleJurors:         _jurors,   // pass-through so rows render
    toggleGroupSort:       vi.fn(),
    toggleJurorSort:       vi.fn(),
    setJurorFilter:        vi.fn(),
    clearSort:             vi.fn(),
    setGroupScoreFilter:   vi.fn(),
    clearGroupScoreFilter: vi.fn(),
    clearAllFilters:       vi.fn(),
  }),
}));

vi.mock("../useGridExport", () => ({
  useGridExport: () => ({ requestExport: vi.fn() }),
}));

vi.mock("@/auth", () => ({
  useAuth: () => ({ activeOrganization: null }),
}));

// ── Import (after mocks) ───────────────────────────────────────

import HeatmapPage from "../HeatmapPage";

// ── Fixtures ──────────────────────────────────────────────────

const JURORS = [{ juror_id: "j1", juror_name: "Alice", affiliation: "EE", key: "j1" }];
const GROUPS = [{ id: "g1", group_no: 1, title: "Alpha", members: "Bob" }];

// ── Tests ─────────────────────────────────────────────────────

describe("HeatmapPage — ARIA roles", () => {
  qaTest("scoregrid.aria.01", () => {
    const { container } = render(
      <HeatmapPage data={[]} jurors={JURORS} groups={GROUPS} periodName="2026 Spring" />
    );
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });

  qaTest("scoregrid.aria.02", () => {
    const { container } = render(
      <HeatmapPage data={[]} jurors={JURORS} groups={GROUPS} periodName="2026 Spring" />
    );
    expect(container.querySelector('[role="rowheader"]')).not.toBeNull();
  });
});

// Import the mocked module to override per-test
import * as useGridSortModule from "../useGridSort";

describe("HeatmapPage — ARIA sort", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  qaTest("a11y.table.01", () => {
    // Sortable column headers must always carry an aria-sort attribute.
    // Valid values are: ascending | descending | none (required on all sortable headers).
    const { container } = render(
      <HeatmapPage data={[]} jurors={JURORS} groups={GROUPS} periodName="2026 Spring" />
    );

    // The juror column header must have aria-sort at all times (even when "none")
    const headersWithAriaSort = Array.from(container.querySelectorAll('[aria-sort]'));
    expect(headersWithAriaSort.length).toBeGreaterThan(0);

    // Every aria-sort value must be a valid ARIA token
    const valid = new Set(['ascending', 'descending', 'other', 'none']);
    headersWithAriaSort.forEach((th) => {
      expect(valid.has(th.getAttribute('aria-sort'))).toBe(true);
    });
  });
});
