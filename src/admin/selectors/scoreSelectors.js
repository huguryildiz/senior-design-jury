// src/admin/selectors/scoreSelectors.js
// ============================================================
// Pure selector functions for shaping raw DB score rows into
// UI-ready objects.
//
// No React. No API calls. No side effects.
// ============================================================

/**
 * Derive the status string from a raw DB score row.
 *
 * Priority:
 *  1. If the DB supplies an explicit `status`, use it as-is.
 *  2. final_submitted_at present → "completed"
 *  3. All criteria values present (and at least one) → "submitted"
 *  4. No scores and no comment → "not_started"
 *  5. Otherwise → "in_progress"
 *
 * @param {{ status?: string|null, criteria_scores?: Record<string, number|null>, comment?: string|null, final_submitted_at?: string|null }} row
 * @returns {string}
 */
export function deriveScoreStatus(row) {
  if (row.status) return row.status;
  const cs = row.criteria_scores || {};
  const vals = Object.values(cs);
  const hasAnyScore = vals.some(v => v != null);
  const hasAllScores = vals.length > 0 && vals.every(v => v != null);
  const hasComment = String(row.comment || "").trim().length > 0;
  const finalSubmittedAtRaw = row.final_submitted_at || "";
  const isFinalSubmitted = !!finalSubmittedAtRaw;
  if (isFinalSubmitted) return "completed";
  if (hasAllScores) return "submitted";
  if (!hasAnyScore && !hasComment) return "not_started";
  return "in_progress";
}
