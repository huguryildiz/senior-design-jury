// src/jury/useJuryState.js
// ============================================================
// Thin orchestrator for the jury evaluation flow.
//
// Composes focused sub-hooks and wires them together via
// useJuryHandlers. Returns the same external API shape as
// before — JuryForm.jsx and all tests require zero changes.
//
// Sub-hooks (each owns a single concern):
//   useJurorIdentity  — juror name, affiliation, auth error
//   useJurorSession   — PIN/session token state
//   useJuryLoading    — period/project loading + abort ref
//   useJuryScoring    — scoring state + pending refs
//   useJuryEditState  — edit/lock state + polling effect
//   useJuryWorkflow   — step navigation, derived values
//   useJuryAutosave   — writeGroup, visibility autosave
//   useJuryHandlers   — all cross-hook callbacks
//
// What stays in the orchestrator:
//   stateRef            — composite always-fresh ref (read by async callbacks)
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
//   "identity" → "period" → ("pin" | "pin_reveal") → "progress_check" → "eval" → "done"
//   (period step auto-advances when exactly one active period)
// ============================================================

import { useEffect, useRef } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { DEMO_MODE as _DEMO_MODE } from "@/shared/lib/demoMode";
import { KEYS, saveJurySession, clearJurySession } from "@/shared/storage";
import { isAllFilled } from "./utils/scoreState";
import { deriveEffectiveCriteria } from "./hooks/juryHandlerUtils";
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

  // Derive effectiveCriteria early so workflow can use it without depending on handlers.
  const effectiveCriteria = deriveEffectiveCriteria(loading.criteriaConfig);

  // ── Sub-hooks (with params from already-called hooks) ─────
  // workflow is called before editState so editState can receive workflow.step
  // (avoids a circular dep: editState needs step; workflow no longer needs editMode).
  const workflow = useJuryWorkflow({
    scores:           scoring.scores,
    projects:         loading.projects,
    effectiveCriteria,
  });

  const editState = useJuryEditState({
    step:              workflow.step,
    jurorId:           session.jurorId,
    periodId:          loading.periodId,
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
    periodId:          loading.periodId,
    periodName:        loading.periodName,
    projects:          loading.projects,
    scores:            scoring.scores,
    comments:          scoring.comments,
    current:           workflow.current,
    criteriaConfig:    loading.criteriaConfig,
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

  // ── Session persistence ────────────────────────────────────
  // Write key session data to sessionStorage so page refreshes can restore
  // the exact step. Only runs in production mode.
  useEffect(() => {
    if (_DEMO_MODE) return;
    const { jurorSessionToken, jurorId, periodId } = stateRef.current;
    if (!jurorSessionToken || !jurorId || !periodId) return;
    saveJurySession({
      jurorSessionToken,
      jurorId,
      periodId,
      periodName:  loading.periodName,
      juryName:    identity.juryName,
      affiliation: identity.affiliation,
      current:     workflow.current,
    });
  }, [session.jurorSessionToken, session.jurorId, loading.periodId, loading.periodName, identity.juryName, identity.affiliation, workflow.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session hydration on page refresh ──────────────────────
  // On mount, if sessionStorage has a valid session snapshot, re-fetch
  // projects + scores and restore to the correct step (eval / done).
  const _hydrateCalledRef = useRef(false);
  useEffect(() => {
    if (_DEMO_MODE) return;
    if (_hydrateCalledRef.current) return;
    _hydrateCalledRef.current = true;
    const token = session.jurorSessionToken;
    const jid   = session.jurorId;
    const pid   = loading.periodId;
    if (!token || !jid || !pid) return;
    const savedCurrent = parseInt(
      (() => { try { return localStorage.getItem(KEYS.JURY_CURRENT) || sessionStorage.getItem(KEYS.JURY_CURRENT); } catch { return "0"; } })() || "0",
      10
    ) || 0;
    handlers.handleHydrate(savedCurrent);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-upgrade groupSynced ───────────────────────────────
  // If all criteria for a project are filled but the write hasn't confirmed
  // (e.g. the user filled all fields without blurring), mark the project synced.
  // Kept in orchestrator (not useJuryWorkflow) to avoid circular dep with editState.
  useEffect(() => {
    if (workflow.step !== "eval" || editState.editMode) return;
    const newly = {};
    loading.projects.forEach((p) => {
      if (!scoring.groupSynced[p.project_id] && isAllFilled(scoring.scores, p.project_id, handlers.effectiveCriteria)) {
        newly[p.project_id] = true;
      }
    });
    if (Object.keys(newly).length > 0) {
      scoring.setGroupSynced((prev) => ({ ...prev, ...newly }));
    }
  }, [scoring.scores, workflow.step, scoring.groupSynced, editState.editMode, loading.projects, handlers.effectiveCriteria]);

  // ── PIN lockout: redirect to locked recovery screen ──────
  // When handlePinSubmit (or handlePeriodSelect) detects a lockout,
  // it sets pinErrorCode to "locked". Redirect to the dedicated
  // locked recovery screen instead of showing an inline alert.
  useEffect(() => {
    if (session.pinErrorCode === "locked" && workflow.step !== "locked") {
      workflow.setStep("locked");
    }
  }, [session.pinErrorCode, workflow.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session expired: redirect to PIN step ────────────────
  // When a write fails because the session token is invalid (e.g. another
  // device opened a new session, or the token expired), redirect the juror
  // back to the PIN step with an informative error message.
  useEffect(() => {
    if (!autosave.sessionExpired || workflow.step !== "eval") return;
    session.setJurorSessionToken("");
    session.setPinError("Your session has expired or was opened on another device. Please enter your PIN again to continue.");
    session.setPinErrorCode("session_expired");
    workflow.setStep("pin");
    autosave.setSessionExpired(false);
  }, [autosave.sessionExpired, workflow.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  return {
    // Identity
    jurorId:           session.jurorId,
    jurorSessionToken: session.jurorSessionToken,
    juryName:          identity.juryName,
    setJuryName:       identity.setJuryName,
    affiliation:       identity.affiliation,
    setAffiliation:    identity.setAffiliation,
    authError:         identity.authError,
    issuedPin:         session.issuedPin,

    // Period
    periods:            loading.periods,
    periodId:           loading.periodId,
    periodName:         loading.periodName,
    tenantAdminEmail:   loading.tenantAdminEmail,
    orgName:            loading.orgName,
    currentPeriodInfo:  loading.currentPeriodInfo,
    activeProjectCount: loading.activeProjectCount,
    progressCheck:      loading.progressCheck,

    // Projects (dynamic)
    projects:         loading.projects,
    effectiveCriteria: handlers.effectiveCriteria,
    outcomeLookup:     handlers.outcomeLookup,

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
    pinMaxAttempts:  session.pinMaxAttempts,
    pinAttemptsLeft: session.pinAttemptsLeft,
    pinLockedUntil:  session.pinLockedUntil,
    handlePinSubmit:          handlers.handlePinSubmit,
    handleIdentitySubmit:     handlers.handleIdentitySubmit,
    handlePinRevealContinue:  handlers.handlePinRevealContinue,
    handleProgressContinue:   handlers.handleProgressContinue,

    // Period
    handlePeriodSelect: handlers.handlePeriodSelect,

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
