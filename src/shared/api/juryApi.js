// src/shared/api/juryApi.js
// Juror-facing API — mix of RPCs (complex auth) and PostgREST (queries).

import { supabase } from "./core/client";
import { withRetry } from "./core/retry";
import { formatMembers } from "./fieldMapping";
import { invokeEdgeFunction } from "./core/invokeEdgeFunction";

// ── Juror auth (RPCs) ────────────────────────────────────────

export async function authenticateJuror(periodId, jurorName, affiliation, forceReissue = false, email = null) {
  const { data, error } = await supabase.rpc("rpc_jury_authenticate", {
    p_period_id: periodId,
    p_juror_name: String(jurorName || "").trim(),
    p_affiliation: String(affiliation || "").trim(),
    p_force_reissue: forceReissue,
    p_email: email ? String(email).trim() : null,
  });
  if (error) throw error;
  return data;
}

export async function verifyJurorPin(periodId, jurorName, affiliation, pin) {
  const { data, error } = await supabase.rpc("rpc_jury_verify_pin", {
    p_period_id: periodId,
    p_juror_name: String(jurorName || "").trim(),
    p_affiliation: String(affiliation || "").trim(),
    p_pin: String(pin || "").trim(),
  });
  if (error) throw error;
  return data;
}

export async function verifyEntryToken(token) {
  const { data, error } = await supabase.rpc("rpc_jury_validate_entry_token", {
    p_token: String(token || "").trim(),
  });
  if (error) throw error;
  return data;
}

export async function verifyEntryReference(reference) {
  const { data, error } = await supabase.rpc("rpc_jury_validate_entry_reference", {
    p_reference: String(reference || "").trim(),
  });
  if (error) throw error;
  return data;
}

// ── Score upsert (RPC) ──────────────────────────────────────

export async function upsertScore(periodId, projectId, jurorId, sessionToken, scores, comment, criteriaConfig) {
  return withRetry(async () => {
    const criteria = criteriaConfig || [
      { key: "technical", id: "technical" },
      { key: "written", id: "written" },
      { key: "oral", id: "oral" },
      { key: "teamwork", id: "teamwork" }
    ];

    const p_scores = criteria.map(c => ({
      key: c.key || c.id,
      value: scores[c.id] ?? scores[c.key] ?? null
    })).filter(s => s.value !== null && s.value !== undefined);

    const { data, error } = await supabase.rpc("rpc_jury_upsert_score", {
      p_period_id: periodId,
      p_project_id: projectId,
      p_juror_id: jurorId,
      p_session_token: sessionToken,
      p_scores: p_scores,
      p_comment: comment || null,
    });
    if (error) throw error;
    if (data?.error_code) {
      const code = String(data.error_code || "");
      const mappedMessage = code === "session_expired"
        ? "juror_session_expired"
        : code === "invalid_session"
          ? "juror_session_invalid"
          : code === "session_not_found"
            ? "juror_session_not_found"
            : code;
      const e = new Error(mappedMessage || "rpc_jury_upsert_score_failed");
      if (
        code === "session_expired" ||
        code === "invalid_session" ||
        code === "session_not_found"
      ) {
        e.code = "P0401";
      }
      throw e;
    }
    return data;
  });
}

// ── PostgREST queries ────────────────────────────────────────

export async function getJurorById(jurorId) {
  const { data, error } = await supabase
    .from("jurors")
    .select("*")
    .eq("id", jurorId)
    .single();
  if (error) throw error;
  return data;
}

export async function listProjects(periodId, jurorId = null, signal, sessionToken = null) {
  return withRetry(async () => {
    let query = supabase
      .from("projects")
      .select("id, title, members, advisor_name")
      .eq("period_id", periodId)
      .order("title");

    if (signal) query = query.abortSignal(signal);
    const { data: projects, error } = await query;
    if (error) throw error;

    // If jurorId provided, fetch their scores for these projects.
    // Uses rpc_jury_get_scores (SECURITY DEFINER) when a sessionToken is available
    // because score_sheets RLS only allows authenticated (admin) access — anon role
    // gets zero rows from the direct PostgREST query even with GRANT SELECT.
    if (jurorId) {
      let sheets = [];
      if (sessionToken) {
        const { data: rpcResult, error: rpcError } = await supabase.rpc("rpc_jury_get_scores", {
          p_period_id:     periodId,
          p_juror_id:      jurorId,
          p_session_token: sessionToken,
        });
        if (!rpcError && rpcResult?.ok) {
          sheets = rpcResult.sheets || [];
        }
      }

      const scoreMap = new Map();
      (sheets || []).forEach((s) => {
        const scores = {};
        let total = 0;
        (s.items || []).forEach((item) => {
          const key = item.key;
          if (!key) return;
          const val = item.score_value != null ? Number(item.score_value) : null;
          scores[key] = val;
          if (val != null) total += val;
        });
        scoreMap.set(s.project_id, { scores, total, comment: s.comment, updated_at: s.updated_at });
      });

      return (projects || []).map((p) => {
        const entry = scoreMap.get(p.id);
        return {
          project_id: p.id,
          title: p.title,
          members: formatMembers(p.members),
          advisor: p.advisor_name || "",
          scores: entry?.scores || null,
          comment: entry?.comment ?? "",
          total: entry?.total ?? null,
          updated_at: entry?.updated_at,
          final_submitted_at: null,
        };
      });
    }
    return (projects || []).map((p) => ({
      project_id: p.id,
      title: p.title,
      members: formatMembers(p.members),
      advisor: p.advisor || "",
      scores: null,
      comment: "",
      total: null,
    }));
  });
}

export async function getJurorEditState(periodId, jurorId, sessionToken, signal) {
  let query = supabase
    .from("juror_period_auth")
    .select("edit_enabled, edit_expires_at, is_blocked, last_seen_at, final_submitted_at")
    .match({ juror_id: jurorId, period_id: periodId })
    .single();

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  const expiresMs = data.edit_expires_at ? Date.parse(data.edit_expires_at) : NaN;
  const editAllowed = !!data.edit_enabled && Number.isFinite(expiresMs) && expiresMs > Date.now();
  return {
    edit_allowed: editAllowed,
    lock_active: data.is_blocked,
    edit_expires_at: data.edit_expires_at,
    last_seen_at: data.last_seen_at,
    final_submitted_at: data.final_submitted_at,
  };
}

export async function finalizeJurorSubmission(periodId, jurorId, sessionToken) {
  const { data, error } = await supabase.rpc("rpc_jury_finalize_submission", {
    p_period_id: periodId,
    p_juror_id: jurorId,
    p_session_token: sessionToken,
    p_correlation_id: crypto.randomUUID(),
  });
  if (error) throw error;
  return data;
}

// ── Period queries (public, for jury flow) ───────────────────

export async function listPeriods(signal) {
  let query = supabase
    .from("periods")
    .select("id, name, is_current, is_locked, organization_id, framework_id, snapshot_frozen_at, end_date, organizations(code, name, institution, contact_email)")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function freezePeriodSnapshot(periodId) {
  const { data, error } = await supabase.rpc("rpc_period_freeze_snapshot", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data;
}

export async function getCurrentPeriod(signal) {
  let query = supabase
    .from("periods")
    .select("*")
    .eq("is_current", true)
    .limit(1)
    .maybeSingle();
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ── Semester compatibility functions (legacy RPC-based) ───────
// @deprecated Use listPeriods() instead
export async function listSemesters(signal) {
  return withRetry(async () => {
    const q = supabase.rpc("rpc_list_semesters");
    if (signal) q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw error;
    const { sortPeriodsByStartDateDesc } = await import("../periodSort.js");
    return sortPeriodsByStartDateDesc(data || []);
  });
}

// @deprecated Use getCurrentPeriod() instead
export async function getCurrentSemester(signal, semesterId) {
  const runRpc = async (params) => {
    const q = params
      ? supabase.rpc("rpc_get_current_semester", params)
      : supabase.rpc("rpc_get_current_semester");
    if (signal) q.abortSignal(signal);
    const { data, error } = await q;
    return { data, error };
  };

  // Default first: current production RPC signature is no-arg.
  const primary = await runRpc(null);
  if (!primary.error) return primary.data?.[0] || null;

  // Legacy fallback: some environments may still expose p_semester_id.
  if (semesterId) {
    const fnMissing = /function|does not exist|no function matches/i.test(String(primary.error.message || ""));
    if (!fnMissing) throw primary.error;
    const scoped = await runRpc({ p_semester_id: semesterId });
    if (scoped.error) throw scoped.error;
    return scoped.data?.[0] || null;
  }
  return null;
}

// ── PIN reset request (Edge Function) ───────────────────────

export async function requestPinReset({ periodId, jurorName, affiliation, message }) {
  const { data, error } = await invokeEdgeFunction("request-pin-reset", {
    body: {
      periodId,
      jurorName: String(jurorName || "").trim(),
      affiliation: String(affiliation || "").trim(),
      message: message || undefined,
    },
  });
  if (error) throw error;
  if (data?.ok === false) throw new Error(data.error || "Request failed");
  return data;
}

// ── Retry wrappers ───────────────────────────────────────────

export const listProjectsWithRetry = (...args) => listProjects(...args);
export const upsertScoreWithRetry = (...args) => upsertScore(...args);

// ── Project Rankings (SECURITY DEFINER — avg scores across all jurors) ──

export async function getProjectRankings(periodId, sessionToken) {
  const { data, error } = await supabase.rpc("rpc_jury_project_rankings", {
    p_period_id: periodId,
    p_session_token: sessionToken,
  });
  if (error) throw error;
  return data || [];
}

// ── Score Edit Request (Edge Function) ──────────────────────

export async function requestScoreEdit({ periodId, jurorName, affiliation, sessionToken }) {
  const { data, error } = await invokeEdgeFunction("request-score-edit", {
    body: {
      periodId,
      jurorName: String(jurorName || "").trim(),
      affiliation: String(affiliation || "").trim(),
      sessionToken,
    },
  });
  if (error) throw error;
  if (data?.ok === false) throw new Error(data.error || "Request failed");
  return data;
}

// ── Jury Feedback (SECURITY DEFINER — session token auth) ───

export async function submitJuryFeedback(periodId, sessionToken, rating, comment) {
  const { data, error } = await supabase.rpc("rpc_submit_jury_feedback", {
    p_period_id: periodId,
    p_session_token: sessionToken,
    p_rating: rating,
    p_comment: comment || null,
  });
  if (error) throw error;
  return data;
}
