// src/shared/api/admin/organizations.js
// ============================================================
// Admin organization management (PostgREST).
// ============================================================

import { supabase } from "../core/client";

function mapAdmins(memberships) {
  if (!Array.isArray(memberships)) return [];
  return memberships
    .map((m) => ({
      membershipId: m.id,
      userId: m.user_id,
      name: m.profiles?.display_name || m.profiles?.email || "Unknown",
      email: m.profiles?.email || "",
      role: m.role,
      status: m.status || "active",
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
  const institution =
    payload.institution ??
    payload.subtitle ??
    ([payload.university, payload.department].filter(Boolean).join(" · ") ||
      null);
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: payload.name,
      code: payload.code || payload.shortLabel || null,
      institution,
      contact_email: payload.contact_email || null,
      status: payload.status || "active",
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
  const resolvedCode = payload.code !== undefined ? payload.code : payload.shortLabel;
  if (resolvedCode !== undefined) updates.code = resolvedCode;
  if (payload.institution !== undefined) updates.institution = payload.institution;
  else if (payload.subtitle !== undefined) updates.institution = payload.subtitle;
  if (payload.university !== undefined || payload.department !== undefined) {
    const uni = String(payload.university || "").trim();
    const dept = String(payload.department || "").trim();
    updates.institution = [uni, dept].filter(Boolean).join(" · ") || null;
  }
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
  const userId = payload?.userId || payload?.id;
  if (!userId) throw new Error("userId is required");

  const displayName =
    payload.displayName !== undefined
      ? payload.displayName
      : payload.name;
  if (displayName !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: String(displayName || "").trim() || null })
      .eq("id", userId);
    if (error) throw error;
  }
  return true;
}

// ── Invite API (Supabase-native flow) ─────────────────────────

/**
 * Invite an admin to an org via Supabase Auth.
 * Calls the invite-org-admin Edge Function.
 * Returns { status: 'invited' | 'reinvited' | 'added', user_id, email? }.
 */
export async function inviteOrgAdmin(orgId, email, approvalFlow = false) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  // Use raw fetch so the Authorization header is guaranteed to reach the
  // Edge Function. supabase.functions.invoke() through the Proxy was not
  // reliably attaching the user JWT — the header arrived absent at the function.
  const supabaseUrl = supabase.supabaseUrl; // Proxy → active env client URL
  const anonKey = supabase.supabaseKey;    // required by Supabase API gateway (Kong)
  const res = await fetch(`${supabaseUrl}/functions/v1/invite-org-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ org_id: orgId, email, approval_flow: approvalFlow }),
  });

  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Cancel an invited membership (removes the 'invited' membership row).
 */
export async function cancelOrgAdminInvite(membershipId) {
  const { data, error } = await supabase.rpc("rpc_org_admin_cancel_invite", {
    p_membership_id: membershipId,
  });
  if (error) throw error;
  return data;
}

export async function deleteMemberHard(payload) {
  const userId = typeof payload === "string" ? payload : payload?.userId;
  const organizationId = typeof payload === "object" ? payload?.organizationId : null;
  if (!userId) throw new Error("userId is required");
  if (!organizationId) throw new Error("organizationId is required");

  // Remove only the membership for this specific organization.
  // The Supabase Auth user and profile are intentionally kept intact —
  // the user may belong to other organizations or re-join later.
  const { error: memErr } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", organizationId);
  if (memErr) throw memErr;

  return true;
}
