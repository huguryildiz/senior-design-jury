// src/shared/api/core/invokeEdgeFunction.js
// ──────────────────────────────────────────────────────────────
// Raw-fetch wrapper for Supabase Edge Functions.
//
// supabase.functions.invoke() through the Proxy client does not
// reliably attach the user JWT — the Authorization header arrives
// absent at the function (confirmed in organizations.js). This
// helper uses raw fetch with explicit headers so the token always
// reaches the Edge Function, regardless of Proxy or supabase-js
// auth-state timing.
//
// Usage:
//   import { invokeEdgeFunction } from "@/shared/api/core/invokeEdgeFunction";
//   const { data, error } = await invokeEdgeFunction("my-function", { body: { ... } });
// ──────────────────────────────────────────────────────────────

import { supabase } from "./client";

async function getValidSession() {
  const { data: { session } } = await supabase.auth.getSession();
  let activeSession = session || null;

  // getSession() may return a cached token that is already expired.
  if (activeSession?.expires_at && Date.now() / 1000 > activeSession.expires_at - 30) {
    const { data } = await supabase.auth.refreshSession();
    activeSession = data?.session || null;
  }

  return activeSession;
}

/**
 * @param {string} name - Edge Function name (e.g. "notify-maintenance")
 * @param {{ body?: object, headers?: Record<string,string> }} [options]
 * @returns {Promise<{ data: any, error: Error | null }>}
 */
export async function invokeEdgeFunction(name, { body, headers: extraHeaders = {} } = {}) {
  let session = await getValidSession();

  // supabase.supabaseUrl and supabase.supabaseKey go through the Proxy
  // get-trap which returns the active client's property directly.
  const url = `${supabase.supabaseUrl}/functions/v1/${name}`;
  const anonKey = supabase.supabaseKey;

  const requestBody = body !== undefined ? JSON.stringify(body) : undefined;
  const buildHeaders = () => ({
    "Content-Type": "application/json",
    apikey: anonKey,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...extraHeaders,
  });

  let res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: requestBody,
  });

  // If token is stale and the gateway rejects it, refresh once and retry.
  if (res.status === 401) {
    const { data } = await supabase.auth.refreshSession();
    session = data?.session || null;
    res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: requestBody,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    return { data: null, error: new Error(text) };
  }

  try {
    const data = await res.json();
    return { data, error: null };
  } catch {
    return { data: null, error: new Error("Invalid JSON response from Edge Function") };
  }
}
