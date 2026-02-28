// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury flow.
//
// ── Write strategy ────────────────────────────────────────────
//   Single function: writeGroup(pid)
//     Writes one row to Sheets for the given project.
//     Each juror has exactly one row per group → overwrite.
//
//   Triggered by:
//     1. onBlur on any score input  → writeGroup(pid)
//     2. onBlur on comment textarea → writeGroup(pid)
//     3. Group navigation           → writeGroup(currentPid) then navigate
//
//   NO timers. NO debounce. NO background sync. NO cloud draft.
//   LocalStorage is used only to persist lock state across refresh.
//
// ── Refs ─────────────────────────────────────────────────────
//   pendingScoresRef / pendingCommentsRef:
//     Updated synchronously inside onChange handlers BEFORE React
//     commits the state update. writeGroup always reads from these
//     refs so it always sees the latest values regardless of when
//     in the render cycle it is called.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA } from "../config";
import {
  generateId,
  postToSheet,
  buildRow,
  fetchMyScores,
  pingSession,
  checkPin,
  createPin,
  verifyPin,
  storeToken,
  getToken,
  clearToken,
} from "../shared/api";

// ── Constants ─────────────────────────────────────────────────
const EDITING_ROWS_DELAY = 1500; // ms to wait before downgrading status in edit mode
const LOCK_PREFIX = "LOCKED__";

const lockKey = (jid) => `${LOCK_PREFIX}${jid}`;
const readLockFlag = (jid) => {
  if (!jid || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(lockKey(jid)) === "1";
  } catch {
    return false;
  }
};
const writeLockFlag = (jid) => {
  if (!jid || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lockKey(jid), "1");
  } catch {}
};
const clearLockFlag = (jid) => {
  if (!jid || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(lockKey(jid));
  } catch {}
};
const isLockedNow = (_, currentPinStep) => {
  return currentPinStep === "locked";
};

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
  // Shape: { rows, filledCount, totalCount, allSubmitted } | null
  const [sheetProgress, setSheetProgress] = useState(null);

  // Drives the save indicator in EvalStep header.
  const [saveStatus, setSaveStatus] = useState("idle");

  // ── PIN state ─────────────────────────────────────────────
  const [pinStep,      setPinStep]      = useState("idle");
  const [pinError,     setPinError]     = useState("");
  const [newPin,       setNewPin]       = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  // ── Session-kicked dialog state ───────────────────────────
  const [sessionKicked, setSessionKicked] = useState(false);
  const [kickedMsg,     setKickedMsg]     = useState("");

  // ── Refs ──────────────────────────────────────────────────
  const doneFiredRef = useRef(false);
  const stateRef     = useRef({});
  stateRef.current   = { juryName, juryDept, scores, comments, groupSynced, current };
  const lockCheckRef = useRef({ jid: "", done: false });

  // Always-fresh copies of scores/comments — updated synchronously
  // in onChange handlers ONLY. Never reset from render — doing so
  // would overwrite handler updates with stale React state between
  // setScores() call and the commit, causing lost writes.
  // Initialised once; kept current via explicit assignments in every
  // handler that mutates scores/comments.
  const pendingScoresRef   = useRef(scores);
  const pendingCommentsRef = useRef(comments);

  // ── Core write: single group → single row ─────────────────
  // Reads from pendingScoresRef/pendingCommentsRef — always fresh.
  // Called on blur and on group navigation. Never called on onChange.
  const writeGroup = useCallback((pid) => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const jid = jurorIdRef.current;
    const s   = pendingScoresRef.current;
    const c   = pendingCommentsRef.current;

    if (!n.trim() || !jid || !getToken()) return;
    if (!hasAnyCriteria(s, pid)) return; // nothing entered yet, skip

    const project = PROJECTS.find((p) => p.id === pid);
    if (!project) return;

    const status = isAllFilled(s, pid) ? "group_submitted" : "in_progress";
    const row    = buildRow(n, d, jid, s, c, project, status);

    setSaveStatus("saving");
    postToSheet({ rows: [row] });
    // postToSheet is fire-and-forget (no-cors), show feedback via timeout.
    setTimeout(() => setSaveStatus("saved"), 500);
    setTimeout(() => setSaveStatus("idle"),  2500);
  }, []);

  // ── Group navigation with guaranteed write ────────────────
  // Always writes the current group before switching.
  // Used by prev/next buttons and the group dropdown.
  const handleNavigate = useCallback((newIndex) => {
    const { current: cur } = stateRef.current;
    const currentPid = PROJECTS[cur]?.id;
    if (currentPid !== undefined) writeGroup(currentPid);
    setCurrent(newIndex);
  }, [writeGroup]);

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
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, jid, s, c, p, "all_submitted")),
      });
      setDoneScores({ ...s });
      setDoneComments({ ...c });
      setStep("done");
    }, 800);
    return () => clearTimeout(t);
  }, [groupSynced, step, editMode]);

  // ── Score handlers ────────────────────────────────────────

  // onChange: update state and ref only. No write.
  const handleScore = useCallback((pid, cid, val) => {
    const newScores = {
      ...pendingScoresRef.current,
      [pid]: { ...pendingScoresRef.current[pid], [cid]: val },
    };
    pendingScoresRef.current = newScores; // sync ref immediately
    setScores(newScores);
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
    if (val === "" && groupSynced[pid]) {
      setGroupSynced((prev) => ({ ...prev, [pid]: false }));
    }
  }, [groupSynced]);

  // onBlur: clamp value, sync ref, then write this group.
  const handleScoreBlur = useCallback((pid, cid) => {
    const crit = CRITERIA.find((c) => c.id === cid);
    const val  = pendingScoresRef.current[pid]?.[cid];
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

    // Clamp to [0, max].
    if (val !== "" && val !== undefined) {
      const n       = parseInt(val, 10);
      const clamped = Number.isFinite(n) ? Math.min(Math.max(n, 0), crit.max) : 0;
      if (String(clamped) !== String(val)) {
        const clamped_scores = {
          ...pendingScoresRef.current,
          [pid]: { ...pendingScoresRef.current[pid], [cid]: clamped },
        };
        pendingScoresRef.current = clamped_scores;
        setScores(clamped_scores);
      }
    }

    // Write this group now.
    writeGroup(pid);
  }, [writeGroup]);

  // ── Comment handlers ──────────────────────────────────────

  // onChange: update state and ref only. No write.
  const handleCommentChange = useCallback((pid, val) => {
    const nc = { ...pendingCommentsRef.current, [pid]: val };
    pendingCommentsRef.current = nc;
    setComments(nc);
  }, []);

  // onBlur: write this group.
  const handleCommentBlur = useCallback((pid) => {
    writeGroup(pid);
  }, [writeGroup]);

  // ── Final submit ──────────────────────────────────────────
  const submitFinal = useCallback((finalScores, finalComments) => {
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
  }, []);

  // ── Edit-mode entry ───────────────────────────────────────
  const handleEditScores = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const jid = jurorIdRef.current;
    const useScores   = doneScores   || scores;
    const useComments = doneComments || comments;

    if (jid) postToSheet({ action: "resetJuror" });

    pendingScoresRef.current   = useScores;
    pendingCommentsRef.current = useComments;
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

  // ── Session kick helper ───────────────────────────────────
  // Shows the "Session Ended" dialog overlay without changing the step.
  // The user must click "Sign in again" to proceed to PIN entry.
  const kickSession = useCallback((msg) => {
    clearToken();
    setKickedMsg(msg || "Your session has expired. Please enter your PIN again.");
    setSessionKicked(true);
  }, []);

  const handleKickedAcknowledge = useCallback(() => {
    setSessionKicked(false);
    setKickedMsg("");
    setPinError("");
    const jid = jurorIdRef.current;
    lockCheckRef.current = { jid, done: false };
    setPinStep("entering");
    setStep("pin");
  }, []);

  // ── PIN lock re-check (safety gate) ───────────────────────
  useEffect(() => {
    if (step !== "pin" || pinStep !== "entering") return;
    const jid = jurorIdRef.current;
    if (!jid) return;
    const cached = lockCheckRef.current;
    if (cached.jid === jid && cached.done) return;
    let cancelled = false;
    setSheetProgress({ loading: true });
    (async () => {
      try {
        const res = await checkPin(jid);
        if (cancelled) return;
        if (res.locked || res.status === "locked") {
          writeLockFlag(jid);
          setPinStep("locked");
          setAttemptsLeft(0);
          setPinError("");
        } else if (res.status === "ok") {
          clearLockFlag(jid);
        }
        if (typeof res.attemptsLeft === "number") {
          setAttemptsLeft(res.attemptsLeft);
        }
      } catch (_) {
        // Ignore lock check failures; allow PIN entry.
      } finally {
        if (!cancelled) setSheetProgress(null);
        lockCheckRef.current = { jid, done: true };
      }
    })();
    return () => { cancelled = true; };
  }, [step, pinStep]);

  // ── SINGLE ENTRY POINT after PIN ──────────────────────────
  const proceedAfterPin = useCallback(async () => {
    // Show overlay immediately — user sees feedback without waiting for the fetch.
    setSheetProgress({ loading: true });

    let sheetRows = [];
    try {
      sheetRows = await fetchMyScores() || [];
    } catch (err) {
      if (err.unauthorized) {
        kickSession("Your session has expired. Please enter your PIN again.");
        return;
      }
      // Other network errors — fall through, show empty progress dialog.
    }

    const totalCount  = PROJECTS.length;
    const filledCount = sheetRows.filter((r) =>
      r.status === "group_submitted" || r.status === "all_submitted"
    ).length;
    const allSubmitted =
      sheetRows.length >= totalCount &&
      sheetRows.every((r) => r.status === "all_submitted");

    setSheetProgress({ rows: sheetRows, filledCount, totalCount, allSubmitted });
  }, [kickSession]);

  // ── Session heartbeat — kick when another device logs in ──
  useEffect(() => {
    if (step !== "eval") return;
    const id = setInterval(async () => {
      try {
        const json = await pingSession();
        if (json.status === "unauthorized") {
          kickSession("Your session was ended because you signed in from another device.");
        }
      } catch (_) {
        // Network error — don't kick; retry next cycle.
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [step, kickSession]);

  // ── Visibility change — immediate check on tab focus ──────
  // Handles the common case: user logged in on Device B, then switches
  // back to Device A's tab. The kick dialog appears within ~1 s.
  useEffect(() => {
    if (step !== "eval") return;
    async function handleVisible() {
      if (document.visibilityState !== "visible") return;
      try {
        const json = await pingSession();
        if (json.status === "unauthorized") {
          kickSession("Your session was ended because you signed in from another device.");
        }
      } catch (_) {}
    }
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [step, kickSession]);

  // ── Confirm: load sheet data ──────────────────────────────
  const handleConfirmFromSheet = useCallback(() => {
    const prog = sheetProgress;
    if (!prog) return;
    setSheetProgress(null);

    if (prog.allSubmitted) {
      const { scores: s, comments: c } = rowsToState(prog.rows);
      pendingScoresRef.current   = s;
      pendingCommentsRef.current = c;
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
      pendingScoresRef.current   = s;
      pendingCommentsRef.current = c;
      setScores(s);
      setComments(c);
      setGroupSynced(synced);
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(s, p.id));
      setCurrent(firstIncomplete >= 0 ? firstIncomplete : 0);
      doneFiredRef.current = false;
    }

    setStep("eval");
  }, [sheetProgress]);

  // ── Start fresh ───────────────────────────────────────────
  const handleStartFresh = useCallback(() => {
    const empty   = makeEmptyScores();
    const emptyC  = makeEmptyComments();
    pendingScoresRef.current   = empty;
    pendingCommentsRef.current = emptyC;
    setSheetProgress(null);
    setScores(empty);
    setComments(emptyC);
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
      if (rows?.length) {
        const st = rowsToState(rows);
        useScores   = st.scores;
        useComments = st.comments;
      }
    } catch (_) {}

    if (jid) postToSheet({ action: "resetJuror" });

    pendingScoresRef.current   = useScores;
    pendingCommentsRef.current = useComments;
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
    setAttemptsLeft(null);

    if (isLockedNow(jid, pinStep)) {
      setSheetProgress(null);
      setPinStep("locked");
      setPinError("");
      setAttemptsLeft(0);
      setStep("pin");
      lockCheckRef.current = { jid, done: true };
      return;
    }

    // Show overlay immediately — user sees "Checking…" without waiting.
    setSheetProgress({ loading: true });

    if (getToken()) {
      try {
        const res = await checkPin(jid);
        if (res.locked || res.status === "locked") {
          writeLockFlag(jid);
          setSheetProgress(null);
          setPinStep("locked");
          setPinError("");
          setAttemptsLeft(0);
          setStep("pin");
          lockCheckRef.current = { jid, done: true };
          return;
        }
        if (typeof res.attemptsLeft === "number") {
          setAttemptsLeft(res.attemptsLeft);
        }
        if (res.status === "ok") clearLockFlag(jid);
        lockCheckRef.current = { jid, done: true };
      } catch (_) {
        // If lock check fails, fall back to existing session token.
        lockCheckRef.current = { jid, done: true };
      }
      await proceedAfterPin();
      return;
    }

    try {
      const res = await checkPin(jid);
      if (res.locked || res.status === "locked") {
        writeLockFlag(jid);
        setSheetProgress(null);
        setPinStep("locked");
        setPinError("");
        setAttemptsLeft(0);
        setStep("pin");
        lockCheckRef.current = { jid, done: true };
        return;
      }
      if (typeof res.attemptsLeft === "number") {
        setAttemptsLeft(res.attemptsLeft);
      }
      if (res.status !== "ok") {
        setSheetProgress(null);
        setPinError("Could not reach the server. Please try again.");
        setPinStep("entering");
        setStep("pin");
        lockCheckRef.current = { jid, done: true };
        return;
      }
      if (res.exists) {
        clearLockFlag(jid);
        setSheetProgress(null);
        setPinStep("entering");
        setPinError("");
        if (typeof res.attemptsLeft === "number") {
          setAttemptsLeft(res.attemptsLeft);
        }
        setStep("pin");
        lockCheckRef.current = { jid, done: true };
      } else {
        const r2 = await createPin(jid, n, d);
        if (r2.status === "ok") {
          clearLockFlag(jid);
          setSheetProgress(null);
          storeToken(r2.token);
          setNewPin(r2.pin);
          setPinStep("new");
          setStep("pin");
          setAttemptsLeft(null);
          lockCheckRef.current = { jid, done: true };
        } else {
          setSheetProgress(null);
          setPinError("Could not create a PIN. Please try again.");
          setPinStep("entering");
          setStep("pin");
          lockCheckRef.current = { jid, done: true };
        }
      }
    } catch (_) {
      setSheetProgress(null);
      setPinError("Connection error. Please check your network and try again.");
      setPinStep("entering");
      setStep("pin");
    }
  }, [proceedAfterPin, pinStep]);

  // ── PIN submit ────────────────────────────────────────────
  const handlePinSubmit = useCallback(async (enteredPin) => {
    const jid = jurorIdRef.current;
    if (isLockedNow(jid, pinStep)) {
      setPinStep("locked");
      setAttemptsLeft(0);
      setPinError("");
      return;
    }
    setSheetProgress({ loading: true });
    try {
      const res = await verifyPin(jid, enteredPin);
      if (res.locked || res.status === "locked") {
        writeLockFlag(jid);
        setSheetProgress(null);
        setPinStep("locked");
        setAttemptsLeft(0);
        setPinError("Too many failed attempts. Please contact the admin to reset your PIN.");
        return;
      }
      if (res.valid) {
        clearLockFlag(jid);
        storeToken(res.token || "");
        setPinStep("idle");
        setPinError("");
        if (typeof res.attemptsLeft === "number") {
          setAttemptsLeft(res.attemptsLeft);
        }
        await proceedAfterPin();
        return;
      }
      setSheetProgress(null);
      const left = typeof res.attemptsLeft === "number" ? res.attemptsLeft : null;
      if (left !== null) setAttemptsLeft(left);
      if (left !== null && left <= 0) {
        writeLockFlag(jid);
        setPinStep("locked");
        setPinError("Too many failed attempts. Please contact the admin.");
      } else {
        if (left !== null) {
          setPinError(`Incorrect PIN. ${left} attempt${left !== 1 ? "s" : ""} remaining.`);
        } else {
          setPinError("Incorrect PIN. Please try again.");
        }
      }
    } catch (_) {
      setSheetProgress(null);
      setPinError("Could not verify PIN. Please try again.");
    }
  }, [proceedAfterPin, pinStep]);

  const handlePinAcknowledge = useCallback(async () => {
    await proceedAfterPin();
  }, [proceedAfterPin, pinStep]);

  // ── Full reset ────────────────────────────────────────────
  const resetAll = useCallback(() => {
    const empty  = makeEmptyScores();
    const emptyC = makeEmptyComments();
    const jid = jurorIdRef.current;
    pendingScoresRef.current   = empty;
    pendingCommentsRef.current = emptyC;
    setJuryName("");
    setJuryDept("");
    setStep("info");
    setCurrent(0);
    setScores(empty);
    setComments(emptyC);
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
    setAttemptsLeft(null);
    doneFiredRef.current = false;
    jurorIdRef.current   = "";
    clearToken();
    clearLockFlag(jid);
    lockCheckRef.current = { jid: "", done: false };
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
    current,
    handleNavigate,

    scores, comments, touched,
    handleScore, handleScoreBlur,
    handleCommentChange, handleCommentBlur,

    project, progressPct, allComplete,
    groupSynced, editMode,

    doneScores,
    doneComments,

    sheetProgress,
    saveStatus,

    pinStep, pinError, newPin, attemptsLeft,
    handlePinSubmit, handlePinAcknowledge,

    sessionKicked, kickedMsg, handleKickedAcknowledge,

    handleStart,
    handleConfirmFromSheet,
    handleStartFresh,
    handleResubmit,
    handleEditScores,
    handleFinalSubmit,
    resetAll,
  };
}
