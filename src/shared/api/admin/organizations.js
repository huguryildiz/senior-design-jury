// src/shared/api/admin/organizations.js
// ============================================================
// Admin organization management (PostgREST).
// ============================================================

import { supabase } from "../core/client";

function mapAdmins(memberships) {
  if (!Array.isArray(memberships)) return [];
  return memberships
    .map((m) => ({
      userId: m.user_id,
      name: m.profiles?.display_name || m.profiles?.email || "Unknown",
      email: m.profiles?.email || "",
      role: m.role,
      status: "approved",
      updatedAt: m.created_at || "",
    }))
    .filter((e) => e.userId);
}

function mapPending(applications) {
  if (!Array.isArray(applications)) return [];
  return applications
    .filter((a) => a.status === "pending")
    .map((a) => ({
      applicationId: a.id,
      name: a.applicant_name || a.contact_email || "Unknown",
      email: a.contact_email || "",
      status: "pending",
      createdAt: a.created_at || "",
    }));
}

export async function listOrganizations() {
  // Use SECURITY DEFINER RPC to bypass RLS on joined tables.
  // Direct PostgREST embedding (memberships + org_applications) 403s because
  // the org_applications RLS policy previously accessed auth.users directly
  // (authenticated role has no SELECT on that table).
  const { data, error } = await supabase.rpc("rpc_admin_list_organizations");
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    shortLabel: row.code,
    tenantAdmins: mapAdmins(row.memberships),
    pendingApplications: mapPending(row.org_applications),
  }));
}

export async function createOrganization(payload) {
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: payload.name,
      code: payload.code || payload.shortLabel || null,
      contact_email: payload.contact_email || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrganization(payload) {
  const id = payload.organizationId || payload.id;
  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.code !== undefined) updates.code = payload.code;
  if (payload.shortLabel !== undefined) updates.code = payload.shortLabel;
  if (payload.contact_email !== undefined) updates.contact_email = payload.contact_email;
  if (payload.status !== undefined) updates.status = payload.status;

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listOrganizationsPublic() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, code")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function updateMemberAdmin(payload) {
  if (payload.displayName !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: payload.displayName })
      .eq("id", payload.userId);
    if (error) throw error;
  }
  return true;
}

export async function deleteMemberHard(userId) {
  // Delete membership
  const { error: memErr } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", userId);
  if (memErr) throw memErr;

  // Delete profile
  const { error: profErr } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profErr) throw profErr;

  return true;
}
