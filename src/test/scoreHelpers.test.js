// src/test/scoreHelpers.test.js
import { describe, it, expect, vi } from "vitest";

// Icons are React components — mock them so scoreHelpers can be imported in Node.
vi.mock("../shared/Icons", () => ({
  CheckCircle2Icon: "span",
  CheckIcon: "span",
  SendIcon: "span",
  Clock3Icon: "span",
  CircleIcon: "span",
  CircleDotDashedIcon: "span",
  PencilIcon: "span",
}));

import { getCellState, getPartialTotal, getJurorWorkflowState } from "../admin/scoreHelpers";

// ── getCellState ──────────────────────────────────────────────
describe("getCellState", () => {
  it("returns 'empty' for null or undefined entry", () => {
    expect(getCellState(null)).toBe("empty");
    expect(getCellState(undefined)).toBe("empty");
  });

  it("returns 'empty' when no total and no criteria are set", () => {
    expect(getCellState({ technical: null, design: null, delivery: null, teamwork: null, total: null })).toBe("empty");
    expect(getCellState({})).toBe("empty");
  });

  it("returns 'scored' when total is a positive number", () => {
    expect(getCellState({ total: 85 })).toBe("scored");
    expect(getCellState({ total: 100 })).toBe("scored");
  });

  it("returns 'scored' when total is zero (zero is a valid intentional score)", () => {
    // Regression: this was broken when the check was `total > 0`
    expect(getCellState({ total: 0 })).toBe("scored");
  });

  it("returns 'partial' when at least one criterion is filled but no total", () => {
    expect(getCellState({ technical: 20, design: null, delivery: null, teamwork: null, total: null })).toBe("partial");
    expect(getCellState({ technical: 0, design: null, delivery: null, teamwork: null, total: null })).toBe("partial");
  });

  it("returns 'partial' when multiple criteria are filled but no total", () => {
    expect(getCellState({ technical: 20, design: 15, delivery: null, teamwork: null, total: null })).toBe("partial");
  });
});

// ── getPartialTotal ───────────────────────────────────────────
describe("getPartialTotal", () => {
  it("returns 0 for null or undefined entry", () => {
    expect(getPartialTotal(null)).toBe(0);
    expect(getPartialTotal(undefined)).toBe(0);
  });

  it("sums only numeric criteria values", () => {
    expect(getPartialTotal({ technical: 20, design: 15, delivery: null, teamwork: null })).toBe(35);
  });

  it("includes zero-value criteria in the sum", () => {
    expect(getPartialTotal({ technical: 0, design: 0, delivery: 0, teamwork: 0 })).toBe(0);
  });

  it("returns full score when all criteria are filled", () => {
    expect(getPartialTotal({ technical: 30, design: 30, delivery: 30, teamwork: 10 })).toBe(100);
  });

  it("ignores string and null values", () => {
    expect(getPartialTotal({ technical: "invalid", design: null, delivery: 10, teamwork: 5 })).toBe(15);
  });
});

// ── getJurorWorkflowState ─────────────────────────────────────
describe("getJurorWorkflowState", () => {
  const groups = [{ id: "g1" }, { id: "g2" }];

  const scoredLookup = {
    j1: {
      g1: { total: 80, technical: 25, design: 25, delivery: 20, teamwork: 10 },
      g2: { total: 75, technical: 20, design: 25, delivery: 20, teamwork: 10 },
    },
  };

  const partialLookup = {
    j1: {
      g1: { total: 80, technical: 25, design: 25, delivery: 20, teamwork: 10 },
      g2: { total: null, technical: 15, design: null, delivery: null, teamwork: null },
    },
  };

  const emptyLookup = {};

  it("returns 'editing' when editEnabled is true, regardless of other state", () => {
    const juror = { key: "j1", editEnabled: true };
    const finalMap = new Map([["j1", true]]);
    expect(getJurorWorkflowState(juror, groups, scoredLookup, finalMap)).toBe("editing");
  });

  it("returns 'completed' when juror is in finalMap and not editing", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map([["j1", true]]);
    expect(getJurorWorkflowState(juror, groups, scoredLookup, finalMap)).toBe("completed");
  });

  it("returns 'ready_to_submit' when all groups are scored and not finalized", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, groups, scoredLookup, finalMap)).toBe("ready_to_submit");
  });

  it("returns 'in_progress' when some groups are started but not all scored", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, groups, partialLookup, finalMap)).toBe("in_progress");
  });

  it("returns 'not_started' when no scores exist", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, groups, emptyLookup, finalMap)).toBe("not_started");
  });

  it("returns 'not_started' when group list is empty", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, [], scoredLookup, finalMap)).toBe("not_started");
  });
});
