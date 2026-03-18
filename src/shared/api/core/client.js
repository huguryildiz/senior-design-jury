// src/shared/api/core/client.js
// ============================================================
// Supabase client access and admin RPC proxy configuration.
//
// Admin RPCs are routed through the rpc-proxy Edge Function in
// production so that the RPC secret never appears in the bundle.
// In dev, falls back to direct Supabase RPC with VITE_RPC_SECRET.
// ============================================================

export { supabase } from "../../../lib/supabaseClient";

export const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL ?? "";
export const RPC_PROXY_URL  = `${SUPABASE_URL}/functions/v1/rpc-proxy`;
export const USE_PROXY      = !import.meta.env.DEV;
export const DEV_RPC_SECRET = import.meta.env.DEV
  ? (import.meta.env.VITE_RPC_SECRET ?? "")
  : "";

if (import.meta.env.DEV && !import.meta.env.VITE_RPC_SECRET) {
  console.warn("[api] VITE_RPC_SECRET is not set — admin RPC calls will fail.");
}
