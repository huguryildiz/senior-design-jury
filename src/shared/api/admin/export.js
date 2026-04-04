// src/shared/api/admin/export.js
// Admin data export (PostgREST).

import { supabase } from "../core/client";

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
