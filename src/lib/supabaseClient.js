import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Remove persisted Supabase session from localStorage.
 * Used when "Remember me" is unchecked — keeps session in memory only
 * so it expires when the browser is closed.
 */
export function clearPersistedSession() {
  try {
    const prefix = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    });
  } catch {
    // Storage unavailable or URL parsing failed — silently ignore
  }
}