// src/shared/api/admin/scores.js
// ============================================================
// Admin score data, settings, eval-lock, and delete functions.
// (v2 — JWT-based auth)
// ============================================================

import { callAdminRpcV2, rethrowUnauthorized } from "../transport";
import { dbAvgScoresToUi } from "../fieldMapping";
import { normalizeScoreRow } from "../../../admin/selectors/scoreSelectors";
import { adminDeleteSemester } from "./semesters";
import { adminDeleteProject } from "./projects";
import { adminDeleteJuror } from "./jurors";

/**
 * Returns all score rows for a semester, normalized to the field names
 * that admin tab components expect.
 */
export async function adminGetScores(semesterId) {
  let data;
  try {
    data = await callAdminRpcV2("rpc_admin_scores_get", {
      p_semester_id: semesterId,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }
  return (data || []).map(normalizeScoreRow);
}

/**
 * Returns all jurors for the semester, including those who have not scored yet.
 */
export async function adminListJurors(semesterId) {
  let data;
  try {
    data = await callAdminRpcV2("rpc_admin_juror_list", {
      p_semester_id: semesterId,
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
 */
export async function adminProjectSummary(semesterId) {
  let data;
  try {
    data = await callAdminRpcV2("rpc_admin_project_summary", {
      p_semester_id: semesterId,
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
    avg:      dbAvgScoresToUi(row),
    totalAvg: row.avg_total == null ? null : Number(row.avg_total),
    totalMin: row.min_total == null ? null : Number(row.min_total),
    totalMax: row.max_total == null ? null : Number(row.max_total),
    note:     row.note || "",
  }));
}

/**
 * Returns per-semester outcome averages used by the Analytics trend chart.
 */
export async function adminGetOutcomeTrends(semesterIds) {
  let data;
  try {
    data = await callAdminRpcV2("rpc_admin_outcome_trends", {
      p_semester_ids: semesterIds,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }
  return (data || []).map((row) => ({
    semesterId:   row.semester_id,
    semesterName: row.semester_name || "",
    posterDate:   row.poster_date || "",
    criteriaAvgs: dbAvgScoresToUi(row),
    nEvals:       Number(row.n_evals || 0),
  }));
}

// ── Admin settings ────────────────────────────────────────────

/**
 * Returns all admin settings key/value pairs for a tenant.
 */
export async function adminGetSettings(tenantId) {
  const data = await callAdminRpcV2("rpc_admin_settings_get", {
    p_tenant_id: tenantId,
  });
  return data || [];
}

/**
 * Sets a single admin settings key to the given value (tenant-scoped).
 */
export async function adminSetSetting(key, value, tenantId) {
  return callAdminRpcV2("rpc_admin_setting_set", {
    p_tenant_id: tenantId,
    p_key:       key,
    p_value:     value,
  });
}

/**
 * Locks or unlocks scoring for a semester.
 */
export async function adminSetSemesterEvalLock(semesterId, enabled) {
  const data = await callAdminRpcV2("rpc_admin_semester_set_eval_lock", {
    p_semester_id: semesterId,
    p_enabled:     !!enabled,
  });
  return data === true;
}

// ── Admin delete ──────────────────────────────────────────────

/**
 * Returns cascade counts for a delete operation.
 */
export async function adminDeleteCounts(targetType, targetId) {
  return callAdminRpcV2("rpc_admin_delete_counts", {
    p_type: targetType,
    p_id:   targetId,
  });
}

/**
 * Dispatches a permanent delete to the appropriate domain function.
 */
export async function adminDeleteEntity({ targetType, targetId }) {
  if (!targetType || !targetId) throw new Error("targetType and targetId are required.");
  if (targetType === "semester") return adminDeleteSemester(targetId);
  if (targetType === "project")  return adminDeleteProject(targetId);
  if (targetType === "juror")    return adminDeleteJuror(targetId);
  throw new Error("Unsupported delete target.");
}
