// src/jury/hooks/useJuryAutosave.js
// ============================================================
// Owns the core write logic (writeGroup) and autosave behavior.
//
// State:
//   saveStatus     — "idle"|"saving"|"saved"|"error"
//   sessionExpired — true when a write fails because the juror's
//                    12-hour session token has expired or is invalid.
//                    Distinct from saveStatus "error" so the UI can
//                    show a targeted "Your session has expired" message
//                    rather than a generic save failure.
//
// Refs:
//   lastWrittenRef — { [project_id]: { key: string } }
//     Stores the snapshot key of the last successfully written data per
//     project. writeGroup compares the current snapshot key against this
//     to skip redundant RPC calls (deduplication).
//
// writeGroup(pid):
//   - Reads jurorId, sessionToken, periodId, current from stateRef.current
//     (always fresh — avoids stale closure problems in async callbacks).
//   - Reads scores and comment from pendingScoresRef / pendingCommentsRef
//     (always fresh — updated synchronously in onChange handlers).
//   - Builds a normalized snapshot and compares its key to lastWrittenRef.
//   - Skips the RPC if data is unchanged or truly untouched.
//   - On period lock error: sets editLockActive = true.
//   - On session expired error: sets sessionExpired = true and
//     editLockActive = true (prevents further writes until re-auth).
//   - Returns true on success or skip, false on error.
//
// Visibility autosave:
//   Saves the current project when the tab is hidden or the browser closes.
//   Guards on step === "eval" to avoid spurious saves in other steps.
//   Re-surfaces errors when the user returns to the tab (pendingVisibilityError
//   closure flag) so background failures are not silently lost.
//
// Parameters (from orchestrator):
//   stateRef          — composite always-fresh ref
//   pendingScoresRef  — from useJuryScoring
//   pendingCommentsRef — from useJuryScoring
//   editLockActive    — from useJuryEditState
//   setGroupSynced    — from useJuryScoring
//   setEditLockActive — from useJuryEditState
//   step              — from useJuryWorkflow (for visibility guard)
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import { getActiveCriteria } from "../../shared/criteriaHelpers";
import { upsertScore } from "../../shared/api";
import {
  buildScoreSnapshot,
  isFinalSubmittedError,
  isPeriodLockedError,
  isSessionExpiredError,
} from "../utils/scoreSnapshot";
import { isAllFilled } from "../utils/scoreState";

export function useJuryAutosave({
  stateRef,
  pendingScoresRef,
  pendingCommentsRef,
  editLockActive,
  setGroupSynced,
  setEditLockActive,
  step,
}) {
  const [saveStatus, setSaveStatus] = useState("idle");
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastWrittenRef = useRef({});
  const inFlightRef = useRef(new Set()); // pids with an in-progress upsert

  // ── Core write: single group → single score row ───────────
  // Reads from refs (never from React state) for stale-closure safety.
  const writeGroup = useCallback(
    async (pid) => {
      const { jurorId: jid, jurorSessionToken: sessionToken, periodId: sid } =
        stateRef.current;
      if (!jid || !sessionToken || !sid || !pid) {
        console.warn("[writeGroup] early return — missing required field", { jid: !!jid, sessionToken: !!sessionToken, sid: !!sid, pid: !!pid });
        return false;
      }
      if (editLockActive) {
        console.warn("[writeGroup] early return — editLockActive");
        return false;
      }

      const s = pendingScoresRef.current;
      const c = pendingCommentsRef.current;
      const currentComment = String(c[pid] || "");
      const { criteriaConfig } = stateRef.current;
      const effectiveCriteria = getActiveCriteria(criteriaConfig);
      const snapshot = buildScoreSnapshot(s[pid], currentComment, effectiveCriteria);

      if (!snapshot.hasAnyScores && !snapshot.hasComment && !lastWrittenRef.current[pid]) {
        return true; // truly untouched — skip
      }

      const last = lastWrittenRef.current[pid];
      if (last && last.key === snapshot.key) {
        return true; // no data changes since last write — skip
      }

      if (inFlightRef.current.has(pid)) {
        return true; // concurrent write already in progress — skip to avoid lock contention
      }

      setSaveStatus("saving");
      inFlightRef.current.add(pid);
      try {
        await upsertScore(sid, pid, jid, sessionToken, snapshot.normalizedScores, snapshot.comment, criteriaConfig);
        lastWrittenRef.current[pid] = { key: snapshot.key };
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);

        if (isAllFilled(s, pid, effectiveCriteria)) {
          setGroupSynced((prev) => ({ ...prev, [pid]: true }));
        }
        return true;
      } catch (e) {
        console.error("[writeGroup] upsertScore failed for pid", pid, e);

        if (isFinalSubmittedError(e)) {
          // Juror already has a finalized submission and edit is not enabled.
          // Scores are persisted in the DB — treat this as a successful skip.
          return true;
        }
        if (isSessionExpiredError(e)) {
          // Session token has expired or is invalid. Block further writes
          // (same mechanism as period lock) and raise the distinct state
          // so the UI can show a targeted "session expired" message.
          setSessionExpired(true);
          setEditLockActive(true);
        } else if (isPeriodLockedError(e)) {
          setEditLockActive(true);
        }
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
        return false;
      } finally {
        inFlightRef.current.delete(pid);
      }
    },
    [editLockActive, stateRef, pendingScoresRef, pendingCommentsRef, setGroupSynced, setEditLockActive]
  );

  // ── Visibility autosave ───────────────────────────────────
  // Saves the current project when the tab is hidden (mobile background,
  // browser close, tab switch). Guards on step === "eval" to avoid saving
  // in other flow steps where score state may not be meaningful.
  //
  // Error surfacing: if the save fails while the tab is hidden the user
  // cannot see the error banner. A closure flag (pendingVisibilityError)
  // tracks the failure and re-surfaces the error state when the user
  // returns to the tab (visibilityState === "visible").
  useEffect(() => {
    let pendingVisibilityError = false;

    const onVisibilityChange = async () => {
      if (document.visibilityState === "hidden" && step === "eval") {
        const { current: cur, projects: projs } = stateRef.current;
        const pid = projs[cur]?.project_id;
        if (pid) {
          const ok = await writeGroup(pid);
          if (!ok) pendingVisibilityError = true;
        }
      } else if (document.visibilityState === "visible" && pendingVisibilityError) {
        // User has returned to the tab after a failed background save.
        // Re-surface the error so they can take action.
        pendingVisibilityError = false;
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 4000);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [step, writeGroup, stateRef]);

  return {
    saveStatus, setSaveStatus,
    sessionExpired, setSessionExpired,
    lastWrittenRef,
    writeGroup,
  };
}
