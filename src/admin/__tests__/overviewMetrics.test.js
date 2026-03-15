// src/admin/__tests__/overviewMetrics.test.js
// ============================================================
// computeOverviewMetrics — pure function unit tests.
// Audit items: metrics.01 / .02 / .03
// ============================================================

import { describe, expect } from "vitest";
import { computeOverviewMetrics } from "../scoreHelpers";
import { qaTest } from "../../test/qaTest.js";

// Helpers to build minimal test fixtures
function makeJuror(overrides = {}) {
  return {
    jurorId: "j1",
    key: "j1",
    editEnabled: false,
    finalSubmitted: false,
    finalSubmittedAt: null,
    ...overrides,
  };
}

function makeScore(jurorId, projectId, total = 85) {
  return { jurorId, projectId, key: jurorId, total };
}

describe("computeOverviewMetrics", () => {
  qaTest("metrics.01", () => {
    const result = computeOverviewMetrics([], [], 0);

    expect(result.totalJurors).toBe(0);
    expect(result.totalEvaluations).toBe(0);
    expect(result.completedJurors).toBe(0);
    expect(result.scoredEvaluations).toBe(0);
    expect(result.partialEvaluations).toBe(0);
    expect(result.emptyEvaluations).toBe(0);
    expect(result.editingJurors).toBe(0);
    expect(result.inProgressJurors).toBe(0);
    expect(result.readyToSubmitJurors).toBe(0);
    expect(result.notStartedJurors).toBe(0);
    // No NaN values
    Object.values(result).forEach((v) => {
      if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    });
  });

  qaTest("metrics.02", () => {
    const juror1 = makeJuror({ jurorId: "j1", key: "j1", finalSubmitted: true, finalSubmittedAt: "2026-01-01" });
    const juror2 = makeJuror({ jurorId: "j2", key: "j2", editEnabled: true });
    const juror3 = makeJuror({ jurorId: "j3", key: "j3" });
    const jurorList = [juror1, juror2, juror3];

    // juror1 has all 3 groups scored (finalSubmitted → completed)
    // juror2 is editing
    // juror3 has 1 of 3 groups scored (in_progress)
    const scores = [
      makeScore("j1", "g1", 85),
      makeScore("j1", "g2", 80),
      makeScore("j1", "g3", 90),
      makeScore("j3", "g1", 75), // 1 scored, not all 3 → in_progress
    ];
    const totalProjects = 3;

    const result = computeOverviewMetrics(scores, jurorList, totalProjects);

    expect(result.totalJurors).toBe(3);
    expect(result.completedJurors).toBe(1);  // juror1 only
    expect(result.editingJurors).toBe(1);    // juror2
    expect(result.inProgressJurors).toBe(1); // juror3 (started but not all scored)
    expect(result.notStartedJurors).toBe(0); // juror2 is editing (excluded), juror3 started
    expect(result.scoredEvaluations).toBe(4); // j1×3 + j3×1
  });

  qaTest("metrics.03", () => {
    // scoredEvaluations + partialEvaluations > totalEvaluations — emptyEvaluations must be 0, not negative
    const juror = makeJuror({ jurorId: "j1", key: "j1" });
    const scores = [
      makeScore("j1", "g1", 85),
      makeScore("j1", "g2", 80),
      makeScore("j1", "g3", 90),
    ];
    // totalProjects = 1, but there are 3 scored rows → totalEvaluations = 1
    // emptyEvaluations = max(1 - 3 - 0, 0) = max(-2, 0) = 0
    const result = computeOverviewMetrics(scores, [juror], 1);
    expect(result.emptyEvaluations).toBe(0);
    expect(result.emptyEvaluations).toBeGreaterThanOrEqual(0);
  });
});
