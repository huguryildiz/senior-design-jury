// src/admin/__tests__/ScoreGrid.aria.test.jsx
// ============================================================
// ScoreGrid — ARIA role regression tests (TC-018).
// Verifies that role="grid" and role="rowheader" are preserved.
// ============================================================

import { render } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks ─────────────────────────────────────────────────────

vi.mock("../../lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../shared/Icons", () => ({
  FilterIcon: "span",
  InfoIcon: "span",
  DownloadIcon: "span",
  SearchIcon: "span",
  XIcon: "span",
}));

vi.mock("../../config", () => ({
  CRITERIA: [
    { id: "technical", label: "Technical", max: 30 },
    { id: "design",    label: "Design",    max: 30 },
    { id: "delivery",  label: "Delivery",  max: 30 },
    { id: "teamwork",  label: "Teamwork",  max: 10 },
  ],
  TOTAL_MAX: 100,
}));

vi.mock("../scoreHelpers", () => {
  const FakeIcon = () => null;
  return {
    getCellState:      () => "empty",
    getPartialTotal:   () => 0,
    jurorStatusMeta: {
      not_started:     { label: "Not Started",  icon: FakeIcon, colorClass: "status-gray" },
      in_progress:     { label: "In Progress",  icon: FakeIcon, colorClass: "status-amber" },
      ready_to_submit: { label: "Ready",        icon: FakeIcon, colorClass: "status-blue" },
      completed:       { label: "Completed",    icon: FakeIcon, colorClass: "status-green" },
      editing:         { label: "Editing",      icon: FakeIcon, colorClass: "status-purple" },
    },
  };
});

vi.mock("../useScrollSync", () => ({ useScrollSync: () => {} }));
vi.mock("../useGridExport", () => ({ useGridExport: () => ({ requestExport: vi.fn() }) }));

vi.mock("../useScoreGridData", () => ({
  useScoreGridData: () => ({
    lookup:           {},
    jurorFinalMap:    new Map(),
    jurorWorkflowMap: new Map(),
    groupAverages:    [],
    buildExportRows:  vi.fn(() => []),
  }),
}));

vi.mock("../useGridSort", () => ({
  useGridSort: (_jurors, _groups) => ({
    sortGroupId:          null,
    sortGroupDir:         "desc",
    sortJurorDir:         "asc",
    sortMode:             "none",
    jurorFilter:          "",
    groupScoreFilters:    {},
    visibleJurors:        _jurors,   // pass-through so rows render
    toggleGroupSort:      vi.fn(),
    toggleJurorSort:      vi.fn(),
    setJurorFilter:       vi.fn(),
    clearSort:            vi.fn(),
    setGroupScoreFilter:  vi.fn(),
    clearGroupScoreFilter: vi.fn(),
    clearAllFilters:      vi.fn(),
  }),
}));

vi.mock("../components", () => ({
  FilterPanelActions:            ({ children }) => children ?? null,
  FilterPopoverPortal:           () => null,
  useResponsiveFilterPresentation: () => ({ mode: "popover" }),
}));

// matchMedia: ScoreGridInner calls it for touch detection
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query) => ({
    matches: false,
    media:   query,
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    addListener:         vi.fn(),
    removeListener:      vi.fn(),
  })),
});

// ── Import (after mocks) ───────────────────────────────────────

import ScoreGrid from "../ScoreGrid";

// ── Fixtures ──────────────────────────────────────────────────

const JURORS = [{ juror_id: "j1", juror_name: "Alice", juror_inst: "EE", key: "j1" }];
const GROUPS = [{ id: "g1", group_no: 1, project_title: "Alpha", group_students: "Bob" }];

// ── Tests ─────────────────────────────────────────────────────

describe("ScoreGrid — ARIA roles", () => {
  qaTest("scoregrid.aria.01", () => {
    const { container } = render(
      <ScoreGrid data={[]} jurors={JURORS} groups={GROUPS} semesterName="2026 Spring" />
    );
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });

  qaTest("scoregrid.aria.02", () => {
    const { container } = render(
      <ScoreGrid data={[]} jurors={JURORS} groups={GROUPS} semesterName="2026 Spring" />
    );
    expect(container.querySelector('[role="rowheader"]')).not.toBeNull();
  });
});
