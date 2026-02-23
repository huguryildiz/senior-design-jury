// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury
// evaluation flow. JuryForm.jsx is a thin renderer that just
// passes these values and handlers down to step components.
//
// Responsibilities:
//   - Score / comment state
//   - localStorage persistence (survives browser refresh)
//   - Cloud draft save / load (survives device change)
//   - Periodic 30-second background sync
//   - PIN authentication with session-level caching
//   - Auto-done detection (all groups filled → done screen)
//   - Edit-mode transitions
//
// PIN session logic:
//   Once a juror successfully verifies their PIN, we store a
//   session token in sessionStorage so they aren't asked again
//   within the same browser tab. Closing the tab clears it.
//   A different device or a new tab will always require the PIN.
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
} from "../shared/api";

// ── Constants ─────────────────────────────────────────────────
const STORAGE_KEY   = "ee492_jury_draft_v1";
// Session token key — cleared when the browser tab closes.
const PIN_SESSION_KEY = "ee492_pin_verified";
// How often to sync draft and rows to the cloud (30 s is safe for
// Apps Script quota and limits draft loss to at most 30 seconds).
const SYNC_INTERVAL = 30 * 1000;
// Debounce for cloud-draft lookup while the user types name/dept.
const DEBOUNCE_MS   = 500;
// Short delay before firing the instant rows-write so rapid
// keystrokes are batched into one network request.
const INSTANT_DELAY = 350;
// Delay before sending group_submitted rows after resetJuror,
// giving Apps Script time to write EditingFlag = "editing" first.
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

// ── Pure helpers (also exported for use in step components) ───

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

// ── Tab-unique PIN session ────────────────────────────────────
// Each browser tab gets a random ID written to sessionStorage
// on first load. This ID is NOT shared between tabs, so PIN
// verification in one tab never grants access in another —
// even when they share the same origin. Closing and re-opening
// the tab clears sessionStorage, so a new ID is generated and
// the juror must re-enter their PIN.
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

function pinSessionKey(juryName, juryDept) {
  return `${PIN_SESSION_KEY}__${getTabId()}__${juryName.trim().toLowerCase()}__${juryDept.trim().toLowerCase()}`;
}

// Check if PIN was already verified in this specific tab for this identity.
export function isPinVerifiedInSession(juryName, juryDept) {
  try {
    return sessionStorage.getItem(pinSessionKey(juryName, juryDept)) === "1";
  } catch {
    return false;
  }
}

// Mark PIN as verified for this tab session.
function markPinVerified(juryName, juryDept) {
  try {
    sessionStorage.setItem(pinSessionKey(juryName, juryDept), "1");
  } catch {}
}

// Convert myscores API rows → { scores, comments } state shape.
export function rowsToState(rows) {
  const scores   = makeEmptyScores();
  const comments = makeEmptyComments();
  (rows || []).forEach((r) => {
    const pid = Number(r.projectId);
    if (!pid) return;
    scores[pid] = {
      ...scores[pid],
      design:    r.design    ?? "",
      technical: r.technical ?? "",
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

export default function useJuryState({ startAtEval = false } = {}) {

  // ── Identity ──────────────────────────────────────────────
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");

  // ── Step / navigation ─────────────────────────────────────
  // Possible steps: "info" | "pin" | "eval" | "done"
  const [step,    setStep]    = useState("info");
  const [current, setCurrent] = useState(0); // index into PROJECTS array

  // ── Scoring state ─────────────────────────────────────────
  const [scores,   setScores]   = useState(makeEmptyScores);
  const [comments, setComments] = useState(makeEmptyComments);
  // touched tracks whether a field has been interacted with (for
  // showing validation errors only after the user has touched a field)
  const [touched, setTouched]   = useState(makeEmptyTouched);

  // groupSynced[projectId] = true once all criteria for that group
  // are filled in. Triggers auto-done when every group is synced.
  const [groupSynced, setGroupSynced] = useState({});
  // editMode = true when the juror is re-editing after submission.
  // Auto-done is suppressed in edit mode.
  const [editMode, setEditMode] = useState(false);

  // Snapshot of scores/comments taken at the moment of final
  // submission — used by the Done screen to show confirmed values.
  const [doneScores,   setDoneScores]   = useState(null);
  const [doneComments, setDoneComments] = useState(null);

  // ── Cloud state ───────────────────────────────────────────
  const [cloudDraft,       setCloudDraft]       = useState(null);
  const [cloudChecking,    setCloudChecking]     = useState(false);
  const [alreadySubmitted, setAlreadySubmitted]  = useState(false);
  // "idle" | "saving" | "saved" — drives the Save button label
  const [saveStatus, setSaveStatus] = useState("idle");

  // ── PIN state ─────────────────────────────────────────────
  // pinStep: "idle" | "entering" | "new" | "locked"
  const [pinStep,      setPinStep]      = useState("idle");
  const [pinError,     setPinError]     = useState("");
  const [newPin,       setNewPin]       = useState(""); // shown once to first-time jurors
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // ── Refs ──────────────────────────────────────────────────
  // doneFiredRef prevents the auto-done effect from firing twice.
  const doneFiredRef = useRef(false);
  const debounceRef  = useRef(null);
  const instantRef   = useRef(null);
  // stateRef holds the latest state values so setInterval callbacks
  // always read fresh values without stale-closure issues.
  const stateRef = useRef({});
  stateRef.current = { juryName, juryDept, scores, comments, groupSynced, current };

  // ── Restore from localStorage on mount ───────────────────
  // Fills in name/dept so the user doesn't have to retype them.
  // If startAtEval=true (Resume button on home screen), also
  // restores scores and jumps directly to the eval step.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.juryName) setJuryName(saved.juryName);
      if (saved.juryDept) setJuryDept(saved.juryDept);
      if (startAtEval && saved.step === "eval") {
        if (saved.scores)      setScores(saved.scores);
        if (saved.comments)    setComments(saved.comments);
        if (saved.groupSynced) setGroupSynced(saved.groupSynced);
        if (typeof saved.current === "number") setCurrent(saved.current);
        setStep("eval");
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cloud-draft lookup ────────────────────────────────────
  // Fires when the user types in the info fields (debounced).
  // Only surfaces cloudDraft if it is NEWER than the local draft —
  // this prevents a stale localStorage draft from being silently
  // preferred over fresher data the juror entered on another device.
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
      const json = await getFromSheet({ action: "loadDraft", juryName: n, juryDept: d });
      if (json.status === "ok" && json.draft) {
        // Compare with local savedAt timestamp to decide which is newer.
        let localSavedAt = "";
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localSavedAt = JSON.parse(raw).savedAt || "";
        } catch (_) {}
        const cloudSavedAt = json.draft.savedAt || "";
        // Show cloud draft only when it's strictly newer than local data.
        if (!localSavedAt || cloudSavedAt > localSavedAt) {
          setCloudDraft(json.draft);
        }
      }
    } catch (_) {
      // Cloud unreachable — silently degrade; user can still work offline.
    } finally {
      setCloudChecking(false);
    }
  }, []);

  useEffect(() => {
    if (step !== "info") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => lookupCloud(juryName, juryDept),
      DEBOUNCE_MS
    );
    return () => clearTimeout(debounceRef.current);
  }, [juryName, juryDept, step, lookupCloud]);

  // ── localStorage auto-save ────────────────────────────────
  // Runs on every state change during the eval step so a browser
  // refresh never loses more than a single React render cycle.
  useEffect(() => {
    if (step !== "eval") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          juryName, juryDept, scores, comments, current, groupSynced, step,
          savedAt: new Date().toISOString(),   // used for stale-draft detection
        })
      );
    } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, groupSynced, step]);

  // ── Cloud draft save ──────────────────────────────────────
  // showFeedback = true drives the "Saving… / ✓ Saved" button state.
  const saveCloudDraft = useCallback((showFeedback = false) => {
    const { juryName: n, juryDept: d, scores: s, comments: c, groupSynced: gs, current: cur } =
      stateRef.current;
    if (!n.trim()) return;
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
    }).then(() => {
      if (showFeedback) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }, []); // stateRef always has latest values — no deps needed

  const deleteCloudDraft = useCallback(() => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim()) return;
    postToSheet({ action: "deleteDraft", juryName: n.trim(), juryDept: d.trim() });
  }, []);

  // ── Instant rows write ────────────────────────────────────
  // Fires 350 ms after the last score change. Only sends groups
  // that have at least one criterion filled — avoids writing
  // blank rows to Sheets for untouched groups.
  const instantWrite = useCallback((newScores, newComments, newGroupSynced) => {
    clearTimeout(instantRef.current);
    instantRef.current = setTimeout(() => {
      const { juryName: n, juryDept: d } = stateRef.current;
      if (!n.trim()) return;
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(newScores, p.id))
        .map((p) =>
          buildRow(n, d, newScores, newComments, p,
            isAllFilled(newScores, p.id) ? "group_submitted" : "in_progress")
        );
      if (rows.length > 0) postToSheet({ rows });
    }, INSTANT_DELAY);
  }, []);

  // ── 30-second background sync ─────────────────────────────
  // Keeps the cloud draft and Sheets rows fresh even if the user
  // forgets to click Save. Only active during the eval step.
  useEffect(() => {
    if (step !== "eval") return;
    const id = setInterval(() => {
      const { juryName: n, juryDept: d, scores: s, comments: c } = stateRef.current;
      if (!n.trim()) return;
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(s, p.id))
        .map((p) =>
          buildRow(n, d, s, c, p, isAllFilled(s, p.id) ? "group_submitted" : "in_progress")
        );
      if (rows.length > 0) postToSheet({ rows });
      saveCloudDraft();
    }, SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [step, saveCloudDraft]);

  // ── Auto-upgrade groupSynced ──────────────────────────────
  // When all criteria for a group are filled, mark it as synced.
  // This is what eventually triggers auto-done.
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
  // Once every group is synced and we're not in edit mode, wait
  // 800 ms then send all_submitted and navigate to the done screen.
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
  // Allows free typing (does not clamp mid-keystroke).
  // Clamping happens in handleScoreBlur so "23" doesn't snap to
  // "20" while the user is still typing.
  const handleScore = useCallback(
    (pid, cid, val) => {
      const newScores = { ...scores, [pid]: { ...scores[pid], [cid]: val } };
      setScores(newScores);
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

      // If the field was cleared, downgrade this group's synced state
      // so the auto-done won't fire with a missing value.
      let newGroupSynced = groupSynced;
      if (val === "" && groupSynced[pid]) {
        newGroupSynced = { ...groupSynced, [pid]: false };
        setGroupSynced(newGroupSynced);
      }
      instantWrite(newScores, comments, newGroupSynced);
    },
    [scores, comments, groupSynced, instantWrite]
  );

  // Clamp and mark touched on blur.
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

  // ── Centralised final submit ──────────────────────────────
  // Used by both the auto-done path and the manual edit-mode submit.
  const submitFinal = useCallback(
    (finalScores, finalComments) => {
      const { juryName: n, juryDept: d } = stateRef.current;
      postToSheet({
        rows: PROJECTS.map((p) => buildRow(n, d, finalScores, finalComments, p, "all_submitted")),
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

  // ── Edit-mode entry (from Done screen "Edit Scores") ──────
  // Sequence:
  //   1. Fire resetJuror — sets EditingFlag = "editing" in Sheets
  //   2. Wait EDITING_ROWS_DELAY ms (Apps Script processes resetJuror)
  //   3. Fire group_submitted rows — carry-over logic in Apps Script
  //      reads EditingFlag="editing" from the existing row and keeps it
  const handleEditScores = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    const useScores   = doneScores   || scores;
    const useComments = doneComments || comments;

    if (n.trim()) {
      postToSheet({ action: "resetJuror", juryName: n.trim(), juryDept: d.trim() });
    }

    setScores(useScores);
    setComments(useComments);
    setEditMode(true);
    doneFiredRef.current = false;
    // All groups are pre-marked as synced so the nav dropdown shows ✅ for each.
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
    setStep("eval");

    // Delayed rows write so resetJuror has time to write EditingFlag first.
    setTimeout(() => {
      if (!n.trim()) return;
      postToSheet({
        rows: PROJECTS.map((p) =>
          buildRow(n, d, useScores, useComments, p, "group_submitted")
        ),
      });
    }, EDITING_ROWS_DELAY);
  }, [doneScores, doneComments, scores, comments]);

  // ── Edit-mode submit (from eval screen in edit mode) ──────
  const handleFinalSubmit = useCallback(() => {
    if (!isAllComplete(scores)) {
      // Show validation errors on all untouched fields and jump
      // to the first incomplete group.
      setTouched(makeAllTouched());
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(scores, p.id));
      if (firstIncomplete >= 0) setCurrent(firstIncomplete);
      return;
    }
    submitFinal(scores, comments);
  }, [scores, comments, submitFinal]);

  // ── Load scores from cloud and show Done screen ───────────
  // Used after PIN verification for already-submitted jurors.
  // Fetches real scores so Done screen and Edit mode work correctly.
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

  // ── Re-submit from info screen (already-submitted juror) ──
  // Fetches the existing scores from Sheets, then enters edit mode.
  const handleResubmit = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;

    // Load existing scores so the juror sees their previous values.
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
      postToSheet({ action: "resetJuror", juryName: n.trim(), juryDept: d.trim() });
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

    // Same delayed write as handleEditScores.
    setTimeout(() => {
      if (!n.trim()) return;
      postToSheet({
        rows: PROJECTS.map((p) =>
          buildRow(n, d, useScores, useComments, p, "group_submitted")
        ),
      });
    }, EDITING_ROWS_DELAY);
  }, []);

  // ── Resume cloud draft ────────────────────────────────────
  const handleResumeCloud = useCallback(() => {
    const d = cloudDraft;
    if (!d) return;
    if (d.juryName) setJuryName(d.juryName);
    if (d.juryDept) setJuryDept(d.juryDept);
    if (d.scores)   setScores(d.scores);
    if (d.comments) setComments(d.comments);
    if (typeof d.current === "number") setCurrent(d.current);
    if (d.groupSynced) setGroupSynced(d.groupSynced);
    // Sync resumed cloud state to localStorage immediately so a
    // browser refresh doesn't revert to stale local data.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...d, step: "eval" }));
    } catch (_) {}
    setCloudDraft(null);
    setStep("eval");
  }, [cloudDraft]);

  // ── Start fresh (discard cloud draft) ────────────────────
  const handleStartFresh = useCallback(() => {
    const es = makeEmptyScores();
    const ec = makeEmptyComments();
    setScores(es);
    setComments(ec);
    setGroupSynced({});
    doneFiredRef.current = false;
    setEditMode(false);
    setCloudDraft(null);
    setStep("eval");
    // Write in_progress rows only after the user has actually
    // started scoring — not here at start-fresh time.
  }, []);

  // ── Proceed to eval (after PIN verification) ──────────────
  // Does NOT write any rows to Sheets yet — we only write once
  // the user has entered at least one score (see instantWrite).
  const proceedToEval = useCallback(() => {
    setStep("eval");
  }, []);

  // ── Start button handler ───────────────────────────────────
  // Flow:
  //   1. Check session cache — if PIN was verified this session, skip PIN.
  //   2. If alreadySubmitted → still require PIN, then show done screen.
  //   3. Call checkPin:
  //        exists=false → createPin → show new PIN screen
  //        exists=true  → show PIN entry screen
  //   4. On network error → graceful degradation (proceed without PIN).
  const handleStart = useCallback(async () => {
    const { juryName: n, juryDept: d } = stateRef.current;
    if (!n.trim() || !d.trim()) return;

    // If PIN already verified this session, skip straight to destination.
    if (isPinVerifiedInSession(n, d)) {
      if (alreadySubmitted) { loadScoresAndShowDone(n, d); return; }
      proceedToEval();
      return;
    }

    try {
      const res = await checkPin(n, d);
      if (res.status !== "ok") {
        // Server error — degrade gracefully.
        if (alreadySubmitted) { loadScoresAndShowDone(n, d); return; }
        proceedToEval();
        return;
      }

      if (res.exists) {
        // Returning juror — ask for PIN.
        setPinStep("entering");
        setPinError("");
        setAttemptsLeft(3);
        setStep("pin");
      } else {
        // First-time juror — generate PIN and show it once.
        const r2 = await createPin(n, d);
        if (r2.status === "ok") {
          setNewPin(r2.pin);
          setPinStep("new");
          setStep("pin");
        } else {
          // PIN creation failed — proceed without PIN.
          if (alreadySubmitted) { loadScoresAndShowDone(n, d); return; }
          proceedToEval();
        }
      }
    } catch (_) {
      // Network unreachable — proceed without PIN.
      if (alreadySubmitted) { loadScoresAndShowDone(n, d); return; }
      proceedToEval();
    }
  }, [alreadySubmitted, proceedToEval, loadScoresAndShowDone]);

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
          // Cache the verification for this browser session.
          markPinVerified(n, d);
          setPinStep("idle");
          setPinError("");
          // Now decide where to go based on submission status.
          if (alreadySubmitted) {
            // Load scores from cloud so Done screen & Edit mode have real values.
            loadScoresAndShowDone(n, d);
          } else {
            proceedToEval();
          }
          return;
        }

        // Wrong PIN.
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
    [alreadySubmitted, attemptsLeft, proceedToEval, loadScoresAndShowDone]
  );

  // Called from PinStep when a new juror acknowledges their PIN.
  const handlePinAcknowledge = useCallback(() => {
    const { juryName: n, juryDept: d } = stateRef.current;
    markPinVerified(n, d);
    if (alreadySubmitted) {
      loadScoresAndShowDone(n, d);
    } else {
      proceedToEval();
    }
  }, [alreadySubmitted, proceedToEval, loadScoresAndShowDone]);

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

  // ── Return value ──────────────────────────────────────────
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

    // Cloud / submission status
    cloudDraft, cloudChecking, alreadySubmitted,
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
