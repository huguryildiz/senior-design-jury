// src/shared/criteria/criteriaHelpers.js
// ============================================================
// Core normalization + criteria resolution helpers.
//
// Source-of-truth hierarchy:
//   1. Evaluation period JSONB criteria_config (operational)
//   2. config.js CRITERIA (seed defaults + fallback only)
//
// Canonical view-model fields per criterion:
//   label, shortLabel, color, max, blurb, mudek (display codes), rubric[]
//
// Legacy fields (key, mudek_outcomes) are handled in adapters only:
//   - normalizeCriterion()      : any stored shape → view model
//   - criterionToConfig()      : view model → stored shape (emits legacy compat)
// ============================================================

import { MUDEK_OUTCOMES } from "../constants";

// ── Internal helpers ──────────────────────────────────────────

/** "1.2" → "po_1_2" */
export function _codeToId(code) {
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

// ── Normalization ─────────────────────────────────────────────

/**
 * Convert any stored criterion shape (old or new) to the canonical
 * view-model shape. This is the single adapter used by getActiveCriteria,
 * OutcomeBadge, and all consumers.
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
  const rubric = Array.isArray(c.rubric) && c.rubric.length > 0 ? c.rubric : [];
  const blurb = c.blurb || "";

  return {
    key,
    id:         key,
    label:      c.label ?? "",
    shortLabel: c.shortLabel || c.label || "",
    color:      c.color ?? "#94A3B8",
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
export function criterionToConfig(row) {
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

// ── DB row normalizer ─────────────────────────────────────────

/**
 * Normalize a `period_criteria` DB row to the canonical view-model shape.
 * DB row fields: key, label, short_label, max_score, weight, color,
 *                description, rubric_bands (JSONB), sort_order
 */
export function normalizeCriterionFromDb(row) {
  return {
    key:        row.key,
    id:         row.key,
    label:      row.label ?? "",
    shortLabel: row.short_label || row.label || "",
    color:      row.color || "#6B7280",
    max:        Number(row.max_score) || 0,
    weight:     row.weight ?? null,
    blurb:      row.description || "",
    mudek:      Array.isArray(row.mudek) ? row.mudek : [],
    rubric:     Array.isArray(row.rubric_bands)
      ? row.rubric_bands.map((b) => ({
          level: b.level ?? b.label ?? "",
          min:   b.min,
          max:   b.max,
          range: b.range || `${b.min}–${b.max}`,
          desc:  b.desc ?? b.description ?? "",
        }))
      : [],
  };
}

// ── Criteria helpers ─────────────────────────────────────────

/**
 * Resolve active criteria from either:
 *   1. An array of `period_criteria` DB rows (have `max_score` field) — normalized via normalizeCriterionFromDb
 *   2. A `criteria_config` JSONB array (have `max` field) — normalized via normalizeCriterion
 *   3. null / empty → falls back to static CRITERIA from config.js
 *
 * Callers do not need to know which shape they have; duck-typing on `max_score`
 * presence distinguishes DB rows from stored JSONB config entries.
 */
export function getActiveCriteria(config) {
  if (!Array.isArray(config) || config.length === 0) return [];
  // Duck-type: DB rows from period_criteria have max_score; JSONB config rows have max.
  if ("max_score" in config[0]) return config.map(normalizeCriterionFromDb);
  return config.map(normalizeCriterion);
}

/**
 * Same as getActiveCriteria but only converts — does not fall back to
 * config. Returns an empty array when config is null/empty.
 */
export function configToCriteria(config) {
  if (!Array.isArray(config) || config.length === 0) return [];
  return config.map(normalizeCriterion);
}

/**
 * Structure-normalizing adapter for evaluation period criteria configs.
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
 * @param {Array} config - Raw criteria_config from DB (any stored shape)
 * @returns {Array} Normalized view-model array
 */
export function normalizePeriodCriteria(config) {
  if (!Array.isArray(config)) return [];
  return config.map(normalizeCriterion);
}

// ── Outcome helpers ────────────────────────────────────────────

/**
 * Build a lookup object keyed by internal outcome id (e.g. "po_1_1").
 * This is the primary adapter for period-specific outcome data.
 *
 * Output shape: { [id]: { id, code, desc_en, desc_tr } }
 *
 * Falls back to config MUDEK_OUTCOMES when config is null or empty
 * (intended for new periods or legacy migration only).
 */
export function buildOutcomeLookup(outcomeConfig) {
  if (Array.isArray(outcomeConfig) && outcomeConfig.length > 0) {
    return Object.fromEntries(
      outcomeConfig.map((o) => [
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

/**
 * Prune invalid or deleted MÜDEK outcomes from criteria mappings.
 * A criterion may have an empty mapping (mudek: []).
 *
 * @param {Array} criteria - Array of semantic criteria objects
 * @param {Array} outcomeConfig - Current valid outcome config
 * @returns {Array} A new criteria array with cleaned mappings (if changed), or the original array
 */
export function pruneCriteriaMudekMappings(criteria, outcomeConfig) {
  if (!Array.isArray(criteria)) return [];
  const validCodes = new Set((outcomeConfig || []).map((o) => o.code));

  let changed = false;
  const pruned = criteria.map((c) => {
    const originalMudek = Array.isArray(c.mudek) ? c.mudek : [];
    const validMudek = originalMudek.filter((code) => validCodes.has(code));
    const uniqueMudek = [...new Set(validMudek)];

    if (
      uniqueMudek.length !== originalMudek.length ||
      uniqueMudek.some((code, i) => code !== originalMudek[i])
    ) {
      changed = true;
      return { ...c, mudek: uniqueMudek };
    }
    return c;
  });

  return changed ? pruned : criteria;
}
