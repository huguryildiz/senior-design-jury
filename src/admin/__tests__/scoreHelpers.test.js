// src/admin/__tests__/scoreHelpers.test.js
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// Icons are React components — mock them so scoreHelpers can be imported in Node.
vi.mock("@/shared/ui/Icons", () => ({
  CheckCircle2Icon: "span",
  CheckIcon: "span",
  SendIcon: "span",
  Clock3Icon: "span",
  CircleIcon: "span",
  CircleDotDashedIcon: "span",
  PencilIcon: "span",
}));

import { getCellState, getPartialTotal, getJurorWorkflowState } from "../utils/scoreHelpers";

// ── getCellState ──────────────────────────────────────────────
describe("getCellState", () => {
  qaTest("helpers.cellstate.01", () => {
    expect(getCellState(null)).toBe("empty");
    expect(getCellState(undefined)).toBe("empty");
  });

  qaTest("helpers.cellstate.02", () => {
    expect(getCellState({ technical: null, design: null, delivery: null, teamwork: null, total: null })).toBe("empty");
    expect(getCellState({})).toBe("empty");
  });

  qaTest("helpers.cellstate.03", () => {
    // "scored" requires ALL criteria fields filled — total alone is not enough
    expect(getCellState({ technical: 25, design: 25, delivery: 25, teamwork: 10, total: 85 })).toBe("scored");
    expect(getCellState({ technical: 30, design: 30, delivery: 30, teamwork: 10, total: 100 })).toBe("scored");
  });

  qaTest("helpers.cellstate.04", () => {
    // All criteria filled with zero scores is still "scored" (complete evaluation)
    expect(getCellState({ technical: 0, design: 0, delivery: 0, teamwork: 0, total: 0 })).toBe("scored");
    // total-only without criteria fields is "empty" — total is derived, not authoritative
    expect(getCellState({ total: 85 })).toBe("empty");
  });

  qaTest("helpers.cellstate.05", () => {
    expect(getCellState({ technical: 20, design: null, delivery: null, teamwork: null, total: null })).toBe("partial");
    expect(getCellState({ technical: 0, design: null, delivery: null, teamwork: null, total: null })).toBe("partial");
  });

  qaTest("helpers.cellstate.06", () => {
    expect(getCellState({ technical: 20, design: 15, delivery: null, teamwork: null, total: null })).toBe("partial");
  });
});

// ── getPartialTotal ───────────────────────────────────────────
describe("getPartialTotal", () => {
  qaTest("helpers.partial.01", () => {
    expect(getPartialTotal(null)).toBe(0);
    expect(getPartialTotal(undefined)).toBe(0);
  });

  qaTest("helpers.partial.02", () => {
    expect(getPartialTotal({ technical: 20, design: 15, delivery: null, teamwork: null })).toBe(35);
  });

  qaTest("helpers.partial.03", () => {
    expect(getPartialTotal({ technical: 0, design: 0, delivery: 0, teamwork: 0 })).toBe(0);
  });

  qaTest("helpers.partial.04", () => {
    expect(getPartialTotal({ technical: 30, design: 30, delivery: 30, teamwork: 10 })).toBe(100);
  });

  qaTest("helpers.partial.05", () => {
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

  qaTest("helpers.workflow.01", () => {
    const juror = { key: "j1", editEnabled: true };
    const finalMap = new Map([["j1", true]]);
    expect(getJurorWorkflowState(juror, groups, scoredLookup, finalMap)).toBe("editing");
  });

  qaTest("helpers.workflow.02", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map([["j1", true]]);
    expect(getJurorWorkflowState(juror, groups, scoredLookup, finalMap)).toBe("completed");
  });

  qaTest("helpers.workflow.03", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, groups, scoredLookup, finalMap)).toBe("ready_to_submit");
  });

  qaTest("helpers.workflow.04", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, groups, partialLookup, finalMap)).toBe("in_progress");
  });

  qaTest("helpers.workflow.05", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, groups, emptyLookup, finalMap)).toBe("not_started");
  });

  qaTest("helpers.workflow.06", () => {
    const juror = { key: "j1", editEnabled: false };
    const finalMap = new Map();
    expect(getJurorWorkflowState(juror, [], scoredLookup, finalMap)).toBe("not_started");
  });
});
