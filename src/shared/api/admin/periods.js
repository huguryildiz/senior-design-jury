// src/shared/api/admin/periods.js
// ============================================================
// Admin evaluation period management.
//
// As of migration 050, all mutating operations go through SECURITY DEFINER
// RPCs that write the audit_logs row in the same transaction as the DB
// change. No client-side fire-and-forget audit writes remain here.
// ============================================================

import { supabase } from "../core/client";
import { invokeEdgeFunction } from "../core/invokeEdgeFunction";

export async function listPeriods(organizationId) {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || !data.length) return [];

  const periodIds = data.map((p) => p.id);
  const { data: criteriaRows } = await supabase
    .from("period_criteria")
    .select("period_id, label, max_score")
    .in("period_id", periodIds)
    .order("sort_order", { ascending: true });

  const byPeriod = {};
  for (const row of (criteriaRows || [])) {
    if (!byPeriod[row.period_id]) byPeriod[row.period_id] = [];
    byPeriod[row.period_id].push(row);
  }

  return data.map((p) => {
    const rows = byPeriod[p.id] || [];
    return {
      ...p,
      criteria_count: rows.length,
      criteria_labels: rows.map((r) => r.label),
      criteria_total_pts: rows.reduce((s, r) => s + (r.max_score || 0), 0),
    };
  });
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

export async function duplicatePeriod(sourcePeriodId) {
  const { data, error } = await supabase.rpc("rpc_admin_duplicate_period", {
    p_source_period_id: sourcePeriodId,
  });
  if (error) throw error;
  return data;
}

export async function setEvalLock(periodId, enabled) {
  // Period update + audit event are atomic inside rpc_admin_set_period_lock.
  // When caller is org admin and scores exist, the RPC returns ok=false with
  // error_code='cannot_unlock_period_has_scores' — caller should route to
  // requestPeriodUnlock() in that case.
  const { data, error } = await supabase.rpc("rpc_admin_set_period_lock", {
    p_period_id: periodId,
    p_locked: !!enabled,
  });
  if (error) throw error;
  return data;
}

/**
 * Creates a pending unlock request for a locked period that already has scores.
 * Org admin calls this when direct unlock is blocked. Super admin receives an
 * email notification. Idempotent per period via unique partial index on
 * (period_id) WHERE status='pending'.
 *
 * @param {string} periodId
 * @param {string} reason — minimum 10 chars (server-enforced)
 * @returns {{ ok: boolean, request_id?: string, error_code?: string }}
 */
export async function requestPeriodUnlock(periodId, reason) {
  if (!periodId) throw new Error("requestPeriodUnlock: periodId required");
  const { data, error } = await supabase.rpc("rpc_admin_request_unlock", {
    p_period_id: periodId,
    p_reason: reason || "",
  });
  if (error) throw error;
  if (!data?.ok) return data;

  // Fire-and-forget email notification (failures are logged server-side).
  try {
    const [{ data: period }, { data: org }, { data: profile }] = await Promise.all([
      supabase.from("periods").select("id, name, organization_id").eq("id", periodId).single(),
      supabase.from("periods").select("organizations(name)").eq("id", periodId).single(),
      supabase.auth.getUser(),
    ]);
    const userId = profile?.user?.id;
    const displayRes = userId
      ? await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle()
      : { data: null };

    await invokeEdgeFunction("notify-unlock-request", {
      body: {
        type: "request_submitted",
        request_id: data.request_id,
        period_id: period?.id || periodId,
        period_name: period?.name || null,
        organization_id: period?.organization_id || null,
        organization_name: org?.organizations?.name || null,
        requester_user_id: userId || null,
        requester_name: displayRes?.data?.display_name || null,
        reason,
      },
    });
  } catch (notifyErr) {
    console.error("notify-unlock-request (submitted) failed:", notifyErr?.message);
  }

  return data;
}

/**
 * Super admin approves or rejects a pending unlock request.
 * On approve: period.is_locked=false, requester receives "approved" email.
 * On reject: status updated, requester receives "rejected" email.
 *
 * @param {string} requestId
 * @param {"approved" | "rejected"} decision
 * @param {string} [note]
 * @returns {{ ok: boolean, decision?: string, error_code?: string }}
 */
export async function resolveUnlockRequest(requestId, decision, note) {
  if (!requestId) throw new Error("resolveUnlockRequest: requestId required");
  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("resolveUnlockRequest: decision must be 'approved' or 'rejected'");
  }
  const { data, error } = await supabase.rpc("rpc_super_admin_resolve_unlock", {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note || null,
  });
  if (error) throw error;
  if (!data?.ok) return data;

  // Fire-and-forget email notification to the original requester.
  try {
    const [{ data: period }, { data: org }, requesterRes] = await Promise.all([
      supabase.from("periods").select("name").eq("id", data.period_id).maybeSingle(),
      supabase.from("organizations").select("name").eq("id", data.organization_id).maybeSingle(),
      data.requested_by
        ? supabase.from("profiles").select("display_name").eq("id", data.requested_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    await invokeEdgeFunction("notify-unlock-request", {
      body: {
        type: "request_resolved",
        request_id: requestId,
        period_id: data.period_id,
        period_name: period?.name || null,
        organization_id: data.organization_id,
        organization_name: org?.name || null,
        requester_user_id: data.requested_by,
        requester_name: requesterRes?.data?.display_name || null,
        decision,
        review_note: note || null,
      },
    });
  } catch (notifyErr) {
    console.error("notify-unlock-request (resolved) failed:", notifyErr?.message);
  }

  return data;
}

/**
 * Lists unlock requests visible to caller (RLS enforced).
 * Org admin sees only their org; super admin sees all.
 *
 * @param {"pending" | "approved" | "rejected" | "all"} [status="pending"]
 * @returns {Array<{
 *   id, period_id, period_name, organization_id, organization_name,
 *   requested_by, requester_name, reason, status,
 *   reviewed_by, reviewer_name, reviewed_at, review_note, created_at
 * }>}
 */
export async function listUnlockRequests(status = "pending") {
  const { data, error } = await supabase.rpc("rpc_admin_list_unlock_requests", {
    p_status: status,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
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
    supabase.from("period_criteria").select("period_id, label, sort_order").in("period_id", periodIds).order("sort_order"),
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
    stats[periodId] = { projectCount: 0, jurorCount: 0, criteriaCount: 0, criteriaLabels: [], progress: null, hasScores: false };
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
    s.criteriaLabels.push(criterion.label);
  }

  // Calculate progress for each period + track score presence
  const sheetsByPeriod = {};
  for (const sheet of (scoreSheets || [])) {
    if (!sheetsByPeriod[sheet.period_id]) {
      sheetsByPeriod[sheet.period_id] = { submitted: 0, total: 0 };
    }
    sheetsByPeriod[sheet.period_id].total += 1;
    if (sheet.status === "submitted") {
      sheetsByPeriod[sheet.period_id].submitted += 1;
    }
    stats[sheet.period_id].hasScores = true;
  }

  for (const periodId of periodIds) {
    if (sheetsByPeriod[periodId]) {
      const { submitted, total } = sheetsByPeriod[periodId];
      stats[periodId].progress = Math.round((submitted / total) * 100);
    }
  }

  return stats;
}

/**
 * Set (or clear) the criteria_name on a period, recording that criteria setup
 * has been initiated. Pass null to reset to unconfigured state.
 *
 * @param {string} periodId
 * @param {string|null} name — e.g. "Custom Criteria" or a framework name
 */
export async function setPeriodCriteriaName(periodId, name) {
  if (!periodId) throw new Error("setPeriodCriteriaName: periodId required");
  const { error } = await supabase.rpc("rpc_admin_set_period_criteria_name", {
    p_period_id: periodId,
    p_name:      name ?? null,
  });
  if (error) throw error;
}

/**
 * Check whether a period meets the minimum requirements to be published.
 * Server-side readiness evaluation — UI uses the result to render the
 * "N issues before publish" badge and to gate the Publish button.
 *
 * Issues returned with severity:
 *   - "required": blocks publish (must be fixed)
 *   - "optional": informational only (publishing still allowed)
 *
 * @param {string} periodId
 * @returns {Promise<{
 *   ok: boolean,
 *   issues: Array<{ check: string, msg: string, severity: "required"|"optional" }>,
 *   counts: { criteria: number, weight_total: number, projects: number, jurors: number, outcomes: number }
 * }>}
 */
export async function checkPeriodReadiness(periodId) {
  if (!periodId) throw new Error("checkPeriodReadiness: periodId required");
  const { data, error } = await supabase.rpc("rpc_admin_check_period_readiness", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data || { ok: false, issues: [], counts: {} };
}

/**
 * Transition a period from Draft to Published. Server-side readiness check
 * runs first; if any required check fails, returns `{ ok: false,
 * error_code: 'readiness_failed', readiness }` so the UI can list the
 * blocking issues without a second round-trip. Idempotent — re-publishing
 * an already-published period returns `{ ok: true, already_published: true }`.
 *
 * @param {string} periodId
 * @returns {Promise<{ ok: boolean, already_published?: boolean, activated_at?: string, error_code?: string, readiness?: object }>}
 */
export async function publishPeriod(periodId) {
  if (!periodId) throw new Error("publishPeriod: periodId required");
  const { data, error } = await supabase.rpc("rpc_admin_publish_period", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data;
}

/**
 * Close a Published or Live period — sets closed_at, marking it terminal.
 * Idempotent. Requires the period to be Published first (is_locked=true).
 *
 * @param {string} periodId
 * @returns {Promise<{ ok: boolean, already_closed?: boolean, closed_at?: string, error_code?: string }>}
 */
export async function closePeriod(periodId) {
  if (!periodId) throw new Error("closePeriod: periodId required");
  const { data, error } = await supabase.rpc("rpc_admin_close_period", {
    p_period_id: periodId,
  });
  if (error) throw error;
  return data;
}
