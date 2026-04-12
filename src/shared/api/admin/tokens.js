// src/shared/api/admin/tokens.js
// Admin entry token management (PostgREST).

import { supabase } from "../core/client";

function throwIfError(result) {
  if (result?.error) throw result.error;
  return result;
}

function toCount(result) {
  return typeof result?.count === "number" ? result.count : 0;
}

function isTokenUnexpired(ts) {
  if (!ts) return true;
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return true;
  return ms > Date.now();
}

function makeTokenPrefix(tokenRow) {
  const source = tokenRow?.token_plain || tokenRow?.token_hash || tokenRow?.id || "";
  return String(source).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || null;
}

function toAccessId(tokenRow) {
  const prefix = makeTokenPrefix(tokenRow);
  if (!prefix) return "—";
  if (prefix.length <= 4) return prefix;
  return `${prefix.slice(0, 4)}-${prefix.slice(4, 8)}`;
}

function getTokenStatus(tokenRow) {
  if (tokenRow?.is_revoked) return "revoked";
  if (!isTokenUnexpired(tokenRow?.expires_at)) return "expired";
  return "active";
}

function normalizeSessionCount(tokenRow, rawCount) {
  // Revoke operation also appears as an update event; do not count it as a session.
  if (tokenRow?.is_revoked) {
    return Math.max(rawCount - 1, 0);
  }
  return rawCount;
}

function latestTimestamp(...timestamps) {
  let latest = null;
  let latestMs = -Infinity;
  for (const ts of timestamps) {
    if (!ts) continue;
    const ms = Date.parse(ts);
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latest = ts;
      latestMs = ms;
    }
  }
  return latest;
}

async function countActiveSessions(periodId, nowIso) {
  const [activeWithExpiryRes, activeNoExpiryRes] = await Promise.all([
    supabase
      .from("juror_period_auth")
      .select("juror_id", { count: "exact", head: true })
      .eq("period_id", periodId)
      .not("session_token_hash", "is", null)
      .is("final_submitted_at", null)
      .gt("session_expires_at", nowIso),
    supabase
      .from("juror_period_auth")
      .select("juror_id", { count: "exact", head: true })
      .eq("period_id", periodId)
      .not("session_token_hash", "is", null)
      .is("final_submitted_at", null)
      .is("session_expires_at", null),
  ]);

  throwIfError(activeWithExpiryRes);
  throwIfError(activeNoExpiryRes);
  return toCount(activeWithExpiryRes) + toCount(activeNoExpiryRes);
}

export async function generateEntryToken(periodId) {
  const { data, error } = await supabase.rpc("rpc_admin_generate_entry_token", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data;
}

export async function revokeEntryToken(periodId) {
  // rpc_admin_revoke_entry_token performs UPDATE + audit write atomically.
  const { data, error } = await supabase.rpc("rpc_admin_revoke_entry_token", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return {
    success: true,
    active_juror_count: data?.active_juror_count ?? 0,
    revoked_count: data?.revoked_count ?? 0,
  };
}

export async function getEntryTokenStatus(periodId) {
  const latestTokenRes = await supabase
    .from("entry_tokens")
    .select("id, token_hash, token_plain, is_revoked, created_at, expires_at, last_used_at")
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(latestTokenRes);
  const activeToken = latestTokenRes.data;
  if (!activeToken) return null;

  const nowIso = new Date().toISOString();
  const [
    activeSessionCount,
    totalSessionsRes,
    expiredSessionsRes,
    revokedCountRes,
    lastSeenRes,
    lastUsedRes,
  ] = await Promise.all([
    countActiveSessions(periodId, nowIso),
    supabase
      .from("juror_period_auth")
      .select("juror_id", { count: "exact", head: true })
      .eq("period_id", periodId)
      .not("session_token_hash", "is", null)
      .is("final_submitted_at", null),
    supabase
      .from("juror_period_auth")
      .select("juror_id", { count: "exact", head: true })
      .eq("period_id", periodId)
      .not("session_token_hash", "is", null)
      .is("final_submitted_at", null)
      .not("session_expires_at", "is", null)
      .lte("session_expires_at", nowIso),
    supabase
      .from("entry_tokens")
      .select("id", { count: "exact", head: true })
      .eq("period_id", periodId)
      .eq("is_revoked", true),
    supabase
      .from("juror_period_auth")
      .select("last_seen_at")
      .eq("period_id", periodId)
      .not("last_seen_at", "is", null)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("entry_tokens")
      .select("last_used_at")
      .eq("period_id", periodId)
      .not("last_used_at", "is", null)
      .order("last_used_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  throwIfError(totalSessionsRes);
  throwIfError(expiredSessionsRes);
  throwIfError(revokedCountRes);
  throwIfError(lastSeenRes);
  throwIfError(lastUsedRes);

  const totalSessions = toCount(totalSessionsRes);
  const expiredSessionCount = toCount(expiredSessionsRes);
  const revokedCount = toCount(revokedCountRes);
  const lastActivity = latestTimestamp(lastSeenRes.data?.last_seen_at, lastUsedRes.data?.last_used_at);

  return {
    has_token: true,
    enabled: !activeToken.is_revoked && isTokenUnexpired(activeToken.expires_at),
    created_at: activeToken.created_at,
    expires_at: activeToken.expires_at,
    token_prefix: makeTokenPrefix(activeToken),
    active_session_count: activeSessionCount,
    active_juror_count: activeSessionCount,
    expired_session_count: expiredSessionCount,
    total_sessions: totalSessions,
    total_entries: totalSessions,
    revoked_count: revokedCount,
    last_activity: lastActivity,
  };
}

export async function getEntryTokenHistory(periodId, { limit = 25 } = {}) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Number(limit))) : 25;
  const tokensRes = await supabase
    .from("entry_tokens")
    .select("id, token_hash, token_plain, is_revoked, created_at, expires_at, last_used_at")
    .eq("period_id", periodId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  throwIfError(tokensRes);
  const tokens = tokensRes.data || [];
  if (!tokens.length) return [];

  const tokenIds = tokens.map((token) => token.id).filter(Boolean);
  const updateCounts = new Map();

  if (tokenIds.length) {
    const updatesRes = await supabase
      .from("audit_logs")
      .select("resource_id")
      .eq("resource_type", "entry_tokens")
      .eq("action", "entry_tokens.update")
      .in("resource_id", tokenIds);

    throwIfError(updatesRes);
    for (const row of updatesRes.data || []) {
      const key = row?.resource_id;
      if (!key) continue;
      updateCounts.set(key, (updateCounts.get(key) || 0) + 1);
    }
  }

  return tokens.map((token) => {
    const rawCount = updateCounts.get(token.id) || 0;
    const status = getTokenStatus(token);
    return {
      id: token.id,
      access_id: toAccessId(token),
      created_at: token.created_at,
      expires_at: token.expires_at,
      last_used_at: token.last_used_at,
      session_count: normalizeSessionCount(token, rawCount),
      status,
      is_active: status === "active",
      is_revoked: status === "revoked",
      is_expired: status === "expired",
    };
  });
}

export async function getActiveEntryToken(periodId) {
  const { data, error } = await supabase
    .from("entry_tokens")
    .select("id, expires_at")
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return isTokenUnexpired(data.expires_at);
}

/** Returns the plain entry token for a period (admin only), or null if none active. */
export async function getActiveEntryTokenPlain(periodId) {
  const { data, error } = await supabase
    .from("entry_tokens")
    .select("token_plain, expires_at")
    .eq("period_id", periodId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!isTokenUnexpired(data?.expires_at)) return null;
  return data?.token_plain || null;
}
