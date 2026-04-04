// src/shared/api/admin/maintenance.js
// Maintenance mode API — get status, set, cancel.

import { supabase } from "../core/client";

/**
 * Public (no auth) — check if maintenance is currently active.
 * Called on app load before any auth check.
 * @returns {{ is_active: boolean, mode: string, start_time: string|null, end_time: string|null, message: string }}
 */
export async function getMaintenanceStatus() {
  const { data, error } = await supabase.rpc("rpc_public_maintenance_status");
  if (error) throw error;
  return data;
}

/**
 * Super admin — read full maintenance config for the admin drawer.
 * @returns {{ is_active: boolean, mode: string, start_time: string|null, end_time: string|null, message: string, affected_org_ids: string[]|null, notify_admins: boolean, updated_at: string }}
 */
export async function getMaintenanceConfig() {
  const { data, error } = await supabase.rpc("rpc_admin_get_maintenance");
  if (error) throw error;
  return data;
}

/**
 * Super admin — activate or schedule maintenance.
 * @param {object} params
 * @param {"scheduled"|"immediate"} params.mode
 * @param {string|null} params.startTime   - ISO datetime string (for scheduled mode)
 * @param {number|null} params.durationMin - minutes until auto-lift; null = manual
 * @param {string} params.message
 * @param {string[]|null} params.affectedOrgIds - null = all orgs
 * @param {boolean} params.notifyAdmins
 */
export async function setMaintenance({ mode, startTime, durationMin, message, affectedOrgIds, notifyAdmins }) {
  const { data, error } = await supabase.rpc("rpc_admin_set_maintenance", {
    p_mode:             mode,
    p_start_time:       startTime ?? null,
    p_duration_min:     durationMin ?? null,
    p_message:          message ?? null,
    p_affected_org_ids: affectedOrgIds ?? null,
    p_notify_admins:    notifyAdmins ?? true,
  });
  if (error) throw error;

  // Fire-and-forget email notification — failure never blocks the RPC result.
  if (notifyAdmins) {
    const endTime = data?.end_time ?? null;
    supabase.functions
      .invoke("notify-maintenance", {
        body: { message, startTime, endTime, mode, affectedOrgIds: affectedOrgIds ?? null },
      })
      .catch((err) => {
        console.warn("[maintenance] notify-maintenance invoke failed:", err?.message);
      });
  }

  return data;
}

/**
 * Super admin — immediately deactivate maintenance mode.
 */
export async function cancelMaintenance() {
  const { data, error } = await supabase.rpc("rpc_admin_cancel_maintenance");
  if (error) throw error;
  return data;
}
