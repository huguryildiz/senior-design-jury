// src/admin/__tests__/outcomeAttainmentTrend.test.js
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

import { buildOutcomeAttainmentTrendDataset } from "../analytics/analyticsDatasets";

// Helpers
const semOpts = [
  { id: "p1", period_name: "Spring 2025", startDate: "2025-02-01" },
  { id: "p2", period_name: "Fall 2025", startDate: "2025-09-01" },
];

describe("buildOutcomeAttainmentTrendDataset", () => {
  qaTest("outcome.trend.01", () => {
    const { rows, outcomeMeta } = buildOutcomeAttainmentTrendDataset([], semOpts, ["p1"]);
    expect(rows).toEqual([]);
    expect(outcomeMeta).toEqual([]);
  });

  qaTest("outcome.trend.02", () => {
    // Two criteria mapping to outcome "1.2" with weights 0.25 each (sum=0.5).
    // After normalization: score = (c1_pct * 0.25 + c2_pct * 0.25) / 0.5
    // c1=24/30=80%, c2=18/30=60% → (80*0.25 + 60*0.25)/0.5 = 35/0.5 = 70 → exactly at threshold
    const trendData = [
      {
        periodId: "p1",
        periodName: "Spring 2025",
        nEvals: 1,
        outcomes: [{ code: "1.2", label: "Knowledge", avg: 70.0, attainmentRate: 100 }],
      },
    ];
    const { rows, outcomeMeta } = buildOutcomeAttainmentTrendDataset(trendData, semOpts, ["p1"]);
    expect(outcomeMeta).toHaveLength(1);
    expect(outcomeMeta[0].code).toBe("1.2");
    expect(rows[0]["1.2_att"]).toBe(100);
    expect(rows[0]["1.2_avg"]).toBe(70.0);
  });

  qaTest("outcome.trend.03", () => {
    // Outcome "1.2" measured in p1 but NOT in p2 → p2 row must have null
    const trendData = [
      {
        periodId: "p1",
        periodName: "Spring 2025",
        nEvals: 3,
        outcomes: [{ code: "1.2", label: "Knowledge", avg: 75.0, attainmentRate: 78 }],
      },
      {
        periodId: "p2",
        periodName: "Fall 2025",
        nEvals: 4,
        outcomes: [], // outcome not measured this period
      },
    ];
    const { rows } = buildOutcomeAttainmentTrendDataset(trendData, semOpts, ["p1", "p2"]);
    expect(rows).toHaveLength(2);
    // p2 must have null, not 0
    const p2Row = rows.find((r) => r.period === "Fall 2025");
    expect(p2Row["1.2_att"]).toBeNull();
    expect(p2Row["1.2_avg"]).toBeNull();
  });

  qaTest("outcome.trend.04", () => {
    // 3 evals: scores 80, 65, 90 → 2 of 3 above 70 → attainmentRate = 67
    // avg = (80+65+90)/3 = 78.3
    const trendData = [
      {
        periodId: "p1",
        periodName: "Spring 2025",
        nEvals: 3,
        outcomes: [{ code: "9.1", label: "Oral", avg: 78.3, attainmentRate: 67 }],
      },
    ];
    const { rows } = buildOutcomeAttainmentTrendDataset(trendData, semOpts, ["p1"]);
    expect(rows[0]["9.1_att"]).toBe(67);
    expect(rows[0]["9.1_avg"]).toBe(78.3);
  });
});
