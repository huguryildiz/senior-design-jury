// src/shared/api/admin/periods.js
// ============================================================
// Admin evaluation period management (PostgREST).
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

export async function setCurrentPeriod(periodId, organizationId) {
  // Unset all current flags for this org
  const { error: clearErr } = await supabase
    .from("periods")
    .update({ is_current: false })
    .eq("organization_id", organizationId)
    .eq("is_current", true);
  if (clearErr) throw clearErr;

  // Set target as current; stamp activated_at if first activation
  const { data: target, error: fetchErr } = await supabase
    .from("periods")
    .select("activated_at")
    .eq("id", periodId)
    .single();
  if (fetchErr) throw fetchErr;

  const updates = { is_current: true };
  if (!target.activated_at) {
    updates.activated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("periods")
    .update(updates)
    .eq("id", periodId)
    .select()
    .single();
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
  const { error } = await supabase
    .from("periods")
    .update({ is_locked: !!enabled })
    .eq("id", periodId);
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
 * Save criteria to the period_criteria snapshot table.
 * Replaces all existing criteria for the period with the new set.
 *
 * @param {string} periodId
 * @param {Array} criteria — array from criterionToConfig():
 *   { key, label, shortLabel, color, max, blurb, outcomes: string[], rubric: [] }
 * @returns {Array} inserted DB rows
 */
export async function savePeriodCriteria(periodId, criteria) {
  if (!periodId) throw new Error("savePeriodCriteria: periodId required");
  if (!Array.isArray(criteria)) throw new Error("savePeriodCriteria: criteria must be an array");

  const totalMax = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);

  // 1. Delete existing outcome maps (FK constraint requires this before criteria delete)
  const { error: mapsDelErr } = await supabase
    .from("period_criterion_outcome_maps")
    .delete()
    .eq("period_id", periodId);
  if (mapsDelErr) throw mapsDelErr;

  // 2. Delete existing criteria
  const { error: critDelErr } = await supabase
    .from("period_criteria")
    .delete()
    .eq("period_id", periodId);
  if (critDelErr) throw critDelErr;

  if (criteria.length === 0) return [];

  // 3. Insert new criteria rows
  const rows = criteria.map((c, i) => ({
    period_id:    periodId,
    key:          c.key,
    label:        c.label,
    short_label:  c.shortLabel || c.label,
    description:  c.blurb || null,
    max_score:    Number(c.max) || 0,
    weight:       totalMax > 0 ? Number(c.max) / totalMax * 100 : 0,
    color:        c.color || null,
    rubric_bands: Array.isArray(c.rubric) ? c.rubric : null,
    sort_order:   i,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("period_criteria")
    .insert(rows)
    .select();
  if (insErr) throw insErr;

  // 4. Insert outcome mappings
  // Build a lookup: outcome_code → period_outcome_id
  const allOutcomeCodes = [...new Set(criteria.flatMap((c) => c.outcomes || []))];
  if (allOutcomeCodes.length > 0 && inserted?.length) {
    const { data: periodOutcomes } = await supabase
      .from("period_outcomes")
      .select("id, code")
      .eq("period_id", periodId)
      .in("code", allOutcomeCodes);

    const outcomeCodeToId = Object.fromEntries(
      (periodOutcomes || []).map((o) => [o.code, o.id])
    );

    // Build a lookup: criterion_key → inserted_criterion_id
    const keyToId = Object.fromEntries(
      (inserted || []).map((r) => [r.key, r.id])
    );

    const maps = [];
    for (const c of criteria) {
      const critId = keyToId[c.key];
      if (!critId) continue;
      for (const code of c.outcomes || []) {
        const outcomeId = outcomeCodeToId[code];
        if (!outcomeId) continue;
        maps.push({
          period_id:            periodId,
          period_criterion_id:  critId,
          period_outcome_id:    outcomeId,
        });
      }
    }

    if (maps.length > 0) {
      const { error: mapInsErr } = await supabase
        .from("period_criterion_outcome_maps")
        .insert(maps);
      if (mapInsErr) throw mapInsErr;
    }
  }

  return inserted || [];
}
