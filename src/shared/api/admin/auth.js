// src/shared/api/admin/auth.js
// Admin authentication and application management (PostgREST).

import { supabase } from "../core/client";

/**
 * Returns current user's memberships with organization info.
 */
export async function getSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("memberships")
    .select("*, organization:organizations(id, name, short_name, status)")
    .eq("user_id", user.id);
  if (error) throw error;
  return data;
}

/**
 * Lists active organizations for public dropdown.
 */
export async function listOrganizationsPublic() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, short_name")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data || [];
}

/**
 * Submit a tenant admin application.
 */
export async function submitApplication(payload) {
  const { data, error } = await supabase
    .from("tenant_applications")
    .insert({
      organization_id: payload.organization_id || payload.organizationId || null,
      organization_name: payload.organization_name || payload.organizationName,
      contact_email: payload.contact_email || payload.email,
      applicant_name: payload.applicant_name || payload.name,
      message: payload.message || null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      const e = new Error("Application already pending");
      e.code = "application_already_pending";
      throw e;
    }
    throw error;
  }
  return data;
}

/**
 * Get current user's applications.
 */
export async function getMyApplications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const { data, error } = await supabase
    .from("tenant_applications")
    .select("*")
    .eq("contact_email", user.email)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Cancel a pending application.
 */
export async function cancelApplication(applicationId) {
  const { error } = await supabase
    .from("tenant_applications")
    .update({ status: "cancelled" })
    .eq("id", applicationId);
  if (error) throw error;
}

/**
 * Approve application via Edge Function (creates Supabase Auth user).
 */
export async function approveApplication(applicationId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";
  const { data, error } = await supabase.functions.invoke("approve-admin-application", {
    body: { application_id: applicationId },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw error;
  if (data?.error) {
    const e = new Error(data.error);
    e.code = data.code;
    throw e;
  }
  return data?.data ?? true;
}

/**
 * Reject application.
 */
export async function rejectApplication(applicationId) {
  const { error } = await supabase
    .from("tenant_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) throw error;
}

/**
 * List pending applications for an organization.
 */
export async function listPendingApplications(organizationId) {
  const { data, error } = await supabase
    .from("tenant_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
