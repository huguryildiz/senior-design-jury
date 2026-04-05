import { renderHook } from "@testing-library/react";
import { describe, expect } from "vitest";
import { useHeatmapData } from "../hooks/useHeatmapData";
import { qaTest } from "../../test/qaTest.js";

const MOCK_CRITERIA = [
  { id: "technical" },
  { id: "design" },
  { id: "delivery" },
  { id: "teamwork" },
];

describe("useHeatmapData", () => {
  qaTest("griddata.01", () => {
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

    const { result } = renderHook(() => useHeatmapData({ data, jurors, groups, criteriaConfig: MOCK_CRITERIA }));
    const { lookup, buildExportRows, jurorWorkflowMap } = result.current;

    expect(lookup.j1.g1.total).toBe(80);
    expect(lookup.j3.g2.technical).toBe(20);
    expect(jurorWorkflowMap.get("j3")).toBe("in_progress");

    const exportRows = buildExportRows([jurors[2]]);
    expect(exportRows[0].scores.g1).toBeNull();
    expect(exportRows[0].scores.g2).toBe(20);
  });
});

