// src/shared/api/admin/audit.js
// Admin audit log functions (PostgREST).

import { supabase } from "../core/client";

export async function writeAuditLog(action, { resourceType, resourceId, details } = {}) {
  const { error } = await supabase.rpc("rpc_admin_write_audit_log", {
    p_action: action,
    p_resource_type: resourceType || null,
    p_resource_id: resourceId || null,
    p_details: details || {},
  });
  if (error) throw error;
}

export async function listAuditLogs(filters = {}) {
  let query = supabase
    .from("audit_logs")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(filters.limit || 120);

  if (filters.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  }
  if (filters.actions?.length) {
    query = query.in("action", filters.actions);
  }
  if (filters.startAt) {
    query = query.gte("created_at", filters.startAt);
  }
  if (filters.endAt) {
    query = query.lte("created_at", filters.endAt);
  }
  if (filters.search) {
    query = query.ilike("action", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
