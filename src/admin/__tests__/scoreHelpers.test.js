import { describe, expect, it } from "vitest";
import {
  getCellState,
  getPartialTotal,
  getJurorWorkflowState,
} from "../scoreHelpers";

describe("scoreHelpers", () => {
  it("resolves cell state correctly", () => {
    expect(getCellState(null)).toBe("empty");
    expect(getCellState({ total: 70 })).toBe("scored");
    expect(
      getCellState({
        total: null,
        technical: 20,
        design: null,
        delivery: null,
        teamwork: null,
      })
    ).toBe("partial");
    expect(
      getCellState({
        total: null,
        technical: null,
        design: null,
        delivery: null,
        teamwork: null,
      })
    ).toBe("empty");
  });

  it("calculates partial total from numeric criteria only", () => {
    const entry = {
      technical: 25,
      design: "20",
      delivery: 15,
      teamwork: null,
    };
    expect(getPartialTotal(entry)).toBe(40);
  });

  it("resolves juror workflow state with correct precedence", () => {
    const groups = [{ id: "g1" }, { id: "g2" }];
    const lookup = {
      j1: {
        g1: { total: 80 },
        g2: { total: 75 },
      },
      j2: {
        g1: { total: 90 },
        g2: { total: 90 },
      },
      j3: {
        g1: { technical: 20, total: null },
      },
      j4: {},
    };
    const jurorFinalMap = new Map([
      ["j1", true],
      ["j2", false],
      ["j3", false],
      ["j4", false],
    ]);

    expect(
      getJurorWorkflowState({ key: "j0", editEnabled: true }, groups, lookup, jurorFinalMap)
    ).toBe("editing");
    expect(
      getJurorWorkflowState({ key: "j1", editEnabled: false }, groups, lookup, jurorFinalMap)
    ).toBe("completed");
    expect(
      getJurorWorkflowState({ key: "j2", editEnabled: false }, groups, lookup, jurorFinalMap)
    ).toBe("ready_to_submit");
    expect(
      getJurorWorkflowState({ key: "j3", editEnabled: false }, groups, lookup, jurorFinalMap)
    ).toBe("in_progress");
    expect(
      getJurorWorkflowState({ key: "j4", editEnabled: false }, groups, lookup, jurorFinalMap)
    ).toBe("not_started");
  });
});
