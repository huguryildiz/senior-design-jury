// src/jury/useJuryState.js
// ============================================================
// Custom hook that owns ALL state and side-effects for the
// jury evaluation flow. JuryForm.jsx becomes a pure renderer.
//
// Responsibilities:
//  - Score / comment state management
//  - localStorage persistence
//  - Cloud draft save / load
//  - Periodic 2-min sync to Sheets
//  - Auto-done detection
//  - Edit mode transitions
//  - PIN check orchestration
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA } from "../config";
import {
  postToSheet,
  fetchMyScores,
  verifySubmittedCount,
  buildRow,
  calcRowTotal,
} from "../shared/api";

const STORAGE_KEY   = "ee492_jury_draft_v1";
const SCRIPT_URL    = import.meta.env.VITE_SCRIPT_URL || "";
const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
const DEBOUNCE_MS   = 400;
const INSTANT_DELAY = 300;

// ── State factory helpers ─────────────────────────────────────

export const makeEmptyScores = () =>
  Object.fromEntries(PROJECTS.map((p) => [
    p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, ""])),
  ]));

export const makeEmptyComments = () =>
  Object.fromEntries(PROJECTS.map((p) => [p.id, ""]));

const makeEmptyTouched = () =>
  Object.fromEntries(PROJECTS.map((p) => [
    p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, false])),
  ]));

export const makeAllTouched = () =>
  Object.fromEntries(PROJECTS.map((p) => [
    p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, true])),
  ]));

// ── Score helpers (pure, exported for UI use) ─────────────────

export const isAllFilled = (scores, pid) =>
  CRITERIA.every((c) => scores[pid]?.[c.id] !== "");

export const isAllComplete = (scores) =>
  PROJECTS.every((p) => isAllFilled(scores, p.id));

export const countFilled = (scores) =>
  PROJECTS.reduce((t, p) =>
    t + CRITERIA.reduce((n, c) => n + (scores[p.id]?.[c.id] !== "" ? 1 : 0), 0), 0);

export const hasAnyCriteria = (scores, pid) =>
  CRITERIA.some((c) => scores[pid]?.[c.id] !== "");

// Convert myscores API rows → scores/comments state
export function rowsToState(rows) {
  const es = makeEmptyScores();
  const ec = makeEmptyComments();
  (rows || []).forEach((r) => {
    const pid = Number(r.projectId);
    if (!pid) return;
    es[pid] = { ...es[pid], design: r.design ?? "", technical: r.technical ?? "", delivery: r.delivery ?? "", teamwork: r.teamwork ?? "" };
    ec[pid] = r.comments ?? "";
  });
  return { scores: es, comments: ec };
}

// ═════════════════════════════════════════════════════════════
// Hook
// ═════════════════════════════════════════════════════════════

export default function useJuryState({ startAtEval = false } = {}) {
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");

  // Screens: "info" | "pin" | "eval" | "done"
  const [step,    setStep]    = useState("info");
  const [current, setCurrent] = useState(0);

  const [scores,   setScores]   = useState(makeEmptyScores);
  const [comments, setComments] = useState(makeEmptyComments);
  const [touched,  setTouched]  = useState(makeEmptyTouched);

  const [groupSynced, setGroupSynced] = useState({});
  const [editMode,    setEditMode]    = useState(false);

  // Snapshot scores/comments at the moment of submission (for Done screen)
  const [doneScores,   setDoneScores]   = useState(null);
  const [doneComments, setDoneComments] = useState(null);

  // Cloud / PIN state
  const [cloudDraft,      setCloudDraft]      = useState(null);
  const [cloudChecking,   setCloudChecking]   = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Save feedback: "idle" | "saving" | "saved"
  const [saveStatus, setSaveStatus] = useState("idle");

  // PIN flow state
  const [pinStep,       setPinStep]       = useState("idle"); // "idle"|"entering"|"new"|"locked"
  const [pinError,      setPinError]      = useState("");
  const [newPin,        setNewPin]        = useState("");     // shown once on first registration
  const [attemptsLeft,  setAttemptsLeft]  = useState(3);

  const doneFiredRef  = useRef(false);
  const debounceRef   = useRef(null);
  const instantRef    = useRef(null);
  // Use refs for values accessed inside setInterval to avoid stale closures
  const stateRef      = useRef({});
  stateRef.current    = { juryName, juryDept, scores, comments, groupSynced };

  // ── Restore from localStorage on mount ───────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const p = JSON.parse(saved);
      if (p.juryName) setJuryName(p.juryName);
      if (p.juryDept) setJuryDept(p.juryDept);
      if (startAtEval && p.step === "eval") {
        if (p.scores)      setScores(p.scores);
        if (p.comments)    setComments(p.comments);
        if (typeof p.current === "number") setCurrent(p.current);
        if (p.groupSynced) setGroupSynced(p.groupSynced);
        setStep("eval");
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cloud draft lookup (debounced on name/dept change) ────
  const lookupCloud = useCallback(async (name, dept) => {
    const n = name.trim(), d = dept.trim();
    if (!n || !d) return;
    setCloudChecking(true);
    setCloudDraft(null);
    setAlreadySubmitted(false);
    try {
      const count = await verifySubmittedCount(n, d);
      if (count >= PROJECTS.length) {
        setAlreadySubmitted(true);
        return;
      }
      // Load draft
      const { getFromSheet } = await import("../shared/api");
      const json = await getFromSheet({ action: "loadDraft", juryName: n, juryDept: d });
      if (json.status === "ok" && json.draft) setCloudDraft(json.draft);
    } catch (_) {
    } finally {
      setCloudChecking(false);
    }
  }, []);

  useEffect(() => {
    if (step !== "info") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookupCloud(juryName, juryDept), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [juryName, juryDept, step, lookupCloud]);

  // ── localStorage auto-save during eval ───────────────────
  useEffect(() => {
    if (step !== "eval") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(
        { juryName, juryDept, scores, comments, current, groupSynced, step }
      ));
    } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, groupSynced, step]);

  // ── Cloud draft save ──────────────────────────────────────
  const saveCloudDraft = useCallback((showFeedback = false) => {
    const { juryName: n, juryDept: d, scores: s, comments: c, groupSynced: gs } = stateRef.current;
    if (!n.trim()) return;
    if (showFeedback) setSaveStatus("saving");
    postToSheet({
      action:   "saveDraft",
      juryName: n.trim(),
      juryDept: d.trim(),
      draft:    { juryName: n.trim(), juryDept: d.trim(), scores: s, comments: c, current, groupSynced: gs },
    }).then(() => {
      if (showFeedback) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }, [current]);

  const deleteCloudDraft = useCallback(() => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim()) return;
    postToSheet({ action: "deleteDraft", juryName: n.trim(), juryDept: d.trim() });
  }, []);

  // ── Instant write on score/comment change ─────────────────
  // Sends only groups that have at least one criterion filled.
  const instantWrite = useCallback((newScores, newComments, newGroupSynced) => {
    clearTimeout(instantRef.current);
    instantRef.current = setTimeout(() => {
      const { juryName: n, juryDept: d } = stateRef.current;
      if (!n.trim()) return;
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(newScores, p.id))
        .map((p) => buildRow(
          n, d, newScores, newComments, p,
          isAllFilled(newScores, p.id) ? "group_submitted" : "in_progress"
        ));
      if (rows.length > 0) postToSheet({ rows });
    }, INSTANT_DELAY);
  }, []);

  // ── Periodic 2-min background sync ───────────────────────
  useEffect(() => {
    if (step !== "eval") return;
    const id = setInterval(() => {
      const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
      if (!n.trim()) return;
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(s, p.id))
        .map((p) => buildRow(n, d, s, c, p, isAllFilled(s, p.id) ? "group_submitted" : "in_progress"));
      if (rows.length > 0) postToSheet({ rows });
      saveCloudDraft();
    }, SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [step, saveCloudDraft]);

  // ── Auto-upgrade groupSynced when all criteria filled ─────
  useEffect(() => {
    if (step !== "eval" || editMode) return;
    const newly = {};
    PROJECTS.forEach((p) => {
      if (!groupSynced[p.id] && isAllFilled(scores, p.id)) newly[p.id] = true;
    });
    if (Object.keys(newly).length > 0) setGroupSynced((prev) => ({ ...prev, ...newly }));
  }, [scores, step, groupSynced, editMode]);

  // ── Auto-done: all groups synced → fire done screen ───────
  useEffect(() => {
    if (step !== "eval" || doneFiredRef.current || editMode) return;
    if (!PROJECTS.every((p) => groupSynced[p.id])) return;

    doneFiredRef.current = true;
    const t = setTimeout(() => {
      const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
      postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, s, c, p, "all_submitted")) });
      deleteCloudDraft();
      localStorage.removeItem(STORAGE_KEY);
      setDoneScores({ ...s });
      setDoneComments({ ...c });
      setStep("done");
    }, 800);
    return () => clearTimeout(t);
  }, [groupSynced, step, editMode, deleteCloudDraft]);

  // ── Score change handler ──────────────────────────────────
  const handleScore = useCallback((pid, cid, val) => {
    const crit    = CRITERIA.find((c) => c.id === cid);
    const parsed  = val === "" ? "" : parseInt(val, 10);
    // Clamp only on blur (see handleScoreBlur), not on every keystroke
    const clamped = val === "" ? "" : (!Number.isFinite(parsed) ? 0 : Math.min(Math.max(parsed, 0), crit.max));
    const newScores = { ...scores, [pid]: { ...scores[pid], [cid]: clamped } };
    setScores(newScores);
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

    // Downgrade groupSynced if criterion was cleared
    let newGroupSynced = groupSynced;
    if (clamped === "" && groupSynced[pid]) {
      newGroupSynced = { ...groupSynced, [pid]: false };
      setGroupSynced(newGroupSynced);
    }
    instantWrite(newScores, comments, newGroupSynced);
  }, [scores, comments, groupSynced, instantWrite]);

  // Clamp on blur (feels more natural than clamping mid-typing)
  const handleScoreBlur = useCallback((pid, cid) => {
    const crit = CRITERIA.find((c) => c.id === cid);
    const val  = scores[pid]?.[cid];
    if (val === "") return;
    const clamped = Math.min(Math.max(parseInt(val, 10) || 0, 0), crit.max);
    if (clamped !== val) setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: clamped } }));
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
  }, [scores]);

  const handleCommentChange = useCallback((pid, val) => {
    const nc = { ...comments, [pid]: val };
    setComments(nc);
    instantWrite(scores, nc, groupSynced);
  }, [scores, comments, groupSynced, instantWrite]);

  // ── Centralised final submit ──────────────────────────────
  // Used by both "normal" done flow and "edit mode" submit.
  const submitFinal = useCallback((currentScores, currentComments) => {
    const { juryName: n, juryDept: d } = stateRef.current;
    postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, currentScores, currentComments, p, "all_submitted")) });
    deleteCloudDraft();
    localStorage.removeItem(STORAGE_KEY);
    setDoneScores({ ...currentScores });
    setDoneComments({ ...currentComments });
    setEditMode(false);
    doneFiredRef.current = true;
    setStep("done");
  }, [deleteCloudDraft]);

  // Called from Edit Scores button on Done screen
  const handleEditScores = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const useScores   = doneScores   || scores;
    const useComments = doneComments || comments;

    // Unlock Sheets so all_submitted can be downgraded
    if (n.trim()) {
      postToSheet({ action: "resetJuror", juryName: n.trim(), juryDept: d.trim() });
      postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, useScores, useComments, p, "in_progress")) });
    }

    setScores(useScores);
    setComments(useComments);
    setEditMode(true);
    doneFiredRef.current = false;
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
    setStep("eval");

    postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, useScores, useComments, p, "group_submitted")) });
  }, [doneScores, doneComments, scores, comments]);

  // Called from Edit Final Submit button
  const handleFinalSubmit = useCallback(() => {
    if (!isAllComplete(scores)) {
      setTouched(makeAllTouched());
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(scores, p.id));
      if (firstIncomplete >= 0) setCurrent(firstIncomplete);
      return;
    }
    submitFinal(scores, comments);
  }, [scores, comments, submitFinal]);

  // Called from Re-submit on Info screen (already submitted juror)
  const handleResubmit = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const rows = await fetchMyScores(n, d);
    if (rows && rows.length) {
      const st = rowsToState(rows);
      setScores(st.scores);
      setComments(st.comments);
      setDoneScores(st.scores);
      setDoneComments(st.comments);
    }
    if (n.trim()) postToSheet({ action: "resetJuror", juryName: n.trim(), juryDept: d.trim() });
    setAlreadySubmitted(false);
    setEditMode(true);
    doneFiredRef.current = false;
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
    setStep("eval");
  }, []);

  // Called from Resume cloud draft button
  const handleResumeCloud = useCallback(() => {
    const d = cloudDraft;
    if (!d) return;
    if (d.juryName) setJuryName(d.juryName);
    if (d.juryDept) setJuryDept(d.juryDept);
    if (d.scores)   setScores(d.scores);
    if (d.comments) setComments(d.comments);
    if (typeof d.current === "number") setCurrent(d.current);
    if (d.groupSynced) setGroupSynced(d.groupSynced);
    // Sync resumed state back to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...d, step: "eval" }));
    } catch (_) {}
    setCloudDraft(null);
    setStep("eval");
  }, [cloudDraft]);

  const handleStartFresh = useCallback(() => {
    const es = makeEmptyScores(), ec = makeEmptyComments();
    setScores(es);
    setComments(ec);
    setGroupSynced({});
    doneFiredRef.current = false;
    setEditMode(false);
    setCloudDraft(null);
    setStep("eval");
    const { juryName: n, juryDept: d } = stateRef.current;
    if (n.trim()) postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, es, ec, p, "in_progress")) });
  }, []);

  // ── Info screen: Start / PIN gate ────────────────────────
  const handleStart = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim() || !d.trim()) return;
    if (alreadySubmitted) { setStep("done"); return; }

    try {
      const { checkPin } = await import("../shared/api");
      const res = await checkPin(n, d);
      if (res.status === "ok") {
        if (res.exists) {
          // Existing juror — ask for PIN
          setPinStep("entering");
          setPinError("");
          setAttemptsLeft(3);
          setStep("pin");
        } else {
          // New juror — generate PIN, show it once, then proceed
          const { createPin } = await import("../shared/api");
          const r2 = await createPin(n, d);
          if (r2.status === "ok") {
            setNewPin(r2.pin);
            setPinStep("new");
            setStep("pin");
          } else {
            // Server failed to create PIN — proceed without PIN (graceful degradation)
            proceedToEval();
          }
        }
      } else {
        // Could not reach server — proceed anyway
        proceedToEval();
      }
    } catch (_) {
      proceedToEval();
    }
  }, [alreadySubmitted]);

  const proceedToEval = useCallback(() => {
    setStep("eval");
    const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
    if (n.trim()) postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, s, c, p, "in_progress")) });
  }, []);

  // Called when user submits PIN on the PIN screen
  const handlePinSubmit = useCallback(async (enteredPin) => {
    const { juryName: n, juryDept: d } = stateRef.current;
    try {
      const { verifyPin } = await import("../shared/api");
      const res = await verifyPin(n, d, enteredPin);
      if (res.locked) {
        setPinStep("locked");
        setPinError("Too many failed attempts. Please contact the admin to reset your PIN.");
        return;
      }
      if (res.valid) {
        setPinStep("idle");
        setPinError("");
        proceedToEval();
      } else {
        const left = res.attemptsLeft ?? (attemptsLeft - 1);
        setAttemptsLeft(left);
        if (left <= 0) {
          setPinStep("locked");
          setPinError("Too many failed attempts. Please contact the admin.");
        } else {
          setPinError(`Incorrect PIN. ${left} attempt${left !== 1 ? "s" : ""} remaining.`);
        }
      }
    } catch (_) {
      setPinError("Could not verify PIN. Please try again.");
    }
  }, [attemptsLeft, proceedToEval]);

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
    setCloudDraft(null);
    setEditMode(false);
    setDoneScores(null);
    setDoneComments(null);
    setAlreadySubmitted(false);
    setPinStep("idle");
    setPinError("");
    setNewPin("");
    doneFiredRef.current = false;
  }, []);

  // ── Derived values ────────────────────────────────────────
  const project     = PROJECTS[current];
  const progressPct = Math.round((countFilled(scores) / (PROJECTS.length * CRITERIA.length)) * 100);
  const allComplete  = isAllComplete(scores);

  return {
    // Identity
    juryName, setJuryName,
    juryDept, setJuryDept,

    // Navigation
    step, setStep,
    current, setCurrent,

    // Scores / comments
    scores, comments, touched,
    handleScore, handleScoreBlur, handleCommentChange,

    // Derived
    project, progressPct, allComplete,
    groupSynced,
    editMode,

    // Done screen
    doneScores, doneComments,

    // Cloud / status
    cloudDraft, cloudChecking, alreadySubmitted,
    saveStatus,

    // PIN
    pinStep, pinError, newPin, attemptsLeft,
    handlePinSubmit,

    // State setters (exposed for edge-case use in JuryForm)
    setDoneScores,
    setDoneComments,

    // Actions
    handleStart,
    handleResumeCloud,
    handleStartFresh,
    handleResubmit,
    handleEditScores,
    handleFinalSubmit,
    saveCloudDraft,
    resetAll,
  };
}
