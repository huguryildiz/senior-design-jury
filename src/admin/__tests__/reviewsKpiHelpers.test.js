import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  computeCoverage,
  computePending,
  computeSpread,
} from "../utils/reviewsKpiHelpers.js";

describe("Reviews KPI helpers", () => {
  describe("computeCoverage", () => {
    qaTest("reviews.kpi.01", () => {
      const rows = [
        { jurorId: "j1", jurorStatus: "completed" },
        { jurorId: "j2", jurorStatus: "in_progress" },
        { jurorId: "j3", jurorStatus: "completed" },
      ];
      const jurors = [
        { jurorId: "j1" },
        { jurorId: "j2" },
        { jurorId: "j3" },
        { jurorId: "j4" },
      ];

      const result = computeCoverage(rows, jurors);
      expect(result.display).toBe("2 / 4");
      expect(result.completed).toBe(2);
      expect(result.total).toBe(4);

      // All completed
      const allRows = [
        { jurorId: "j1", jurorStatus: "completed" },
        { jurorId: "j2", jurorStatus: "completed" },
      ];
      const r2 = computeCoverage(allRows, [{ jurorId: "j1" }, { jurorId: "j2" }]);
      expect(r2.display).toBe("2 / 2");
      expect(r2.completed).toBe(2);

      // No assigned jurors
      const r3 = computeCoverage(rows, []);
      expect(r3.display).toBe("—");
    });
  });

  describe("computePending", () => {
    qaTest("reviews.kpi.02", () => {
      const rows = [
        { jurorId: "j1", jurorStatus: "ready_to_submit" },
        { jurorId: "j2", jurorStatus: "completed" },
        { jurorId: "j3", jurorStatus: "ready_to_submit" },
        // j3 appears twice (different project rows)
        { jurorId: "j3", jurorStatus: "ready_to_submit" },
        { jurorId: "j4", jurorStatus: "in_progress" },
      ];
      // j1 and j3 are ready_to_submit (j3 deduped) → 2
      expect(computePending(rows)).toBe(2);

      // None pending
      expect(
        computePending([{ jurorId: "j1", jurorStatus: "completed" }])
      ).toBe(0);
    });
  });

  describe("computeSpread", () => {
    qaTest("reviews.kpi.03", () => {
      const rows = [
        // p1: scores 80, 90 → mean 85, σ = 5
        { projectId: "p1", jurorStatus: "completed", total: 80 },
        { projectId: "p1", jurorStatus: "completed", total: 90 },
        // p2: scores 70, 80 → mean 75, σ = 5
        { projectId: "p2", jurorStatus: "completed", total: 70 },
        { projectId: "p2", jurorStatus: "completed", total: 80 },
        // p3: in_progress → excluded
        { projectId: "p3", jurorStatus: "in_progress", total: 75 },
        // p4: only 1 completed juror → excluded from σ
        { projectId: "p4", jurorStatus: "completed", total: 85 },
      ];
      // avg σ of p1 and p2 = (5 + 5) / 2 = 5.0
      expect(computeSpread(rows)).toBe("5.0");

      // No qualifying projects → "—"
      expect(
        computeSpread([{ projectId: "p1", jurorStatus: "in_progress", total: 80 }])
      ).toBe("—");

      // Single juror per project → "—"
      expect(
        computeSpread([
          { projectId: "p1", jurorStatus: "completed", total: 80 },
          { projectId: "p2", jurorStatus: "completed", total: 90 },
        ])
      ).toBe("—");
    });
  });
});
