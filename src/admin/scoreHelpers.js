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

// ── Cell state ────────────────────────────────────────────────
// entry: { total, technical, design, delivery, teamwork } from lookup

export function getCellState(entry) {
  if (!entry) return "empty";
  if (entry.total !== null && entry.total !== undefined) return "scored";
  const hasAny =
    entry.technical != null ||
    entry.design    != null ||
    entry.delivery  != null ||
    entry.teamwork  != null;
  return hasAny ? "partial" : "empty";
}

// Partial sum from whichever criteria are filled (numeric only).
// Returns 0 if nothing is filled.
export function getPartialTotal(entry) {
  if (!entry) return 0;
  return (
    (typeof entry.technical === "number" ? entry.technical : 0) +
    (typeof entry.design    === "number" ? entry.design    : 0) +
    (typeof entry.delivery  === "number" ? entry.delivery  : 0) +
    (typeof entry.teamwork  === "number" ? entry.teamwork  : 0)
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
    colorClass: "status-green",
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
