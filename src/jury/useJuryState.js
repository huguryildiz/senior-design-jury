// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury flow.
//
// jurorId:
//   Generated once from generateId(name, dept) — deterministic,
//   no server round-trip needed.  Stored in stateRef so all
//   callbacks always read the latest value.
//
// Auth flow (single entry point):
//   InfoStep OK →
//     checkPin(jurorId)
//       exists=false → createPin → storeToken → "new" PIN screen
//       exists=true  → "entering" PIN screen
//     verifyPin → storeToken(token)
//   → proceedAfterPin()          ← SINGLE ENTRY POINT
//       cloud lookup (now that we have a token)
//       alreadySubmitted? → loadScoresAndShowDone
//       cloud newer than local? → set cloudDraft (banner in eval)
//       else → setStep("eval")
//
// Home "Resume" banner removed — draft continuity is handled
// entirely inside proceedAfterPin after PIN verification.
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
const STORAGE_KEY        = "ee492_jury_draft_v1";
const SYNC_INTERVAL      = 30 * 1000;
const DEBOUNCE_MS        = 400;
const INSTANT_DELAY      = 350;
const EDITING_ROWS_DELAY = 1500;

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
  // jurorId is derived from name+dept; computed and cached in stateRef.
  const jurorIdRef = useRef("");

  // Keep jurorId in sync whenever name or dept changes.
  useEffect(() => {
    const id = juryName.trim() && juryDept.trim()
      ? generateId(juryName, juryDept)
      : "";
    jurorIdRef.current = id;
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

  // ── Cloud state ───────────────────────────────────────────
  // cloudDraft is shown as a banner inside the eval step
  // ("Newer data found on another device — restore?").
  const [cloudDraft,       setCloudDraft]      = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
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

  // ── Restore name/dept from localStorage on mount ─────────
  // We only restore identity fields — scores are loaded from
  // cloud after PIN verification.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.juryName) setJuryName(saved.juryName);
      if (saved.juryDept) setJuryDept(saved.juryDept);
    } catch (_) {}
  }, []);

  // ── localStorage auto-save (eval step only) ──────────────
  useEffect(() => {
    if (step !== "eval") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          juryName, juryDept,
          scores, comments, current, groupSynced, step,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, groupSynced, step]);

  // ── Cloud draft save ──────────────────────────────────────
  const saveCloudDraft = useCallback((showFeedback = false) => {
    const { juryName: n, juryDept: d, scores: s, comments: c, groupSynced: gs, current: cur } =
      stateRef.current;
    if (!n.trim() || !getToken()) return;
    if (showFeedback) setSaveStatus("saving");
    postToSheet({
      action: "saveDraft",
      draft:  {
        juryName: n.trim(), juryDept: d.trim(),
        scores: s, comments: c, current: cur, groupSynced: gs,
        savedAt: new Date().toISOString(),
      },
    }).then(() => {
      if (showFeedback) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }, []);

  const deleteCloudDraft = useCallback(() => {
    if (!getToken()) return;
    postToSheet({ action: "deleteDraft" });
  }, []);

  // ── Instant rows write ────────────────────────────────────
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

  // ── 30-second background sync ─────────────────────────────
  useEffect(() => {
    if (step !== "eval") return;
    const id = setInterval(() => {
      const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
      const jid = jurorIdRef.current;
      if (!n.trim() || !jid || !getToken()) return;
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(s, p.id))
        .map((p) =>
          buildRow(n, d, jid, s, c, p, isAllFilled(s, p.id) ? "group_submitted" : "in_progress")
        );
      if (rows.length > 0) postToSheet({ rows });
      saveCloudDraft();
    }, SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [step, saveCloudDraft]);

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
      deleteCloudDraft();
      localStorage.removeItem(STORAGE_KEY);
      setDoneScores({ ...s });
      setDoneComments({ ...c });
      setStep("done");
    }, 800);
    return () => clearTimeout(t);
  }, [groupSynced, step, editMode, deleteCloudDraft]);

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
      const n       = parseInt(val, 10);
      const clamped = Number.isFinite(n) ? Math.min(Math.max(n, 0), crit.max) : 0;
      if (String(clamped) !== String(val)) {
        setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: clamped } }));
      }
    },
    [scores]
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
      });
      deleteCloudDraft();
      localStorage.removeItem(STORAGE_KEY);
      setDoneScores({ ...finalScores });
      setDoneComments({ ...finalComments });
      setEditMode(false);
      doneFiredRef.current = true;
      setStep("done");
    },
    [deleteCloudDraft]
  );

  // ── Load scores from cloud → Done screen ─────────────────
  const loadScoresAndShowDone = useCallback(async () => {
    let useScores   = makeEmptyScores();
    let useComments = makeEmptyComments();
    try {
      const rows = await fetchMyScores();
      if (rows && rows.length) {
        const st = rowsToState(rows);
        useScores   = st.scores;
        useComments = st.comments;
      }
    } catch (_) {}
    setDoneScores(useScores);
    setDoneComments(useComments);
    setScores(useScores);
    setComments(useComments);
    setStep("done");
  }, []);

  // ── SINGLE ENTRY POINT after PIN verification ─────────────
  // Called by handlePinSubmit (valid PIN) and handlePinAcknowledge
  // (new-PIN screen). Token is already stored at this point.
  const proceedAfterPin = useCallback(async () => {
    // 1. Check if already fully submitted.
    let submitted = false;
    try {
      const count = await verifySubmittedCount();
      if (count >= PROJECTS.length) submitted = true;
    } catch (_) {}

    if (submitted) {
      setAlreadySubmitted(true);
      await loadScoresAndShowDone();
      return;
    }

    // 2. Compare cloud draft vs local draft.
    let cloudNewer = false;
    try {
      const json = await getFromSheetAuth({ action: "loadDraft" });
      if (json.status === "ok" && json.draft) {
        let localSavedAt = "";
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localSavedAt = JSON.parse(raw).savedAt || "";
        } catch (_) {}
        const cloudSavedAt = json.draft.savedAt || "";
        if (!localSavedAt || cloudSavedAt > localSavedAt) {
          setCloudDraft(json.draft);
          cloudNewer = true;
        }
      }
    } catch (_) {}

    if (!cloudNewer) {
      // Restore local draft scores if any.
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.scores)      setScores(saved.scores);
          if (saved.comments)    setComments(saved.comments);
          if (saved.groupSynced) setGroupSynced(saved.groupSynced);
          if (typeof saved.current === "number") setCurrent(saved.current);
        }
      } catch (_) {}
    }

    setStep("eval");
  }, [loadScoresAndShowDone]);

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

  // ── Re-submit (already-submitted juror) ──────────────────
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
    setAlreadySubmitted(false);
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

  // ── Resume cloud draft (banner inside eval) ───────────────
  const handleResumeCloud = useCallback(() => {
    const d = cloudDraft;
    if (!d) return;
    if (d.juryName) setJuryName(d.juryName);
    if (d.juryDept) setJuryDept(d.juryDept);
    if (d.scores)   setScores(d.scores);
    if (d.comments) setComments(d.comments);
    if (typeof d.current === "number") setCurrent(d.current);
    if (d.groupSynced) setGroupSynced(d.groupSynced);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...d, step: "eval" }));
    } catch (_) {}
    setCloudDraft(null);
  }, [cloudDraft]);

  const handleStartFresh = useCallback(() => {
    setScores(makeEmptyScores());
    setComments(makeEmptyComments());
    setGroupSynced({});
    doneFiredRef.current = false;
    setEditMode(false);
    setCloudDraft(null);
  }, []);

  // ── Start button on InfoStep ──────────────────────────────
  // Flow:
  //   Token in session → skip PIN, go directly to proceedAfterPin
  //   No token:
  //     checkPin → exists → "entering" screen
  //              → !exists → createPin → store token → "new" screen
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
        await proceedAfterPin();
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
          await proceedAfterPin();
        }
      }
    } catch (_) {
      await proceedAfterPin();
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

  // Called when new juror acknowledges their PIN display.
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
    setCloudDraft(null);
    setEditMode(false);
    setDoneScores(null);
    setDoneComments(null);
    setAlreadySubmitted(false);
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
    jurorId:  jurorIdRef.current,

    step, setStep,
    current, setCurrent,

    scores, comments, touched,
    handleScore, handleScoreBlur, handleCommentChange,

    project, progressPct, allComplete,
    groupSynced, editMode,

    doneScores,   setDoneScores,
    doneComments, setDoneComments,

    cloudDraft, alreadySubmitted,
    saveStatus,

    pinStep, pinError, newPin, attemptsLeft,
    handlePinSubmit, handlePinAcknowledge,

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
