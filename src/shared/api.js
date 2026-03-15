// src/shared/api.js
// ============================================================
// All backend communication via Supabase RPCs.
// No GAS URL, no fire-and-forget, no session tokens.
//
// Criteria field name mapping (config.js → DB):
//   config.js ids : technical | design   | delivery | teamwork
//   DB columns    : technical | written  | oral     | teamwork
//
// Mapping is applied ONLY in this file at the API boundary.
// All UI components and useJuryState continue to use config.js ids.
// ============================================================

import { supabase } from "../lib/supabaseClient";
import { CRITERIA } from "../config";
import { sortSemestersByPosterDateDesc } from "./semesterSort";

// ── Admin RPC proxy ────────────────────────────────────────────
// In production, admin RPCs are routed through the rpc-proxy Edge Function
// so that the RPC secret never appears in the client bundle.
// In dev mode, falls back to direct Supabase RPC with VITE_RPC_SECRET.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const RPC_PROXY_URL = `${SUPABASE_URL}/functions/v1/rpc-proxy`;
const DEV_RPC_SECRET = import.meta.env.DEV ? (import.meta.env.VITE_RPC_SECRET ?? '') : '';
const USE_PROXY = !import.meta.env.DEV;

if (import.meta.env.DEV && !import.meta.env.VITE_RPC_SECRET) {
  console.warn('[api.js] VITE_RPC_SECRET is not set — admin RPC calls will fail.');
}

/**
 * Call an admin-only RPC function.
 *
 * Production: proxied through the rpc-proxy Edge Function (p_rpc_secret
 * is injected server-side and never reaches the browser).
 *
 * Dev: falls back to direct Supabase RPC with VITE_RPC_SECRET.
 *
 * @param {string} fn   - RPC function name (e.g. "rpc_admin_login")
 * @param {object} params - parameters WITHOUT p_rpc_secret
 * @returns {Promise<any>} data from the RPC
 */
async function callAdminRpc(fn, params = {}) {
  if (USE_PROXY) {
    const res = await fetch(RPC_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''}`,
      },
      body: JSON.stringify({ fn, params }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      const err = new Error(json.error || 'Admin RPC proxy error');
      err.code = json.code;
      throw err;
    }
    return json.data;
  }
  // Dev fallback: direct Supabase RPC with client-side secret
  const { data, error } = await supabase.rpc(fn, {
    ...params,
    p_rpc_secret: DEV_RPC_SECRET,
  });
  if (error) throw error;
  return data;
}

// ── Retry helper ───────────────────────────────────────────────
// Retries on transient network errors only.
// Handles both raw fetch TypeError and Supabase client network errors
// (which surface as thrown PostgrestError with "Failed to fetch" message).
// Never retries AbortError (intentional cancellation) or business errors.
// Uses exponential backoff: delayMs * 2^(attempt-1).
export async function withRetry(fn, { maxAttempts = 3, delayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      // AbortError = intentional cancel (AbortController) — never retry
      if (e?.name === "AbortError") throw e;
      // Network-level failures: native TypeError (raw fetch) or
      // Supabase client "Failed to fetch" / "NetworkError" wrapped errors
      const isNetworkError =
        e instanceof TypeError ||
        (e?.message && (
          e.message.includes("Failed to fetch") ||
          e.message.includes("NetworkError") ||
          e.message.includes("network")
        ));
      if (isNetworkError) {
        lastError = e;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
          continue;
        }
      }
      // Supabase business errors, auth failures → propagate immediately
      throw e;
    }
  }
  throw lastError;
}

// ── Semester RPCs ──────────────────────────────────────────────

export async function listSemesters(signal) {
  const q = supabase.rpc("rpc_list_semesters");
  if (signal) q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return sortSemestersByPosterDateDesc(data || []);
}

export async function getActiveSemester(signal) {
  const q = supabase.rpc("rpc_get_active_semester");
  if (signal) q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return data?.[0] || null;
}

// ── Juror auth ─────────────────────────────────────────────────
// Returns { juror_id, juror_name, juror_inst, needs_pin, pin_plain_once, locked_until, failed_attempts }.
export async function createOrGetJurorAndIssuePin(semesterId, jurorName, jurorInst) {
  const { data, error } = await supabase.rpc("rpc_create_or_get_juror_and_issue_pin", {
    p_semester_id: semesterId,
    p_juror_name:  String(jurorName || "").trim(),
    p_juror_inst:  String(jurorInst || "").trim(),
  });
  if (error) throw error;
  return data?.[0] || null;
}

// Returns { ok, juror_id, juror_name, juror_inst, error_code, locked_until, failed_attempts, pin_plain_once }.
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

// ── Project listing ────────────────────────────────────────────
// Returns projects for a semester with this juror's existing scores.
// DB column names are normalized back to config.js criterion ids here.
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
      project_id:     row.project_id,
      group_no:       row.group_no,
      project_title:  row.project_title,
      group_students: row.group_students || "",
      poster_date:    row.poster_date || "",
      updated_at:     row.updated_at,
      final_submitted_at: row.final_submitted_at,
      // Normalize DB column names → config.js criterion ids
      scores: {
        technical: row.technical ?? null,
        design:    row.written   ?? null,   // written  → design
        delivery:  row.oral      ?? null,   // oral     → delivery
        teamwork:  row.teamwork  ?? null,
      },
      comment: row.comment || "",
      total:   row.total   ?? null,
    }));
  });
}

// ── Score upsert ───────────────────────────────────────────────
// Accepts scores keyed by config.js ids.
// Maps design→p_written and delivery→p_oral before calling RPC.
// Returns computed total integer (from DB trigger).
export async function upsertScore(semesterId, projectId, jurorId, scores, comment) {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc("rpc_upsert_score", {
      p_semester_id: semesterId,
      p_project_id:  projectId,
      p_juror_id:    jurorId,
      p_technical:   scores.technical ?? null,
      p_written:     scores.design    ?? null,   // design   → written
      p_oral:        scores.delivery  ?? null,   // delivery → oral
      p_teamwork:    scores.teamwork  ?? null,
      p_comment:     comment || "",
    });
    if (error) throw error;
    return data; // integer total
  });
}

// ── Admin RPCs ─────────────────────────────────────────────────

export async function adminLogin(password) {
  const data = await callAdminRpc("rpc_admin_login", {
    p_password: password,
  });
  const row = data?.[0] ?? {};
  if (!row.ok && row.locked_until) {
    const e = new Error("Too many failed attempts.");
    e.adminLocked = true;
    e.lockedUntil = row.locked_until;
    throw e;
  }
  return !!row.ok;
}

export async function adminSecurityState() {
  const { data, error } = await supabase.rpc("rpc_admin_security_state");
  if (error) throw error;
  return data?.[0] || {
    admin_password_set: false,
    delete_password_set: false,
    backup_password_set: false,
  };
}

// Returns all score rows for a semester, normalized to the field
// names that existing admin tab components expect.
export async function adminGetScores(semesterId, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_get_scores", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
  } catch (error) {
    if (error.code === "P0401" || error.message?.includes("unauthorized")) {
      const e = new Error("unauthorized");
      e.unauthorized = true;
      throw e;
    }
    throw error;
  }

  // Normalize DB names → admin tab field names (matches old GAS row shape)
  return (data || []).map((row) => {
    const hasAnyScore =
      row.technical != null ||
      row.written   != null ||
      row.oral      != null ||
      row.teamwork  != null;
    const hasAllScores =
      row.technical != null &&
      row.written   != null &&
      row.oral      != null &&
      row.teamwork  != null;
    const hasComment = String(row.comment || "").trim().length > 0;
    const finalSubmittedAtRaw = row.final_submitted_at || "";
    const isFinalSubmitted = !!finalSubmittedAtRaw;
    const status = row.status || (
      isFinalSubmitted
        ? "completed"
        : (hasAllScores
          ? "submitted"
          : (!hasAnyScore && !hasComment ? "not_started" : "in_progress"))
    );

    const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : "";
    const updatedMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const finalSubmittedAt = finalSubmittedAtRaw ? new Date(finalSubmittedAtRaw).toISOString() : "";
    const finalSubmittedMs = finalSubmittedAtRaw ? new Date(finalSubmittedAtRaw).getTime() : 0;

    return ({
      jurorId:     row.juror_id,
      juryName:    row.juror_name,
      juryDept:    row.juror_inst,
      projectId:   row.project_id,
      groupNo:     row.group_no,
      projectName: row.project_title,
      posterDate:  row.poster_date || "",
      // Normalize DB column names → config.js criterion ids
      technical:   row.technical   ?? null,
      design:      row.written     ?? null,   // written → design
      delivery:    row.oral        ?? null,   // oral    → delivery
      teamwork:    row.teamwork    ?? null,
      total:       row.total       ?? null,
      comments:    row.comment     || "",
      updatedAt,
      updatedMs,
      finalSubmittedAt,
      finalSubmittedMs,
      // Legacy timestamp fields now represent "last edited"
      timestamp:   updatedAt,
      tsMs:        updatedMs,
      status,
      editingFlag: status === "editing" ? "editing" : "",
    });
  });
}

// Returns all jurors for the semester (including those who haven't scored yet).
export async function adminListJurors(semesterId, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_list_jurors", {
      p_admin_password: adminPassword,
      p_semester_id:    semesterId,
    });
  } catch (error) {
    if (error.code === "P0401" || error.message?.includes("unauthorized")) {
      const e = new Error("unauthorized");
      e.unauthorized = true;
      throw e;
    }
    throw error;
  }
  return (data || []).map((j) => ({
    jurorId:  j.juror_id,
    juryName: j.juror_name,
    juryDept: j.juror_inst || "",
    scoredSemesters: Array.isArray(j.scored_semesters) ? j.scored_semesters : [],
    isAssigned: j.is_assigned,
    editEnabled: j.edit_enabled,
    finalSubmittedAt: j.final_submitted_at || "",
    finalSubmitted: Boolean(j.final_submitted_at),
    lastActivityAt: j.last_activity_at || "",
    lastActivityMs: j.last_activity_at ? new Date(j.last_activity_at).getTime() : 0,
    lastSeenAt: j.last_seen_at || "",
    lastSeenMs: j.last_seen_at ? new Date(j.last_seen_at).getTime() : 0,
    updatedAt: j.updated_at || "",
    updatedMs: j.updated_at ? new Date(j.updated_at).getTime() : 0,
    totalProjects: j.total_projects,
    completedProjects: j.completed_projects,
    lockedUntil: j.locked_until,
    isLocked: j.is_locked,
  }));
}

// Returns per-project summary aggregates, normalized for admin tabs.
export async function adminProjectSummary(semesterId, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_project_summary", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
  } catch (error) {
    if (error.code === "P0401" || error.message?.includes("unauthorized")) {
      const e = new Error("unauthorized");
      e.unauthorized = true;
      throw e;
    }
    throw error;
  }

  return (data || []).map((row) => ({
    id:          row.project_id,
    groupNo:     row.group_no,
    name:        row.project_title,
    students:    row.group_students || "",
    count:       Number(row.juror_count || 0),
    avg: {
      technical: row.avg_technical == null ? null : Number(row.avg_technical),
      design:    row.avg_written   == null ? null : Number(row.avg_written),  // avg_written → design
      delivery:  row.avg_oral      == null ? null : Number(row.avg_oral),     // avg_oral    → delivery
      teamwork:  row.avg_teamwork  == null ? null : Number(row.avg_teamwork),
    },
    totalAvg: row.avg_total == null ? null : Number(row.avg_total),
    totalMin: row.min_total == null ? null : Number(row.min_total),
    totalMax: row.max_total == null ? null : Number(row.max_total),
    note:     row.note || "",
  }));
}

// Returns per-semester outcome averages for trend chart.
export async function adminGetOutcomeTrends(semesterIds, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_outcome_trends", {
      p_semester_ids:   semesterIds,
      p_admin_password: adminPassword,
    });
  } catch (error) {
    if (error.code === "P0401" || error.message?.includes("unauthorized")) {
      const e = new Error("unauthorized");
      e.unauthorized = true;
      throw e;
    }
    throw error;
  }
  return (data || []).map((row) => ({
    semesterId:   row.semester_id,
    semesterName: row.semester_name || "",
    posterDate:   row.poster_date || "",
    avgTechnical: row.avg_technical == null ? null : Number(row.avg_technical),
    avgWritten:   row.avg_written   == null ? null : Number(row.avg_written),
    avgOral:      row.avg_oral      == null ? null : Number(row.avg_oral),
    avgTeamwork:  row.avg_teamwork  == null ? null : Number(row.avg_teamwork),
    nEvals:       Number(row.n_evals || 0),
  }));
}

// ── Admin manage RPCs ─────────────────────────────────────────

export async function adminSetActiveSemester(semesterId, adminPassword) {
  const data = await callAdminRpc("rpc_admin_set_active_semester", {
    p_semester_id: semesterId,
    p_admin_password: adminPassword,
  });
  return data;
}

export async function adminCreateSemester(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_create_semester", {
    p_name: payload.name,
    p_poster_date: payload.poster_date,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

export async function adminUpdateSemester(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_update_semester", {
    p_semester_id: payload.id,
    p_name: payload.name,
    p_poster_date: payload.poster_date,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

export async function adminListProjects(semesterId, adminPassword) {
  const data = await callAdminRpc("rpc_admin_list_projects", {
    p_semester_id: semesterId,
    p_admin_password: adminPassword,
  });
  return data || [];
}

export async function adminCreateProject(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_create_project", {
    p_semester_id: payload.semesterId,
    p_group_no: payload.group_no,
    p_project_title: payload.project_title,
    p_group_students: payload.group_students,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

export async function adminUpsertProject(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_upsert_project", {
    p_semester_id: payload.semesterId,
    p_group_no: payload.group_no,
    p_project_title: payload.project_title,
    p_group_students: payload.group_students,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

export async function adminCreateJuror(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_create_juror", {
    p_juror_name: payload.juror_name,
    p_juror_inst: payload.juror_inst,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

export async function adminUpdateJuror(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_update_juror", {
    p_juror_id: payload.jurorId,
    p_juror_name: payload.juror_name,
    p_juror_inst: payload.juror_inst,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function adminResetJurorPin(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_reset_juror_pin", {
    p_semester_id: payload.semesterId,
    p_juror_id: payload.jurorId,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

export async function adminSetJurorEditMode(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_set_juror_edit_mode", {
    p_semester_id: payload.semesterId,
    p_juror_id: payload.jurorId,
    p_enabled: !!payload.enabled,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function adminForceCloseJurorEditMode(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_force_close_juror_edit_mode", {
    p_semester_id: payload.semesterId,
    p_juror_id: payload.jurorId,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function adminGetSettings(adminPassword) {
  const data = await callAdminRpc("rpc_admin_get_settings", {
    p_admin_password: adminPassword,
  });
  return data || [];
}

export async function adminListAuditLogs(filters, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_list_audit_logs", {
      p_admin_password: adminPassword,
      p_start_at: filters?.startAt || null,
      p_end_at: filters?.endAt || null,
      p_actor_types: filters?.actorTypes || null,
      p_actions: filters?.actions || null,
      p_search: filters?.search || null,
      p_search_day: filters?.searchDay || null,
      p_search_month: filters?.searchMonth || null,
      p_search_year: filters?.searchYear || null,
      p_limit: filters?.limit || 120,
      p_before_at: filters?.beforeAt || null,
      p_before_id: filters?.beforeId || null,
    });
  } catch (error) {
    if (error.code === "P0401" || error.message?.includes("unauthorized")) {
      const e = new Error("unauthorized");
      e.unauthorized = true;
      throw e;
    }
    throw error;
  }
  return data || [];
}

export async function adminSetSetting(key, value, adminPassword) {
  const data = await callAdminRpc("rpc_admin_set_setting", {
    p_key: key,
    p_value: value,
    p_admin_password: adminPassword,
  });
  return data;
}

export async function adminSetSemesterEvalLock(semesterId, enabled, adminPassword) {
  const data = await callAdminRpc("rpc_admin_set_semester_eval_lock", {
    p_semester_id: semesterId,
    p_enabled: !!enabled,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function getJurorEditState(semesterId, jurorId, signal) {
  const q = supabase.rpc("rpc_get_juror_edit_state", {
    p_semester_id: semesterId,
    p_juror_id: jurorId,
  });
  if (signal) q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return data?.[0] || null;
}

export async function finalizeJurorSubmission(semesterId, jurorId) {
  const { data, error } = await supabase.rpc("rpc_finalize_juror_submission", {
    p_semester_id: semesterId,
    p_juror_id: jurorId,
  });
  if (error) throw error;
  return data === true;
}

export async function adminChangePassword(currentPassword, newPassword) {
  const data = await callAdminRpc("rpc_admin_change_password", {
    p_current_password: currentPassword,
    p_new_password: newPassword,
  });
  return data?.[0] || null;
}

export async function adminBootstrapPassword(newPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_password", {
    p_new_password: newPassword,
  });
  return data?.[0] || null;
}

export async function adminBootstrapBackupPassword(newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_backup_password", {
    p_new_password: newPassword,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function adminBootstrapDeletePassword(newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_delete_password", {
    p_new_password: newPassword,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function adminChangeBackupPassword(currentPassword, newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_change_backup_password", {
    p_current_password: currentPassword,
    p_new_password: newPassword,
    p_admin_password: adminPassword,
  });
  return data === true;
}

export async function adminFullExport(backupPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_full_export", {
    p_backup_password: backupPassword,
    p_admin_password: adminPassword,
  });
  return data;
}

export async function adminFullImport(backup, backupPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_full_import", {
    p_backup_password: backupPassword,
    p_admin_password: adminPassword,
    p_data: backup,
  });
  return data;
}

export async function adminChangeDeletePassword(currentPassword, newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_change_delete_password", {
    p_current_password: currentPassword,
    p_new_password: newPassword,
    p_admin_password: adminPassword,
  });
  return data === true || data?.[0] || null;
}

export async function adminDeleteSemester(semesterId, deletePassword) {
  const data = await callAdminRpc("rpc_admin_delete_semester", {
    p_semester_id:     semesterId,
    p_delete_password: deletePassword,
  });
  return data === true;
}

export async function adminDeleteProject(projectId, deletePassword) {
  const data = await callAdminRpc("rpc_admin_delete_project", {
    p_project_id:      projectId,
    p_delete_password: deletePassword,
  });
  return data === true;
}

export async function adminDeleteJuror(jurorId, deletePassword) {
  const data = await callAdminRpc("rpc_admin_delete_juror", {
    p_juror_id:        jurorId,
    p_delete_password: deletePassword,
  });
  return data === true;
}

export async function adminDeleteCounts(targetType, targetId, adminPassword) {
  const data = await callAdminRpc("rpc_admin_delete_counts", {
    p_type: targetType,
    p_id: targetId,
    p_admin_password: adminPassword,
  });
  return data;
}

export async function adminDeleteEntity({ targetType, targetId, deletePassword }) {
  if (!targetType || !targetId) throw new Error("targetType and targetId are required.");
  if (targetType === "semester") return adminDeleteSemester(targetId, deletePassword);
  if (targetType === "project") return adminDeleteProject(targetId, deletePassword);
  if (targetType === "juror") return adminDeleteJuror(targetId, deletePassword);
  throw new Error("Unsupported delete target.");
}
