// src/shared/criteriaValidation.js
// ============================================================
// Centralized, pure validation helpers for the semester
// criteria editor (CriteriaManager).
//
// All functions are side-effect-free and testable in isolation.
// ============================================================

// ── validateRubric helpers ────────────────────────────────────

function _bandLabel(rubric, bi) {
  const level = (rubric[bi]?.level ?? "").trim();
  return level || `Band ${bi + 1}`;
}

function _quotedBandLabel(rubric, bi) {
  return `"${_bandLabel(rubric, bi)}"`;
}

// ── validateRubric ────────────────────────────────────────────

/**
 * Validate a rubric array against a criterion's max score.
 *
 * Per-band checks (range, name, description) always run regardless of band
 * count, so that reversed-range and overlap errors are always surfaced.
 * coverageError is set for count violations (< 2 or > 6) and gap/coverage
 * issues, but does NOT short-circuit the per-band validation.
 *
 * @param {Array}        rubric        - Array of band objects { level, min, max, desc }
 * @param {number|null}  criterionMax  - The criterion's max score (positive integer), or null
 * @returns {{ bandRangeErrors: Object, bandLevelErrors: Object, bandDescErrors: Object, coverageError: string|null }}
 */
export function validateRubric(rubric, criterionMax) {
  const bandRangeErrors = {};
  const bandLevelErrors = {};
  const bandDescErrors  = {};
  let coverageError     = null;

  if (!Array.isArray(rubric) || rubric.length === 0) {
    return {
      bandRangeErrors,
      bandLevelErrors,
      bandDescErrors,
      coverageError: "Rubric must have at least 2 bands",
    };
  }

  // Set count-based coverageError but do NOT return early — per-band checks
  // must still run so that range/name/desc errors are always reported.
  if (rubric.length < 2) {
    coverageError = "Rubric must have at least 2 bands";
  } else if (rubric.length > 6) {
    coverageError = "Rubric cannot exceed 6 bands";
  }

  // ── Per-band checks ──────────────────────────────────────────

  const seenNames = new Map(); // normalized name → first index

  for (let bi = 0; bi < rubric.length; bi++) {
    const band = rubric[bi];

    // Band name required + duplicate check
    const levelTrimmed = (band.level ?? "").trim();
    if (levelTrimmed === "") {
      bandLevelErrors[bi] = "Band name required";
    } else {
      const normalized = levelTrimmed.toLowerCase();
      if (seenNames.has(normalized)) {
        bandLevelErrors[bi] = "Duplicate band name";
        // Also mark the first occurrence
        const firstIdx = seenNames.get(normalized);
        bandLevelErrors[firstIdx] = "Duplicate band name";
      } else {
        seenNames.set(normalized, bi);
      }
    }

    // Band description required
    if ((band.desc ?? "").trim() === "") {
      bandDescErrors[bi] = "Description required";
    }

    // Band range validation
    const bMin = Number(band.min);
    const bMax = Number(band.max);
    const minIsInt = Number.isInteger(bMin);
    const maxIsInt = Number.isInteger(bMax);
    const minStr   = String(band.min ?? "");
    const maxStr   = String(band.max ?? "");

    if (
      minStr === "" || maxStr === "" ||
      !minIsInt || !maxIsInt ||
      bMin < 0 || bMax < 0
    ) {
      bandRangeErrors[bi] = "Enter a non-negative integer";
    } else if (
      criterionMax !== null &&
      criterionMax > 0 &&
      (bMin > criterionMax || bMax > criterionMax)
    ) {
      bandRangeErrors[bi] = `Cannot exceed criterion max (${criterionMax})`;
    } else if (bMin > bMax) {
      bandRangeErrors[bi] = `${_quotedBandLabel(rubric, bi)} range is invalid`;
    }
  }

  // ── Overlap check ────────────────────────────────────────────
  // Only check bands that have no range errors
  const validBands = rubric
    .map((b, i) => ({ ...b, _bi: i }))
    .filter((b) => !bandRangeErrors[b._bi]);

  if (validBands.length >= 2) {
    const sorted = [...validBands].sort((a, b) => Number(a.min) - Number(b.min));
    for (let j = 0; j < sorted.length - 1; j++) {
      const curr = sorted[j];
      const next = sorted[j + 1];
      if (Number(curr.max) >= Number(next.min)) {
        const msg = `${_quotedBandLabel(rubric, curr._bi)} and ${_quotedBandLabel(rubric, next._bi)} overlap.`;
        bandRangeErrors[curr._bi] = bandRangeErrors[curr._bi] || msg;
        bandRangeErrors[next._bi] = bandRangeErrors[next._bi] || msg;
      }
    }
  }

  // ── Coverage check ───────────────────────────────────────────
  // Only when count is valid (2–6), no band range errors, and criterionMax is set.
  if (
    coverageError === null &&
    criterionMax !== null &&
    criterionMax > 0 &&
    Object.keys(bandRangeErrors).length === 0
  ) {
    const sorted = [...rubric]
      .map((b, i) => ({ ...b, _bi: i }))
      .sort((a, b) => Number(a.min) - Number(b.min));

    let hasCoverageGap = false;

    if (Number(sorted[0].min) !== 0) {
      hasCoverageGap = true;
    } else if (Number(sorted[sorted.length - 1].max) !== criterionMax) {
      hasCoverageGap = true;
    } else {
      for (let j = 0; j < sorted.length - 1; j++) {
        if (Number(sorted[j].max) + 1 !== Number(sorted[j + 1].min)) {
          hasCoverageGap = true;
          break;
        }
      }
    }

    if (hasCoverageGap) {
      coverageError = `Score range [0–${criterionMax}] not fully covered. Fix gaps or overlaps.`;
    }
  }

  return { bandRangeErrors, bandLevelErrors, bandDescErrors, coverageError };
}

// ── validateCriterion ─────────────────────────────────────────

/**
 * Validate a single criterion row.
 *
 * @param {Object}  row           - The criterion row (view-model shape)
 * @param {Array}   allRows       - All criterion rows (for uniqueness checks)
 * @param {Array}   mudekTemplate - MÜDEK outcome objects { id, code, desc_en, desc_tr }
 * @param {number}  index         - Row index within allRows
 * @returns {{ errors: Object, rubricErrors: Object }}
 */
export function validateCriterion(row, allRows, mudekTemplate, index) {
  const errors = {};

  // label
  if ((row.label ?? "").trim() === "") {
    errors.label = "Required";
  }

  // shortLabel — required + uniqueness
  const shortLabelTrimmed = (row.shortLabel ?? "").trim();
  if (shortLabelTrimmed === "") {
    errors.shortLabel = "Required";
  } else {
    const normalized = shortLabelTrimmed.toLowerCase();
    const isDuplicate = allRows.some(
      (r, i) =>
        i !== index &&
        (r.shortLabel ?? "").trim().toLowerCase() === normalized
    );
    if (isDuplicate) {
      errors.shortLabel = "Duplicate short label";
    }
  }

  // blurb
  if ((row.blurb ?? "").trim() === "") {
    errors.blurb = "Required";
  }

  // max
  const maxStr = String(row.max ?? "").trim();
  if (maxStr === "") {
    errors.max = "Required";
  } else {
    const maxNum = Number(maxStr);
    if (!Number.isInteger(maxNum) || String(maxNum) !== maxStr.replace(/\.0+$/, "")) {
      errors.max = "Enter an integer";
    } else if (maxNum <= 0) {
      errors.max = "Must be greater than 0";
    }
  }

  // MÜDEK
  const mudekArray = Array.isArray(row.mudek) ? row.mudek : [];
  if (mudekTemplate.length > 0 && mudekArray.length === 0) {
    errors.mudek = "Select at least one MÜDEK outcome";
  }
  if (new Set(mudekArray).size !== mudekArray.length) {
    errors.mudek_dup = "Duplicate MÜDEK selections";
  }

  // Rubric
  const criterionMax =
    !errors.max && maxStr !== ""
      ? Number(maxStr)
      : null;

  const rubricErrors = validateRubric(
    Array.isArray(row.rubric) ? row.rubric : [],
    criterionMax
  );

  return { errors, rubricErrors };
}

// ── validateSemesterCriteria ──────────────────────────────────

/**
 * Validate all criterion rows for a semester.
 *
 * Error keys are namespaced by index (camelCase field name + "_" + index):
 * label_0, shortLabel_1, blurb_2, max_0, mudek_1, mudek_dup_2
 *
 * @param {Array}  rows          - All criterion rows
 * @param {Array}  mudekTemplate - MÜDEK outcome objects
 * @returns {{ errors: Object, rubricErrorsByCriterion: Object, totalMax: number, totalError: string|null }}
 */
export function validateSemesterCriteria(rows, mudekTemplate) {
  const errors                  = {};
  const rubricErrorsByCriterion = {};
  let   totalMax                = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { errors: rowErrors, rubricErrors } = validateCriterion(
      row,
      rows,
      mudekTemplate,
      i
    );

    if (rowErrors.label)     errors[`label_${i}`]     = rowErrors.label;
    if (rowErrors.shortLabel) errors[`shortLabel_${i}`] = rowErrors.shortLabel;
    if (rowErrors.blurb)     errors[`blurb_${i}`]     = rowErrors.blurb;
    if (rowErrors.max)       errors[`max_${i}`]       = rowErrors.max;
    if (rowErrors.mudek)     errors[`mudek_${i}`]     = rowErrors.mudek;
    if (rowErrors.mudek_dup) errors[`mudek_dup_${i}`] = rowErrors.mudek_dup;

    const hasRubricError =
      Object.keys(rubricErrors.bandRangeErrors).length > 0 ||
      Object.keys(rubricErrors.bandLevelErrors).length > 0 ||
      Object.keys(rubricErrors.bandDescErrors).length  > 0 ||
      rubricErrors.coverageError !== null;

    if (hasRubricError) {
      rubricErrorsByCriterion[i] = rubricErrors;
    }

    // Accumulate totalMax only from valid positive integer max values
    const maxNum = Number(String(row.max ?? "").trim());
    if (Number.isInteger(maxNum) && maxNum > 0) {
      totalMax += maxNum;
    }
  }

  const totalError = totalMax !== 100 ? "Total must equal 100" : null;

  return { errors, rubricErrorsByCriterion, totalMax, totalError };
}

// ── isDisposableEmptyDraftCriterion ───────────────────────────

/**
 * Returns true only when the criterion row is a truly empty new draft
 * that can be silently stripped on save — specifically when ALL of:
 * - label is empty string (after trim)
 * - shortLabel is empty string (after trim)
 * - blurb is empty string (after trim)
 * - max is the empty string exactly ("0" is NOT disposable)
 * - mudek is empty array
 * - _rubricTouched is false
 *
 * Color is not part of this predicate (UI-only attribute).
 *
 * @param {Object} row - The criterion row
 * @returns {boolean}
 */
export function isDisposableEmptyDraftCriterion(row) {
  return (
    (row.label ?? "").trim()     === "" &&
    (row.shortLabel ?? "").trim() === "" &&
    (row.blurb ?? "").trim()     === "" &&
    row.max                       === "" &&
    (Array.isArray(row.mudek) ? row.mudek.length : 0) === 0 &&
    row._rubricTouched            === false
  );
}
