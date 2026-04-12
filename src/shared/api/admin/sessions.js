import { supabase } from "../core/client";
import { invokeEdgeFunction } from "../core/invokeEdgeFunction";

function toIsoOrNull(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const text = String(value).trim();
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function touchAdminSession({
  deviceId,
  userAgent,
  browser,
  os,
  authMethod,
  signedInAt = null,
  expiresAt = null,
}) {
  const payload = {
    deviceId: String(deviceId || "").trim(),
    userAgent: String(userAgent || "").trim(),
    browser: String(browser || "").trim() || "Unknown",
    os: String(os || "").trim() || "Unknown",
    authMethod: String(authMethod || "").trim() || "Unknown",
    signedInAt: toIsoOrNull(signedInAt),
    expiresAt: toIsoOrNull(expiresAt),
  };

  try {
    const { data, error } = await invokeEdgeFunction("admin-session-touch", { body: payload });
    if (error) {
      console.error("admin-session-touch failed:", error.message);
      throw error;
    }
    if (data?.ok !== true) {
      throw new Error(data?.error || "Session touch failed.");
    }
    return data;
  } catch (err) {
    console.error("touchAdminSession invoke exception:", err);
    throw err;
  }
}

export async function listAdminSessions() {
  const { data, error } = await supabase
    .from("admin_user_sessions")
    .select("*")
    .order("last_activity_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteAdminSession(id) {
  const { data, error } = await supabase.rpc("rpc_admin_revoke_admin_session", {
    p_session_id: id,
  });
  if (error) throw error;
  if (data?.ok === false) {
    throw new Error(data.error_code || "session_revoke_failed");
  }
  return data;
}
