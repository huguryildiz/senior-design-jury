// src/shared/criteria/validation.js
// ============================================================
// Pure validation helpers for criteria scoring.
// No config dependency.
// ============================================================

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
