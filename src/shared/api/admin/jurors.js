// src/shared/api/admin/jurors.js
// ============================================================
// Admin juror management functions (v2 — JWT-based auth).
// ============================================================

import { callAdminRpcV2, rethrowUnauthorized } from "../transport";

/**
 * Creates a new juror and assigns to the given semester.
 *
 * @param {{juror_name: string, juror_inst: string, semesterId: string}} payload
 * @returns {Promise<{juror_id: string, juror_name: string, juror_inst: string}|null>}
 */
export async function adminCreateJuror(payload) {
  const params = {
    p_juror_name:  payload.juror_name,
    p_juror_inst:  payload.juror_inst,
    p_semester_id: payload.semesterId,
  };
  const data = await callAdminRpcV2("rpc_admin_juror_create", params);
  return data?.[0] || null;
}

/**
 * Updates a juror's name and institution.
 *
 * @param {{jurorId: string, juror_name: string, juror_inst: string}} payload
 * @returns {Promise<boolean>} True on success.
 */
export async function adminUpdateJuror(payload) {
  const params = {
    p_juror_id:   payload.jurorId,
    p_juror_name: payload.juror_name,
    p_juror_inst: payload.juror_inst,
  };
  const data = await callAdminRpcV2("rpc_admin_juror_update", params);
  return data === true;
}

/**
 * Resets a juror's PIN for a specific semester.
 */
export async function adminResetJurorPin(payload) {
  const data = await callAdminRpcV2("rpc_admin_juror_reset_pin", {
    p_semester_id: payload.semesterId,
    p_juror_id:    payload.jurorId,
  });
  return data?.[0] || null;
}

/**
 * Enables re-edit mode for a juror who has already submitted.
 */
export async function adminSetJurorEditMode(payload) {
  const data = await callAdminRpcV2("rpc_admin_juror_set_edit_mode", {
    p_semester_id: payload.semesterId,
    p_juror_id:    payload.jurorId,
    p_enabled:     !!payload.enabled,
  });
  return data === true;
}

/**
 * Force-closes re-edit mode for a juror.
 */
export async function adminForceCloseJurorEditMode(payload) {
  const data = await callAdminRpcV2("rpc_admin_juror_force_close_edit_mode", {
    p_semester_id: payload.semesterId,
    p_juror_id:    payload.jurorId,
  });
  return data === true;
}

/**
 * Permanently deletes a juror and all their associated score data.
 */
export async function adminDeleteJuror(jurorId) {
  try {
    const data = await callAdminRpcV2("rpc_admin_juror_delete", {
      p_juror_id: jurorId,
    });
    return data === true;
  } catch (e) { rethrowUnauthorized(e); }
}
