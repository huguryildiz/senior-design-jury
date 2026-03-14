// src/jury/__tests__/DoneStep.test.jsx
// ============================================================
// DoneStep — title variants, edit button visibility, score display.
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../shared/Icons", () => ({
  HomeIcon:        "span",
  ChevronDownIcon: "span",
  PencilIcon:      "span",
  HistoryIcon:     "span",
}));

vi.mock("../../config", () => ({
  CRITERIA: [
    { id: "technical", label: "Technical", max: 25 },
    { id: "design",    label: "Design",    max: 25 },
    { id: "delivery",  label: "Delivery",  max: 25 },
    { id: "teamwork",  label: "Teamwork",  max: 25 },
  ],
}));

vi.mock("../../admin/scoreHelpers", () => ({
  getCellState:    () => "scored",
  getPartialTotal: (s) =>
    Object.values(s || {}).reduce((t, v) => {
      const n = Number(v);
      return Number.isFinite(n) ? t + n : t;
    }, 0),
  jurorStatusMeta: {
    scored:   { label: "Scored",   icon: "span", colorClass: "status-green-soft" },
    partial:  { label: "Partial",  icon: "span", colorClass: "status-amber" },
    empty:    { label: "Empty",    icon: "span", colorClass: "status-gray" },
  },
}));

vi.mock("../../admin/utils", () => ({ formatTs: () => "—" }));

vi.mock("../../components/EntityMeta", () => ({
  GroupLabel:   ({ text }) => text,
  ProjectTitle: ({ text }) => text,
  StudentNames: () => null,
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────

import DoneStep from "../DoneStep";

// ── Fixtures ──────────────────────────────────────────────────────────────

const noop = vi.fn();

const PROJECT = {
  project_id:     "p-1",
  group_no:       1,
  project_title:  "Alpha",
  group_students: "Alice, Bob",
  updated_at:     new Date().toISOString(),
};

const FULL_SCORES = {
  "p-1": { technical: 20, design: 20, delivery: 20, teamwork: 20 },
};

function renderDone(overrides = {}) {
  const defaults = {
    juryName:   "Test Juror",
    doneScores: FULL_SCORES,
    scores:     FULL_SCORES,
    projects:   [PROJECT],
    onBack:     noop,
  };
  return render(<DoneStep {...defaults} {...overrides} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("DoneStep — title variants", () => {
  qaTest("jury.done.01", () => {
    renderDone({ juryName: "Alice" });
    expect(screen.getByText(/thank you, alice/i)).toBeInTheDocument();
  });

  qaTest("jury.done.02", () => {
    renderDone({ onEditScores: noop });
    expect(screen.getByText(/edit mode is enabled/i)).toBeInTheDocument();
  });
});

describe("DoneStep — edit button visibility", () => {
  qaTest("jury.done.03", () => {
    // onEditScores provided → button shown
    renderDone({ onEditScores: noop });
    expect(screen.getByRole("button", { name: /edit my scores/i })).toBeInTheDocument();
  });

  it("Edit My Scores button is hidden when onEditScores is not provided", () => {
    renderDone({ onEditScores: undefined });
    expect(screen.queryByRole("button", { name: /edit my scores/i })).not.toBeInTheDocument();
  });
});

describe("DoneStep — score display", () => {
  qaTest("jury.done.04", () => {
    // 20+20+20+20 = 80 → shown in the score column
    renderDone({
      doneScores: { "p-1": { technical: 20, design: 20, delivery: 20, teamwork: 20 } },
    });
    expect(screen.getByText("80")).toBeInTheDocument();
  });
});
