// src/shared/api/admin/maintenance.js
// Maintenance mode API — get status, set, cancel.

import { supabase } from "../core/client";
import { invokeEdgeFunction } from "../core/invokeEdgeFunction";

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
 * @returns {{ ok: boolean, start_time: string|null, end_time: string|null, mailResult: { sent: number, total: number, errors?: string[] }|null }}
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

  let mailResult = null;
  if (notifyAdmins) {
    try {
      const { data: mailData, error: fnErr } = await invokeEdgeFunction("notify-maintenance", {
        body: { message, startTime, endTime: data?.end_time ?? null, mode, affectedOrgIds: affectedOrgIds ?? null },
      });
      if (!fnErr) mailResult = mailData;
    } catch (err) {
      console.warn("[maintenance] notify-maintenance invoke failed:", err?.message);
    }
  }

  return { ...data, mailResult };
}

/**
 * Super admin — send a test maintenance email to the currently authenticated user.
 * No DB state changes; useful for verifying email template + env vars.
 * @param {object} params - same fields passed to setMaintenance
 * @returns {{ ok: boolean, sent: number, test: boolean }}
 */
export async function sendTestMaintenanceEmail({ mode, startTime, message }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Could not determine your email address");

  const { data, error } = await invokeEdgeFunction("notify-maintenance", {
    body: {
      message,
      startTime: startTime ?? null,
      endTime: null,
      mode,
      affectedOrgIds: null,
      testRecipient: user.email,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Returns the total number of jurors currently scoring across all active periods.
 * Used by MaintenanceDrawer to warn when activating maintenance mid-session.
 * @returns {number}
 */
export async function getActiveJurorCount() {
  const nowIso = new Date().toISOString();
  const [withExpiryRes, noExpiryRes] = await Promise.all([
    supabase
      .from("juror_period_auth")
      .select("juror_id", { count: "exact", head: true })
      .not("session_token_hash", "is", null)
      .gt("session_expires_at", nowIso),
    supabase
      .from("juror_period_auth")
      .select("juror_id", { count: "exact", head: true })
      .not("session_token_hash", "is", null)
      .is("session_expires_at", null),
  ]);
  if (withExpiryRes.error) throw withExpiryRes.error;
  if (noExpiryRes.error) throw noExpiryRes.error;
  return (typeof withExpiryRes.count === "number" ? withExpiryRes.count : 0) +
         (typeof noExpiryRes.count === "number" ? noExpiryRes.count : 0);
}

/**
 * Super admin — immediately deactivate maintenance mode.
 */
export async function cancelMaintenance() {
  const { data, error } = await supabase.rpc("rpc_admin_cancel_maintenance");
  if (error) throw error;
  return data;
}
