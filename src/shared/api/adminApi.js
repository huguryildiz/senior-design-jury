// src/shared/api/adminApi.js
// ============================================================
// Admin-only RPC wrappers. All calls go through callAdminRpc,
// which routes through the Edge Function in production so that
// the RPC secret never reaches the browser.
//
// Field mapping:
//   adminGetScores:      DB written/oral → UI design/delivery  (dbScoresToUi)
//   adminProjectSummary: DB avg_written/avg_oral → UI design/delivery (dbAvgScoresToUi)
// ============================================================

import { supabase } from "./core/client";
import {
  RPC_PROXY_URL,
  USE_PROXY,
  DEV_RPC_SECRET,
} from "./core/client";
import { dbScoresToUi, dbAvgScoresToUi } from "./fieldMapping";

// ── Proxy dispatcher ──────────────────────────────────────────
// Private — not exported from index.js.
//
// Production: calls rpc-proxy Edge Function (p_rpc_secret injected server-side).
// Dev:        calls Supabase RPC directly with client-side VITE_RPC_SECRET.
async function callAdminRpc(fn, params = {}) {
  if (USE_PROXY) {
    const res = await fetch(RPC_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:        import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify({ fn, params }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      const err = new Error(json.error || "Admin RPC proxy error");
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

// ── Auth helpers ──────────────────────────────────────────────

// Re-thrown as `e.unauthorized = true` for consistent handling across admin tabs.
//
// Primary check: error.code === "P0401" — the SQLSTATE used by all admin
// password-validation failures in the DB (sql/000_bootstrap.sql).
//
// Fallback: error.message === "unauthorized" — exact match for the DB
// exception string, handles cases where the proxy does not forward the code
// (e.g., a network-level error wraps the response). Exact equality prevents
// false positives from unrelated P0401 errors (e.g., juror session errors).
function rethrowUnauthorized(error) {
  if (error.code === "P0401" || error.message === "unauthorized") {
    const e = new Error("unauthorized");
    e.unauthorized = true;
    throw e;
  }
  throw error;
}

// ── Shared typedefs ───────────────────────────────────────────

/**
 * @typedef {object} SemesterRow
 * @property {string}       id           UUID primary key.
 * @property {string}       name         Display name (e.g. "2026 Spring").
 * @property {boolean}      is_active    Whether this is the current active semester.
 * @property {boolean}      is_locked    Whether scoring is locked for this semester.
 * @property {string}       poster_date  ISO date string (YYYY-MM-DD) of poster day.
 * @property {string|null}  updated_at   ISO timestamp of last update.
 */

/**
 * @typedef {object} ProjectRow
 * @property {string}       id              UUID primary key.
 * @property {string}       semester_id     Foreign key → semesters.id.
 * @property {number}       group_no        Group number (1-based).
 * @property {string}       project_title   Title of the project / group name.
 * @property {string}       group_students  Newline-separated student names.
 * @property {string|null}  updated_at      ISO timestamp of last update.
 */

/**
 * @typedef {object} JurorRow
 * @property {string}       jurorId           UUID (mapped from juror_id).
 * @property {string}       juryName          Display name (mapped from juror_name).
 * @property {string}       juryDept          Institution / department (mapped from juror_inst).
 * @property {boolean}      isAssigned        Whether the juror is assigned to this semester.
 * @property {boolean}      editEnabled       Whether re-edit mode is currently active.
 * @property {string}       finalSubmittedAt  ISO timestamp of final submission, or "".
 * @property {boolean}      finalSubmitted    True when finalSubmittedAt is set.
 * @property {string}       lastActivityAt    ISO timestamp of last scoring activity, or "".
 * @property {number}       lastActivityMs    Unix ms of lastActivityAt, or 0.
 * @property {number}       totalProjects     Number of projects assigned.
 * @property {number}       completedProjects Number of projects fully scored.
 * @property {string|null}  lockedUntil       ISO timestamp while login is locked, or null.
 * @property {boolean}      isLocked          Whether the juror's login is currently locked.
 */

/**
 * @typedef {object} ScoreRow
 * @property {string}      jurorId          UUID of the juror.
 * @property {string}      juryName         Display name of the juror.
 * @property {string}      juryDept         Institution / department of the juror.
 * @property {string}      projectId        UUID of the project.
 * @property {number}      groupNo          Group number.
 * @property {string}      projectName      Title of the project.
 * @property {string}      posterDate       ISO date string of poster day.
 * @property {number|null} technical        Score for Technical criterion (0–30).
 * @property {number|null} design           Score for Design criterion (mapped from written, 0–30).
 * @property {number|null} delivery         Score for Delivery criterion (mapped from oral, 0–30).
 * @property {number|null} teamwork         Score for Teamwork criterion (0–10).
 * @property {number|null} total            Computed total (null when not all criteria are filled).
 * @property {string}      comments         Juror's comment text.
 * @property {string}      updatedAt        ISO timestamp of last update.
 * @property {number}      updatedMs        Unix ms of updatedAt.
 * @property {string}      finalSubmittedAt ISO timestamp of final submission, or "".
 * @property {number}      finalSubmittedMs Unix ms of finalSubmittedAt, or 0.
 * @property {string}      status           "not_started" | "in_progress" | "submitted" | "completed" | "editing".
 */

// ── Admin auth ────────────────────────────────────────────────

/**
 * Validates an admin password against the database.
 *
 * @param {string} password - The admin password to validate.
 * @returns {Promise<boolean>} True when the password is correct.
 * @throws {Error} With `adminLocked=true` and `lockedUntil` if too many attempts.
 */
export async function adminLogin(password) {
  const data = await callAdminRpc("rpc_admin_login", { p_password: password });
  const row = data?.[0] ?? {};
  if (!row.ok && row.locked_until) {
    const e = new Error("Too many failed attempts.");
    e.adminLocked = true;
    e.lockedUntil = row.locked_until;
    throw e;
  }
  return !!row.ok;
}

/**
 * Returns the current admin security configuration state.
 * Does not require an admin password.
 *
 * @returns {Promise<{admin_password_set: boolean, delete_password_set: boolean, backup_password_set: boolean}>}
 */
export async function adminSecurityState() {
  const { data, error } = await supabase.rpc("rpc_admin_security_state");
  if (error) throw error;
  return data?.[0] || {
    admin_password_set:  false,
    delete_password_set: false,
    backup_password_set: false,
  };
}

// ── Score data ────────────────────────────────────────────────

/**
 * Returns all score rows for a semester, normalized to the field names
 * that admin tab components expect. DB `written`/`oral` are mapped to
 * UI `design`/`delivery`.
 *
 * @param {string} semesterId     - UUID of the semester.
 * @param {string} adminPassword  - Admin password for authorization.
 * @returns {Promise<ScoreRow[]>} Array of normalized score rows.
 * @throws {Error} With `unauthorized=true` when the password is wrong.
 */
export async function adminGetScores(semesterId, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_get_scores", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }

  return (data || []).map((row) => {
    const hasAnyScore  = row.technical != null || row.written != null || row.oral != null || row.teamwork != null;
    const hasAllScores = row.technical != null && row.written != null && row.oral != null && row.teamwork != null;
    const hasComment   = String(row.comment || "").trim().length > 0;
    const finalSubmittedAtRaw = row.final_submitted_at || "";
    const isFinalSubmitted    = !!finalSubmittedAtRaw;
    const status = row.status || (
      isFinalSubmitted
        ? "completed"
        : (hasAllScores
          ? "submitted"
          : (!hasAnyScore && !hasComment ? "not_started" : "in_progress"))
    );

    const updatedAt        = row.updated_at         ? new Date(row.updated_at).toISOString()         : "";
    const updatedMs        = row.updated_at         ? new Date(row.updated_at).getTime()             : 0;
    const finalSubmittedAt = finalSubmittedAtRaw    ? new Date(finalSubmittedAtRaw).toISOString()    : "";
    const finalSubmittedMs = finalSubmittedAtRaw    ? new Date(finalSubmittedAtRaw).getTime()        : 0;

    return {
      jurorId:     row.juror_id,
      juryName:    row.juror_name,
      juryDept:    row.juror_inst,
      projectId:   row.project_id,
      groupNo:     row.group_no,
      projectName: row.project_title,
      posterDate:  row.poster_date || "",
      // DB written/oral → UI design/delivery via dbScoresToUi
      ...dbScoresToUi(row),
      total:       row.total    ?? null,
      comments:    row.comment  || "",
      updatedAt,
      updatedMs,
      finalSubmittedAt,
      finalSubmittedMs,
      // Legacy timestamp fields now represent "last edited"
      timestamp:   updatedAt,
      tsMs:        updatedMs,
      status,
      editingFlag: status === "editing" ? "editing" : "",
    };
  });
}

/**
 * Returns all jurors for the semester, including those who have not scored yet.
 *
 * @param {string} semesterId    - UUID of the semester.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<JurorRow[]>} Array of normalized juror rows.
 * @throws {Error} With `unauthorized=true` when the password is wrong.
 */
export async function adminListJurors(semesterId, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_list_jurors", {
      p_admin_password: adminPassword,
      p_semester_id:    semesterId,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }
  return (data || []).map((j) => ({
    jurorId:           j.juror_id,
    juryName:          j.juror_name,
    juryDept:          j.juror_inst || "",
    scoredSemesters:   Array.isArray(j.scored_semesters) ? j.scored_semesters : [],
    isAssigned:        j.is_assigned,
    editEnabled:       j.edit_enabled,
    finalSubmittedAt:  j.final_submitted_at || "",
    finalSubmitted:    Boolean(j.final_submitted_at),
    lastActivityAt:    j.last_activity_at || "",
    lastActivityMs:    j.last_activity_at ? new Date(j.last_activity_at).getTime() : 0,
    lastSeenAt:        j.last_seen_at || "",
    lastSeenMs:        j.last_seen_at ? new Date(j.last_seen_at).getTime() : 0,
    updatedAt:         j.updated_at || "",
    updatedMs:         j.updated_at ? new Date(j.updated_at).getTime() : 0,
    totalProjects:     j.total_projects,
    completedProjects: j.completed_projects,
    lockedUntil:       j.locked_until,
    isLocked:          j.is_locked,
  }));
}

/**
 * Returns per-project summary aggregates for the Rankings and Analytics tabs.
 * DB `avg_written`/`avg_oral` are mapped to UI `design`/`delivery` inside `avg`.
 *
 * @param {string} semesterId    - UUID of the semester.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<Array<{id: string, groupNo: number, name: string, students: string, count: number, avg: object, totalAvg: number|null, totalMin: number|null, totalMax: number|null, note: string}>>}
 * @throws {Error} With `unauthorized=true` when the password is wrong.
 */
export async function adminProjectSummary(semesterId, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_project_summary", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }

  return (data || []).map((row) => ({
    id:       row.project_id,
    groupNo:  row.group_no,
    name:     row.project_title,
    students: row.group_students || "",
    count:    Number(row.juror_count || 0),
    // DB avg_written/avg_oral → UI design/delivery via dbAvgScoresToUi
    avg:      dbAvgScoresToUi(row),
    totalAvg: row.avg_total == null ? null : Number(row.avg_total),
    totalMin: row.min_total == null ? null : Number(row.min_total),
    totalMax: row.max_total == null ? null : Number(row.max_total),
    note:     row.note || "",
  }));
}

/**
 * Returns per-semester outcome averages used by the Analytics trend chart.
 *
 * @param {string[]} semesterIds  - Array of semester UUIDs to include.
 * @param {string}   adminPassword - Admin password for authorization.
 * @returns {Promise<Array<{semesterId: string, semesterName: string, posterDate: string, avgTechnical: number|null, avgWritten: number|null, avgOral: number|null, avgTeamwork: number|null, nEvals: number}>>}
 * @throws {Error} With `unauthorized=true` when the password is wrong.
 */
export async function adminGetOutcomeTrends(semesterIds, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_outcome_trends", {
      p_semester_ids:   semesterIds,
      p_admin_password: adminPassword,
    });
  } catch (error) {
    rethrowUnauthorized(error);
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

// ── Admin manage: semesters ───────────────────────────────────

/**
 * Sets the active semester. Only one semester can be active at a time.
 *
 * @param {string} semesterId    - UUID of the semester to activate.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<void>}
 */
export async function adminSetActiveSemester(semesterId, adminPassword) {
  return callAdminRpc("rpc_admin_set_active_semester", {
    p_semester_id:    semesterId,
    p_admin_password: adminPassword,
  });
}

/**
 * Creates a new semester.
 *
 * @param {{name: string, poster_date: string}} payload - Semester fields.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<SemesterRow|null>} The created semester row, or null.
 */
export async function adminCreateSemester(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_create_semester", {
    p_name:           payload.name,
    p_poster_date:    payload.poster_date,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

/**
 * Updates the name and poster date of an existing semester.
 *
 * @param {{id: string, name: string, poster_date: string}} payload - Updated semester fields.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<SemesterRow|null>} The updated semester row, or null.
 */
export async function adminUpdateSemester(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_update_semester", {
    p_semester_id:    payload.id,
    p_name:           payload.name,
    p_poster_date:    payload.poster_date,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

/**
 * Permanently deletes a semester and all associated data.
 * Requires the separate delete password (not the admin password).
 *
 * @param {string} semesterId     - UUID of the semester to delete.
 * @param {string} deletePassword - Delete password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminDeleteSemester(semesterId, deletePassword) {
  const data = await callAdminRpc("rpc_admin_delete_semester", {
    p_semester_id:     semesterId,
    p_delete_password: deletePassword,
  });
  return data === true;
}

// ── Admin manage: projects ────────────────────────────────────

/**
 * Lists all projects for a semester.
 *
 * @param {string} semesterId    - UUID of the semester.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<ProjectRow[]>} Array of project rows.
 */
export async function adminListProjects(semesterId, adminPassword) {
  const data = await callAdminRpc("rpc_admin_list_projects", {
    p_semester_id:    semesterId,
    p_admin_password: adminPassword,
  });
  return data || [];
}

/**
 * Creates a new project in a semester.
 *
 * @param {{semesterId: string, group_no: number, project_title: string, group_students: string}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<{project_id: string}|null>} Object with the new project's UUID, or null.
 */
export async function adminCreateProject(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_create_project", {
    p_semester_id:    payload.semesterId,
    p_group_no:       payload.group_no,
    p_project_title:  payload.project_title,
    p_group_students: payload.group_students,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

/**
 * Updates an existing project (upsert by group_no within the semester).
 *
 * @param {{semesterId: string, group_no: number, project_title: string, group_students: string}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<{project_id: string}|null>} Object with the project's UUID, or null.
 */
export async function adminUpsertProject(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_upsert_project", {
    p_semester_id:    payload.semesterId,
    p_group_no:       payload.group_no,
    p_project_title:  payload.project_title,
    p_group_students: payload.group_students,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

/**
 * Permanently deletes a project and its associated score data.
 *
 * @param {string} projectId     - UUID of the project to delete.
 * @param {string} deletePassword - Delete password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminDeleteProject(projectId, deletePassword) {
  const data = await callAdminRpc("rpc_admin_delete_project", {
    p_project_id:      projectId,
    p_delete_password: deletePassword,
  });
  return data === true;
}

// ── Admin manage: jurors ──────────────────────────────────────

/**
 * Creates a new juror.
 *
 * @param {{juror_name: string, juror_inst: string}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<{juror_id: string, juror_name: string, juror_inst: string}|null>}
 */
export async function adminCreateJuror(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_create_juror", {
    p_juror_name:     payload.juror_name,
    p_juror_inst:     payload.juror_inst,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

/**
 * Updates a juror's name and institution.
 *
 * @param {{jurorId: string, juror_name: string, juror_inst: string}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminUpdateJuror(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_update_juror", {
    p_juror_id:       payload.jurorId,
    p_juror_name:     payload.juror_name,
    p_juror_inst:     payload.juror_inst,
    p_admin_password: adminPassword,
  });
  return data === true;
}

/**
 * Resets a juror's PIN for a specific semester. The new PIN is returned
 * once and should be displayed immediately to the admin.
 *
 * @param {{semesterId: string, jurorId: string}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<{pin_plain_once: string, juror_name: string, juror_inst: string}|null>}
 */
export async function adminResetJurorPin(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_reset_juror_pin", {
    p_semester_id:    payload.semesterId,
    p_juror_id:       payload.jurorId,
    p_admin_password: adminPassword,
  });
  return data?.[0] || null;
}

/**
 * Enables re-edit mode for a juror who has already submitted. Only `enabled=true`
 * is allowed from the admin side — closing edit mode requires juror resubmission.
 *
 * @param {{semesterId: string, jurorId: string, enabled: boolean}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminSetJurorEditMode(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_set_juror_edit_mode", {
    p_semester_id:    payload.semesterId,
    p_juror_id:       payload.jurorId,
    p_enabled:        !!payload.enabled,
    p_admin_password: adminPassword,
  });
  return data === true;
}

/**
 * Force-closes re-edit mode for a juror without waiting for resubmission.
 * Use sparingly — prefer letting the juror resubmit normally.
 *
 * @param {{semesterId: string, jurorId: string}} payload
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminForceCloseJurorEditMode(payload, adminPassword) {
  const data = await callAdminRpc("rpc_admin_force_close_juror_edit_mode", {
    p_semester_id:    payload.semesterId,
    p_juror_id:       payload.jurorId,
    p_admin_password: adminPassword,
  });
  return data === true;
}

/**
 * Permanently deletes a juror and all their associated score data.
 *
 * @param {string} jurorId       - UUID of the juror to delete.
 * @param {string} deletePassword - Delete password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminDeleteJuror(jurorId, deletePassword) {
  const data = await callAdminRpc("rpc_admin_delete_juror", {
    p_juror_id:        jurorId,
    p_delete_password: deletePassword,
  });
  return data === true;
}

// ── Admin settings ────────────────────────────────────────────

/**
 * Returns all admin settings key/value pairs.
 *
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<Array<{key: string, value: string}>>}
 */
export async function adminGetSettings(adminPassword) {
  const data = await callAdminRpc("rpc_admin_get_settings", {
    p_admin_password: adminPassword,
  });
  return data || [];
}

/**
 * Sets a single admin settings key to the given value.
 *
 * @param {string} key           - Settings key.
 * @param {string} value         - New value.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<void>}
 */
export async function adminSetSetting(key, value, adminPassword) {
  return callAdminRpc("rpc_admin_set_setting", {
    p_key:            key,
    p_value:          value,
    p_admin_password: adminPassword,
  });
}

/**
 * Locks or unlocks scoring for a semester. When locked, jurors cannot
 * submit or modify scores.
 *
 * @param {string}  semesterId    - UUID of the semester.
 * @param {boolean} enabled       - True to lock scoring; false to unlock.
 * @param {string}  adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminSetSemesterEvalLock(semesterId, enabled, adminPassword) {
  const data = await callAdminRpc("rpc_admin_set_semester_eval_lock", {
    p_semester_id:    semesterId,
    p_enabled:        !!enabled,
    p_admin_password: adminPassword,
  });
  return data === true;
}

// ── Admin audit log ───────────────────────────────────────────

/**
 * Returns paginated audit log entries matching the given filters.
 *
 * @param {object}   filters                  - Filter parameters (all optional).
 * @param {string}   [filters.startAt]         ISO timestamp lower bound.
 * @param {string}   [filters.endAt]           ISO timestamp upper bound.
 * @param {string[]} [filters.actorTypes]      Actor type filter (e.g. ["admin", "juror"]).
 * @param {string[]} [filters.actions]         Action filter (e.g. ["create", "delete"]).
 * @param {string}   [filters.search]          Full-text search string.
 * @param {string}   [filters.searchDay]       Day filter (DD).
 * @param {string}   [filters.searchMonth]     Month filter (MM).
 * @param {string}   [filters.searchYear]      Year filter (YYYY).
 * @param {number}   [filters.limit=120]       Max rows to return.
 * @param {string}   [filters.beforeAt]        Cursor: return entries before this timestamp.
 * @param {string}   [filters.beforeId]        Cursor: tiebreaker for beforeAt.
 * @param {string}   adminPassword             Admin password for authorization.
 * @returns {Promise<object[]>} Array of audit log rows.
 * @throws {Error} With `unauthorized=true` when the password is wrong.
 */
export async function adminListAuditLogs(filters, adminPassword) {
  let data;
  try {
    data = await callAdminRpc("rpc_admin_list_audit_logs", {
      p_admin_password: adminPassword,
      p_start_at:       filters?.startAt       || null,
      p_end_at:         filters?.endAt         || null,
      p_actor_types:    filters?.actorTypes    || null,
      p_actions:        filters?.actions       || null,
      p_search:         filters?.search        || null,
      p_search_day:     filters?.searchDay     || null,
      p_search_month:   filters?.searchMonth   || null,
      p_search_year:    filters?.searchYear    || null,
      p_limit:          filters?.limit         || 120,
      p_before_at:      filters?.beforeAt      || null,
      p_before_id:      filters?.beforeId      || null,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }
  return data || [];
}

// ── Admin passwords ───────────────────────────────────────────

/**
 * Changes the admin password. Requires the current password.
 *
 * @param {string} currentPassword - The current admin password.
 * @param {string} newPassword     - The new admin password to set.
 * @returns {Promise<object|null>} Result row or null.
 */
export async function adminChangePassword(currentPassword, newPassword) {
  const data = await callAdminRpc("rpc_admin_change_password", {
    p_current_password: currentPassword,
    p_new_password:     newPassword,
  });
  return data?.[0] || null;
}

/**
 * Sets the initial admin password when none has been configured yet.
 * Fails if an admin password is already set.
 *
 * @param {string} newPassword - The initial admin password to set.
 * @returns {Promise<object|null>} Result row or null.
 */
export async function adminBootstrapPassword(newPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_password", {
    p_new_password: newPassword,
  });
  return data?.[0] || null;
}

/**
 * Sets the initial backup (export) password when none has been configured yet.
 *
 * @param {string} newPassword   - The initial backup password to set.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminBootstrapBackupPassword(newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_backup_password", {
    p_new_password:   newPassword,
    p_admin_password: adminPassword,
  });
  return data === true;
}

/**
 * Sets the initial delete password when none has been configured yet.
 *
 * @param {string} newPassword   - The initial delete password to set.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminBootstrapDeletePassword(newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_delete_password", {
    p_new_password:   newPassword,
    p_admin_password: adminPassword,
  });
  return data === true;
}

/**
 * Changes the backup (export) password. Requires the current backup password.
 *
 * @param {string} currentPassword - The current backup password.
 * @param {string} newPassword     - The new backup password.
 * @param {string} adminPassword   - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminChangeBackupPassword(currentPassword, newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_change_backup_password", {
    p_current_password: currentPassword,
    p_new_password:     newPassword,
    p_admin_password:   adminPassword,
  });
  return data === true;
}

/**
 * Changes the delete password. Requires the current delete password.
 *
 * @param {string} currentPassword - The current delete password.
 * @param {string} newPassword     - The new delete password.
 * @param {string} adminPassword   - Admin password for authorization.
 * @returns {Promise<boolean|object|null>} True or result row on success.
 */
export async function adminChangeDeletePassword(currentPassword, newPassword, adminPassword) {
  const data = await callAdminRpc("rpc_admin_change_delete_password", {
    p_current_password: currentPassword,
    p_new_password:     newPassword,
    p_admin_password:   adminPassword,
  });
  return data === true || data?.[0] || null;
}

// ── Admin export / import ─────────────────────────────────────

/**
 * Exports the full database as a serialized backup blob.
 * Requires both the backup password and admin password.
 *
 * @param {string} backupPassword - Backup password for authorization.
 * @param {string} adminPassword  - Admin password for authorization.
 * @returns {Promise<object>} Serialized backup data.
 */
export async function adminFullExport(backupPassword, adminPassword) {
  return callAdminRpc("rpc_admin_full_export", {
    p_backup_password: backupPassword,
    p_admin_password:  adminPassword,
  });
}

/**
 * Imports a full backup, replacing all data.
 * Requires both the backup password and admin password.
 *
 * @param {object} backup         - Backup data returned by `adminFullExport`.
 * @param {string} backupPassword - Backup password for authorization.
 * @param {string} adminPassword  - Admin password for authorization.
 * @returns {Promise<void>}
 */
export async function adminFullImport(backup, backupPassword, adminPassword) {
  return callAdminRpc("rpc_admin_full_import", {
    p_backup_password: backupPassword,
    p_admin_password:  adminPassword,
    p_data:            backup,
  });
}

// ── Admin delete ──────────────────────────────────────────────

/**
 * Returns cascade counts for a delete operation (how many rows will be removed).
 * Used to populate the delete confirmation dialog before the user confirms.
 *
 * @param {"semester"|"project"|"juror"} targetType - The type of entity.
 * @param {string} targetId      - UUID of the entity.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<object>} Counts object (structure depends on targetType).
 */
export async function adminDeleteCounts(targetType, targetId, adminPassword) {
  return callAdminRpc("rpc_admin_delete_counts", {
    p_type:           targetType,
    p_id:             targetId,
    p_admin_password: adminPassword,
  });
}

/**
 * Dispatches a permanent delete to the appropriate domain function.
 *
 * @param {object} opts
 * @param {"semester"|"project"|"juror"} opts.targetType - The type of entity to delete.
 * @param {string} opts.targetId      - UUID of the entity to delete.
 * @param {string} opts.deletePassword - Delete password for authorization.
 * @returns {Promise<boolean>} True on success.
 * @throws {Error} When targetType is unsupported or ids are missing.
 */
export async function adminDeleteEntity({ targetType, targetId, deletePassword }) {
  if (!targetType || !targetId) throw new Error("targetType and targetId are required.");
  if (targetType === "semester") return adminDeleteSemester(targetId, deletePassword);
  if (targetType === "project")  return adminDeleteProject(targetId, deletePassword);
  if (targetType === "juror")    return adminDeleteJuror(targetId, deletePassword);
  throw new Error("Unsupported delete target.");
}

// ── Phase 3.5 — Jury entry token management ───────────────────

/**
 * Generates a new jury entry token for a semester. The raw token is
 * returned once and should be stored or shared immediately.
 *
 * @param {string} semesterId    - UUID of the semester.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<string|null>} The raw token string, or null on failure.
 */
export async function adminGenerateEntryToken(semesterId, adminPassword) {
  try {
    const rows = await callAdminRpc("rpc_admin_generate_entry_token", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
    return rows?.[0]?.raw_token || null;
  } catch (e) { rethrowUnauthorized(e); throw e; }
}

/**
 * Revokes the active jury entry token for a semester, preventing new logins.
 *
 * @param {string} semesterId    - UUID of the semester.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<boolean>} True on success.
 */
export async function adminRevokeEntryToken(semesterId, adminPassword) {
  try {
    await callAdminRpc("rpc_admin_revoke_entry_token", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
    return true;
  } catch (e) { rethrowUnauthorized(e); throw e; }
}

/**
 * Returns the current entry token status for a semester.
 *
 * @param {string} semesterId    - UUID of the semester.
 * @param {string} adminPassword - Admin password for authorization.
 * @returns {Promise<{token_active: boolean, expires_at: string|null}|null>}
 */
export async function adminGetEntryTokenStatus(semesterId, adminPassword) {
  try {
    const rows = await callAdminRpc("rpc_admin_get_entry_token_status", {
      p_semester_id:    semesterId,
      p_admin_password: adminPassword,
    });
    return rows?.[0] || null;
  } catch (e) { rethrowUnauthorized(e); throw e; }
}
