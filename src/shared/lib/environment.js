// src/shared/lib/environment.js
// Runtime environment store.
// Determines whether the app talks to the production or demo Supabase instance.
//
// Resolution order:
//   1. URL param ?env=demo — explicit at entry (QR codes, landing page buttons)
//   2. sessionStorage['vera_env'] — persisted within current browser tab/session
//   3. Default → 'prod'

const ENV_KEY = "vera_env";
const JURY_ACCESS_KEY = "jury_access_period";

// Auto-clear stale demo environment at module load.
// Preserve it when: (a) URL has ?env=demo or ?explore, or (b) an active jury
// session exists (jury_access_period in sessionStorage — survives refresh).
if (typeof window !== "undefined") {
  const _p = new URLSearchParams(window.location.search);
  const hasEnvParam = _p.get("env") === "demo" || _p.has("explore");
  const hasActiveJury = !!sessionStorage.getItem(JURY_ACCESS_KEY);
  if (!hasEnvParam && !hasActiveJury) {
    sessionStorage.removeItem(ENV_KEY);
  }
}

/**
 * Resolve the active environment ('prod' | 'demo').
 * Called on every Supabase client access via the Proxy in supabaseClient.js,
 * so it must be fast and side-effect-free.
 */
export function resolveEnvironment() {
  if (typeof window === "undefined") return "prod";
  const params = new URLSearchParams(window.location.search);
  if (params.get("env") === "demo" || params.has("explore")) return "demo";
  const stored = sessionStorage.getItem(ENV_KEY);
  if (stored === "demo") return stored;
  return "prod";
}

/** Persist environment selection for the current browser session. */
export function setEnvironment(env) {
  sessionStorage.setItem(ENV_KEY, env);
}

/** Clear persisted environment (reverts to default 'prod' on next resolve). */
export function clearEnvironment() {
  sessionStorage.removeItem(ENV_KEY);
}

/** Convenience: true when the active environment is 'demo'. */
export function isDemoEnvironment() {
  return resolveEnvironment() === "demo";
}
