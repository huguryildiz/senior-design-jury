// src/jury/hooks/useJuryHandlers.js
// ============================================================
// Owns all cross-hook callback handlers for the jury flow.
//
// Called by the orchestrator after all sub-hooks and stateRef are
// assembled. Receives every sub-hook instance as a single params
// object — does NOT import sub-hooks directly (isolation rule
// preserved: no sub-hook imports another sub-hook).
//
// Handlers returned:
//   handleNavigate         — save current project, then advance to newIndex
//   handleScore            — onChange: update scores in state + pending ref
//   handleScoreBlur        — onBlur: normalize value, persist via writeGroup
//   handleCommentChange    — onChange: update comment in state + pending ref
//   handleCommentBlur      — onBlur: persist via writeGroup
//   handleRequestSubmit    — validate all complete, flush saves, open confirm
//   handleConfirmSubmit    — finalize submission, advance to "done"
//   handleCancelSubmit     — dismiss confirm dialog
//   handleEditScores       — re-enter eval from DoneStep
//   handleIdentitySubmit   — name + dept → load semesters
//   handleSemesterSelect   — semester → create/get juror, issue PIN
//   handlePinSubmit        — verify PIN, advance to eval
//   handlePinRevealContinue — pin_reveal → load semester
//   handleProgressContinue — advance from progress_check step
//   resetAll               — full state reset to identity step
//   clearLocalSession      — remove jury.* keys from localStorage
//
// Internal:
//   _loadSemester(semester, overrideJurorId, _identityOverride, options)
//     Shared async inner function used by handlePinSubmit and
//     handleSemesterSelect. Intentionally NOT useCallback — including
//     it in any deps array causes infinite render loops. All reads use
//     stateRef.current for safe access outside the render cycle.
// ============================================================

import { useCallback } from "react";
import { getActiveCriteria, buildMudekLookup } from "../../shared/criteriaHelpers";

import {
  listSemesters,
  listProjects,
  createOrGetJurorAndIssuePin,
  verifyJurorPin,
  getJurorEditState,
  finalizeJurorSubmission,
} from "../../shared/api";
import {
  isAllFilled,
  isAllComplete,
  makeEmptyTouched,
  makeAllTouched,
} from "../utils/scoreState";
import { buildScoreSnapshot, isSemesterLockedError, isSessionExpiredError } from "../utils/scoreSnapshot";
import { buildProgressCheck } from "../utils/progress";
import { getJurySessionKeys } from "../../shared/storage";

export function useJuryHandlers({
  identity,
  session,
  scoring,
  loading,
  workflow,
  editState,
  autosave,
  stateRef,
  setSubmitError,
}) {
  // Derive effective criteria: semester template (if set) or static config fallback.
  const effectiveCriteria = getActiveCriteria(loading.criteriaTemplate);
  const mudekLookup = buildMudekLookup(loading.mudekTemplate);

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
      setSubmitError("Evaluations are locked for this semester.");
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
      const { jurorId: jid, jurorSessionToken: sessionToken, semesterId: sid } = stateRef.current;
      try {
        const editStateResult = await getJurorEditState(sid, jid, sessionToken);
        if (editStateResult?.lock_active) {
          editState.setEditLockActive(true);
          setSubmitError("Evaluations are locked for this semester.");
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
      semesterId: sid,
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
      if (!sessionToken) throw new Error("juror_session_missing");
      const ok = await finalizeJurorSubmission(sid, jid, sessionToken);
      if (!ok) throw new Error("finalize_failed");

      workflow.doneFiredRef.current = true;
      scoring.setDoneScores({ ...s });
      scoring.setDoneComments({ ...c });
      editState.setEditMode(false);
      workflow.setStep("done");
      editState.setEditAllowed(false);

      // Refresh projects to get submission timestamps for DoneStep.
      listProjects(sid, jid)
        .then((projectList) => {
          const uiProjects = projectList.map((p) => ({
            project_id:         p.project_id,
            group_no:           p.group_no,
            project_title:      p.project_title,
            group_students:     p.group_students,
            final_submitted_at: p.final_submitted_at,
            updated_at:         p.updated_at,
          }));
          loading.setProjects(uiProjects);
        })
        .catch(() => {});
    } catch (e) {
      // Keep user in eval mode; submission didn't finalize.
      if (isSessionExpiredError(e)) {
        // Session expired mid-finalization. Block further writes and surface the
        // distinct sessionExpired state (set by writeGroup or here) so the UI
        // can show "Your session has expired" rather than a generic failure.
        autosave.setSessionExpired(true);
        editState.setEditLockActive(true);
        setSubmitError("Your session has expired. Please refresh and re-enter your PIN.");
      } else if (isSemesterLockedError(e)) {
        editState.setEditLockActive(true);
        setSubmitError("Evaluations are locked for this semester.");
      } else {
        setSubmitError("Final submission failed. Please try again.");
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

  // ── Score handlers ─────────────────────────────────────────

  const handleScore = useCallback(
    (pid, cid, val) => {
      if (editState.editLockActive) return;
      const stored = val === "" ? null : val;
      const newScores = {
        ...scoring.pendingScoresRef.current,
        [pid]: { ...scoring.pendingScoresRef.current[pid], [cid]: stored },
      };
      scoring.pendingScoresRef.current = newScores;
      scoring.setScores(newScores);
      scoring.setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      if (!isAllFilled(newScores, pid)) {
        scoring.setGroupSynced((prev) => ({ ...prev, [pid]: false }));
      }
    },
    [editState.editLockActive]
  );

  const handleScoreBlur = useCallback(
    (pid, cid) => {
      if (editState.editLockActive) return;
      const crit = effectiveCriteria.find((c) => c.id === cid);
      scoring.setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      const val = scoring.pendingScoresRef.current[pid]?.[cid];
      let normalized;
      if (val === "" || val === null || val === undefined) {
        normalized = null;
      } else {
        const n = parseInt(String(val), 10);
        normalized = Number.isFinite(n)
          ? Math.min(Math.max(n, 0), crit.max)
          : null;
      }
      const newScores = {
        ...scoring.pendingScoresRef.current,
        [pid]: { ...scoring.pendingScoresRef.current[pid], [cid]: normalized },
      };
      scoring.pendingScoresRef.current = newScores;
      scoring.setScores(newScores);
      autosave.writeGroup(pid);
    },
    [editState.editLockActive, autosave.writeGroup]
  );

  const handleCommentChange = useCallback((pid, val) => {
    if (editState.editLockActive) return;
    scoring.pendingCommentsRef.current = { ...scoring.pendingCommentsRef.current, [pid]: val };
    scoring.setComments((prev) => ({ ...prev, [pid]: val }));
  }, [editState.editLockActive]);

  const handleCommentBlur = useCallback(
    (pid) => {
      if (editState.editLockActive) return;
      autosave.writeGroup(pid);
    },
    [editState.editLockActive, autosave.writeGroup]
  );

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
    workflow.doneFiredRef.current = false;
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

  // ── Internal: load semester + projects ────────────────────
  // Shared by handlePinSubmit and handleSemesterSelect.
  // Kept as a plain async function (intentionally NOT useCallback):
  // including it in any deps array causes infinite render loops.
  const _loadSemester = async (semester, overrideJurorId, _identityOverride, options = {}) => {
    const jid = overrideJurorId || stateRef.current.jurorId;
    const { showProgressCheck = false, showEmptyProgress = false } = options;

    // Cancel any previous in-flight load and issue a fresh signal.
    loading.loadAbortRef.current?.abort();
    const ctrl = new AbortController();
    loading.loadAbortRef.current = ctrl;
    const { signal } = ctrl;

    loading.setLoadingState({ stage: "loading", message: "Loading projects…" });
    try {
      const projectList = await listProjects(semester.id, jid, signal);
      let editStateResult = null;
      try {
        const sessionToken = stateRef.current.jurorSessionToken;
        editStateResult = await getJurorEditState(semester.id, jid, sessionToken, signal);
      } catch (e) {
        if (e?.name === "AbortError") throw e; // propagate abort
      }

      loading.setSemesterId(semester.id);
      loading.setSemesterName(semester.name);

      // Store the semester's criteria template so the eval UI renders dynamically.
      // `semester` comes from the listSemesters result which now includes criteria_template.
      const semTemplate = semester.criteria_template || [];
      if (!semester.criteria_template || semester.criteria_template.length === 0) {
        console.warn(
          `[_loadSemester] Semester "${semester.name}" (${semester.id}) has no criteria_template — falling back to global CRITERIA from config.js`
        );
      }
      const mudekTemplate = semester.mudek_template || [];
      loading.setCriteriaTemplate(semTemplate);
      loading.setMudekTemplate(mudekTemplate);
      const semCriteria = getActiveCriteria(semTemplate);

      // Seed scores / comments from existing DB data
      const seedScores = Object.fromEntries(
        projectList.map((p) => [p.project_id, { ...p.scores }])
      );
      const seedComments = Object.fromEntries(
        projectList.map((p) => [p.project_id, p.comment || ""])
      );
      const seedTouched = makeEmptyTouched(projectList, semCriteria);
      // A project is "synced" if all criteria are filled
      const seedSynced = Object.fromEntries(
        projectList
          .filter((p) => isAllFilled(seedScores, p.project_id, semCriteria))
          .map((p) => [p.project_id, true])
      );

      // Strip to just the fields the UI needs
      const uiProjects = projectList.map((p) => ({
        project_id:         p.project_id,
        group_no:           p.group_no,
        project_title:      p.project_title,
        group_students:     p.group_students,
        final_submitted_at: p.final_submitted_at,
        updated_at:         p.updated_at,
      }));

      scoring.pendingScoresRef.current   = seedScores;
      scoring.pendingCommentsRef.current = seedComments;
      autosave.lastWrittenRef.current    = Object.fromEntries(
        projectList.map((p) => {
          const snapshot = buildScoreSnapshot(seedScores[p.project_id], seedComments[p.project_id], semCriteria);
          return [p.project_id, { key: snapshot.key }];
        })
      );

      loading.setProjects(uiProjects);
      scoring.setScores(seedScores);
      scoring.setComments(seedComments);
      scoring.setTouched(seedTouched);
      scoring.setGroupSynced(seedSynced);
      workflow.setCurrent(0);
      workflow.doneFiredRef.current     = false;
      workflow.submitPendingRef.current = false;
      loading.setLoadingState(null);
      const canEdit = !!editStateResult?.edit_allowed;
      editState.setEditAllowed(canEdit);
      editState.setEditLockActive(!!editStateResult?.lock_active);

      const progressCheckData = buildProgressCheck(
        projectList,
        seedScores,
        { showProgressCheck, showEmptyProgress, canEdit }
      );
      const isFinalSubmitted = Boolean(
        projectList.find((p) => p.final_submitted_at)?.final_submitted_at
      );
      workflow.justLoadedRef.current = true;
      if (isFinalSubmitted) {
        scoring.setDoneScores({ ...seedScores });
        scoring.setDoneComments({ ...seedComments });
        editState.setEditMode(false);
        loading.setProgressCheck(null);
        workflow.setStep("done");
      } else {
        scoring.setDoneScores(null);
        scoring.setDoneComments(null);
        if (progressCheckData) {
          loading.setProgressCheck(progressCheckData);
          workflow.setStep("progress_check");
        } else {
          workflow.setStep("eval");
        }
      }
    } catch (e) {
      if (e?.name === "AbortError") return; // superseded by a newer load — ignore
      loading.setLoadingState(null);
      identity.setAuthError("Could not load projects. Please try again.");
      workflow.setStep("identity");
    }
  };

  // ── Identity submit ────────────────────────────────────────
  const handleIdentitySubmit = useCallback(async () => {
    const name = identity.juryName.trim();
    const inst = identity.juryDept.trim();
    if (!name || !inst) {
      identity.setAuthError("Please enter your full name and Institution / Department.");
      return;
    }
    identity.setAuthError("");
    loading.loadAbortRef.current?.abort();
    const ctrl = new AbortController();
    loading.loadAbortRef.current = ctrl;
    loading.setLoadingState({ stage: "loading", message: "Loading semesters…" });
    try {
      const semesterList = await listSemesters(ctrl.signal);
      const active = (semesterList || []).filter((s) => s.is_active);
      loading.setSemesters(active);
      if (active.length === 1) {
        await handleSemesterSelect(active[0]);
        return;
      }
      loading.setLoadingState(null);
      workflow.setStep("semester");
    } catch (e) {
      if (e?.name === "AbortError") return;
      loading.setLoadingState(null);
      identity.setAuthError("Could not load semesters. Please try again.");
    }
  // _loadSemester (via handleSemesterSelect) intentionally omitted from deps:
  // it is a plain async function and would cause an infinite loop if included.
  }, [identity.juryName, identity.juryDept]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PIN submit ─────────────────────────────────────────────
  const handlePinSubmit = useCallback(async (enteredPin) => {
    session.setPinError("");
    session.setPinErrorCode("");
    session.setPinLockedUntil("");
    loading.setLoadingState({ stage: "loading", message: "Verifying…" });
    try {
      const res = await verifyJurorPin(
        loading.semesterId, identity.juryName, identity.juryDept, enteredPin
      );
      if (!res?.ok) {
        loading.setLoadingState(null);
        const failedAttempts =
          typeof res?.failed_attempts === "number" ? res.failed_attempts : null;
        const lockedUntil = res?.locked_until || "";
        const lockedDate  = lockedUntil ? new Date(lockedUntil) : null;
        const isLocked    =
          res?.error_code === "locked"
          || (lockedDate && !Number.isNaN(lockedDate.getTime()) && lockedDate > new Date());
        if (res?.error_code === "semester_inactive") {
          session.setPinErrorCode("semester_inactive");
          session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
          session.setPinError("This semester is no longer active. Please start a new evaluation.");
        } else if (res?.error_code === "not_found") {
          session.setPinErrorCode("not_found");
          session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
          session.setPinError("No juror found with this name and Institution / Department.");
        } else if (res?.error_code === "no_pin") {
          session.setPinErrorCode("no_pin");
          session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
          session.setPinError("No PIN found for this semester. Please start a new evaluation.");
        } else if (isLocked) {
          session.setPinErrorCode("locked");
          session.setPinAttemptsLeft(0);
          session.setPinLockedUntil(lockedUntil);
          session.setPinError("locked");
        } else {
          session.setPinErrorCode("invalid");
          if (failedAttempts !== null) {
            session.setPinAttemptsLeft(Math.max(0, session.MAX_PIN_ATTEMPTS - failedAttempts));
          }
          session.setPinError("Incorrect PIN.");
        }
        return;
      }
      const jid          = res.juror_id;
      const sessionToken = String(res?.session_token || "").trim();
      if (!sessionToken) {
        loading.setLoadingState(null);
        session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
        session.setPinErrorCode("network");
        session.setPinLockedUntil("");
        session.setPinError("Session could not be established. Please try again.");
        return;
      }
      const nextName = res.juror_name || identity.juryName;
      const nextInst = res.juror_inst || identity.juryDept;
      if (res.juror_name) identity.setJuryName(res.juror_name);
      if (res.juror_inst) identity.setJuryDept(res.juror_inst);
      session.setJurorId(jid);
      session.setJurorSessionToken(sessionToken);
      if (res?.pin_plain_once) {
        session.setIssuedPin(res.pin_plain_once);
        session.setPinError("");
        session.setPinErrorCode("");
        session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
        session.setPinLockedUntil("");
        loading.setLoadingState(null);
        workflow.setStep("pin_reveal");
        return;
      }
      session.setIssuedPin("");
      session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
      session.setPinLockedUntil("");
      loading.setLoadingState(null);
      // Resolve the full semester object (with criteria_template) from the loaded list.
      // Passing only { id, name } loses criteria_template, causing effectiveCriteria to
      // fall back to hardcoded config CRITERIA and crash for custom-criteria semesters.
      const fullSemester =
        loading.semesters.find((s) => s.id === loading.semesterId)
        || { id: loading.semesterId, name: loading.semesterName };
      await _loadSemester(
        fullSemester,
        jid,
        { name: nextName, inst: nextInst },
        { showProgressCheck: true, showEmptyProgress: false }
      );
    } catch (_) {
      loading.setLoadingState(null);
      session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
      session.setPinErrorCode("network");
      session.setPinLockedUntil("");
      session.setPinError("Connection error. Please try again.");
    }
  // _loadSemester intentionally omitted — plain async function; inclusion
  // causes infinite render loops. The semesterId/Name deps already capture
  // the meaningful state changes that should re-trigger this handler.
  }, [loading.semesterId, loading.semesterName, identity.juryName, identity.juryDept]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Semester selection ─────────────────────────────────────
  const handleSemesterSelect = useCallback(
    async (semester) => {
      // semesterSelectLockRef: intentionally NOT reset on success — once the juror
      // advances past semester selection they cannot navigate back, so the lock is
      // permanent for the session. Reset only on error (to allow retry) or resetAll.
      if (loading.semesterSelectLockRef.current) return;
      if (!semester?.is_active) {
        identity.setAuthError("Only the active semester can be evaluated.");
        workflow.setStep("identity");
        return;
      }
      const name = identity.juryName.trim();
      const inst = identity.juryDept.trim();
      if (!name || !inst) {
        identity.setAuthError("Please enter your full name and Institution / Department.");
        workflow.setStep("identity");
        return;
      }
      loading.semesterSelectLockRef.current = true;
      identity.setAuthError("");
      loading.setSemesterId(semester.id);
      loading.setSemesterName(semester.name);
      loading.setLoadingState({ stage: "loading", message: "Preparing access…" });
      try {
        const res = await createOrGetJurorAndIssuePin(semester.id, name, inst);
        if (res?.juror_name) identity.setJuryName(res.juror_name);
        if (res?.juror_inst) identity.setJuryDept(res.juror_inst);
        if (res?.needs_pin) {
          session.setIssuedPin("");
          session.setPinError("");
          const lockedUntil = res?.locked_until || "";
          const lockedDate  = lockedUntil ? new Date(lockedUntil) : null;
          const isLocked    = lockedDate && !Number.isNaN(lockedDate.getTime()) && lockedDate > new Date();
          if (isLocked) {
            session.setPinErrorCode("locked");
            session.setPinAttemptsLeft(0);
            session.setPinLockedUntil(lockedUntil);
          } else {
            session.setPinErrorCode("");
            session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
            session.setPinLockedUntil("");
          }
          loading.setLoadingState(null);
          workflow.setStep("pin");
          return;
        }
        session.setIssuedPin(res?.pin_plain_once || "");
        session.setPinError("");
        session.setPinErrorCode("");
        session.setPinAttemptsLeft(session.MAX_PIN_ATTEMPTS);
        session.setPinLockedUntil("");
        loading.setLoadingState(null);
        workflow.setStep("pin_reveal");
      } catch (e) {
        loading.semesterSelectLockRef.current = false;
        loading.setLoadingState(null);
        if (String(e?.message || "").includes("semester_inactive")) {
          identity.setAuthError("This semester is no longer active. Please try again.");
        } else {
          identity.setAuthError("Could not start the evaluation. Please try again.");
        }
        workflow.setStep("identity");
      }
    },
    [identity.juryName, identity.juryDept]
  );

  const handlePinRevealContinue = useCallback(async () => {
    if (!session.issuedPin) return;
    await handlePinSubmit(session.issuedPin);
  }, [session.issuedPin, handlePinSubmit]);

  const handleProgressContinue = useCallback(() => {
    if (!loading.progressCheck?.nextStep) return;
    workflow.setStep(loading.progressCheck.nextStep);
    loading.setProgressCheck(null);
  }, [loading.progressCheck]);

  // NOTE: Intentionally no auto-resume. PIN is always required on entry.

  // ── Full reset ─────────────────────────────────────────────
  const resetAll = useCallback(() => {
    session.setJurorId("");
    session.setJurorSessionToken("");
    identity.setJuryName("");
    identity.setJuryDept("");
    loading.setSemesters([]);
    loading.setSemesterId("");
    loading.setSemesterName("");
    loading.setCriteriaTemplate([]);
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
    loading.semesterSelectLockRef.current = false;
    workflow.doneFiredRef.current         = false;
    workflow.submitPendingRef.current     = false;
    workflow.justLoadedRef.current        = false;
  }, []);

  // ── Clear localStorage ─────────────────────────────────────
  const clearLocalSession = useCallback(() => {
    try {
      Object.values(getJurySessionKeys()).forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  return {
    handleNavigate,
    handleRequestSubmit,
    handleConfirmSubmit,
    handleCancelSubmit,
    handleScore,
    handleScoreBlur,
    handleCommentChange,
    handleCommentBlur,
    handleEditScores,
    handleIdentitySubmit,
    handlePinSubmit,
    handleSemesterSelect,
    handlePinRevealContinue,
    handleProgressContinue,
    resetAll,
    clearLocalSession,
    effectiveCriteria,
    mudekLookup,
  };
}
