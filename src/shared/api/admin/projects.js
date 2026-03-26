// src/shared/api/admin/projects.js
// ============================================================
// Admin project management functions (v2 — JWT-based auth).
// ============================================================

import { callAdminRpcV2, rethrowUnauthorized } from "../transport";

/**
 * Lists all projects for a semester.
 */
export async function adminListProjects(semesterId) {
  const data = await callAdminRpcV2("rpc_admin_project_list", {
    p_semester_id: semesterId,
  });
  return data || [];
}

/**
 * Creates a new project in a semester.
 */
export async function adminCreateProject(payload) {
  const data = await callAdminRpcV2("rpc_admin_project_create", {
    p_semester_id:    payload.semesterId,
    p_group_no:       payload.group_no,
    p_project_title:  payload.project_title,
    p_group_students: payload.group_students,
  });
  return data?.[0] || null;
}

/**
 * Updates an existing project (upsert by group_no within the semester).
 */
export async function adminUpsertProject(payload) {
  const data = await callAdminRpcV2("rpc_admin_project_upsert", {
    p_semester_id:    payload.semesterId,
    p_group_no:       payload.group_no,
    p_project_title:  payload.project_title,
    p_group_students: payload.group_students,
  });
  return data?.[0] || null;
}

/**
 * Permanently deletes a project and its associated score data.
 */
export async function adminDeleteProject(projectId) {
  try {
    const data = await callAdminRpcV2("rpc_admin_project_delete", {
      p_project_id: projectId,
    });
    return data === true;
  } catch (e) { rethrowUnauthorized(e); }
}
