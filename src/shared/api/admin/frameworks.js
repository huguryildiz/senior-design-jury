// src/shared/api/admin/frameworks.js
// Accreditation frameworks and outcomes management (PostgREST).

import { supabase } from "../core/client";

export async function listFrameworks(organizationId) {
  const { data, error } = await supabase
    .from("frameworks")
    .select("*")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function createFramework(payload) {
  const { data, error } = await supabase
    .from("frameworks")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFramework(id, payload) {
  const { data, error } = await supabase
    .from("frameworks")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFramework(id) {
  const { error } = await supabase.from("frameworks").delete().eq("id", id);
  if (error) throw error;
}

export async function listOutcomes(frameworkId) {
  const { data, error } = await supabase
    .from("framework_outcomes")
    .select("*")
    .eq("framework_id", frameworkId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function createOutcome(payload) {
  // rpc_admin_create_framework_outcome performs INSERT + audit atomically.
  const { data, error } = await supabase.rpc("rpc_admin_create_framework_outcome", {
    p_framework_id: payload.framework_id,
    p_code: payload.code,
    p_label: payload.label,
    p_description: payload.description ?? null,
    p_sort_order: payload.sort_order ?? 0,
  });
  if (error) throw error;
  return data;
}

export async function updateOutcome(id, payload) {
  // rpc_admin_update_framework_outcome fetches before, updates, writes diff audit atomically.
  const patch = {};
  if (payload.code !== undefined) patch.code = payload.code;
  if (payload.label !== undefined) patch.label = payload.label;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.sort_order !== undefined) patch.sort_order = payload.sort_order;
  if (payload.coverage_hint !== undefined) patch.coverage_hint = payload.coverage_hint ?? null;

  const { data, error } = await supabase.rpc("rpc_admin_update_framework_outcome", {
    p_outcome_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  return data;
}

export async function deleteOutcome(id) {
  // rpc_admin_delete_framework_outcome performs DELETE + audit atomically.
  const { error } = await supabase.rpc("rpc_admin_delete_framework_outcome", {
    p_outcome_id: id,
  });
  if (error) throw error;
}

export async function listFrameworkCriteria(frameworkId) {
  const { data, error } = await supabase
    .from("framework_criteria")
    .select("*")
    .eq("framework_id", frameworkId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function listCriterionOutcomeMappings(frameworkId) {
  const { data, error } = await supabase
    .from("framework_criterion_outcome_maps")
    .select("*")
    .eq("framework_id", frameworkId);
  if (error) throw error;
  return data || [];
}

export async function upsertCriterionOutcomeMapping(payload) {
  const { data, error } = await supabase
    .from("framework_criterion_outcome_maps")
    .upsert(payload, { onConflict: "criterion_id,outcome_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCriterionOutcomeMapping(id) {
  const { error } = await supabase.from("framework_criterion_outcome_maps").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Deep-clone a framework under a new name for the given org.
 * Calls rpc_admin_clone_framework which copies outcomes, criteria, and maps.
 * Returns { id, name } of the new framework.
 */
export async function cloneFramework(frameworkId, newName, orgId) {
  const { data, error } = await supabase.rpc("rpc_admin_clone_framework", {
    p_framework_id: frameworkId,
    p_new_name: newName,
    p_org_id: orgId,
  });
  if (error) throw error;
  return { id: data, name: newName };
}

/**
 * Assign (or reassign) a framework to a period by setting periods.framework_id.
 * Hard-confirm logic and mapping cleanup are handled in the UI before calling this.
 */
export async function assignFrameworkToPeriod(periodId, frameworkId) {
  const { error } = await supabase
    .from("periods")
    .update({ framework_id: frameworkId })
    .eq("id", periodId);
  if (error) throw error;
}
