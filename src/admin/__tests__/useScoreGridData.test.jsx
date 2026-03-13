import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScoreGridData } from "../useScoreGridData";

const BASE_GROUPS = [
  { id: "g1", groupNo: 1, label: "Group 1" },
  { id: "g2", groupNo: 2, label: "Group 2" },
];

describe("useScoreGridData", () => {
  it("builds lookup map and averages from completed jurors only", () => {
    const groups = [
      { id: "g1", groupNo: 1, label: "Group 1" },
      { id: "g2", groupNo: 2, label: "Group 2" },
    ];
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: false },
      { key: "j2", name: "Bob", dept: "EE", finalSubmitted: true, editEnabled: true },
      { key: "j3", name: "Cem", dept: "EE", finalSubmitted: false, editEnabled: false },
    ];
    const data = [
      {
        jurorId: "j1",
        projectId: "g1",
        total: 80,
        technical: 25,
        design: 25,
        delivery: 22,
        teamwork: 8,
        status: "completed",
        editingFlag: "",
        finalSubmittedAt: "2026-03-13T10:00:00.000Z",
      },
      {
        jurorId: "j1",
        projectId: "g2",
        total: 60,
        technical: 20,
        design: 18,
        delivery: 16,
        teamwork: 6,
        status: "completed",
        editingFlag: "",
        finalSubmittedAt: "2026-03-13T10:00:00.000Z",
      },
      {
        jurorId: "j2",
        projectId: "g1",
        total: 100,
        technical: 30,
        design: 30,
        delivery: 30,
        teamwork: 10,
        status: "editing",
        editingFlag: "editing",
        finalSubmittedAt: "2026-03-13T10:00:00.000Z",
      },
      {
        jurorId: "j3",
        projectId: "g2",
        total: null,
        technical: 20,
        design: null,
        delivery: null,
        teamwork: null,
        status: "in_progress",
        editingFlag: "",
        finalSubmittedAt: "",
      },
    ];

    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups }));
    const { lookup, groupAverages, buildExportRows, jurorWorkflowMap } = result.current;

    expect(lookup.j1.g1.total).toBe(80);
    expect(lookup.j3.g2.technical).toBe(20);
    // Average row must ignore editing/non-final jurors.
    expect(groupAverages).toEqual(["80.00", "60.00"]);
    expect(jurorWorkflowMap.get("j3")).toBe("in_progress");

    const exportRows = buildExportRows([jurors[2]]);
    expect(exportRows[0].scores.g1).toBeNull();
    expect(exportRows[0].scores.g2).toBe(20);
  });
});

// ── groupAverages edge cases ──────────────────────────────────────────────────

describe("useScoreGridData — groupAverages edge cases", () => {
  const mkEntry = (total) => ({
    total,
    technical: null, design: null, delivery: null, teamwork: null,
    status: "completed", editingFlag: "", finalSubmittedAt: "01.01.2026 10:00",
  });

  it("excludes juror with editEnabled=true from average", () => {
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: true },
    ];
    const data = [{ jurorId: "j1", projectId: "g1", ...mkEntry(90) }];
    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups: BASE_GROUPS }));
    // Editing juror excluded → no values → null average
    expect(result.current.groupAverages[0]).toBeNull();
  });

  it("includes juror with finalSubmitted=true and no finalSubmittedAt [Fix 2 regression]", () => {
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: false, finalSubmittedAt: undefined },
    ];
    const data = [{
      jurorId: "j1", projectId: "g1",
      total: 80, technical: null, design: null, delivery: null, teamwork: null,
      status: "completed", editingFlag: "", finalSubmittedAt: "",
    }];
    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups: BASE_GROUPS }));
    // Should be included: finalSubmitted=true and !editEnabled
    expect(result.current.groupAverages[0]).toBe("80.00");
  });

  it("returns null averages when all jurors are in editing mode", () => {
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: true },
      { key: "j2", name: "Bob",   dept: "CS", finalSubmitted: true, editEnabled: true },
    ];
    const data = [
      { jurorId: "j1", projectId: "g1", ...mkEntry(80) },
      { jurorId: "j2", projectId: "g1", ...mkEntry(60) },
    ];
    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups: BASE_GROUPS }));
    expect(result.current.groupAverages[0]).toBeNull();
    expect(result.current.groupAverages[1]).toBeNull();
  });

  it("excludes partial-state entries from average (no total)", () => {
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: false },
    ];
    const data = [{
      jurorId: "j1", projectId: "g1",
      total: null, technical: 20, design: null, delivery: null, teamwork: null,
      status: "in_progress", editingFlag: "", finalSubmittedAt: "01.01.2026 10:00",
    }];
    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups: BASE_GROUPS }));
    // partial state → not included in average
    expect(result.current.groupAverages[0]).toBeNull();
  });

  it("includes zero-score entry in average (total=0 is scored) [zero regression]", () => {
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: false },
    ];
    const data = [{ jurorId: "j1", projectId: "g1", ...mkEntry(0) }];
    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups: BASE_GROUPS }));
    expect(result.current.groupAverages[0]).toBe("0.00");
  });

  it("computes correct numeric average across multiple jurors", () => {
    const jurors = [
      { key: "j1", name: "Alice", dept: "EE", finalSubmitted: true, editEnabled: false },
      { key: "j2", name: "Bob",   dept: "CS", finalSubmitted: true, editEnabled: false },
    ];
    const data = [
      { jurorId: "j1", projectId: "g1", ...mkEntry(80) },
      { jurorId: "j2", projectId: "g1", ...mkEntry(60) },
    ];
    const { result } = renderHook(() => useScoreGridData({ data, jurors, groups: BASE_GROUPS }));
    expect(result.current.groupAverages[0]).toBe("70.00");
  });
});
