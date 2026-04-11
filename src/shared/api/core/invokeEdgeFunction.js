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

/**
 * @param {string} name - Edge Function name (e.g. "notify-maintenance")
 * @param {{ body?: object, headers?: Record<string,string> }} [options]
 * @returns {Promise<{ data: any, error: Error | null }>}
 */
export async function invokeEdgeFunction(name, { body, headers: extraHeaders = {} } = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  // supabase.supabaseUrl and supabase.supabaseKey go through the Proxy
  // get-trap which returns the active client's property directly.
  const url = `${supabase.supabaseUrl}/functions/v1/${name}`;
  const anonKey = supabase.supabaseKey;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
