// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury flow.
//
// ── Persistence ───────────────────────────────────────────────
//   sessionStorage  : auth token only (cleared on tab close)
//   Google Sheets   : single source of truth for all score data
//   NO localStorage : removed — Sheets is master, no local fallback needed
//   NO cloud draft  : removed — instant writes replace draft mechanism
//
// ── Write strategy ───────────────────────────────────────────
//   Single mechanism: instantWrite (500ms debounce).
//   On blur: pending debounce is cancelled and write fires immediately.
//   No 30-second background sync. No manual save button. No cloud draft.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA } from "../config";
import {
  generateId,
  postToSheet,
  buildRow,
  fetchMyScores,
  verifySubmittedCount,
  checkPin,
  createPin,
  verifyPin,
  getFromSheetAuth,
  storeToken,
  getToken,
  clearToken,
} from "../shared/api";

// ── Constants ─────────────────────────────────────────────────
const INSTANT_DELAY      = 500;   // debounce for per-keystroke writes (ms)
const EDITING_ROWS_DELAY = 1500;  // wait before writing "group_submitted" in edit mode

// ── Empty-state factories ─────────────────────────────────────

export const makeEmptyScores = () =>
  Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, ""]))])
  );

export const makeEmptyComments = () =>
  Object.fromEntries(PROJECTS.map((p) => [p.id, ""]));

const makeEmptyTouched = () =>
  Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, false]))])
  );

export const makeAllTouched = () =>
  Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, true]))])
  );

// ── Pure helpers ──────────────────────────────────────────────

export const isAllFilled = (scores, pid) =>
  CRITERIA.every((c) => scores[pid]?.[c.id] !== "");

export const isAllComplete = (scores) =>
  PROJECTS.every((p) => isAllFilled(scores, p.id));

export const countFilled = (scores) =>
  PROJECTS.reduce(
    (t, p) => t + CRITERIA.reduce((n, c) => n + (scores[p.id]?.[c.id] !== "" ? 1 : 0), 0),
    0
  );

export const hasAnyCriteria = (scores, pid) =>
  CRITERIA.some((c) => scores[pid]?.[c.id] !== "");

// Convert myscores rows → { scores, comments } state shape.
export function rowsToState(rows) {
  const scores   = makeEmptyScores();
  const comments = makeEmptyComments();
  (rows || []).forEach((r) => {
    const pid = Number(r.projectId);
    if (!pid) return;
    scores[pid] = {
      ...scores[pid],
      technical: r.technical ?? "",
      design:    r.design    ?? "",
      delivery:  r.delivery  ?? "",
      teamwork:  r.teamwork  ?? "",
    };
    comments[pid] = r.comments ?? "";
  });
  return { scores, comments };
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export default function useJuryState() {

  // ── Identity ──────────────────────────────────────────────
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");
  const jurorIdRef = useRef("");

  useEffect(() => {
    jurorIdRef.current = juryName.trim() && juryDept.trim()
      ? generateId(juryName, juryDept)
      : "";
  }, [juryName, juryDept]);

  // ── Step / navigation ─────────────────────────────────────
  const [step,    setStep]    = useState("info");
  const [current, setCurrent] = useState(0);

  // ── Scoring state ─────────────────────────────────────────
  const [scores,   setScores]   = useState(makeEmptyScores);
  const [comments, setComments] = useState(makeEmptyComments);
  const [touched,  setTouched]  = useState(makeEmptyTouched);

  const [groupSynced, setGroupSynced] = useState({});
  const [editMode,    setEditMode]    = useState(false);

  const [doneScores,   setDoneScores]   = useState(null);
  const [doneComments, setDoneComments] = useState(null);

  // ── Sheet progress dialog state ───────────────────────────
  // Shape: { rows: [...], filledCount: number, totalCount: number,
  //          allSubmitted: boolean } | null
  const [sheetProgress, setSheetProgress] = useState(null);

  // saveStatus drives the auto-save indicator in EvalStep.
  const [saveStatus, setSaveStatus] = useState("idle");

  // ── PIN state ─────────────────────────────────────────────
  const [pinStep,      setPinStep]      = useState("idle");
  const [pinError,     setPinError]     = useState("");
  const [newPin,       setNewPin]       = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // ── Refs ──────────────────────────────────────────────────
  const doneFiredRef = useRef(false);
  const instantRef   = useRef(null);
  const stateRef     = useRef({});
  stateRef.current   = { juryName, juryDept, scores, comments, groupSynced, current };

  // ── Core write function ───────────────────────────────────
  // Builds rows from current scores and posts to Sheets.
  // Called by both instantWrite (debounced) and flushWrite (immediate).
  const doWrite = useCallback((newScores, newComments) => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const jid = jurorIdRef.current;
    if (!n.trim() || !jid || !getToken()) return;
    const rows = PROJECTS
      .filter((p) => hasAnyCriteria(newScores, p.id))
      .map((p) =>
        buildRow(n, d, jid, newScores, newComments, p,
          isAllFilled(newScores, p.id) ? "group_submitted" : "in_progress")
      );
    if (rows.length > 0) {
      setSaveStatus("saving");
      postToSheet({ rows }).then(() => {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      });
    }
  }, []);

  // Debounced write — fires after INSTANT_DELAY ms of inactivity.
  const instantWrite = useCallback((newScores, newComments) => {
    clearTimeout(instantRef.current);
    instantRef.current = setTimeout(() => doWrite(newScores, newComments), INSTANT_DELAY);
  }, [doWrite]);

  // Guaranteed write — cancels pending debounce and fires immediately.
  // Used on blur so navigating away never loses a score.
  const flushWrite = useCallback((newScores, newComments) => {
    clearTimeout(instantRef.current);
    doWrite(newScores, newComments);
  }, [doWrite]);

  // ── Auto-upgrade groupSynced ──────────────────────────────
  useEffect(() => {
    if (step !== "eval" || editMode) return;
    const newly = {};
    PROJECTS.forEach((p) => {
      if (!groupSynced[p.id] && isAllFilled(scores, p.id)) newly[p.id] = true;
    });
    if (Object.keys(newly).length > 0)
      setGroupSynced((prev) => ({ ...prev, ...newly }));
  }, [scores, step, groupSynced, editMode]);

  // ── Auto-done ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== "eval" || doneFiredRef.current || editMode) return;
    if (!PROJECTS.every((p) => groupSynced[p.id])) return;

    doneFiredRef.current = true;
    const t = setTimeout(() => {
      const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
      const jid = jurorIdRef.current;
      postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, jid, s, c, p, "all_submitted")) });
      setDoneScores({ ...s });
      setDoneComments({ ...c });
      setStep("done");
    }, 800);
    return () => clearTimeout(t);
  }, [groupSynced, step, editMode]);

  // ── Score / comment handlers ──────────────────────────────
  const handleScore = useCallback(
    (pid, cid, val) => {
      const newScores = { ...scores, [pid]: { ...scores[pid], [cid]: val } };
      setScores(newScores);
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      let newGroupSynced = groupSynced;
      if (val === "" && groupSynced[pid]) {
        newGroupSynced = { ...groupSynced, [pid]: false };
        setGroupSynced(newGroupSynced);
      }
      instantWrite(newScores, comments);
    },
    [scores, comments, groupSynced, instantWrite]
  );

  const handleScoreBlur = useCallback(
    (pid, cid) => {
      const crit = CRITERIA.find((c) => c.id === cid);
      const val  = scores[pid]?.[cid];
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

      // Clamp value to valid range.
      let finalScores = scores;
      if (val !== "" && val !== undefined) {
        const n       = parseInt(val, 10);
        const clamped = Number.isFinite(n) ? Math.min(Math.max(n, 0), crit.max) : 0;
        if (String(clamped) !== String(val)) {
          finalScores = { ...scores, [pid]: { ...scores[pid], [cid]: clamped } };
          setScores(finalScores);
        }
      }

      // Guaranteed write: cancel pending debounce, write right now.
      flushWrite(finalScores, comments);
    },
    [scores, comments, flushWrite]
  );

  const handleCommentChange = useCallback(
    (pid, val) => {
      const nc = { ...comments, [pid]: val };
      setComments(nc);
      instantWrite(scores, nc);
    },
    [scores, comments, instantWrite]
  );

  // ── Final submit ──────────────────────────────────────────
  const submitFinal = useCallback(
    (finalScores, finalComments) => {
      const { juryName: n, juryDept: d } = stateRef.current;
      const jid = jurorIdRef.current;
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, jid, finalScores, finalComments, p, "all_submitted")),
      });
      setDoneScores({ ...finalScores });
      setDoneComments({ ...finalComments });
      setEditMode(false);
      doneFiredRef.current = true;
      setStep("done");
    },
    []
  );

  // ── Edit-mode entry ───────────────────────────────────────
  const handleEditScores = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const jid = jurorIdRef.current;
    const useScores   = doneScores   || scores;
    const useComments = doneComments || comments;

    if (jid) postToSheet({ action: "resetJuror" });

    setScores(useScores);
    setComments(useComments);
    setEditMode(true);
    doneFiredRef.current = false;
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
    setStep("eval");

    setTimeout(() => {
      if (!jid) return;
      postToSheet({
        rows: PROJECTS.map((p) =>
          buildRow(n, d, jid, useScores, useComments, p, "group_submitted")
        ),
      });
    }, EDITING_ROWS_DELAY);
  }, [doneScores, doneComments, scores, comments]);

  // ── Edit-mode final submit ────────────────────────────────
  const handleFinalSubmit = useCallback(() => {
    if (!isAllComplete(scores)) {
      setTouched(makeAllTouched());
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(scores, p.id));
      if (firstIncomplete >= 0) setCurrent(firstIncomplete);
      return;
    }
    submitFinal(scores, comments);
  }, [scores, comments, submitFinal]);

  // ── SINGLE ENTRY POINT after PIN verification ─────────────
  // Always fetches myscores from Sheets (Sheets is master).
  // Always shows SheetsProgressDialog so the juror sees server-side state.
  const proceedAfterPin = useCallback(async () => {
    let sheetRows = [];
    try {
      sheetRows = await fetchMyScores() || [];
    } catch (_) {
      sheetRows = [];
    }

    const totalCount  = PROJECTS.length;
    const filledCount = sheetRows.filter((r) =>
      r.status === "group_submitted" || r.status === "all_submitted"
    ).length;
    const allSubmitted = sheetRows.length > 0
      && sheetRows.every((r) => r.status === "all_submitted")
      && sheetRows.length >= totalCount;

    setSheetProgress({
      rows:         sheetRows,
      filledCount,
      totalCount,
      allSubmitted,
    });
  }, []);

  // ── Confirm: load sheet data and proceed ──────────────────
  const handleConfirmFromSheet = useCallback(() => {
    const prog = sheetProgress;
    if (!prog) return;
    setSheetProgress(null);

    if (prog.allSubmitted) {
      const { scores: s, comments: c } = rowsToState(prog.rows);
      setScores(s);
      setComments(c);
      setDoneScores(s);
      setDoneComments(c);
      setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
      doneFiredRef.current = true;
      setStep("done");
      return;
    }

    if (prog.rows.length > 0) {
      const { scores: s, comments: c } = rowsToState(prog.rows);
      const synced = Object.fromEntries(
        prog.rows
          .filter((r) => r.status === "group_submitted" || r.status === "all_submitted")
          .map((r) => [Number(r.projectId), true])
      );
      setScores(s);
      setComments(c);
      setGroupSynced(synced);

      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(s, p.id));
      setCurrent(firstIncomplete >= 0 ? firstIncomplete : 0);
      doneFiredRef.current = false;
    }
    // No sheet data → start with empty form (no localStorage fallback).

    setStep("eval");
  }, [sheetProgress]);

  // ── Start fresh: ignore sheet data ───────────────────────
  const handleStartFresh = useCallback(() => {
    setSheetProgress(null);
    setScores(makeEmptyScores());
    setComments(makeEmptyComments());
    setGroupSynced({});
    setCurrent(0);
    doneFiredRef.current = false;
    setEditMode(false);
    setStep("eval");
  }, []);

  // ── Resubmit from done screen ─────────────────────────────
  const handleResubmit = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const jid = jurorIdRef.current;

    let useScores   = makeEmptyScores();
    let useComments = makeEmptyComments();
    try {
      const rows = await fetchMyScores();
      if (rows && rows.length) {
        const st  = rowsToState(rows);
        useScores   = st.scores;
        useComments = st.comments;
      }
    } catch (_) {}

    if (jid) postToSheet({ action: "resetJuror" });

    setScores(useScores);
    setComments(useComments);
    setDoneScores(useScores);
    setDoneComments(useComments);
    setEditMode(true);
    doneFiredRef.current = false;
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
    setStep("eval");

    setTimeout(() => {
      if (!jid) return;
      postToSheet({
        rows: PROJECTS.map((p) =>
          buildRow(n, d, jid, useScores, useComments, p, "group_submitted")
        ),
      });
    }, EDITING_ROWS_DELAY);
  }, []);

  // ── Start button on InfoStep ──────────────────────────────
  const handleStart = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim() || !d.trim()) return;
    const jid = generateId(n, d);
    jurorIdRef.current = jid;

    if (getToken()) {
      await proceedAfterPin();
      return;
    }

    try {
      const res = await checkPin(jid);

      if (res.status !== "ok") {
        setPinError("Could not reach the server. Please try again.");
        setPinStep("entering");
        setStep("pin");
        return;
      }

      if (res.exists) {
        setPinStep("entering");
        setPinError("");
        setAttemptsLeft(3);
        setStep("pin");
      } else {
        const r2 = await createPin(jid, n, d);
        if (r2.status === "ok") {
          storeToken(r2.token);
          setNewPin(r2.pin);
          setPinStep("new");
          setStep("pin");
        } else {
          setPinError("Could not create a PIN. Please try again.");
          setPinStep("entering");
          setStep("pin");
        }
      }
    } catch (_) {
      setPinError("Connection error. Please check your network and try again.");
      setPinStep("entering");
      setStep("pin");
    }
  }, [proceedAfterPin]);

  // ── PIN submit ────────────────────────────────────────────
  const handlePinSubmit = useCallback(
    async (enteredPin) => {
      const jid = jurorIdRef.current;
      try {
        const res = await verifyPin(jid, enteredPin);

        if (res.locked) {
          setPinStep("locked");
          setPinError("Too many failed attempts. Please contact the admin to reset your PIN.");
          return;
        }

        if (res.valid) {
          storeToken(res.token || "");
          setPinStep("idle");
          setPinError("");
          await proceedAfterPin();
          return;
        }

        const left = typeof res.attemptsLeft === "number" ? res.attemptsLeft : attemptsLeft - 1;
        setAttemptsLeft(left);
        if (left <= 0) {
          setPinStep("locked");
          setPinError("Too many failed attempts. Please contact the admin.");
        } else {
          setPinError(`Incorrect PIN. ${left} attempt${left !== 1 ? "s" : ""} remaining.`);
        }
      } catch (_) {
        setPinError("Could not verify PIN. Please try again.");
      }
    },
    [attemptsLeft, proceedAfterPin]
  );

  const handlePinAcknowledge = useCallback(async () => {
    await proceedAfterPin();
  }, [proceedAfterPin]);

  // ── Full reset ────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setJuryName("");
    setJuryDept("");
    setStep("info");
    setCurrent(0);
    setScores(makeEmptyScores());
    setComments(makeEmptyComments());
    setTouched(makeEmptyTouched());
    setGroupSynced({});
    setSheetProgress(null);
    setEditMode(false);
    setDoneScores(null);
    setDoneComments(null);
    setSaveStatus("idle");
    setPinStep("idle");
    setPinError("");
    setNewPin("");
    setAttemptsLeft(3);
    doneFiredRef.current  = false;
    jurorIdRef.current    = "";
    clearToken();
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const project     = PROJECTS[current];
  const totalFields = PROJECTS.length * CRITERIA.length;
  const progressPct = Math.round((countFilled(scores) / totalFields) * 100);
  const allComplete = isAllComplete(scores);

  return {
    juryName, setJuryName,
    juryDept, setJuryDept,
    jurorId: jurorIdRef.current,

    step, setStep,
    current, setCurrent,

    scores, comments, touched,
    handleScore, handleScoreBlur, handleCommentChange,

    project, progressPct, allComplete,
    groupSynced, editMode,

    doneScores,   setDoneScores,
    doneComments, setDoneComments,

    sheetProgress,
    saveStatus,

    pinStep, pinError, newPin, attemptsLeft,
    handlePinSubmit, handlePinAcknowledge,

    handleStart,
    handleConfirmFromSheet,
    handleStartFresh,
    handleResubmit,
    handleEditScores,
    handleFinalSubmit,
    resetAll,
  };
}
