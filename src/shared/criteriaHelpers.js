// src/shared/criteriaHelpers.js
// ============================================================
// Canonical helpers for semester-scoped criteria and MÜDEK
// template handling.
//
// Source-of-truth hierarchy:
//   1. Semester JSONB criteria_template (operational)
//   2. config.js CRITERIA (seed defaults + fallback only)
//
// Canonical view-model fields per criterion:
//   label, shortLabel, color, max, blurb, mudek (display codes), rubric[]
//
// Legacy fields (key, mudek_outcomes) are handled in adapters only:
//   - normalizeCriterion()  : any stored shape → view model
//   - criterionToTemplate() : view model → stored shape (emits legacy compat)
// ============================================================

import { CRITERIA, MUDEK_OUTCOMES } from "../config";

// ── Normalization ─────────────────────────────────────────────

/**
 * Convert any stored criterion shape (old or new) to the canonical
 * view-model shape. This is the single adapter used by getActiveCriteria,
 * MudekBadge, and all consumers.
 *
 * Old shape: { key, label, max, mudek_outcomes[] }
 * New shape: { key, label, shortLabel, color, max, blurb, mudek[], rubric[] }
 *
 * Both pass through safely; missing optional fields get safe defaults.
 */
export function normalizeCriterion(c) {
  // Derive mudek (display codes) from mudek_outcomes if mudek not present
  const mudek =
    Array.isArray(c.mudek) && c.mudek.length > 0
      ? c.mudek
      : (Array.isArray(c.mudek_outcomes) ? c.mudek_outcomes : []).map(_idToCode);

  const key = c.key ?? c.id ?? _labelToKey(c.label ?? "");
  // Fall back to config defaults for rich fields missing from old-shape stored templates
  const configMatch = CRITERIA.find((x) => (x.id ?? x.key) === key);
  const rubric = Array.isArray(c.rubric) && c.rubric.length > 0
    ? c.rubric
    : (configMatch?.rubric ?? []);
  const blurb = c.blurb || configMatch?.blurb || "";

  return {
    key,
    id:         key,
    label:      c.label ?? "",
    shortLabel: c.shortLabel ?? c.label ?? "",
    color:      c.color ?? configMatch?.color ?? "#94A3B8",
    max:        Number(c.max) || 0,
    blurb,
    mudek,                                              // primary — display codes
    rubric,
    // mudek_outcomes intentionally excluded from view model
  };
}

/**
 * Save normalizer: convert a view-model criterion row to the full stored
 * shape. Emits both `mudek` (primary) and `mudek_outcomes` (derived, for
 * backward compat with any DB consumers that still read it).
 *
 * The `range` string on each rubric band is always computed from min/max
 * here — it is never read from the editor state.
 *
 * row._key is the silently-preserved stable key; only derive from label
 * for new rows that have no existing key.
 */
export function criterionToTemplate(row) {
  const key = row._key ? row._key : _labelToKey(row.label);
  const criterionMax = Number(row.max);
  const boundedMax = Number.isFinite(criterionMax) && criterionMax >= 0 ? criterionMax : 0;
  const clampBand = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > boundedMax) return boundedMax;
    return n;
  };
  return {
    key,
    label:          row.label.trim(),
    shortLabel:     (row.shortLabel ?? "").trim() || row.label.trim(),
    color:          row.color || "#94A3B8",
    max:            Number(row.max),
    blurb:          (row.blurb ?? "").trim(),
    mudek:          row.mudek ?? [],                        // primary
    mudek_outcomes: (row.mudek ?? []).map(_codeToId),       // derived for compat
    rubric: (row.rubric ?? []).map((b) => ({
      level: b.level ?? "",
      min:   clampBand(b.min),
      max:   clampBand(b.max),
      range: `${clampBand(b.min)}–${clampBand(b.max)}`,   // always computed, never from user input
      desc:  (b.desc ?? "").trim(),
    })),
  };
}

// ── Criteria helpers ─────────────────────────────────────────

/**
 * Convert a `criteria_template` array (DB shape) to the canonical view-model
 * shape via normalizeCriterion. Falls back to `CRITERIA` from config when the
 * template is null, not an array, or empty.
 */
export function getActiveCriteria(template) {
  if (!Array.isArray(template) || template.length === 0) return CRITERIA;
  return template.map(normalizeCriterion);
}

/**
 * Same as getActiveCriteria but only converts — does not fall back to
 * config. Returns an empty array when template is null/empty.
 */
export function templateToCriteria(template) {
  if (!Array.isArray(template) || template.length === 0) return [];
  return template.map(normalizeCriterion);
}

/**
 * Structure-normalizing adapter for semester criteria templates.
 * Fills missing structural fields with safe defaults via normalizeCriterion.
 *
 * Contract:
 * - Does NOT fabricate rubric ranges or silently repair invalid content.
 * - Missing rubric → [] (editor will seed a default rubric for display).
 * - Missing max → 0 (surfaces as "Must be greater than 0" in the editor).
 * - Missing shortLabel → derived from label.
 * - Missing color → "#94A3B8".
 * - Missing blurb → "".
 *
 * @param {Array} template - Raw criteria_template from DB (any stored shape)
 * @returns {Array} Normalized view-model array
 */
export function normalizeSemesterCriteria(template) {
  if (!Array.isArray(template)) return [];
  return template.map(normalizeCriterion);
}

/**
 * Sum the `max` values of a criteria array.
 */
export function computeCriteriaTotal(criteria) {
  if (!Array.isArray(criteria)) return 0;
  return criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
}

/**
 * True when every criterion key defined in `criteria` has a non-null,
 * finite numeric value in `entry`.
 */
export function isCriteriaScoreComplete(entry, criteria) {
  if (!entry || !Array.isArray(criteria) || criteria.length === 0) return false;
  return criteria.every((c) => {
    const key = c.id ?? c.key;
    const val = entry[key];
    return val !== null && val !== undefined && Number.isFinite(Number(val));
  });
}

// ── Seed builders ────────────────────────────────────────────

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

// ── MÜDEK helpers ─────────────────────────────────────────────

/**
 * Build a lookup object keyed by internal MÜDEK id.
 * Output shape: { [id]: { id, code, desc_en, desc_tr } }
 * Falls back to config MUDEK_OUTCOMES when template is null/empty.
 */
export function buildMudekLookup(mudekTemplate) {
  if (Array.isArray(mudekTemplate) && mudekTemplate.length > 0) {
    return Object.fromEntries(
      mudekTemplate.map((o) => [
        o.id,
        { id: o.id, code: o.code, desc_en: o.desc_en, desc_tr: o.desc_tr },
      ])
    );
  }
  return Object.fromEntries(
    Object.entries(MUDEK_OUTCOMES).map(([code, desc]) => {
      const id = _codeToId(code);
      return [id, { id, code, desc_en: desc.en, desc_tr: desc.tr }];
    })
  );
}

// ── Internal helpers ──────────────────────────────────────────

/** "1.2" → "po_1_2" */
function _codeToId(code) {
  return "po_" + String(code).replace(/\./g, "_");
}

/** "po_1_2" → "1.2" */
function _idToCode(id) {
  return String(id).replace(/^po_/, "").replace(/_/g, ".");
}

/** "Technical Content" → "technical_content" */
function _labelToKey(label) {
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "criterion";
}
