// src/admin/selectors/overviewMetrics.js
// Re-export computeOverviewMetrics through the selector layer.
// Canonical import location for new code.
export { computeOverviewMetrics } from "../scoreHelpers";

/**
 * Compute needs attention items for the Overview dashboard card.
 * Identifies stale jurors (not started) and projects with incomplete evaluation coverage.
 *
 * @param {object[]} jurorStats - array of { key, name, dept, rows, progress, ... }
 * @param {object[]} groups - array of { id, title, ... }
 * @param {object} metrics - from computeOverviewMetrics
 * @returns {{ staleJurors: object[], incompleteProjects: object[] }}
 */
export function computeNeedsAttention(jurorStats, groups, metrics) {
  const safeJurors = jurorStats ?? [];
  const safeGroups = groups ?? [];
  const safeMetrics = metrics ?? {};
  const totalJurors = safeMetrics.totalJurors ?? 0;

  // Jurors with no progress (not started)
  const staleJurors = safeJurors.filter((j) => {
    const progress = j.progress ?? 0;
    const status = j.status ?? "unknown";
    return progress === 0 || status === "not_started";
  });

  // Projects with incomplete evaluation coverage
  // (fewer completed evaluations than total assigned jurors)
  const incompleteProjects = safeGroups.filter((g) => {
    const completed = g.completedEvals ?? 0;
    return completed < totalJurors;
  });

  return {
    staleJurors,
    incompleteProjects,
  };
}
