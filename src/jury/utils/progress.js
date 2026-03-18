// src/jury/utils/progress.js
// ============================================================
// Pure function for building the progress-check data shown to
// returning jurors who have partially completed their scoring.
//
// Extracted from the _loadSemester inner function in
// src/jury/useJuryState.js.
// ============================================================

import { CRITERIA } from "../../config";
import { isScoreFilled } from "./scoreState";

// ── buildProgressCheck ────────────────────────────────────
//
// Parameters:
//   projectList   — raw project records from DB (with .scores, .comment,
//                   .total, .final_submitted_at, .updated_at fields)
//   seedScores    — { [project_id]: { [criterionId]: value } } — the
//                   already-normalized score state seeded from DB
//   options:
//     showProgressCheck   — whether caller intends to show the progress screen
//     showEmptyProgress   — whether to show progress even with no data
//     canEdit             — whether the juror currently has edit permission
//
// Returns null if the progress check should be skipped (caller goes directly
// to "eval" step), or a progressCheck object if the screen should be shown.

export const buildProgressCheck = (projectList, seedScores, options = {}) => {
  const { showProgressCheck = false, showEmptyProgress = false, canEdit = false } = options;

  const finalSubmittedAt =
    projectList.find((p) => p.final_submitted_at)?.final_submitted_at || "";
  const isFinalSubmitted = Boolean(finalSubmittedAt);

  const progressRows = projectList
    .filter((p) => {
      if (isFinalSubmitted) return true;
      const projectScores = p.scores || {};
      const hasScore = Object.values(projectScores).some(isScoreFilled);
      const hasComment = String(p.comment || "").trim() !== "";
      return hasScore || hasComment;
    })
    .map((p) => {
      const projectScores = seedScores[p.project_id] || p.scores || {};
      const hasScore = Object.values(projectScores).some(isScoreFilled);
      const hasComment = String(p.comment || "").trim() !== "";
      const hasAny = hasScore || hasComment;
      const hasTotal = p.total !== null && p.total !== undefined;
      const allFilled =
        !hasTotal && CRITERIA.every((c) => isScoreFilled(projectScores[c.id]));
      const computedPartialTotal =
        !hasTotal && hasScore
          ? CRITERIA.reduce((sum, c) => {
              const raw = projectScores[c.id];
              if (!isScoreFilled(raw)) return sum;
              const n = Number(raw);
              return Number.isFinite(n) ? sum + n : sum;
            }, 0)
          : null;
      const scoreStatus =
        hasTotal || allFilled ? "scored" : hasScore ? "partial" : "empty";
      const status = isFinalSubmitted
        ? "group_submitted"
        : hasAny
        ? "in_progress"
        : "not_started";
      const timestamp = isFinalSubmitted
        ? p.final_submitted_at || finalSubmittedAt || ""
        : hasAny
        ? p.updated_at || ""
        : "";
      return {
        projectId: p.project_id,
        status,
        scoreStatus,
        total: hasTotal ? p.total : computedPartialTotal,
        partialTotal: computedPartialTotal,
        timestamp,
      };
    });

  const hasProgress = progressRows.length > 0;

  if (!showProgressCheck || (!hasProgress && !showEmptyProgress)) {
    return null;
  }

  const totalCount = projectList.length;
  const { filledCount, criteriaFilledCount } = projectList.reduce(
    (acc, p) => {
      const allFilled = CRITERIA.every((c) =>
        isScoreFilled(seedScores[p.project_id]?.[c.id])
      );
      const filled = CRITERIA.filter((c) =>
        isScoreFilled(seedScores[p.project_id]?.[c.id])
      ).length;
      return {
        filledCount: acc.filledCount + (allFilled ? 1 : 0),
        criteriaFilledCount: acc.criteriaFilledCount + filled,
      };
    },
    { filledCount: 0, criteriaFilledCount: 0 }
  );
  const criteriaTotalCount = totalCount * CRITERIA.length;
  const allSubmitted = isFinalSubmitted;

  return {
    rows: progressRows,
    filledCount,
    totalCount,
    criteriaFilledCount,
    criteriaTotalCount,
    allSubmitted,
    editAllowed: canEdit,
    nextStep: "eval",
  };
};
