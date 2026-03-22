// src/shared/__tests__/LevelPill.test.js
// ============================================================
// LevelPill — gradient color helpers.
// Audit items: levelpill.gradient.01 / .02 / .03 / .04
// ============================================================

import { describe, it, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  getBandPositionStyle,
  isKnownBandVariant,
  getBandScoreRank,
} from "../LevelPill.jsx";

describe("getBandPositionStyle", () => {
  qaTest("levelpill.gradient.01", () => {
    // rank 0 of 4 → t=0 → exact red anchor
    const style = getBandPositionStyle(0, 4);
    expect(style.color).toBe("rgb(220, 38, 38)");
    expect(style.background).toBe("rgb(254, 226, 226)");
  });

  qaTest("levelpill.gradient.02", () => {
    // rank 3 of 4 → t=1 → exact green anchor
    const style = getBandPositionStyle(3, 4);
    expect(style.color).toBe("rgb(22, 163, 74)");
    expect(style.background).toBe("rgb(220, 252, 231)");
  });

  qaTest("levelpill.gradient.03", () => {
    // single-band guard: total=1 → no division by zero, returns green
    const style = getBandPositionStyle(0, 1);
    expect(style.color).toBe("rgb(22, 163, 74)");
    expect(style.background).toBe("rgb(220, 252, 231)");
  });

  it("returns distinct colors for lowest and highest rank across any band count", () => {
    for (const total of [2, 3, 5, 6, 8]) {
      const lo = getBandPositionStyle(0, total);
      const hi = getBandPositionStyle(total - 1, total);
      expect(lo.color).not.toBe(hi.color);
    }
  });
});

describe("isKnownBandVariant", () => {
  qaTest("levelpill.gradient.04", () => {
    // Canonical names — case-insensitive
    expect(isKnownBandVariant("Excellent")).toBe(true);
    expect(isKnownBandVariant("EXCELLENT")).toBe(true);
    expect(isKnownBandVariant("Good")).toBe(true);
    expect(isKnownBandVariant("Developing")).toBe(true);
    expect(isKnownBandVariant("insufficient")).toBe(true);

    // Custom / unknown names
    expect(isKnownBandVariant("Outstanding")).toBe(false);
    expect(isKnownBandVariant("Band 1")).toBe(false);
    expect(isKnownBandVariant("")).toBe(false);
    expect(isKnownBandVariant(undefined)).toBe(false);
    expect(isKnownBandVariant(null)).toBe(false);
  });
});

describe("getBandScoreRank", () => {
  it("ranks lowest-min band as 0 and highest-min band last", () => {
    const bands = [
      { min: 27, max: 30, level: "Excellent" },
      { min: 21, max: 26, level: "Good" },
      { min: 13, max: 20, level: "Developing" },
      { min: 0,  max: 12, level: "Insufficient" },
    ];
    expect(getBandScoreRank(bands, bands[3])).toBe(0); // Insufficient — min=0
    expect(getBandScoreRank(bands, bands[2])).toBe(1); // Developing — min=13
    expect(getBandScoreRank(bands, bands[1])).toBe(2); // Good — min=21
    expect(getBandScoreRank(bands, bands[0])).toBe(3); // Excellent — min=27
  });

  it("treats bands with non-finite min as highest rank", () => {
    const bands = [
      { min: 0,         level: "Low" },
      { min: undefined, level: "Custom" },
    ];
    expect(getBandScoreRank(bands, bands[0])).toBe(0);
    expect(getBandScoreRank(bands, bands[1])).toBe(1);
  });
});
