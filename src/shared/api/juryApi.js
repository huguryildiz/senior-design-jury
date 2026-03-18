// src/shared/api/juryApi.js
// ============================================================
// Juror-facing RPC wrappers.
//
// Field mapping (config.js ↔ DB) is delegated to fieldMapping.js:
//   listProjects:  DB written/oral → UI design/delivery  (dbScoresToUi)
//   upsertScore:   UI design/delivery → DB p_written/p_oral (uiScoresToDbParams)
// ============================================================

import { supabase } from "./core/client";
import { withRetry } from "./core/retry";
import { dbScoresToUi, uiScoresToDbParams } from "./fieldMapping";

// ── Juror auth ────────────────────────────────────────────────
// Returns { juror_name, juror_inst, needs_pin, pin_plain_once, locked_until, failed_attempts }.
export async function createOrGetJurorAndIssuePin(semesterId, jurorName, jurorInst) {
  const { data, error } = await supabase.rpc("rpc_create_or_get_juror_and_issue_pin", {
    p_semester_id: semesterId,
    p_juror_name:  String(jurorName || "").trim(),
    p_juror_inst:  String(jurorInst || "").trim(),
  });
  if (error) throw error;
  return data?.[0] || null;
}

// Returns { ok, juror_id, juror_name, juror_inst, error_code, locked_until, failed_attempts, pin_plain_once, session_token }.
export async function verifyJurorPin(semesterId, jurorName, jurorInst, pin) {
  const { data, error } = await supabase.rpc("rpc_verify_juror_pin", {
    p_semester_id: semesterId,
    p_juror_name:  String(jurorName || "").trim(),
    p_juror_inst:  String(jurorInst || "").trim(),
    p_pin:         String(pin || "").trim(),
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function getJurorById(jurorId) {
  const { data, error } = await supabase.rpc("rpc_get_juror_by_id", {
    p_juror_id: jurorId,
  });
  if (error) throw error;
  return data?.[0] || null;
}

// ── Project listing ───────────────────────────────────────────
// Returns projects for a semester with this juror's existing scores.
// DB column names are normalized back to config.js criterion ids via dbScoresToUi.
export async function listProjects(semesterId, jurorId = null, signal) {
  return withRetry(async () => {
    const q = supabase.rpc("rpc_list_projects", {
      p_semester_id: semesterId,
      p_juror_id:    jurorId ?? null,
    });
    if (signal) q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map((row) => ({
      project_id:         row.project_id,
      group_no:           row.group_no,
      project_title:      row.project_title,
      group_students:     row.group_students || "",
      poster_date:        row.poster_date || "",
      updated_at:         row.updated_at,
      final_submitted_at: row.final_submitted_at,
      scores:             dbScoresToUi(row),
      comment:            row.comment || "",
      total:              row.total ?? null,
    }));
  });
}

// ── Score upsert ──────────────────────────────────────────────
// Accepts scores keyed by config.js ids.
// Maps design→p_written and delivery→p_oral via uiScoresToDbParams.
// Returns computed total integer (from DB trigger).
export async function upsertScore(semesterId, projectId, jurorId, sessionToken, scores, comment) {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc("rpc_upsert_score", {
      p_semester_id:   semesterId,
      p_project_id:    projectId,
      p_juror_id:      jurorId,
      p_session_token: sessionToken,
      ...uiScoresToDbParams(scores),
      p_comment:       comment || "",
    });
    if (error) throw error;
    return data; // integer total
  });
}

// ── Edit state + finalization ─────────────────────────────────

export async function getJurorEditState(semesterId, jurorId, sessionToken, signal) {
  const q = supabase.rpc("rpc_get_juror_edit_state", {
    p_semester_id:   semesterId,
    p_juror_id:      jurorId,
    p_session_token: sessionToken,
  });
  if (signal) q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return data?.[0] || null;
}

export async function finalizeJurorSubmission(semesterId, jurorId, sessionToken) {
  const { data, error } = await supabase.rpc("rpc_finalize_juror_submission", {
    p_semester_id:   semesterId,
    p_juror_id:      jurorId,
    p_session_token: sessionToken,
  });
  if (error) throw error;
  return data === true;
}

// ── Phase 3.5 — Entry token verification ─────────────────────────────────────
// Called by JuryGatePage before the juror form is shown.
// Returns { ok, semester_id, semester_name, error_code } or null.
export async function verifyEntryToken(token) {
  const { data, error } = await supabase.rpc("rpc_verify_semester_entry_token", {
    p_token: String(token || "").trim(),
  });
  if (error) throw error;
  return data?.[0] || null;
}
