// src/shared/lib/environment.js
// Runtime environment store.
// Determines whether the app talks to the production or demo Supabase instance.
//
// Resolution: pathname starting with /demo → demo, everything else → prod.
// No query params, no sessionStorage — environment is fully determined by URL path.

/**
 * Resolve the active environment ('prod' | 'demo').
 * Called on every Supabase client access via the Proxy in supabaseClient.js.
 */
export function resolveEnvironment() {
  if (typeof window === "undefined") return "prod";
  if (window.location.pathname.startsWith("/demo")) return "demo";
  return "prod";
}

/** Convenience: true when the active environment is 'demo'. */
export function isDemoEnvironment() {
  return resolveEnvironment() === "demo";
}
