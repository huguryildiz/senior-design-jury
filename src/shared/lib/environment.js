// src/shared/lib/environment.js
// Runtime environment store.
// Determines whether the app talks to the production or demo Supabase instance.
//
// Resolution order:
//   1. URL params (?explore, ?demo-jury) — explicit user intent, highest priority
//   2. sessionStorage['vera_env'] — persisted within current browser session
//   3. Default → 'prod'

const ENV_KEY = "vera_env";

// Auto-clear stale demo environment at module load if no demo URL params are
// present. This must run before demoMode.js evaluates DEMO_MODE so that
// DEMO_MODE is not incorrectly set to true on the landing page after returning
// from a previous demo session (which left vera_env='demo' in sessionStorage).
// Demo pages always have ?explore or ?demo-jury in the URL, so clearing is safe.
if (typeof window !== "undefined") {
  const _p = new URLSearchParams(window.location.search);
  if (!_p.has("explore") && !_p.has("demo-jury")) {
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
  if (params.has("explore") || params.has("demo-jury")) return "demo";
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
