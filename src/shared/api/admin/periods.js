// src/shared/api/admin/periods.js
// ============================================================
// Admin evaluation period management.
//
// As of migration 050, all mutating operations go through SECURITY DEFINER
// RPCs that write the audit_logs row in the same transaction as the DB
// change. No client-side fire-and-forget audit writes remain here.
// ============================================================

import { supabase } from "../core/client";

export async function listPeriods(organizationId) {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setCurrentPeriod(periodId, _organizationId) {
  // Unset-others + set-target + audit are atomic inside rpc_admin_set_current_period.
  const { data, error } = await supabase.rpc("rpc_admin_set_current_period", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data;
}

export async function createPeriod(payload) {
  const { data, error } = await supabase
    .from("periods")
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      season: payload.season || null,
      description: payload.description || null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      is_locked: payload.is_locked ?? false,
      is_visible: payload.is_visible ?? true,
      framework_id: payload.framework_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePeriod({ id, name, season, description, start_date, end_date, is_locked, is_visible, framework_id }) {
  if (!id) throw new Error("updatePeriod: id required");
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (season !== undefined) updates.season = season;
  if (description !== undefined) updates.description = description;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (is_locked !== undefined) updates.is_locked = is_locked;
  if (is_visible !== undefined) updates.is_visible = is_visible;
  if (framework_id !== undefined) updates.framework_id = framework_id;

  const { data, error } = await supabase
    .from("periods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPeriodCounts(periodId) {
  const [
    { count: projectCount, error: e1 },
    { count: jurorCount, error: e2 },
    { count: scoreCount, error: e3 },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("period_id", periodId),
    supabase.from("juror_period_auth").select("*", { count: "exact", head: true }).eq("period_id", periodId),
    supabase.from("score_sheets").select("*", { count: "exact", head: true }).eq("period_id", periodId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  return { project_count: projectCount || 0, juror_count: jurorCount || 0, score_count: scoreCount || 0 };
}

export async function deletePeriod(id) {
  const { error } = await supabase.from("periods").delete().eq("id", id);
  if (error) throw error;
}

export async function setEvalLock(periodId, enabled) {
  // Period update + audit event are atomic inside rpc_admin_set_period_lock.
  const { error } = await supabase.rpc("rpc_admin_set_period_lock", {
    p_period_id: periodId,
    p_locked: !!enabled,
  });
  if (error) throw error;
}

/** @deprecated — does nothing useful; `criteria_config` column does not exist on periods. Use savePeriodCriteria instead. */
export async function updatePeriodCriteriaConfig(/* id, config */) {
  // no-op — kept for backward compat imports
}

/** @deprecated — does nothing useful; `outcome_config` column does not exist on periods. Use savePeriodCriteria instead. */
export async function updatePeriodOutcomeConfig(/* id, config */) {
  // no-op — kept for backward compat imports
}

/**
 * Save criteria to the period_criteria snapshot table via the SECURITY DEFINER
 * RPC. The RPC handles delete-maps / delete-criteria / insert-criteria /
 * rebuild-outcome-maps / audit-write in a single transaction.
 *
 * @param {string} periodId
 * @param {Array} criteria — array from criterionToConfig():
 *   { key, label, shortLabel, color, max, blurb, outcomes: string[], rubric: [] }
 * @returns {Array} inserted DB rows
 */
export async function savePeriodCriteria(periodId, criteria) {
  if (!periodId) throw new Error("savePeriodCriteria: periodId required");
  if (!Array.isArray(criteria)) throw new Error("savePeriodCriteria: criteria must be an array");

  const { data, error } = await supabase.rpc("rpc_admin_save_period_criteria", {
    p_period_id: periodId,
    p_criteria: criteria,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Reorder criteria for a period without deleting or re-creating rows.
 * Safe to call even when score_sheet_items exist for the period.
 *
 * @param {string} periodId
 * @param {string[]} keys — criterion keys in the desired new order
 */
export async function reorderPeriodCriteria(periodId, keys) {
  if (!periodId) throw new Error("reorderPeriodCriteria: periodId required");
  if (!Array.isArray(keys)) throw new Error("reorderPeriodCriteria: keys must be an array");
  const { error } = await supabase.rpc("rpc_admin_reorder_period_criteria", {
    p_period_id: periodId,
    p_keys: keys,
  });
  if (error) throw error;
}

/**
 * Fetch aggregate stats (projects, jurors, criteria, score sheets) per period
 * for an organization.
 *
 * @param {string} organizationId
 * @returns {Object} map of { [periodId]: { projectCount, jurorCount, criteriaCount, progress } }
 *          where progress = percentage of submitted score sheets (0-100)
 */
export async function listPeriodStats(organizationId) {
  // Fetch all periods for the organization
  const { data: periods, error: periodsError } = await supabase
    .from("periods")
    .select("id")
    .eq("organization_id", organizationId);

  if (periodsError) throw periodsError;
  if (!periods || periods.length === 0) return {};

  const periodIds = periods.map((p) => p.id);

  // Fetch all data in parallel
  const [
    { data: projects, error: projectsError },
    { data: jurors, error: jurorsError },
    { data: criteria, error: criteriaError },
    { data: scoreSheets, error: scoreSheetsError },
  ] = await Promise.all([
    supabase.from("projects").select("period_id").in("period_id", periodIds),
    supabase.from("juror_period_auth").select("period_id").in("period_id", periodIds),
    supabase.from("period_criteria").select("period_id, label, short_label, sort_order").in("period_id", periodIds).order("sort_order"),
    supabase.from("score_sheets").select("period_id, status").in("period_id", periodIds),
  ]);

  if (projectsError) throw projectsError;
  if (jurorsError) throw jurorsError;
  if (criteriaError) throw criteriaError;
  if (scoreSheetsError) throw scoreSheetsError;

  // Aggregate counts and progress by period
  const stats = {};

  // Initialize all periods with 0 counts and null progress
  for (const periodId of periodIds) {
    stats[periodId] = { projectCount: 0, jurorCount: 0, criteriaCount: 0, criteriaLabels: [], progress: null };
  }

  // Count projects
  for (const project of (projects || [])) {
    stats[project.period_id].projectCount += 1;
  }

  // Count jurors
  for (const juror of (jurors || [])) {
    stats[juror.period_id].jurorCount += 1;
  }

  // Count criteria and collect labels (sorted by sort_order, already ordered from DB)
  for (const criterion of (criteria || [])) {
    const s = stats[criterion.period_id];
    s.criteriaCount += 1;
    s.criteriaLabels.push(criterion.short_label || criterion.label);
  }

  // Calculate progress for each period
  const sheetsByPeriod = {};
  for (const sheet of (scoreSheets || [])) {
    if (!sheetsByPeriod[sheet.period_id]) {
      sheetsByPeriod[sheet.period_id] = { submitted: 0, total: 0 };
    }
    sheetsByPeriod[sheet.period_id].total += 1;
    if (sheet.status === "submitted") {
      sheetsByPeriod[sheet.period_id].submitted += 1;
    }
  }

  for (const periodId of periodIds) {
    if (sheetsByPeriod[periodId]) {
      const { submitted, total } = sheetsByPeriod[periodId];
      stats[periodId].progress = Math.round((submitted / total) * 100);
    }
  }

  return stats;
}
