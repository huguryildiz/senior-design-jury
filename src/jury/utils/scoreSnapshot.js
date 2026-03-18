// src/jury/utils/scoreSnapshot.js
// ============================================================
// Helpers for building a normalized score snapshot (used for
// deduplication via lastWrittenRef) and for classifying
// semester-lock errors.
//
// These were extracted from src/jury/useJuryState.js.
// ============================================================

import { CRITERIA } from "../../config";
import { isScoreFilled, normalizeScoreValue } from "./scoreState";

// ── Score snapshot ─────────────────────────────────────────
//
// Returns a normalized representation of the current scores
// and comment for a single project. The `key` field is used
// by lastWrittenRef to detect whether data has changed since
// the last successful write, avoiding redundant RPC calls.

export const buildScoreSnapshot = (scores, comment) => {
  const normalizedScores = {};
  let hasAnyScores = false;
  CRITERIA.forEach((c) => {
    const v = normalizeScoreValue(scores?.[c.id], c.max);
    normalizedScores[c.id] = v;
    if (isScoreFilled(v)) hasAnyScores = true;
  });
  const cleanComment = String(comment ?? "");
  const key =
    `${CRITERIA.map((c) => (normalizedScores[c.id] ?? "")).join("|")}::${cleanComment}`;
  return {
    normalizedScores,
    comment: cleanComment,
    key,
    hasAnyScores,
    hasComment: cleanComment.trim() !== "",
  };
};

// ── Error classification ───────────────────────────────────
//
// These helpers classify structured DB errors at the jury write boundary.
// The DB raises exceptions with exact message strings; we match them exactly
// (not with .includes()) to prevent false positives if error text ever
// acquires a prefix/suffix.
//
// SQLSTATE reference (sql/000_bootstrap.sql):
//   semester_locked       — P0001 (default) — rpc_upsert_score semester lock check
//   juror_session_*       — P0401           — _assert_juror_session
//
// If the DB exception text ever changes, update the constants below.

// rpc_upsert_score: RAISE EXCEPTION 'semester_locked' (SQLSTATE P0001)
export const isSemesterLockedError = (err) =>
  String(err?.message || "") === "semester_locked";

// _assert_juror_session: all four cases use SQLSTATE P0401
// juror_session_expired   — session_expires_at <= now()
// juror_session_missing   — empty token string
// juror_session_not_found — no matching row in juror_semester_auth
// juror_session_invalid   — null hash, or bcrypt mismatch
const SESSION_EXPIRED_MESSAGES = new Set([
  "juror_session_expired",
  "juror_session_missing",
  "juror_session_not_found",
  "juror_session_invalid",
]);

export const isSessionExpiredError = (err) =>
  err?.code === "P0401" && SESSION_EXPIRED_MESSAGES.has(String(err?.message || ""));
