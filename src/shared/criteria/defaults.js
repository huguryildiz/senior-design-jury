// src/shared/criteria/defaults.js
// ============================================================
// Seed builders for criteria_template and mudek_template.
// Used when creating a new semester.
// ============================================================

import { CRITERIA, MUDEK_OUTCOMES } from "../../config";
import { _codeToId } from "./criteriaHelpers";

/**
 * Build the default `criteria_template` seed array from config.
 * Used when creating a new semester. Includes the full rich shape
 * (shortLabel, color, blurb, mudek, rubric) + legacy compat fields.
 */
export function defaultCriteriaTemplate() {
  return CRITERIA.map((c) => ({
    key:            c.id,
    label:          c.label,
    shortLabel:     c.shortLabel ?? c.label,
    color:          c.color ?? "#94A3B8",
    max:            c.max,
    blurb:          c.blurb ?? "",
    mudek:          c.mudek ?? [],                    // primary
    mudek_outcomes: (c.mudek || []).map(_codeToId),   // legacy compat
    rubric:         c.rubric ?? [],
  }));
}

/**
 * Build the default `mudek_template` seed array from config.
 * Used when creating a new semester.
 */
export function defaultMudekTemplate() {
  return Object.entries(MUDEK_OUTCOMES).map(([code, desc]) => ({
    id:      _codeToId(code),
    code,
    desc_en: desc.en,
    desc_tr: desc.tr,
  }));
}
