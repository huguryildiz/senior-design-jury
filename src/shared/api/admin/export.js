// src/shared/api/admin/export.js
// Admin data export (PostgREST).
//
// Audit: every export call site must call logExportInitiated BEFORE the
// file generation runs. The write is blocking; if it fails the export
// should abort so there is no "user got a file but we can't prove it"
// window. `export.*` events are the best guarantee we can give for
// client-side file generation without moving exports into an Edge Function.

import { supabase } from "../core/client";
import { invokeEdgeFunction } from "../core/invokeEdgeFunction";

/**
 * Blocking, pre-operation audit write for an export.
 * Routes through the log-export-event Edge Function so the server captures
 * IP + user-agent and future backend-triggered exports are also covered.
 * Throws if the write fails — callers should catch and abort the export.
 */
export async function logExportInitiated({
  action,
  organizationId = null,
  resourceType = null,
  resourceId = null,
  details = {},
}) {
  if (!action || !String(action).startsWith("export.")) {
    throw new Error("logExportInitiated: action must start with 'export.'");
  }
  const { data, error } = await invokeEdgeFunction("log-export-event", {
    body: { action, organizationId, resourceType, resourceId, details },
  });
  if (error) throw error;
  if (data?.error) throw new Error(`logExportInitiated: ${data.error}`);
}

export async function fullExport(organizationId) {
  const [periodsRes, jurorsRes, auditRes] = await Promise.all([
    supabase.from("periods").select("*").eq("organization_id", organizationId),
    supabase.from("jurors").select("*").eq("organization_id", organizationId),
    supabase.from("audit_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
  ]);

  if (periodsRes.error) throw periodsRes.error;
  if (jurorsRes.error) throw jurorsRes.error;

  const periodIds = (periodsRes.data || []).map((p) => p.id);

  let projects = [];
  let scores = [];
  if (periodIds.length > 0) {
    const [projRes, sheetRes] = await Promise.all([
      supabase.from("projects").select("*").in("period_id", periodIds),
      supabase.from("score_sheets").select(`
        id, juror_id, project_id, period_id, comment, status, created_at, updated_at,
        items:score_sheet_items(score_value, period_criteria(key))
      `).in("period_id", periodIds),
    ]);
    if (projRes.error) throw projRes.error;
    if (sheetRes.error) throw sheetRes.error;
    projects = projRes.data || [];
    scores = (sheetRes.data || []).map((s) => {
      const row = { id: s.id, juror_id: s.juror_id, project_id: s.project_id, period_id: s.period_id, comment: s.comment, status: s.status, created_at: s.created_at, updated_at: s.updated_at };
      (s.items || []).forEach((item) => {
        const key = item.period_criteria?.key;
        if (key) row[key] = item.score_value != null ? Number(item.score_value) : null;
      });
      return row;
    });
  }

  return {
    periods: periodsRes.data || [],
    projects,
    jurors: jurorsRes.data || [],
    scores,
    audit_logs: auditRes.data || [],
  };
}
