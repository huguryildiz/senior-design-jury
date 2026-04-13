// src/admin/__tests__/criteriaFormHelpers.test.js
// ============================================================
// criteriaFormHelpers — rescaleRubricBandsByWeight function
// ============================================================

import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { rescaleRubricBandsByWeight } from "../criteria/criteriaFormHelpers.js";

// ── Test fixtures ────────────────────────────────────────────

// 4 bands for max=10: E:9-10, G:7-8, D:4-6, I:0-3
const BANDS_10 = [
  { level: "Excellent",     min: "9",  max: "10", desc: "top" },
  { level: "Good",          min: "7",  max: "8",  desc: "good" },
  { level: "Developing",    min: "4",  max: "6",  desc: "dev" },
  { level: "Insufficient",  min: "0",  max: "3",  desc: "ins" },
];

// 4 bands for max=30: E:27-30, G:21-26, D:12-20, I:0-11
const BANDS_30 = [
  { level: "Excellent",     min: "27", max: "30", desc: "top" },
  { level: "Good",          min: "21", max: "26", desc: "good" },
  { level: "Developing",    min: "12", max: "20", desc: "dev" },
  { level: "Insufficient",  min: "0",  max: "11", desc: "ins" },
];

// ── rescaleRubricBandsByWeight ────────────────────────────

describe("rescaleRubricBandsByWeight", () => {
  qaTest("criteria.rescale.01", () => {
    // No-op when origMax === newMax
    const result = rescaleRubricBandsByWeight(BANDS_10, 10);

    // Result should have same values
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ level: "Excellent", min: "9",  max: "10", desc: "top" });
    expect(result[1]).toEqual({ level: "Good",      min: "7",  max: "8",  desc: "good" });
    expect(result[2]).toEqual({ level: "Developing",min: "4",  max: "6",  desc: "dev" });
    expect(result[3]).toEqual({ level: "Insufficient", min: "0",  max: "3",  desc: "ins" });
  });

  qaTest("criteria.rescale.02", () => {
    // Scale up 10 → 30
    const result = rescaleRubricBandsByWeight(BANDS_10, 30);

    // Sort by min ascending for easier assertion
    const sorted = [...result].sort((a, b) => Number(a.min) - Number(b.min));

    // Expected result (sorted by min):
    // Insufficient: min="0",  max="11"
    // Developing:   min="12", max="20"
    // Good:         min="21", max="26"
    // Excellent:    min="27", max="30"

    expect(result).toHaveLength(4);

    // Find bands by level
    const excellent = result.find((b) => b.level === "Excellent");
    const good = result.find((b) => b.level === "Good");
    const developing = result.find((b) => b.level === "Developing");
    const insufficient = result.find((b) => b.level === "Insufficient");

    expect(excellent).toEqual({ level: "Excellent",    min: "27", max: "30", desc: "top" });
    expect(good).toEqual({ level: "Good",             min: "21", max: "26", desc: "good" });
    expect(developing).toEqual({ level: "Developing", min: "12", max: "20", desc: "dev" });
    expect(insufficient).toEqual({ level: "Insufficient", min: "0",  max: "11", desc: "ins" });

    // Verify level and desc are preserved
    expect(excellent.desc).toBe("top");
    expect(good.desc).toBe("good");
    expect(developing.desc).toBe("dev");
    expect(insufficient.desc).toBe("ins");
  });

  qaTest("criteria.rescale.03", () => {
    // Scale down 30 → 10
    const result = rescaleRubricBandsByWeight(BANDS_30, 10);

    expect(result).toHaveLength(4);

    // Find bands by level
    const excellent = result.find((b) => b.level === "Excellent");
    const good = result.find((b) => b.level === "Good");
    const developing = result.find((b) => b.level === "Developing");
    const insufficient = result.find((b) => b.level === "Insufficient");

    expect(excellent).toEqual({ level: "Excellent",    min: "9",  max: "10", desc: "top" });
    expect(good).toEqual({ level: "Good",             min: "7",  max: "8",  desc: "good" });
    expect(developing).toEqual({ level: "Developing", min: "4",  max: "6",  desc: "dev" });
    expect(insufficient).toEqual({ level: "Insufficient", min: "0",  max: "3",  desc: "ins" });

    // Verify level and desc are preserved
    expect(excellent.desc).toBe("top");
    expect(good.desc).toBe("good");
    expect(developing.desc).toBe("dev");
    expect(insufficient.desc).toBe("ins");
  });

  qaTest("criteria.rescale.04", () => {
    // Empty bands returns empty array
    const result = rescaleRubricBandsByWeight([], 30);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  qaTest("criteria.rescale.05", () => {
    // Level and desc preserved (same data as 02 but with explicit verification)
    const result = rescaleRubricBandsByWeight(BANDS_10, 30);

    // Map original bands by level for easy lookup
    const origByLevel = Object.fromEntries(
      BANDS_10.map((b) => [b.level, b])
    );

    // For each result band, find original by level and verify desc
    result.forEach((resultBand) => {
      const origBand = origByLevel[resultBand.level];
      expect(origBand).toBeDefined();
      expect(resultBand.level).toBe(origBand.level);
      expect(resultBand.desc).toBe(origBand.desc);
      // At least one of min or max should be scaled (not equal to original)
      // Some bands (like first band with min=0) may have unchanged min, but max should change
      const minChanged = Number(resultBand.min) !== Number(origBand.min);
      const maxChanged = Number(resultBand.max) !== Number(origBand.max);
      expect(minChanged || maxChanged).toBe(true);
    });
  });
});
