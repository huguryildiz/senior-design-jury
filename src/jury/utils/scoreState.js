// src/jury/utils/scoreState.js
// ============================================================
// Pure helpers for score values, completeness checks, and
// empty-state factories. No React dependencies.
//
// These were extracted from src/jury/useJuryState.js.
// useJuryState.js re-exports the three named exports below
// so that existing imports in EvalStep.jsx and test files
// continue to resolve without any changes.
// ============================================================

import { CRITERIA } from "../../config";

// ── Value helpers ─────────────────────────────────────────

export const isScoreFilled = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v);
  const trimmed = String(v).trim();
  if (trimmed === "") return false;
  return Number.isFinite(Number(trimmed));
};

export const normalizeScoreValue = (val, max) => {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseInt(String(val), 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, 0), max);
};

// ── Completeness helpers ───────────────────────────────────

export const isAllFilled = (scores, pid) =>
  CRITERIA.every((c) => isScoreFilled(scores[pid]?.[c.id]));

export const isAllComplete = (scores, projects) =>
  projects.every((p) => isAllFilled(scores, p.project_id));

export const countFilled = (scores, projects) =>
  (projects || []).reduce(
    (t, p) =>
      t +
      CRITERIA.reduce(
        (n, c) => n + (isScoreFilled(scores[p.project_id]?.[c.id]) ? 1 : 0),
        0
      ),
    0
  );

// ── Empty-state factories (project UUID keyed) ────────────

export const makeEmptyScores = (projects) =>
  Object.fromEntries(
    projects.map((p) => [
      p.project_id,
      Object.fromEntries(CRITERIA.map((c) => [c.id, null])),
    ])
  );

export const makeEmptyComments = (projects) =>
  Object.fromEntries(projects.map((p) => [p.project_id, ""]));

export const makeEmptyTouched = (projects) =>
  Object.fromEntries(
    projects.map((p) => [
      p.project_id,
      Object.fromEntries(CRITERIA.map((c) => [c.id, false])),
    ])
  );

export const makeAllTouched = (projects) =>
  Object.fromEntries(
    projects.map((p) => [
      p.project_id,
      Object.fromEntries(CRITERIA.map((c) => [c.id, true])),
    ])
  );
