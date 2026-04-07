// src/shared/api/admin/tokens.js
// Admin entry token management (PostgREST).

import { supabase } from "../core/client";

export async function generateEntryToken(periodId) {
  const { data, error } = await supabase.rpc("rpc_admin_generate_entry_token", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data;
}

export async function revokeEntryToken(periodId) {
  const { data, error } = await supabase
    .from("entry_tokens")
    .update({ is_revoked: true })
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .select();
  if (error) throw error;

  // Count active jurors for this period
  const { count } = await supabase
    .from("juror_period_auth")
    .select("juror_id", { count: "exact", head: true })
    .eq("period_id", periodId)
    .not("session_token_hash", "is", null);

  return { success: true, active_juror_count: count || 0 };
}

export async function getEntryTokenStatus(periodId) {
  const { data, error } = await supabase
    .from("entry_tokens")
    .select("*")
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    has_token: true,
    enabled: !data.is_revoked,
    created_at: data.created_at,
    expires_at: data.expires_at,
  };
}

export async function getActiveEntryToken(periodId) {
  const { data, error } = await supabase
    .from("entry_tokens")
    .select("id")
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Returns the plain entry token for a period (admin only), or null if none active. */
export async function getActiveEntryTokenPlain(periodId) {
  const { data, error } = await supabase
    .from("entry_tokens")
    .select("token_plain")
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.token_plain || null;
}
