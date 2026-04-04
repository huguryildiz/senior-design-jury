// src/shared/api/admin/frameworks.js
// Accreditation frameworks and outcomes management (PostgREST).

import { supabase } from "../core/client";

export async function listFrameworks(organizationId) {
  const { data, error } = await supabase
    .from("frameworks")
    .select("*, outcomes(*)")
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
    .from("outcomes")
    .select("*")
    .eq("framework_id", frameworkId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function createOutcome(payload) {
  const { data, error } = await supabase
    .from("outcomes")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOutcome(id, payload) {
  const { data, error } = await supabase
    .from("outcomes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOutcome(id) {
  const { error } = await supabase.from("outcomes").delete().eq("id", id);
  if (error) throw error;
}

export async function listCriterionOutcomeMappings(organizationId) {
  const { data, error } = await supabase
    .from("criterion_outcome_mappings")
    .select("*, outcome:outcomes(*)")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return data || [];
}

export async function upsertCriterionOutcomeMapping(payload) {
  const { data, error } = await supabase
    .from("criterion_outcome_mappings")
    .upsert(payload, { onConflict: "organization_id,outcome_id,criterion_key" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCriterionOutcomeMapping(id) {
  const { error } = await supabase.from("criterion_outcome_mappings").delete().eq("id", id);
  if (error) throw error;
}
