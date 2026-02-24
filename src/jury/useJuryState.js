// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury flow.
//
// ── jurorId ──────────────────────────────────────────────────
// Derived from generateId(name, dept): deterministic 8-hex hash.
// Computed once name+dept are entered; stored in jurorIdRef so
// all async callbacks always read the latest value.
//
// ── Auth flow ─────────────────────────────────────────────────
//   InfoStep OK
//     → handleStart()
//         Token in sessionStorage? → skip PIN, go to proceedAfterPin()
//         No token:
//           checkPin(jurorId) → exists=false → createPin → storeToken → "new" PIN screen
//           checkPin(jurorId) → exists=true  → "entering" PIN screen
//           verifyPin  → storeToken(token)
//     → proceedAfterPin()                      ← SINGLE ENTRY POINT
//         Always fetches myscores from Sheets  ← Sheets is master
//         Sets sheetProgress state             ← triggers SheetsProgressDialog
//         User confirms dialog → setStep("eval") or setStep("done")
//
// ── Persistence ───────────────────────────────────────────────
//   sessionStorage  : auth token (cleared on tab close)
//   localStorage    : name, dept, scores, comments (pre-fills InfoStep)
//   Cloud draft     : Drafts sheet via saveDraft POST (used for cross-device)
//
// ── Sheets as master ─────────────────────────────────────────
//   After PIN verification, myscores is ALWAYS fetched.
//   The result is shown in a "X/6 groups found" dialog regardless
//   of all_submitted status. This ensures the user always knows
//   the server-side state and can decide whether to continue or
//   start fresh. Local draft is a fallback only when the sheet
//   has no data at all for this juror.
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
const INSTANT_DELAY      = 500;       // debounce for per-keystroke writes
const EDITING_ROWS_DELAY = 1500;      // wait before writing "group_submitted" in edit mode      // wait before writing "group_submitted" in edit mode

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
  // sheetProgress is set by proceedAfterPin after fetching myscores.
  // It is always shown as a dialog before entering eval/done so the
  // juror always knows the server-side state.
  //
  // Shape: { rows: [...], filledCount: number, totalCount: number,
  //          allSubmitted: boolean } | null
  const [sheetProgress, setSheetProgress] = useState(null);

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

  // ── Instant rows write (debounced) — ONLY write mechanism ──────────
  const instantWrite = useCallback((newScores, newComments, newGroupSynced) => {
    clearTimeout(instantRef.current);
    instantRef.current = setTimeout(() => {
      const { juryName: n, juryDept: d } = stateRef.current;
      const jid = jurorIdRef.current;
      if (!n.trim() || !jid || !getToken()) return;
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(newScores, p.id))
        .map((p) =>
          buildRow(n, d, jid, newScores, newComments, p,
            isAllFilled(newScores, p.id) ? "group_submitted" : "in_progress")
        );
      if (rows.length > 0) postToSheet({ rows });
    }, INSTANT_DELAY);
  }, []);

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
      postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, jid, s, c, p, "all_submitted")) });      setDoneScores({ ...s });
      setDoneComments({ ...c });
      setStep("done");
    }, 800);
    return () => clearTimeout(t);
  }, [groupSynced, step, editMode]);

  // ── Score / comment handlers ──────────────────────────────
  const handleScore = useCallback(
    (pid, cid, val) => {
      const crit = CRITERIA.find((c) => c.id === cid);
      let nextVal = val;

      // Clamp immediately so we never write out-of-range values to Sheets.
      if (val !== "" && val !== undefined && crit && typeof crit.max === "number") {
        const n = parseInt(val, 10);
        if (Number.isFinite(n)) {
          nextVal = String(Math.min(Math.max(n, 0), crit.max));
        } else {
          nextVal = "0";
        }
      }

      const newScores = { ...scores, [pid]: { ...scores[pid], [cid]: nextVal } };
      setScores(newScores);
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

      let newGroupSynced = groupSynced;
      if (nextVal === "" && groupSynced[pid]) {
        newGroupSynced = { ...groupSynced, [pid]: false };
        setGroupSynced(newGroupSynced);
      }
      instantWrite(newScores, comments, newGroupSynced);
    },
    [scores, comments, groupSynced, instantWrite]
  );

  const handleScoreBlur = useCallback(
    (pid, cid) => {
      const crit = CRITERIA.find((c) => c.id === cid);
      const val  = scores[pid]?.[cid];
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      if (val === "" || val === undefined) return;
      const n = parseInt(val, 10);
      const clamped =
        Number.isFinite(n) && crit && typeof crit.max === "number"
          ? Math.min(Math.max(n, 0), crit.max)
          : 0;
      if (String(clamped) !== String(val)) {
        const nextScores = { ...scores, [pid]: { ...scores[pid], [cid]: String(clamped) } };
        setScores(nextScores);
        instantWrite(nextScores, comments, groupSynced);
      } else {
        // Guarantee a write on blur (even if debounce hasn't fired yet).
        instantWrite(scores, comments, groupSynced);
      }
    },
    [scores, comments, groupSynced, instantWrite]
  );

  const handleCommentChange = useCallback(
    (pid, val) => {
      const nc = { ...comments, [pid]: val };
      setComments(nc);
      instantWrite(scores, nc, groupSynced);
    },
    [scores, comments, groupSynced, instantWrite]
  );

  // ── Final submit ──────────────────────────────────────────
  const submitFinal = useCallback(
    (finalScores, finalComments) => {
      const { juryName: n, juryDept: d } = stateRef.current;
      const jid = jurorIdRef.current;
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, jid, finalScores, finalComments, p, "all_submitted")),
      });      setDoneScores({ ...finalScores });
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
  // Always shows a SheetsProgressDialog so the juror sees the
  // server-side state before proceeding.
  //
  // sheetProgress shape:
  //   { rows, filledCount, totalCount, allSubmitted }
  //
  // The dialog calls either handleConfirmFromSheet (continue with
  // sheet data) or handleStartFresh (ignore sheet, empty form).
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

    // Always show the dialog — Sheets is master.
    setSheetProgress({
      rows:         sheetRows,
      filledCount,
      totalCount,
      allSubmitted,
    });
  }, []);

  // ── Confirm: load sheet data and proceed ──────────────────
  // Called when the user clicks "Continue" in SheetsProgressDialog.
  const handleConfirmFromSheet = useCallback(() => {
    const prog = sheetProgress;
    if (!prog) return;
    setSheetProgress(null);

    if (prog.allSubmitted) {
      // All groups submitted — restore scores and go to done screen.
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
      // Partial progress found — load sheet data into eval form.
      const { scores: s, comments: c } = rowsToState(prog.rows);
      const synced = Object.fromEntries(
        prog.rows
          .filter((r) => r.status === "group_submitted" || r.status === "all_submitted")
          .map((r) => [Number(r.projectId), true])
      );
      setScores(s);
      setComments(c);
      setGroupSynced(synced);

      // Navigate to the first incomplete group.
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(s, p.id));
      setCurrent(firstIncomplete >= 0 ? firstIncomplete : 0);
      doneFiredRef.current = false;
      } catch (_) {}
    }

    setStep("eval");
  }, [sheetProgress]);

  // ── Start fresh: ignore sheet data ───────────────────────
  // Called when the user clicks "Start Fresh" in SheetsProgressDialog.
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
  // If a valid token is already in session, skip PIN and go
  // directly to proceedAfterPin. Otherwise run the PIN flow.
  //
  // INVARIANT: proceedAfterPin() is NEVER called from here unless
  // a valid token is already stored in sessionStorage. Token-less
  // paths always end at the PIN screen, never at eval/done.
  const handleStart = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim() || !d.trim()) return;
    const jid = generateId(n, d);
    jurorIdRef.current = jid;

    // Token already in session (same tab, navigated back) → skip PIN.
    if (getToken()) {
      await proceedAfterPin();
      return;
    }

    try {
      const res = await checkPin(jid);

      if (res.status !== "ok") {
        // API secret wrong, network error, or GAS returned an error.
        // Show PIN entry so the juror can retry — do not proceed without a token.
        setPinError("Could not reach the server. Please try again.");
        setPinStep("entering");
        setStep("pin");
        return;
      }

      if (res.exists) {
        // PIN already set — show the entry screen.
        setPinStep("entering");
        setPinError("");
        setAttemptsLeft(3);
        setStep("pin");
      } else {
        // First time — create a PIN and issue a token.
        const r2 = await createPin(jid, n, d);
        if (r2.status === "ok") {
          storeToken(r2.token); // token stored BEFORE any navigation
          setNewPin(r2.pin);
          setPinStep("new");
          setStep("pin");
        } else {
          // createPin failed — show entry screen, do not proceed.
          setPinError("Could not create a PIN. Please try again.");
          setPinStep("entering");
          setStep("pin");
        }
      }
    } catch (_) {
      // Network or parse error — show PIN screen, do not proceed.
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

  // Called when new juror clicks "I've saved my PIN".
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

    sheetProgress,   // SheetsProgressDialog reads this

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
