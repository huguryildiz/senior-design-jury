// src/shared/api/admin/outcomes.js
// Period-scoped outcome + criterion↔outcome mapping API.
//
// period_criterion_outcome_maps is the single source of truth for mappings.
// Each period owns an independent set of outcomes and mappings; editing one
// period does not affect others even if they share a framework.

import { supabase } from "../core/client";

export async function listPeriodCriterionOutcomeMaps(periodId) {
  const { data, error } = await supabase
    .from("period_criterion_outcome_maps")
    .select("*")
    .eq("period_id", periodId);
  if (error) throw error;
  return data || [];
}

export async function createPeriodOutcome(payload) {
  const { data, error } = await supabase.rpc("rpc_admin_create_period_outcome", {
    p_period_id: payload.period_id,
    p_code: payload.code,
    p_label: payload.label,
    p_description: payload.description ?? null,
    p_sort_order: payload.sort_order ?? 0,
  });
  if (error) throw error;
  return data;
}

export async function updatePeriodOutcome(id, payload) {
  const patch = {};
  if (payload.code !== undefined) patch.code = payload.code;
  if (payload.label !== undefined) patch.label = payload.label;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.sort_order !== undefined) patch.sort_order = payload.sort_order;
  if (payload.coverage_type !== undefined) patch.coverage_type = payload.coverage_type;

  const { data, error } = await supabase.rpc("rpc_admin_update_period_outcome", {
    p_outcome_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  return data;
}

export async function deletePeriodOutcome(id) {
  const { error } = await supabase.rpc("rpc_admin_delete_period_outcome", {
    p_outcome_id: id,
  });
  if (error) throw error;
}

export async function upsertPeriodCriterionOutcomeMap({ period_id, period_criterion_id, period_outcome_id, coverage_type }) {
  const { data, error } = await supabase.rpc("rpc_admin_upsert_period_criterion_outcome_map", {
    p_period_id: period_id,
    p_period_criterion_id: period_criterion_id,
    p_period_outcome_id: period_outcome_id,
    p_coverage_type: coverage_type || "direct",
  });
  if (error) throw error;
  return data;
}

export async function deletePeriodCriterionOutcomeMap(mapId) {
  const { data, error } = await supabase.rpc("rpc_admin_delete_period_criterion_outcome_map", {
    p_map_id: mapId,
  });
  if (error) throw error;
  return data;
}
