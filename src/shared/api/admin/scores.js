// src/shared/api/admin/scores.js
// Admin score data, summaries, and settings (PostgREST).

import { supabase } from "../core/client";
import { dbAvgScoresToUi, formatMembers } from "../fieldMapping";

/**
 * Returns all score rows for a period with project and juror info.
 */
export async function getScores(periodId) {
  const { data, error } = await supabase
    .from("scores_compat")
    .select("*, project:projects(id, title, members, project_no), juror:jurors(id, juror_name, affiliation)")
    .eq("period_id", periodId);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    jurorId: row.juror_id,
    juryName: row.juror?.juror_name || "",
    affiliation: row.juror?.affiliation || "",
    projectId: row.project_id,
    projectName: row.project?.title || "",
    groupNo: row.project?.project_no ?? null,
    students: formatMembers(row.project?.members),
    technical: row.technical,
    design: row.written,
    delivery: row.oral,
    teamwork: row.teamwork,
    total: (row.technical || 0) + (row.written || 0) + (row.oral || 0) + (row.teamwork || 0),
    comments: row.comments || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Returns jurors with auth and scoring summary for a period.
 */
export async function listJurorsSummary(periodId) {
  // Get juror-period-auth rows with juror info
  const { data: authRows, error: authErr } = await supabase
    .from("juror_period_auth")
    .select("*, juror:jurors(*)")
    .eq("period_id", periodId);
  if (authErr) throw authErr;

  // Get score counts per juror for this period
  const { data: scores, error: scoreErr } = await supabase
    .from("scores_compat")
    .select("juror_id, id")
    .eq("period_id", periodId);
  if (scoreErr) throw scoreErr;

  // Get total projects count for this period
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("period_id", periodId);
  if (projErr) throw projErr;
  const totalProjects = projects?.length || 0;

  // Count scores per juror
  const scoreCounts = {};
  for (const s of scores || []) {
    scoreCounts[s.juror_id] = (scoreCounts[s.juror_id] || 0) + 1;
  }

  return (authRows || []).map((row) => ({
    jurorId: row.juror_id,
    juryName: row.juror?.juror_name || "",
    affiliation: row.juror?.affiliation || "",
    editEnabled: row.edit_enabled || false,
    finalSubmittedAt: row.final_submitted_at || "",
    finalSubmitted: Boolean(row.final_submitted_at),
    lastSeenAt: row.last_seen_at || "",
    lastSeenMs: row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0,
    totalProjects,
    completedProjects: scoreCounts[row.juror_id] || 0,
    lockedUntil: row.locked_until,
    isLocked: row.is_blocked || false,
  }));
}

/**
 * Returns per-project summary with aggregated scores.
 */
export async function getProjectSummary(periodId) {
  // Get projects
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("period_id", periodId)
    .order("title");
  if (projErr) throw projErr;

  // Get all scores for this period
  const { data: scores, error: scoreErr } = await supabase
    .from("scores_compat")
    .select("*")
    .eq("period_id", periodId);
  if (scoreErr) throw scoreErr;

  // Aggregate scores per project
  const scoresByProject = {};
  for (const s of scores || []) {
    if (!scoresByProject[s.project_id]) scoresByProject[s.project_id] = [];
    scoresByProject[s.project_id].push(s);
  }

  return (projects || []).map((p) => {
    const pScores = scoresByProject[p.id] || [];
    const count = pScores.length;

    const avg = (field) => {
      const vals = pScores.map((s) => s[field]).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const totalAvg = count
      ? pScores.reduce(
          (sum, s) =>
            sum + (s.technical || 0) + (s.written || 0) + (s.oral || 0) + (s.teamwork || 0),
          0
        ) / count
      : null;

    const totals = pScores.map(
      (s) => (s.technical || 0) + (s.written || 0) + (s.oral || 0) + (s.teamwork || 0)
    );

    return {
      id: p.id,
      group_no: p.project_no ?? null,
      title: p.title,
      members: formatMembers(p.members),
      advisor: p.advisor || "",
      count,
      avg: dbAvgScoresToUi({
        technical: avg("technical"),
        written: avg("written"),
        oral: avg("oral"),
        teamwork: avg("teamwork"),
      }),
      totalAvg,
      totalMin: totals.length ? Math.min(...totals) : null,
      totalMax: totals.length ? Math.max(...totals) : null,
    };
  });
}

/**
 * Returns per-period outcome averages for trend charts.
 */
export async function getOutcomeTrends(periodIds) {
  const results = [];
  for (const periodId of periodIds) {
    const { data: period } = await supabase
      .from("periods")
      .select("id, name")
      .eq("id", periodId)
      .single();

    const { data: scores } = await supabase
      .from("scores_compat")
      .select("technical, written, oral, teamwork")
      .eq("period_id", periodId);

    const count = scores?.length || 0;
    const avg = (field) => {
      const vals = (scores || []).map((s) => s[field]).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    results.push({
      periodId,
      periodName: period?.name || "",
      criteriaAvgs: dbAvgScoresToUi({
        technical: avg("technical"),
        written: avg("written"),
        oral: avg("oral"),
        teamwork: avg("teamwork"),
      }),
      nEvals: count,
    });
  }
  return results;
}

/**
 * Returns cascade counts for delete operations.
 */
export async function getDeleteCounts(targetType, targetId) {
  if (targetType === "period") {
    const [projects, scores, jurorAuth] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("period_id", targetId),
      supabase.from("scores_compat").select("id", { count: "exact", head: true }).eq("period_id", targetId),
      supabase.from("juror_period_auth").select("juror_id", { count: "exact", head: true }).eq("period_id", targetId),
    ]);
    return { projects: projects.count || 0, scores: scores.count || 0, jurorAssignments: jurorAuth.count || 0 };
  }
  if (targetType === "project") {
    const { count } = await supabase
      .from("scores_compat")
      .select("id", { count: "exact", head: true })
      .eq("project_id", targetId);
    return { scores: count || 0 };
  }
  if (targetType === "juror") {
    const { count } = await supabase
      .from("scores_compat")
      .select("id", { count: "exact", head: true })
      .eq("juror_id", targetId);
    return { scores: count || 0 };
  }
  return {};
}

/**
 * Returns criteria rows for a period snapshot (from period_criteria table).
 * Returns an empty array if the period has no snapshot yet.
 */
export async function listPeriodCriteria(periodId) {
  const { data, error } = await supabase
    .from("period_criteria")
    .select("*")
    .eq("period_id", periodId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

/**
 * Fetch period_outcomes snapshot rows for a given period.
 * Returns an empty array if the period has no outcome snapshot yet.
 */
export async function listPeriodOutcomes(periodId) {
  const { data, error } = await supabase
    .from("period_outcomes")
    .select("*")
    .eq("period_id", periodId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

/**
 * Dispatches delete to appropriate table.
 */
export async function deleteEntity({ targetType, targetId }) {
  if (!targetType || !targetId) throw new Error("targetType and targetId are required.");
  if (targetType === "period") {
    const { error } = await supabase.from("periods").delete().eq("id", targetId);
    if (error) throw error;
    return true;
  }
  if (targetType === "project") {
    const { error } = await supabase.from("projects").delete().eq("id", targetId);
    if (error) throw error;
    return true;
  }
  if (targetType === "juror") {
    const { error } = await supabase.from("jurors").delete().eq("id", targetId);
    if (error) throw error;
    return true;
  }
  throw new Error("Unsupported delete target.");
}
