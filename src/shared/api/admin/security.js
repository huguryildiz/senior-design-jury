// src/shared/api/admin/security.js
// Security policy API — get and set platform-wide security settings.
// Super admin only.

import { supabase } from "../core/client";

/**
 * Super admin — read the current security policy for the admin drawer.
 * @returns {Promise<{
 *   googleOAuth: boolean,
 *   emailPassword: boolean,
 *   rememberMe: boolean,
 *   minPasswordLength: number,
 *   maxLoginAttempts: number,
 *   requireSpecialChars: boolean,
 *   tokenTtl: string,
 *   pinLockCooldown: string,
 *   allowMultiDevice: boolean,
 *   updated_at: string|null
 * }>}
 */
export async function getSecurityPolicy() {
  const { data, error } = await supabase.rpc("rpc_admin_get_security_policy");
  if (error) throw error;
  return data;
}

/**
 * Super admin — persist the security policy.
 * @param {{
 *   googleOAuth: boolean,
 *   emailPassword: boolean,
 *   rememberMe: boolean,
 *   minPasswordLength: number,
 *   maxLoginAttempts: number,
 *   requireSpecialChars: boolean,
 *   tokenTtl: string,
 *   pinLockCooldown: string,
 *   allowMultiDevice: boolean
 * }} policy
 */
export async function setSecurityPolicy(policy) {
  const { data, error } = await supabase.rpc("rpc_admin_set_security_policy", {
    p_policy: policy,
  });
  if (error) throw error;
  return data;
}
