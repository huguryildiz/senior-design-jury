// src/shared/api/semesterApi.js
// ============================================================
// Semester listing RPCs (public — no admin password required).
// ============================================================

import { supabase } from "./core/client";
import { withRetry } from "./core/retry";
import { sortSemestersByPosterDateDesc } from "../semesterSort";

export async function listSemesters(signal) {
  return withRetry(async () => {
    const q = supabase.rpc("rpc_list_semesters");
    if (signal) q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw error;
    return sortSemestersByPosterDateDesc(data || []);
  });
}

export async function getCurrentSemester(signal, semesterId) {
  const runRpc = async (params) => {
    const q = params
      ? supabase.rpc("rpc_get_current_semester", params)
      : supabase.rpc("rpc_get_current_semester");
    if (signal) q.abortSignal(signal);
    const { data, error } = await q;
    return { data, error };
  };

  // Default first: current production RPC signature is no-arg.
  const primary = await runRpc(null);
  if (!primary.error) return primary.data?.[0] || null;

  // Legacy fallback: some environments may still expose p_semester_id.
  if (semesterId) {
    const fnMissing = /function|does not exist|no function matches/i.test(String(primary.error.message || ""));
    if (!fnMissing) throw primary.error;
    const scoped = await runRpc({ p_semester_id: semesterId });
    if (scoped.error) throw scoped.error;
    return scoped.data?.[0] || null;
  }

  throw primary.error;
}
