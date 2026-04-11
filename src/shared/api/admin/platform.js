// src/shared/api/admin/platform.js
// Platform-wide settings API — super admin only.
// Backs the GlobalSettingsDrawer on the Organizations page.

import { supabase } from "../core/client";

/**
 * Super admin — read platform settings for the drawer.
 * @returns {Promise<{
 *   platform_name: string,
 *   support_email: string,
 *   auto_approve_new_orgs: boolean,
 *   updated_at: string|null,
 *   updated_by: string|null
 * }>}
 */
export async function getPlatformSettings() {
  const { data, error } = await supabase.rpc("rpc_admin_get_platform_settings");
  if (error) throw error;
  return data;
}

/**
 * Super admin — persist platform settings.
 * @param {{
 *   platform_name: string,
 *   support_email: string,
 *   auto_approve_new_orgs: boolean
 * }} settings
 */
export async function setPlatformSettings({
  platform_name,
  support_email,
  auto_approve_new_orgs,
}) {
  const { data, error } = await supabase.rpc("rpc_admin_set_platform_settings", {
    p_platform_name: platform_name,
    p_support_email: support_email,
    p_auto_approve_new_orgs: auto_approve_new_orgs,
  });
  if (error) throw error;
  return data;
}
