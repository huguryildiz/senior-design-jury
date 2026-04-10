// supabase/functions/_shared/super-admin-cc.ts
// ============================================================
// Shared helpers for Edge Functions that want to CC the super
// admin on outgoing notification emails.
//
// Two exports:
//   getSuperAdminEmails(service) — returns all super admin emails
//   shouldCcOn(service, field)   — reads security_policy.policy->>field
//
// Both functions defensively default to "CC on" on any error
// (missing service client, DB read failure) because missing a
// notification is worse than sending an extra CC.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getSuperAdminEmails(
  service: SupabaseClient,
): Promise<string[]> {
  try {
    const { data: members } = await service
      .from("memberships")
      .select("user_id")
      .is("organization_id", null)
      .eq("role", "super_admin");

    if (!members || members.length === 0) return [];

    const emails = await Promise.all(
      members.map(async (m: { user_id: string }) => {
        try {
          const { data } = await service.auth.admin.getUserById(m.user_id);
          return data?.user?.email || "";
        } catch {
          return "";
        }
      }),
    );

    return emails.filter(Boolean);
  } catch {
    return [];
  }
}

export async function shouldCcOn(
  service: SupabaseClient,
  field: string,
): Promise<boolean> {
  try {
    const { data } = await service
      .from("security_policy")
      .select("policy")
      .eq("id", 1)
      .single();
    const value = data?.policy?.[field];
    // Default to true (notify) if the field is missing or unreadable.
    return value !== false;
  } catch {
    return true;
  }
}
