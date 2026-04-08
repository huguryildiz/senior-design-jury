// src/shared/api/admin/jurors.js
// ============================================================
// Admin juror management (PostgREST).
// ============================================================

import { supabase } from "../core/client";

export async function createJuror(payload) {
  // Insert juror
  const { data: juror, error: jurorErr } = await supabase
    .from("jurors")
    .insert({
      organization_id: payload.organizationId || payload.organization_id,
      juror_name: payload.juror_name,
      affiliation: payload.affiliation,
      email: payload.email || null,
      notes: payload.notes || null,
    })
    .select()
    .single();
  if (jurorErr) throw jurorErr;

  // If periodId provided, assign juror to period
  if (payload.periodId || payload.period_id) {
    const { error: authErr } = await supabase
      .from("juror_period_auth")
      .insert({
        juror_id: juror.id,
        period_id: payload.periodId || payload.period_id,
      });
    if (authErr) throw authErr;
  }

  return juror;
}

export async function updateJuror({ id, jurorId, juror_name, affiliation, email, notes }) {
  const resolvedId = id || jurorId;
  if (!resolvedId) throw new Error("updateJuror: id required");
  const updates = {};
  if (juror_name !== undefined) updates.juror_name = juror_name;
  if (affiliation !== undefined) updates.affiliation = affiliation;
  if (email !== undefined) updates.email = email;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("jurors")
    .update(updates)
    .eq("id", resolvedId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJuror(id) {
  const { error } = await supabase.from("jurors").delete().eq("id", id);
  if (error) throw error;
}

export async function resetJurorPin({ jurorId, periodId }) {
  if (!jurorId || !periodId) throw new Error("resetJurorPin: jurorId and periodId required");
  const { data, error } = await supabase.rpc("rpc_juror_reset_pin", {
    p_period_id: periodId,
    p_juror_id: jurorId,
  });
  if (error) throw error;
  return data;
}

export async function setJurorEditMode({ jurorId, periodId, enabled, reason, durationMinutes }) {
  if (!jurorId || !periodId) throw new Error("setJurorEditMode: jurorId and periodId required");
  const safeDuration = Number.isFinite(Number(durationMinutes))
    ? Math.trunc(Number(durationMinutes))
    : 30;
  const { data, error } = await supabase.rpc("rpc_juror_toggle_edit_mode_v2", {
    p_period_id: periodId,
    p_juror_id: jurorId,
    p_enabled: !!enabled,
    p_reason: enabled ? (reason || null) : null,
    p_duration_minutes: enabled ? safeDuration : null,
  });
  if (error) throw error;
  if (data?.error_code) throw new Error(data.error_code);
  return data;
}

export async function forceCloseJurorEditMode({ jurorId, periodId }) {
  if (!jurorId || !periodId) throw new Error("forceCloseJurorEditMode: jurorId and periodId required");
  const { error } = await supabase
    .from("juror_period_auth")
    .update({ edit_enabled: false, session_token_hash: null })
    .match({ juror_id: jurorId, period_id: periodId });
  if (error) throw error;
}

export async function listLockedJurors({ periodId }) {
  if (!periodId) throw new Error("listLockedJurors: periodId required");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("juror_period_auth")
    .select("juror_id, is_blocked, failed_attempts, locked_until, locked_at, jurors(juror_name, affiliation)")
    .eq("period_id", periodId)
    .or(`locked_until.gt.${now},is_blocked.eq.true`);
  if (error) throw error;
  return (data || []).map((row) => ({
    jurorId: row.juror_id,
    jurorName: row.jurors?.juror_name || "",
    affiliation: row.jurors?.affiliation || "",
    isBlocked: row.is_blocked,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
    lockedAt: row.locked_at,
  }));
}

export async function countTodayLockEvents({ periodId }) {
  if (!periodId) throw new Error("countTodayLockEvents: periodId required");

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { count, error } = await supabase
    .from("juror_period_auth")
    .select("juror_id", { count: "exact", head: true })
    .eq("period_id", periodId)
    .gte("locked_at", dayStart.toISOString())
    .lt("locked_at", dayEnd.toISOString());

  if (error) throw error;
  return count || 0;
}

export async function unlockJurorPin({ jurorId, periodId }) {
  if (!jurorId || !periodId) throw new Error("unlockJurorPin: jurorId and periodId required");
  const { data, error } = await supabase.rpc("rpc_juror_unlock_pin", {
    p_period_id: periodId,
    p_juror_id: jurorId,
  });
  if (error) throw error;
  if (data?.error_code) throw new Error(data.error_code);
  return data;
}
