// src/admin/scoreHelpers.js
// ============================================================
// Single source of truth for scoring logic and status metadata.
//
// Cell states:    scored | partial | empty
// Juror states:   completed | ready_to_submit | in_progress | not_started | editing
// ============================================================

import {
  CheckCircle2Icon,
  CheckIcon,
  SendIcon,
  Clock3Icon,
  CircleIcon,
  CircleDotDashedIcon,
  PencilIcon,
} from "../shared/Icons";
import { CRITERIA } from "../config";
import { rowKey } from "./utils";

// ── Cell state ────────────────────────────────────────────────
// entry: { total, ...criteriaFields } from lookup
// Field list is driven by CRITERIA from config.js — no hardcoded names.

export function getCellState(entry) {
  if (!entry) return "empty";
  if (entry.total !== null && entry.total !== undefined) return "scored";
  const hasAny = CRITERIA.some((c) => entry[c.id] != null);
  return hasAny ? "partial" : "empty";
}

// Partial sum from whichever criteria are filled (numeric only).
// Returns 0 if nothing is filled.
export function getPartialTotal(entry) {
  if (!entry) return 0;
  return CRITERIA.reduce(
    (sum, c) => sum + (typeof entry[c.id] === "number" ? entry[c.id] : 0),
    0
  );
}

// ── Juror workflow state ──────────────────────────────────────
// juror:        { key, editEnabled }
// groups:       { id }[]
// lookup:       jurorKey → { projectId → entry }
// jurorFinalMap: Map<jurorKey, boolean>  (has final_submitted_at)

export function getJurorWorkflowState(juror, groups, lookup, jurorFinalMap) {
  if (juror.editEnabled) return "editing";
  const isFinal = jurorFinalMap.get(juror.key) && !juror.editEnabled;
  if (isFinal) return "completed";

  const startedCount = groups.filter((g) => {
    const entry = lookup[juror.key]?.[g.id];
    return getCellState(entry) !== "empty";
  }).length;
  const scoredCount = groups.filter((g) => {
    const entry = lookup[juror.key]?.[g.id];
    return getCellState(entry) === "scored";
  }).length;

  if (groups.length > 0 && scoredCount === groups.length) return "ready_to_submit";
  if (startedCount > 0) return "in_progress";
  return "not_started";
}

// ── Juror status meta ─────────────────────────────────────────
// Single shared lookup for labels, icons, and CSS color classes.
// colorClass values map to:
//   .matrix-status-icon.{colorClass}  in admin-matrix.css
//   .status-badge.{colorClass}        in admin-layout.css

// ── Juror workflow states + cell states used by StatusBadge ──
// colorClass values map to:
//   .matrix-status-icon.{colorClass}  in admin-matrix.css
//   .status-badge.{colorClass}        in admin-layout.css
export const jurorStatusMeta = {
  // Juror workflow states
  completed: {
    label:      "Completed",
    icon:       CheckCircle2Icon,
    colorClass: "status-green",
  },
  ready_to_submit: {
    label:      "Ready to Submit",
    icon:       SendIcon,
    colorClass: "status-blue",
  },
  in_progress: {
    label:      "In Progress",
    icon:       Clock3Icon,
    colorClass: "status-amber",
  },
  not_started: {
    label:      "Not Started",
    icon:       CircleIcon,
    colorClass: "status-gray",
  },
  editing: {
    label:      "Editing",
    icon:       PencilIcon,
    colorClass: "status-purple",
  },
  // Cell states (used in per-group row badges in JurorActivity)
  scored: {
    label:      "Scored",
    icon:       CheckIcon,
    colorClass: "status-green-soft",
  },
  partial: {
    label:      "Partial",
    icon:       CircleDotDashedIcon,
    colorClass: "status-amber",
  },
  empty: {
    label:      "Empty",
    icon:       CircleIcon,
    colorClass: "status-gray",
  },
};

// ── Overview dashboard metrics ─────────────────────────────────
// Pure function: no React deps. Extracted from AdminPanel.jsx useMemo
// so it can be unit-tested independently.
//
// @param {object[]} rawScores       - flat score rows from adminGetScores
// @param {object[]} assignedJurors  - jurors assigned to the current semester
// @param {number}   totalProjects   - total groups in the semester
// @returns {object} counts for each dashboard metric
export function computeOverviewMetrics(rawScores, assignedJurors, totalProjects) {
  const safeScores  = rawScores      || [];
  const safeJurors  = assignedJurors || [];
  const safeProjCt  = totalProjects  || 0;

  const assignedIds   = new Set(safeJurors.map((j) => j.jurorId));
  const totalJurors   = safeJurors.length;
  const scoredByJuror = new Map();
  const startedByJuror = new Map();
  let scoredEvaluations  = 0;
  let partialEvaluations = 0;

  safeScores.forEach((r) => {
    if (assignedIds.size > 0 && !assignedIds.has(r.jurorId)) return;
    const cellState = getCellState(r);
    if (cellState === "scored")  scoredEvaluations  += 1;
    if (cellState === "partial") partialEvaluations += 1;
    if (r.total === null || r.total === undefined) return;
    const key = rowKey(r);
    scoredByJuror.set(key, (scoredByJuror.get(key) || 0) + 1);
  });

  safeScores.forEach((r) => {
    if (assignedIds.size > 0 && !assignedIds.has(r.jurorId)) return;
    if (getCellState(r) === "empty") return;
    const key = rowKey(r);
    startedByJuror.set(key, (startedByJuror.get(key) || 0) + 1);
  });

  const editingJurors = safeJurors.filter((j) =>
    !!(j.editEnabled ?? j.edit_enabled)
  ).length;

  const completedJurors = safeJurors.filter((j) => {
    const isEditing = !!(j.editEnabled ?? j.edit_enabled);
    return !isEditing && !!(j.finalSubmitted ?? j.finalSubmittedAt);
  }).length;

  const totalEvaluations = totalJurors * safeProjCt;
  const emptyEvaluations = Math.max(
    totalEvaluations - scoredEvaluations - partialEvaluations,
    0
  );

  const readyToSubmitJurors = safeJurors.filter((j) => {
    const isEditing = !!(j.editEnabled ?? j.edit_enabled);
    const isFinal   = !!(j.finalSubmitted ?? j.finalSubmittedAt);
    if (isEditing || isFinal) return false;
    return safeProjCt > 0 && (scoredByJuror.get(j.key) || 0) >= safeProjCt;
  }).length;

  const inProgressJurors = safeJurors.filter((j) => {
    const isEditing = !!(j.editEnabled ?? j.edit_enabled);
    const isFinal   = !!(j.finalSubmitted ?? j.finalSubmittedAt);
    if (isEditing || isFinal) return false;
    const started = startedByJuror.get(j.key) || 0;
    const scored  = scoredByJuror.get(j.key)  || 0;
    return started > 0 && scored < safeProjCt;
  }).length;

  const notStartedJurors = safeJurors.filter((j) => {
    const isEditing = !!(j.editEnabled ?? j.edit_enabled);
    if (isEditing) return false;
    const isFinal = !!(j.finalSubmitted ?? j.finalSubmittedAt);
    if (isFinal) return false;
    return (startedByJuror.get(j.key) || 0) === 0;
  }).length;

  return {
    completedJurors,
    readyToSubmitJurors,
    totalJurors,
    totalEvaluations,
    totalProjects: safeProjCt,
    scoredEvaluations,
    partialEvaluations,
    emptyEvaluations,
    inProgressJurors,
    editingJurors,
    notStartedJurors,
  };
}
