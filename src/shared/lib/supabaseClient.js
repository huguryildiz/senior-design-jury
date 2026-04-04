// src/shared/lib/supabaseClient.js
// Proxy-based Supabase client factory.
// Creates separate clients for prod and demo environments.
// The exported `supabase` is a Proxy that transparently delegates
// every property access / method call to the active environment's client.
// All existing consumers (`supabase.rpc(...)`, `supabase.from(...)`, etc.)
// work unchanged — the Proxy routes to the correct backend at runtime.

import { createClient } from "@supabase/supabase-js";
import { resolveEnvironment } from "./environment";

const CONFIGS = {
  prod: {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  demo: {
    url: import.meta.env.VITE_DEMO_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
};

/** @type {Record<string, import('@supabase/supabase-js').SupabaseClient>} */
const clients = {};

function getClient() {
  const env = resolveEnvironment();
  if (!clients[env]) {
    const cfg = CONFIGS[env];
    clients[env] = createClient(cfg.url, cfg.key);
  }
  return clients[env];
}

export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const target = getClient();
      const value = target[prop];
      if (typeof value === "function") return value.bind(target);
      return value;
    },
  },
);

/**
 * Remove persisted Supabase session from localStorage.
 * Used when "Remember me" is unchecked — keeps session in memory only
 * so it expires when the browser is closed.
 */
export function clearPersistedSession() {
  try {
    const env = resolveEnvironment();
    const url = CONFIGS[env].url;
    const prefix = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    });
  } catch {
    // Storage unavailable or URL parsing failed — silently ignore
  }
}
