// src/jury/hooks/useJuryLifecycleHandlers.js
// ============================================================
// Navigation, submission, edit-mode, and reset handlers
// extracted from useJuryHandlers.
//
// Handlers:
//   handleNavigate      — saves current group before navigating
//   handleRequestSubmit — validates all complete, flushes saves, opens confirm
//   handleConfirmSubmit — finalize submission via API, transition to done
//   handleCancelSubmit  — dismiss confirm dialog
//   handleEditScores    — re-enter eval from DoneStep
//   resetAll            — full state reset to identity step
//   clearLocalSession   — remove jury.* keys from localStorage
// ============================================================

import { useCallback } from "react";

import {
  listProjects,
  getJurorEditState,
  finalizeJurorSubmission,
  getProjectRankings,
} from "../../shared/api";
import {
  isAllFilled,
  isAllComplete,
  makeAllTouched,
} from "../utils/scoreState";
import { buildScoreSnapshot, isPeriodLockedError, isSessionExpiredError } from "../utils/scoreSnapshot";
import { clearJurySession } from "../../shared/storage";

export function useJuryLifecycleHandlers({ identity, session, scoring, loading, workflow, editState, autosave, stateRef, effectiveCriteria, setSubmitError }) {
  // ── Group navigation with guaranteed write ─────────────────
  const handleNavigate = useCallback(
    async (newIndex) => {
      const { current: cur, projects: projs } = stateRef.current;
      const currentPid = projs[cur]?.project_id;
      if (currentPid) await autosave.writeGroup(currentPid);
      workflow.setCurrent(newIndex);
    },
    [autosave.writeGroup] // stateRef and workflow.setCurrent are stable
  );

  // ── Submit: validate + flush + open confirm ────────────────
  const handleRequestSubmit = useCallback(async () => {
    setSubmitError("");
    if (editState.editLockActive) {
      setSubmitError("Evaluations are locked for this period.");
      return;
    }
    const { scores: s, projects: projs } = stateRef.current;
    if (!isAllComplete(s, projs, effectiveCriteria)) {
      scoring.setTouched(makeAllTouched(projs, effectiveCriteria));
      const firstIncomplete = projs.findIndex(
        (p) => !isAllFilled(s, p.project_id, effectiveCriteria)
      );
      if (firstIncomplete >= 0) workflow.setCurrent(firstIncomplete);
      return;
    }
    if (workflow.submitPendingRef.current) return;
    workflow.submitPendingRef.current = true;
    loading.setLoadingState({ stage: "loading", message: "Saving latest scores…" });

    let allSaved = true;
    for (const p of projs) {
      const ok = await autosave.writeGroup(p.project_id);
      if (!ok) allSaved = false;
    }

    loading.setLoadingState(null);
    if (!allSaved) {
      const { jurorId: jid, jurorSessionToken: sessionToken, periodId: sid } = stateRef.current;
      try {
        const editStateResult = await getJurorEditState(sid, jid, sessionToken);
        if (editStateResult?.lock_active) {
          editState.setEditLockActive(true);
          setSubmitError("Evaluations are locked for this period.");
        } else {
          setSubmitError("Could not save all scores. Please check your connection and try again.");
        }
      } catch {
        setSubmitError("Could not save all scores. Please check your connection and try again.");
      }
      workflow.submitPendingRef.current = false;
      return;
    }

    workflow.setConfirmingSubmit(true);
  }, [editState.editLockActive, autosave.writeGroup]); // stateRef, workflow refs are stable

  // ── Submit: finalize ───────────────────────────────────────
  const handleConfirmSubmit = useCallback(async () => {
    workflow.setConfirmingSubmit(false);
    setSubmitError("");
    loading.setLoadingState({ stage: "loading", message: "Submitting scores…" });

    const {
      scores: s,
      comments: c,
      jurorId: jid,
      periodId: sid,
      projects: projs,
    } = stateRef.current;

    if (!jid || !sid || !Array.isArray(projs) || projs.length === 0) {
      loading.setLoadingState(null);
      workflow.submitPendingRef.current = false;
      return;
    }

    // Flush any pending edits before finalizing.
    let allSaved = true;
    for (const p of projs) {
      const ok = await autosave.writeGroup(p.project_id);
      if (!ok) allSaved = false;
    }
    if (!allSaved) {
      loading.setLoadingState(null);
      setSubmitError("Could not save all scores. Please check your connection and try again.");
      workflow.submitPendingRef.current = false;
      return;
    }

    try {
      const sessionToken = stateRef.current.jurorSessionToken;
      if (!sessionToken) {
        const e = new Error("juror_session_missing");
        e.code = "P0401";
        throw e;
      }
      // RPC returns JSON — always truthy even on failure. Inspect the `ok`
      // field so the client doesn't silently treat `{ok: false, ...}` as
      // a successful finalize.
      const result = await finalizeJurorSubmission(sid, jid, sessionToken);
      if (!result || result.ok === false) {
        const code = String(result?.error_code || "finalize_failed");
        const e = new Error(code);
        if (code === "session_not_found" || code === "invalid_session") {
          e.code = "P0401";
        }
        throw e;
      }

      scoring.setDoneScores({ ...s });
      scoring.setDoneComments({ ...c });
      editState.setEditMode(false);
      workflow.setStep("done");
      editState.setEditAllowed(false);

      // Refresh projects + rankings for DoneStep.
      Promise.all([
        listProjects(sid, jid, null, sessionToken),
        getProjectRankings(sid, sessionToken).catch(() => []),
      ]).then(([projectList, rankings]) => {
        const rankMap = new Map((rankings || []).map((r) => [r.project_id, r.avg_score]));
        const uiProjects = projectList.map((p) => ({
          project_id:         p.project_id,
          group_no:           p.group_no,
          title:              p.title,
          members:            p.members,
          final_submitted_at: p.final_submitted_at,
          updated_at:         p.updated_at,
          avg_score:          rankMap.get(p.project_id) ?? null,
        }));
        loading.setProjects(uiProjects);
      }).catch(() => {});
    } catch (e) {
      // Keep user in eval mode; submission didn't finalize. Log the raw
      // error so diagnostic detail survives the generic UI toast.
      console.error("[finalize] failed", e);
      const msg = String(e?.message || "");
      if (isSessionExpiredError(e) || msg === "juror_session_missing") {
        // Session expired mid-finalization. Block further writes and surface the
        // distinct sessionExpired state (set by writeGroup or here) so the UI
        // can show "Your session has expired" rather than a generic failure.
        autosave.setSessionExpired(true);
        editState.setEditLockActive(true);
        setSubmitError("Your session has expired. Please refresh and re-enter your PIN.");
      } else if (isPeriodLockedError(e)) {
        editState.setEditLockActive(true);
        setSubmitError("Evaluations are locked for this period.");
      } else if (msg === "juror_blocked") {
        editState.setEditLockActive(true);
        setSubmitError("This juror has been blocked. Please contact the coordinators.");
      } else {
        setSubmitError(`Final submission failed (${msg || "unknown"}). Please try again.`);
      }
    } finally {
      loading.setLoadingState(null);
      workflow.submitPendingRef.current = false;
    }
  }, [autosave.writeGroup]);

  const handleCancelSubmit = useCallback(() => {
    workflow.setConfirmingSubmit(false);
    workflow.submitPendingRef.current = false;
  }, []);

  // ── Edit-mode from DoneStep ────────────────────────────────
  const handleEditScores = useCallback(() => {
    if (!editState.editAllowed) return;
    const s = scoring.doneScores || scoring.scores;
    const c = scoring.doneComments || scoring.comments;
    scoring.pendingScoresRef.current   = s;
    scoring.pendingCommentsRef.current = c;
    autosave.lastWrittenRef.current    = Object.fromEntries(
      Object.keys(s || {}).map((pid) => {
        const snapshot = buildScoreSnapshot(s[pid], c?.[pid], effectiveCriteria);
        return [pid, { key: snapshot.key }];
      })
    );
    scoring.setScores(s);
    scoring.setComments(c);
    editState.setEditMode(true);
    scoring.setGroupSynced(
      Object.fromEntries(loading.projects.map((p) => [p.project_id, true]))
    );
    workflow.setStep("eval");
  }, [
    editState.editAllowed,
    scoring.doneScores,
    scoring.doneComments,
    scoring.scores,
    scoring.comments,
    loading.projects,
  ]);

  // ── Full reset ─────────────────────────────────────────────
  const resetAll = useCallback(() => {
    session.setJurorId("");
    session.setJurorSessionToken("");
    identity.setJuryName("");
    identity.setAffiliation("");
    loading.setPeriods([]);
    loading.setPeriodId("");
    loading.setPeriodName("");
    loading.setTenantAdminEmail("");
    loading.setCriteriaConfig([]);
    loading.setActiveProjectCount(null);
    loading.setProgressCheck(null);
    loading.setProjects([]);
    workflow.setStep("identity");
    workflow.setCurrent(0);
    scoring.setScores({});
    scoring.setComments({});
    scoring.setTouched({});
    scoring.setGroupSynced({});
    editState.setEditMode(false);
    editState.setEditAllowed(false);
    editState.setEditLockActive(false);
    scoring.setDoneScores(null);
    scoring.setDoneComments(null);
    loading.setLoadingState(null);
    autosave.setSaveStatus("idle");
    autosave.setSessionExpired(false);
    session.setPinError("");
    session.setPinErrorCode("");
    session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
    session.setPinLockedUntil("");
    identity.setAuthError("");
    session.setIssuedPin("");
    workflow.setConfirmingSubmit(false);
    scoring.pendingScoresRef.current      = {};
    scoring.pendingCommentsRef.current    = {};
    autosave.lastWrittenRef.current       = {};
    loading.periodSelectLockRef.current   = false;
    workflow.submitPendingRef.current     = false;
    clearJurySession();
  }, []);

  // ── Clear all persisted jury session data ──────────────────
  const clearLocalSession = useCallback(() => {
    clearJurySession();
  }, []);

  return {
    handleNavigate,
    handleRequestSubmit,
    handleConfirmSubmit,
    handleCancelSubmit,
    handleEditScores,
    resetAll,
    clearLocalSession,
  };
}
