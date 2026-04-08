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
    .select("*, organization:organizations(id, name, code, status, subtitle)")
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
    .select("id, name, code, subtitle")
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
    .from("org_applications")
    .insert({
      organization_id: payload.organization_id || payload.organizationId || null,
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

  // Fire-and-forget: notify tenant admins + CC super admins
  notifyApplication({
    type: "application_submitted",
    applicationId: data.id,
    recipientEmail: "",          // Edge Function resolves recipients from DB
    applicantName: data.applicant_name,
    applicantEmail: data.contact_email,
    organizationId: data.organization_id,
    organizationName: payload.tenant_name || payload.organizationName || "",
  });

  return data;
}

/**
 * Get current user's applications.
 */
export async function getMyApplications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const { data, error } = await supabase
    .from("org_applications")
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
    .from("org_applications")
    .update({ status: "cancelled" })
    .eq("id", applicationId);
  if (error) throw error;
}

/**
 * Approve application via RPC (marks status approved; auth user already exists via signUp).
 */
export async function approveApplication(applicationId) {
  const { data, error } = await supabase.rpc("rpc_admin_approve_application", {
    p_application_id: applicationId,
  });
  if (error) throw error;
  if (data?.ok === false) {
    const e = new Error(data.error_code || "Could not approve application.");
    e.code = data.error_code;
    throw e;
  }
  return data;
}

/**
 * Reject application.
 */
export async function rejectApplication(applicationId) {
  const { error } = await supabase
    .from("org_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) throw error;
}

/**
 * List pending applications for an organization.
 */
export async function listPendingApplications(organizationId) {
  const { data, error } = await supabase
    .from("org_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Fire-and-forget email notification for application status changes.
 * Calls the notify-application Edge Function. Never throws.
 *
 * @param {{ type: "application_submitted"|"application_approved"|"application_rejected",
 *            applicationId: string, recipientEmail: string,
 *            applicantName?: string, organizationId?: string, organizationName?: string }} payload
 */
export async function notifyApplication({ type, applicationId, recipientEmail, applicantName, organizationId, organizationName }) {
  try {
    await supabase.functions.invoke("notify-application", {
      body: {
        type,
        application_id: applicationId,
        recipient_email: recipientEmail,
        tenant_id: organizationId || "",
        applicant_name: applicantName || "",
        applicant_email: recipientEmail,
        tenant_name: organizationName || "",
      },
    });
  } catch (e) {
    console.warn("notify-application failed (non-blocking):", e?.message);
  }
}
