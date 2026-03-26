// src/shared/api/admin/semesters.js
// ============================================================
// Admin semester management functions (v2 — JWT-based auth).
// ============================================================

import { callAdminRpcV2, rethrowUnauthorized } from "../transport";
import { sortSemestersByPosterDateDesc } from "../../semesterSort";

/**
 * @typedef {object} SemesterRow
 * @property {string}       id           UUID primary key.
 * @property {string}       semester_name  Display name (e.g. "2026 Spring").
 * @property {boolean}      is_current     Whether this is the current semester.
 * @property {boolean}      is_locked    Whether scoring is locked for this semester.
 * @property {string}       poster_date  ISO date string (YYYY-MM-DD) of poster day.
 * @property {string|null}  updated_at   ISO timestamp of last update.
 */

/**
 * Lists semesters for a specific tenant (JWT-authenticated).
 * @param {string} tenantId  UUID of the tenant.
 * @returns {Promise<SemesterRow[]>}
 */
export async function adminListSemesters(tenantId) {
  const data = await callAdminRpcV2("rpc_admin_semester_list", {
    p_tenant_id: tenantId,
  });
  return sortSemestersByPosterDateDesc(data || []);
}

/**
 * Sets the current semester. Only one semester can be current at a time
 * (within the tenant that owns this semester).
 */
export async function adminSetCurrentSemester(semesterId) {
  return callAdminRpcV2("rpc_admin_semester_set_current", {
    p_semester_id: semesterId,
  });
}

/**
 * Creates a new semester within a tenant.
 */
export async function adminCreateSemester(payload) {
  const data = await callAdminRpcV2("rpc_admin_semester_create", {
    p_tenant_id:         payload.tenantId,
    p_semester_name:     payload.semester_name,
    p_poster_date:       payload.poster_date,
    p_criteria_template: payload.criteria_template ?? null,
    p_mudek_template:    payload.mudek_template ?? null,
  });
  return data?.[0] || null;
}

/**
 * Updates semester name, poster date, and optionally the criteria template of a semester.
 */
export async function adminUpdateSemester(payload) {
  await callAdminRpcV2("rpc_admin_semester_update", {
    p_semester_id:       payload.id,
    p_semester_name:     payload.semester_name,
    p_poster_date:       payload.poster_date,
    p_criteria_template: payload.criteria_template ?? null,
    p_mudek_template:    payload.mudek_template ?? null,
  });
  return true;
}

/**
 * Updates only the criteria template for a semester.
 */
export async function adminUpdateSemesterCriteriaTemplate(semesterId, semesterName, posterDate, template) {
  await callAdminRpcV2("rpc_admin_semester_update", {
    p_semester_id:       semesterId,
    p_semester_name:     semesterName,
    p_poster_date:       posterDate || null,
    p_criteria_template: template,
  });
  return true;
}

/**
 * Updates only the MUDEK template for a semester.
 */
export async function adminUpdateSemesterMudekTemplate(semesterId, semesterName, posterDate, template) {
  await callAdminRpcV2("rpc_admin_semester_update", {
    p_semester_id:       semesterId,
    p_semester_name:     semesterName,
    p_poster_date:    posterDate || null,
    p_mudek_template: template,
  });
  return true;
}

/**
 * Permanently deletes a semester and all associated data.
 */
export async function adminDeleteSemester(semesterId) {
  try {
    const data = await callAdminRpcV2("rpc_admin_semester_delete", {
      p_semester_id: semesterId,
    });
    return data === true;
  } catch (e) { rethrowUnauthorized(e); }
}
