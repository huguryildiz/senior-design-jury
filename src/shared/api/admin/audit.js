// src/shared/api/admin/audit.js
// Admin audit log functions (PostgREST).

import { supabase } from "../core/client";

/**
 * Blocking client-side audit write via rpc_admin_write_audit_event.
 * Currently unused — all audit paths use DB triggers, SECURITY DEFINER RPCs,
 * or Edge Functions. Kept as infrastructure for future client-side audit needs.
 */
export async function writeAuditLog(action, { resourceType, resourceId, details, organizationId, diff } = {}) {
  const { error } = await supabase.rpc("rpc_admin_write_audit_event", {
    p_event: {
      action,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      details: details || {},
      organizationId: organizationId || null,
      diff: diff || null,
    },
  });
  if (error) throw error;
}

/**
 * Log a failed admin login attempt. Callable without an active session
 * (anon role) since auth failures have no auth.uid().
 * Severity escalates automatically server-side based on recent failure count.
 */
export async function writeAuthFailureEvent(email, method = "password") {
  const { error } = await supabase.rpc("rpc_write_auth_failure_event", {
    p_email: email,
    p_method: method,
  });
  // Never surface audit write failures to the caller — don't block the login UI.
  if (error) console.warn("Auth failure audit write failed:", error?.message);
}

function applyAuditFilters(query, filters) {
  if (filters.organizationId) {
    if (filters.includeNullOrg) {
      query = query.or(
        `organization_id.eq.${filters.organizationId},` +
        `and(organization_id.is.null,category.eq.auth),` +
        `and(organization_id.is.null,category.eq.security)`
      );
    } else {
      query = query.eq("organization_id", filters.organizationId);
    }
  }
  if (filters.actions?.length) {
    query = query.in("action", filters.actions);
  }
  if (filters.categories?.length) {
    query = query.in("category", filters.categories);
  }
  if (filters.severities?.length) {
    query = query.in("severity", filters.severities);
  }
  if (filters.actorTypes?.length) {
    query = query.in("actor_type", filters.actorTypes);
  }
  if (filters.startAt) {
    query = query.gte("created_at", filters.startAt);
  }
  if (filters.endAt) {
    query = query.lte("created_at", filters.endAt);
  }
  if (filters.search) {
    const s = filters.search.replace(/[%,()]/g, "");
    const term = `%${s}%`;
    query = query.or(
      [
        `action.ilike.${term}`,
        `resource_type.ilike.${term}`,
        `actor_name.ilike.${term}`,
        `details->>applicant_email.ilike.${term}`,
        `details->>applicant_name.ilike.${term}`,
        `details->>actor_name.ilike.${term}`,
        `details->>juror_name.ilike.${term}`,
      ].join(",")
    );
  }
  return query;
}

export async function verifyAuditChain(orgId) {
  const { data, error } = await supabase.rpc("rpc_admin_verify_audit_chain", {
    p_org_id: orgId || null,
  });
  if (error) throw error;
  return data;
}

export async function listAuditLogs(filters = {}) {
  let query = supabase
    .from("audit_logs")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(filters.limit || 120);

  query = applyAuditFilters(query, filters);

  // Cursor-based keyset pagination: fetch rows older than the last seen row
  if (filters.beforeAt) {
    if (filters.beforeId) {
      query = query.or(
        `created_at.lt.${filters.beforeAt},and(created_at.eq.${filters.beforeAt},id.lt.${filters.beforeId})`
      );
    } else {
      query = query.lt("created_at", filters.beforeAt);
    }
  }

  // Run data + count queries in parallel; count excludes cursor so it reflects
  // the full filtered result set, not just the current page.
  let countQuery = supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true });
  countQuery = applyAuditFilters(countQuery, filters);

  const [{ data, error }, { count, error: countError }] = await Promise.all([query, countQuery]);
  if (error) throw error;
  if (countError) console.warn("Audit count query failed:", countError?.message);
  return { data: data || [], totalCount: count ?? null };
}
