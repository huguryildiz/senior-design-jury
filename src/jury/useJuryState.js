// src/jury/useJuryState.js
// ============================================================
// Thin orchestrator for the jury evaluation flow.
//
// Composes focused sub-hooks and wires them together via
// useJuryHandlers. Returns the same external API shape as
// before — JuryForm.jsx and all tests require zero changes.
//
// Sub-hooks (each owns a single concern):
//   useJurorIdentity  — juror name, dept, auth error
//   useJurorSession   — PIN/session token state
//   useJuryLoading    — semester/project loading + abort ref
//   useJuryScoring    — scoring state + pending refs
//   useJuryEditState  — edit/lock state + polling effect
//   useJuryWorkflow   — step navigation, derived values
//   useJuryAutosave   — writeGroup, visibility autosave
//   useJuryHandlers   — all cross-hook callbacks
//
// What stays in the orchestrator:
//   stateRef            — composite always-fresh ref (read by async callbacks)
//   Auto-done effect    — avoids circular dep: workflow → handleRequestSubmit
//                         → writeGroup (autosave) → editLockActive (editState)
//   Auto-groupSynced effect — needs both editState.editMode and scoring state;
//                         cannot live in either sub-hook without circularity.
//
// ── Write strategy ────────────────────────────────────────────
//   writeGroup(pid): awaits rpc_upsert_score via Supabase.
//   Triggered by:
//     1. onBlur on any score input  → writeGroup(pid)
//     2. onBlur on comment textarea → writeGroup(pid)
//     3. Group navigation           → writeGroup(currentPid) then navigate
//     4. visibilitychange (hidden)  → writeGroup(currentPid)
//
//   pendingScoresRef / pendingCommentsRef (owned by useJuryScoring):
//     Updated synchronously in onChange handlers BEFORE React commits state.
//     writeGroup always reads from these refs so it always sees the latest
//     values regardless of render cycle.
//
// ── Step flow ─────────────────────────────────────────────────
//   "identity" → "semester" → ("pin" | "pin_reveal") → "progress_check" → "eval" → "done"
//   (semester step auto-advances when exactly one active semester)
// ============================================================

import { useEffect, useRef } from "react";
import { useToast } from "../components/toast/useToast";
import { isAllFilled } from "./utils/scoreState";
import { useJurorIdentity } from "./hooks/useJurorIdentity";
import { useJurorSession } from "./hooks/useJurorSession";
import { useJuryScoring } from "./hooks/useJuryScoring";
import { useJuryLoading } from "./hooks/useJuryLoading";
import { useJuryEditState } from "./hooks/useJuryEditState";
import { useJuryWorkflow } from "./hooks/useJuryWorkflow";
import { useJuryAutosave } from "./hooks/useJuryAutosave";
import { useJuryHandlers } from "./hooks/useJuryHandlers";

// Re-export pure helpers so existing imports in EvalStep.jsx and test files
// continue to resolve from this module without any changes.
export { isScoreFilled, normalizeScoreValue, countFilled } from "./utils/scoreState";

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export default function useJuryState() {

  // ── Sub-hooks (leaf: no deps on other sub-hooks) ──────────
  const identity = useJurorIdentity();
  const session  = useJurorSession();
  const scoring  = useJuryScoring();
  const loading  = useJuryLoading();

  // ── Sub-hooks (with params from already-called hooks) ─────
  // workflow is called before editState so editState can receive workflow.step
  // (avoids a circular dep: editState needs step; workflow no longer needs editMode).
  const workflow = useJuryWorkflow({
    scores:      scoring.scores,
    groupSynced: scoring.groupSynced,
    projects:    loading.projects,
  });

  const editState = useJuryEditState({
    step:              workflow.step,
    jurorId:           session.jurorId,
    semesterId:        loading.semesterId,
    jurorSessionToken: session.jurorSessionToken,
  });

  // ── stateRef: composite always-fresh ref ──────────────────
  // Assembled here because it spans identity, session, loading, scoring,
  // and workflow state. Read by writeGroup and async callbacks.
  // Reassigned every render so async callbacks always see the latest values.
  const stateRef = useRef({});
  stateRef.current = {
    jurorId:           session.jurorId,
    jurorSessionToken: session.jurorSessionToken,
    semesterId:        loading.semesterId,
    projects:          loading.projects,
    scores:            scoring.scores,
    comments:          scoring.comments,
    current:           workflow.current,
  };

  const autosave = useJuryAutosave({
    stateRef,
    pendingScoresRef:   scoring.pendingScoresRef,
    pendingCommentsRef: scoring.pendingCommentsRef,
    editLockActive:     editState.editLockActive,
    setGroupSynced:     scoring.setGroupSynced,
    setEditLockActive:  editState.setEditLockActive,
    step:               workflow.step,
  });

  // ── Submit error (toast) ───────────────────────────────────
  const _toast = useToast();
  const setSubmitError = (msg) => { if (msg) _toast.error(msg); };

  // ── All cross-hook handlers ────────────────────────────────
  const handlers = useJuryHandlers({
    identity, session, scoring, loading, workflow, editState, autosave,
    stateRef, setSubmitError,
  });

  // ── Auto-done: show confirmation when all groups synced ───
  // Kept in orchestrator to avoid circular dependency:
  //   workflow needs handleRequestSubmit
  //   handleRequestSubmit needs writeGroup (autosave)
  //   writeGroup needs editLockActive (editState)
  useEffect(() => {
    if (workflow.step !== "eval" || workflow.doneFiredRef.current || editState.editMode) return;
    if (workflow.submitPendingRef.current) return;
    if (loading.projects.length === 0) return;
    // Skip the first render after _loadSemester seeds state so a fully-scored
    // juror who resumes isn't immediately thrown into the submit confirmation.
    if (workflow.justLoadedRef.current) { workflow.justLoadedRef.current = false; return; }
    if (!loading.projects.every((p) => scoring.groupSynced[p.project_id])) return;

    handlers.handleRequestSubmit();
  }, [scoring.groupSynced, workflow.step, editState.editMode, loading.projects, handlers.handleRequestSubmit]);

  // ── Auto-upgrade groupSynced ───────────────────────────────
  // If all criteria for a project are filled but the write hasn't confirmed
  // (e.g. the user filled all fields without blurring), mark the project synced.
  // Kept in orchestrator (not useJuryWorkflow) to avoid circular dep with editState.
  useEffect(() => {
    if (workflow.step !== "eval" || editState.editMode) return;
    const newly = {};
    loading.projects.forEach((p) => {
      if (!scoring.groupSynced[p.project_id] && isAllFilled(scoring.scores, p.project_id)) {
        newly[p.project_id] = true;
      }
    });
    if (Object.keys(newly).length > 0) {
      scoring.setGroupSynced((prev) => ({ ...prev, ...newly }));
    }
  }, [scoring.scores, workflow.step, scoring.groupSynced, editState.editMode, loading.projects]);

  // ─────────────────────────────────────────────────────────
  return {
    // Identity
    jurorId:           session.jurorId,
    jurorSessionToken: session.jurorSessionToken,
    juryName:          identity.juryName,
    setJuryName:       identity.setJuryName,
    juryDept:          identity.juryDept,
    setJuryDept:       identity.setJuryDept,
    authError:         identity.authError,
    issuedPin:         session.issuedPin,

    // Semester
    semesters:          loading.semesters,
    semesterId:         loading.semesterId,
    semesterName:       loading.semesterName,
    activeSemesterInfo: loading.activeSemesterInfo,
    activeProjectCount: loading.activeProjectCount,
    progressCheck:      loading.progressCheck,

    // Projects (dynamic)
    projects: loading.projects,

    // Step / navigation
    step:           workflow.step,
    setStep:        workflow.setStep,
    current:        workflow.current,
    handleNavigate: handlers.handleNavigate,

    // Scoring
    scores:              scoring.scores,
    comments:            scoring.comments,
    touched:             scoring.touched,
    handleScore:         handlers.handleScore,
    handleScoreBlur:     handlers.handleScoreBlur,
    handleCommentChange: handlers.handleCommentChange,
    handleCommentBlur:   handlers.handleCommentBlur,

    // Derived
    project:        workflow.project,
    progressPct:    workflow.progressPct,
    allComplete:    workflow.allComplete,
    groupSynced:    scoring.groupSynced,
    editMode:       editState.editMode,
    editAllowed:    editState.editAllowed,
    editLockActive: editState.editLockActive,
    doneScores:     scoring.doneScores,
    doneComments:   scoring.doneComments,

    // Loading
    loadingState:   loading.loadingState,
    saveStatus:     autosave.saveStatus,
    sessionExpired: autosave.sessionExpired,

    // PIN
    pinError:        session.pinError,
    pinErrorCode:    session.pinErrorCode,
    pinAttemptsLeft: session.pinAttemptsLeft,
    pinLockedUntil:  session.pinLockedUntil,
    handlePinSubmit:          handlers.handlePinSubmit,
    handleIdentitySubmit:     handlers.handleIdentitySubmit,
    handlePinRevealContinue:  handlers.handlePinRevealContinue,
    handleProgressContinue:   handlers.handleProgressContinue,

    // Semester
    handleSemesterSelect: handlers.handleSemesterSelect,

    // Submit
    confirmingSubmit:    workflow.confirmingSubmit,
    handleRequestSubmit: handlers.handleRequestSubmit,
    handleConfirmSubmit: handlers.handleConfirmSubmit,
    handleCancelSubmit:  handlers.handleCancelSubmit,

    // Edit
    handleEditScores:  handlers.handleEditScores,
    handleFinalSubmit: handlers.handleRequestSubmit,

    resetAll:          handlers.resetAll,
    clearLocalSession: handlers.clearLocalSession,
  };
}
