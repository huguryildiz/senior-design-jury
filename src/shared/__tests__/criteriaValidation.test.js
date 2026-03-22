// src/shared/__tests__/criteriaValidation.test.js
import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  validateRubric,
  validateCriterion,
  validateSemesterCriteria,
  isDisposableEmptyDraftCriterion,
} from "../criteriaValidation.js";

// ── Helpers ───────────────────────────────────────────────────

function band(level, min, max, desc = "Some description") {
  return { level, min, max, desc };
}

function fullRow(overrides = {}) {
  return {
    label:      "Technical Content",
    shortLabel: "Technical",
    blurb:      "Evaluate engineering depth.",
    max:        "30",
    mudek:      ["1.2"],
    rubric:     [],
    _rubricTouched: false,
    ...overrides,
  };
}

const MUDEK_TPL = [{ id: "po_1_2", code: "1.2", desc_en: "x", desc_tr: "x" }];

// ── validateRubric tests ──────────────────────────────────────

describe("criteriaValidation", () => {
  qaTest("criteria.validation.01", () => {
    // First band min > 0 → gap at bottom (no band starts at 0)
    const rubric = [
      band("Excellent", 5, 10),
      band("Good", 11, 20),
    ];
    const { coverageError } = validateRubric(rubric, 20);
    expect(coverageError).toMatch(/not fully covered/);
  });

  qaTest("criteria.validation.02", () => {
    // Last band max < criterionMax → gap at top
    const rubric = [
      band("Excellent", 20, 28),
      band("Good", 10, 19),
      band("Developing", 0, 9),
    ];
    const { coverageError } = validateRubric(rubric, 30);
    expect(coverageError).toMatch(/not fully covered/);
  });

  qaTest("criteria.validation.03", () => {
    // Adjacent bands have gap between them
    const rubric = [
      band("Excellent", 21, 30),
      band("Good", 11, 19),  // gap: 20 missing
      band("Developing", 0, 10),
    ];
    const { coverageError } = validateRubric(rubric, 30);
    expect(coverageError).toMatch(/not fully covered/);
  });

  qaTest("criteria.validation.04", () => {
    // Full coverage 0..max → no coverageError
    const rubric = [
      band("Excellent", 21, 30),
      band("Good", 11, 20),
      band("Developing", 0, 10),
    ];
    const { coverageError } = validateRubric(rubric, 30);
    expect(coverageError).toBeNull();
  });

  qaTest("criteria.validation.04b", () => {
    // Overlap messages quote both band labels
    const rubric = [
      band("Developing", 10, 20),
      band("Good", 15, 25),
    ];
    const { bandRangeErrors } = validateRubric(rubric, 30);
    expect(bandRangeErrors[0]).toBe('"Developing" and "Good" overlap.');
    expect(bandRangeErrors[1]).toBe('"Developing" and "Good" overlap.');
  });

  qaTest("criteria.validation.04c", () => {
    // Reversed-range messages quote the band label
    const rubric = [band("Excellent", 30, 10)];
    const { bandRangeErrors } = validateRubric(rubric, 30);
    expect(bandRangeErrors[0]).toBe('"Excellent" range is invalid');
  });

  qaTest("criteria.validation.05", () => {
    // Band count < 2 → coverageError
    const rubric = [band("Excellent", 0, 30)];
    const { coverageError } = validateRubric(rubric, 30);
    expect(coverageError).toMatch(/at least 2 bands/);
  });

  qaTest("criteria.validation.06", () => {
    // Band count > 6 → coverageError
    const rubric = [
      band("A", 0, 4), band("B", 5, 9), band("C", 10, 14),
      band("D", 15, 19), band("E", 20, 24), band("F", 25, 27),
      band("G", 28, 30),
    ];
    const { coverageError } = validateRubric(rubric, 30);
    expect(coverageError).toMatch(/cannot exceed 6 bands/i);
  });

  qaTest("criteria.validation.07", () => {
    // bandLevelErrors when band name is empty
    const rubric = [
      band("", 0, 14),
      band("Good", 15, 30),
    ];
    const { bandLevelErrors } = validateRubric(rubric, 30);
    expect(bandLevelErrors[0]).toMatch(/required/i);
    expect(bandLevelErrors[1]).toBeUndefined();
  });

  qaTest("criteria.validation.08", () => {
    // bandDescErrors when band description is empty
    const rubric = [
      { level: "Excellent", min: 15, max: 30, desc: "" },
      { level: "Developing", min: 0, max: 14, desc: "Has desc" },
    ];
    const { bandDescErrors } = validateRubric(rubric, 30);
    expect(bandDescErrors[0]).toMatch(/required/i);
    expect(bandDescErrors[1]).toBeUndefined();
  });

  qaTest("criteria.validation.09", () => {
    // Duplicate band names (case-insensitive) → bandLevelErrors on both
    const rubric = [
      band("Excellent", 15, 30),
      band("EXCELLENT", 0, 14),
    ];
    const { bandLevelErrors } = validateRubric(rubric, 30);
    expect(bandLevelErrors[0]).toMatch(/duplicate/i);
    expect(bandLevelErrors[1]).toMatch(/duplicate/i);
  });

  qaTest("criteria.validation.10", () => {
    // max = 0 → "Must be greater than 0"
    const row = fullRow({ max: "0" });
    const { errors } = validateCriterion(row, [row], MUDEK_TPL, 0);
    expect(errors.max).toMatch(/greater than 0/i);
  });

  qaTest("criteria.validation.11", () => {
    // shortLabel uniqueness error across criteria
    const row0 = fullRow({ shortLabel: "Tech" });
    const row1 = fullRow({ label: "Other", shortLabel: "Tech" });
    const { errors: e0 } = validateCriterion(row0, [row0, row1], MUDEK_TPL, 0);
    const { errors: e1 } = validateCriterion(row1, [row0, row1], MUDEK_TPL, 1);
    expect(e0.shortLabel).toMatch(/duplicate/i);
    expect(e1.shortLabel).toMatch(/duplicate/i);
  });

  qaTest("criteria.validation.12", () => {
    // blurb required
    const row = fullRow({ blurb: "" });
    const { errors } = validateCriterion(row, [row], MUDEK_TPL, 0);
    expect(errors.blurb).toMatch(/required/i);
  });

  qaTest("criteria.validation.13", () => {
    // MÜDEK error when mudekTemplate non-empty and mudek empty
    const row = fullRow({ mudek: [] });
    const { errors } = validateCriterion(row, [row], MUDEK_TPL, 0);
    expect(errors.mudek).toMatch(/at least one/i);
  });

  qaTest("criteria.validation.14", () => {
    // totalError is null when totalMax === 100
    const rows = [
      fullRow({ max: "40", mudek: [] }),
      fullRow({ label: "Written", shortLabel: "Written", max: "30", mudek: [] }),
      fullRow({ label: "Oral", shortLabel: "Oral", max: "30", mudek: [] }),
    ];
    const { totalError, totalMax } = validateSemesterCriteria(rows, []);
    expect(totalMax).toBe(100);
    expect(totalError).toBeNull();
  });

  qaTest("criteria.validation.15", () => {
    // Errors namespaced by criterion index
    const row0 = fullRow({ label: "" });
    const row1 = fullRow({ label: "", shortLabel: "Other" });
    const { errors } = validateSemesterCriteria([row0, row1], []);
    expect(errors["label_0"]).toBe("Required");
    expect(errors["label_1"]).toBe("Required");
    expect(errors["label_2"]).toBeUndefined();
  });

  // ── isDisposableEmptyDraftCriterion ──────────────────────────

  qaTest("criteria.ux.01", () => {
    // Returns true for a fully empty draft
    const row = {
      label:          "",
      shortLabel:     "",
      blurb:          "",
      max:            "",
      mudek:          [],
      _rubricTouched: false,
    };
    expect(isDisposableEmptyDraftCriterion(row)).toBe(true);
  });

  qaTest("criteria.ux.02", () => {
    // Returns false when max is "0" (typed zero, not empty string)
    const row = {
      label:          "",
      shortLabel:     "",
      blurb:          "",
      max:            "0",
      mudek:          [],
      _rubricTouched: false,
    };
    expect(isDisposableEmptyDraftCriterion(row)).toBe(false);
  });

  qaTest("criteria.ux.03", () => {
    // Returns false when _rubricTouched is true
    const row = {
      label:          "",
      shortLabel:     "",
      blurb:          "",
      max:            "",
      mudek:          [],
      _rubricTouched: true,
    };
    expect(isDisposableEmptyDraftCriterion(row)).toBe(false);
  });
});
