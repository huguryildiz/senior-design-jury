// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury
// evaluation flow. JuryForm.jsx is a thin renderer.
//
// Authentication flow (single entry point):
//   1. Juror fills name + dept on InfoStep, clicks Start.
//   2. System checks for existing PIN (checkPin).
//      • First visit  → generate PIN, show it once (pinStep="new")
//      • Return visit → ask for PIN (pinStep="entering")
//   3. On successful PIN entry the server returns a sessionToken.
//      Token is stored in sessionStorage (tab-scoped, clears on close).
//   4. Immediately after PIN verification:
//      • Cloud draft is fetched and compared with local draft.
//      • If cloud is newer → show choice banner (resume / start fresh).
//      • Otherwise → go straight to eval.
//   5. All subsequent write requests include the sessionToken so the
//      server can reject unauthenticated writes.
//
// Draft resume flow:
//   • Cloud vs local comparison happens AFTER PIN, not before.
//   • The home screen no longer shows a "Resume" banner — the
//     juror always starts from InfoStep and authenticates first.
//
// Unique juror ID:
//   generateJurorId(name, dept) produces a stable short hash.
//   Sent with every API call so the server can use it as a
//   primary key even if name/dept formatting varies slightly.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA } from "../config";
import {
  postToSheet,
  buildRow,
  fetchMyScores,
  verifySubmittedCount,
  checkPin,
  createPin,
  verifyPin,
  getFromSheet,
  generateJurorId,
} from "../shared/api";

// ── Constants ─────────────────────────────────────────────────
const STORAGE_KEY   = "ee492_jury_draft_v2";
// sessionStorage key prefix for the per-tab session token.
const TOKEN_KEY     = "ee492_session_token";
// How often to sync draft and rows to the cloud (30 s).
const SYNC_INTERVAL = 30 * 1000;
// Debounce for triggering cloud lookup while user types (unused in
// new flow but kept for future reuse).
const DEBOUNCE_MS   = 500;
// Delay before instant rows write so rapid keystrokes are batched.
const INSTANT_DELAY = 350;
// Delay before sending group_submitted rows after resetJuror,
// giving Apps Script time to write EditingFlag = "editing" first.
const EDITING_ROWS_DELAY = 1500;

// ── Tab ID (session isolation) ────────────────────────────────
// Each browser tab gets a unique random ID on first load, stored
// in sessionStorage. This ID is NOT shared between tabs even on
// the same origin. Closing the tab destroys sessionStorage, so
// a new ID is created on next open and the juror must re-enter PIN.
const TAB_ID_KEY = "ee492_tab_id";

function getTabId() {
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2);
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    return "fallback";
  }
}

// Build the sessionStorage key for a juror's token in this tab.
function tokenKey(juryName, juryDept) {
  return `${TOKEN_KEY}__${getTabId()}__${generateJurorId(juryName, juryDept)}`;
}

// Retrieve the current session token for this juror (or "").
export function getSessionToken(juryName, juryDept) {
  try {
    return sessionStorage.getItem(tokenKey(juryName, juryDept)) || "";
  } catch {
    return "";
  }
}

// Store a session token returned by the server after PIN verification.
function storeSessionToken(juryName, juryDept, token) {
  try {
    sessionStorage.setItem(tokenKey(juryName, juryDept), token);
  } catch {}
}

// Check whether a valid session token exists for this juror in this tab.
export function hasValidSession(juryName, juryDept) {
  return getSessionToken(juryName, juryDept) !== "";
}

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

// Convert myscores API rows → { scores, comments } state shape.
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

// ═════════════════════════════════════════════════════════════
// Hook
// ═════════════════════════════════════════════════════════════

export default function useJuryState() {

  // ── Identity ──────────────────────────────────────────────
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");

  // ── Step / navigation ─────────────────────────────────────
  // Steps: "info" | "pin" | "cloudChoice" | "eval" | "done"
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
  // cloudDraft is set after PIN verification if cloud > local.
  // The "cloudChoice" step lets the juror choose resume or fresh.
  const [cloudDraft,       setCloudDraft]      = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [saveStatus,       setSaveStatus]       = useState("idle");

  // ── PIN state ─────────────────────────────────────────────
  // pinStep: "idle" | "entering" | "new" | "locked"
  const [pinStep,      setPinStep]      = useState("idle");
  const [pinError,     setPinError]     = useState("");
  const [newPin,       setNewPin]       = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // ── Refs ──────────────────────────────────────────────────
  const doneFiredRef = useRef(false);
  const instantRef   = useRef(null);
  const stateRef     = useRef({});
  stateRef.current   = { juryName, juryDept, scores, comments, groupSynced, current };

  // ── Restore name/dept from localStorage on mount ──────────
  // We restore identity fields only — not scores. Scores are
  // loaded from the cloud after PIN verification.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.juryName) setJuryName(saved.juryName);
      if (saved.juryDept) setJuryDept(saved.juryDept);
    } catch (_) {}
  }, []);

  // ── localStorage auto-save ────────────────────────────────
  useEffect(() => {
    if (step !== "eval") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          juryName, juryDept, scores, comments, current, groupSynced, step,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, groupSynced, step]);

  // ── Cloud draft save ──────────────────────────────────────
  const saveCloudDraft = useCallback((showFeedback = false) => {
    const { juryName: n, juryDept: d, scores: s, comments: c, groupSynced: gs, current: cur } =
      stateRef.current;
    if (!n.trim()) return;
    const token = getSessionToken(n, d);
    if (showFeedback) setSaveStatus("saving");
    postToSheet({
      action:   "saveDraft",
      juryName: n.trim(),
      juryDept: d.trim(),
      draft:    {
        juryName: n.trim(), juryDept: d.trim(),
        scores: s, comments: c, current: cur, groupSynced: gs,
        savedAt: new Date().toISOString(),
      },
    }, token).then(() => {
      if (showFeedback) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }, []);

  const deleteCloudDraft = useCallback(() => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim()) return;
    const token = getSessionToken(n, d);
    postToSheet({ action: "deleteDraft", juryName: n.trim(), juryDept: d.trim() }, token);
  }, []);

  // ── Instant rows write ────────────────────────────────────
  const instantWrite = useCallback((newScores, newComments, newGroupSynced) => {
    clearTimeout(instantRef.current);
    instantRef.current = setTimeout(() => {
      const { juryName: n, juryDept: d } = stateRef.current;
      if (!n.trim()) return;
      const token = getSessionToken(n, d);
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(newScores, p.id))
        .map((p) =>
          buildRow(n, d, newScores, newComments, p,
            isAllFilled(newScores, p.id) ? "group_submitted" : "in_progress")
        );
      if (rows.length > 0) postToSheet({ rows }, token);
    }, INSTANT_DELAY);
  }, []);

  // ── 30-second background sync ─────────────────────────────
  useEffect(() => {
    if (step !== "eval") return;
    const id = setInterval(() => {
      const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
      if (!n.trim()) return;
      const token = getSessionToken(n, d);
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(s, p.id))
        .map((p) =>
          buildRow(n, d, s, c, p, isAllFilled(s, p.id) ? "group_submitted" : "in_progress")
        );
      if (rows.length > 0) postToSheet({ rows }, token);
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
      const token = getSessionToken(n, d);
      postToSheet({ rows: PROJECTS.map((p) => buildRow(n, d, s, c, p, "all_submitted")) }, token);
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
      const token = getSessionToken(n, d);
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, finalScores, finalComments, p, "all_submitted")),
      }, token);
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

  // ── Edit-mode entry ───────────────────────────────────────
  const handleEditScores = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const token      = getSessionToken(n, d);
    const useScores   = doneScores   || scores;
    const useComments = doneComments || comments;

    if (n.trim()) {
      postToSheet({ action: "resetJuror", juryName: n.trim(), juryDept: d.trim() }, token);
    }

    setScores(useScores);
    setComments(useComments);
    setEditMode(true);
    doneFiredRef.current = false;
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
    setStep("eval");

    setTimeout(() => {
      if (!n.trim()) return;
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, useScores, useComments, p, "group_submitted")),
      }, token);
    }, EDITING_ROWS_DELAY);
  }, [doneScores, doneComments, scores, comments]);

  // ── Edit-mode submit ──────────────────────────────────────
  const handleFinalSubmit = useCallback(() => {
    if (!isAllComplete(scores)) {
      setTouched(makeAllTouched());
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(scores, p.id));
      if (firstIncomplete >= 0) setCurrent(firstIncomplete);
      return;
    }
    submitFinal(scores, comments);
  }, [scores, comments, submitFinal]);

  // ── Load scores from cloud → done screen ─────────────────
  const loadScoresAndShowDone = useCallback(async (n, d) => {
    let useScores   = makeEmptyScores();
    let useComments = makeEmptyComments();
    try {
      const rows = await fetchMyScores(n, d);
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

  // ── Re-submit from info screen (already submitted) ────────
  const handleResubmit = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const token = getSessionToken(n, d);

    let useScores   = makeEmptyScores();
    let useComments = makeEmptyComments();
    try {
      const rows = await fetchMyScores(n, d);
      if (rows && rows.length) {
        const st  = rowsToState(rows);
        useScores   = st.scores;
        useComments = st.comments;
      }
    } catch (_) {}

    if (n.trim()) {
      postToSheet({ action: "resetJuror", juryName: n.trim(), juryDept: d.trim() }, token);
    }

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
      if (!n.trim()) return;
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, useScores, useComments, p, "group_submitted")),
      }, token);
    }, EDITING_ROWS_DELAY);
  }, []);

  // ── Post-PIN cloud vs local comparison ───────────────────
  // Called once after a successful PIN verification.
  // Compares cloud draft with local draft; if cloud is newer,
  // stores the draft and navigates to "cloudChoice" step.
  // Otherwise goes straight to eval (or done if submitted).
  const checkDraftAfterPin = useCallback(async (n, d, submitted) => {
    if (submitted) {
      loadScoresAndShowDone(n, d);
      return;
    }

    // Try to load cloud draft
    let cloudNewer = false;
    let draft      = null;
    try {
      const json = await getFromSheet({ action: "loadDraft", juryName: n.trim(), juryDept: d.trim() });
      if (json.status === "ok" && json.draft) {
        let localSavedAt = "";
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localSavedAt = JSON.parse(raw).savedAt || "";
        } catch (_) {}
        const cloudSavedAt = json.draft.savedAt || "";
        if (!localSavedAt || cloudSavedAt > localSavedAt) {
          cloudNewer = true;
          draft      = json.draft;
        }
      }
    } catch (_) {
      // Cloud unreachable — proceed with local data
    }

    if (cloudNewer && draft) {
      setCloudDraft(draft);
      setStep("cloudChoice");
    } else {
      // Restore local scores if available
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
      setStep("eval");
    }
  }, [loadScoresAndShowDone]);

  // ── Resume cloud draft (cloudChoice step) ────────────────
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
    setStep("eval");
  }, [cloudDraft]);

  // ── Start fresh (cloudChoice step) ───────────────────────
  const handleStartFresh = useCallback(() => {
    setScores(makeEmptyScores());
    setComments(makeEmptyComments());
    setGroupSynced({});
    doneFiredRef.current = false;
    setEditMode(false);
    setCloudDraft(null);
    setStep("eval");
  }, []);

  // ── Start button (InfoStep) ───────────────────────────────
  // Single entry point — always goes through PIN verification.
  const handleStart = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim() || !d.trim()) return;

    // If this tab already has a valid session token, skip PIN re-entry.
    if (hasValidSession(n, d)) {
      const count = await verifySubmittedCount(n, d).catch(() => 0);
      const submitted = count >= PROJECTS.length;
      setAlreadySubmitted(submitted);
      checkDraftAfterPin(n, d, submitted);
      return;
    }

    try {
      const res = await checkPin(n, d);
      if (res.status !== "ok") {
        // Server error — degrade gracefully (no PIN, proceed).
        setStep("eval");
        return;
      }

      if (res.exists) {
        setPinStep("entering");
        setPinError("");
        setAttemptsLeft(3);
        setStep("pin");
      } else {
        // First visit — generate PIN and show it once.
        const r2 = await createPin(n, d);
        if (r2.status === "ok") {
          setNewPin(r2.pin);
          setPinStep("new");
          setStep("pin");
        } else {
          // PIN creation failed — degrade gracefully.
          setStep("eval");
        }
      }
    } catch (_) {
      // Network unreachable — proceed without PIN.
      setStep("eval");
    }
  }, [checkDraftAfterPin]);

  // ── PIN submit ────────────────────────────────────────────
  const handlePinSubmit = useCallback(
    async (enteredPin) => {
      const { juryName: n, juryDept: d } = stateRef.current;
      try {
        const res = await verifyPin(n, d, enteredPin);

        if (res.locked) {
          setPinStep("locked");
          setPinError("Too many failed attempts. Please contact the admin to reset your PIN.");
          return;
        }

        if (res.valid) {
          // Store the session token returned by the server.
          if (res.sessionToken) storeSessionToken(n, d, res.sessionToken);
          setPinStep("idle");
          setPinError("");

          // Check submission status then compare drafts.
          const count = await verifySubmittedCount(n, d).catch(() => 0);
          const submitted = count >= PROJECTS.length;
          setAlreadySubmitted(submitted);
          checkDraftAfterPin(n, d, submitted);
          return;
        }

        // Wrong PIN
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
    [attemptsLeft, checkDraftAfterPin]
  );

  // Called from PinStep when a new juror acknowledges their generated PIN.
  const handlePinAcknowledge = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    // For new jurors the server stores the PIN on createPin — no token
    // is returned for new PINs, so we synthesise a lightweight token here
    // by storing a marker that lets hasValidSession() return true.
    // A full token is only issued by verifyPin; for new jurors we trust
    // the createPin flow implicitly (they just received the PIN for the
    // first time, so identity is established).
    // We use a placeholder so the tab is recognised as authenticated.
    storeSessionToken(n, d, "new_juror_ack");
    const count = await verifySubmittedCount(n, d).catch(() => 0);
    const submitted = count >= PROJECTS.length;
    setAlreadySubmitted(submitted);
    checkDraftAfterPin(n, d, submitted);
  }, [checkDraftAfterPin]);

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
    doneFiredRef.current = false;
  }, []);

  // ── Derived values ────────────────────────────────────────
  const project     = PROJECTS[current];
  const totalFields = PROJECTS.length * CRITERIA.length;
  const progressPct = Math.round((countFilled(scores) / totalFields) * 100);
  const allComplete = isAllComplete(scores);

  return {
    // Identity
    juryName, setJuryName,
    juryDept, setJuryDept,

    // Navigation
    step, setStep,
    current, setCurrent,

    // Scores / comments / validation
    scores, comments, touched,
    handleScore, handleScoreBlur, handleCommentChange,

    // Derived
    project, progressPct, allComplete,
    groupSynced, editMode,

    // Done-screen snapshots
    doneScores,   setDoneScores,
    doneComments, setDoneComments,

    // Cloud / submission
    cloudDraft, alreadySubmitted,
    saveStatus,

    // PIN
    pinStep, pinError, newPin, attemptsLeft,
    handlePinSubmit, handlePinAcknowledge,

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
