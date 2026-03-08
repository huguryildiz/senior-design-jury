// src/jury/useJuryState.js
// ============================================================
// Custom hook — owns ALL state and side-effects for the jury flow.
//
// ── Write strategy ────────────────────────────────────────────
//   writeGroup(pid): awaits rpc_upsert_score via Supabase.
//   Triggered by:
//     1. onBlur on any score input  → writeGroup(pid)
//     2. onBlur on comment textarea → writeGroup(pid)
//     3. Group navigation           → writeGroup(currentPid) then navigate
//
//   pendingScoresRef / pendingCommentsRef:
//     Updated synchronously in onChange handlers BEFORE React
//     commits state. writeGroup always reads from these refs so
//     it always sees the latest values regardless of render cycle.
//
// ── Identity ──────────────────────────────────────────────────
//   jurorId (UUID) comes from DB after PIN verification or
//   after issuing a new PIN (first-time juror).
//   juryName / juryDept are collected on the identity step.
//
// ── Step flow ─────────────────────────────────────────────────
//   "identity" → "semester" → ("pin" | "pin_reveal") → "progress_check" → "eval" → "done"
//   (semester step auto-advances when exactly one active semester)
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "../components/toast/useToast";
import { CRITERIA } from "../config";
import {
  listSemesters,
  getActiveSemester,
  listProjects,
  upsertScore,
  createOrGetJurorAndIssuePin,
  verifyJurorPin,
  getJurorEditState,
  finalizeJurorSubmission,
} from "../shared/api";

const STORAGE_KEYS = {
  jurorId: "jury.juror_id",
  semesterId: "jury.semester_id",
  jurorName: "jury.juror_name",
  jurorInst: "jury.juror_inst",
};
const MAX_PIN_ATTEMPTS = 3;

// ── Empty-state factories (project UUID keyed) ────────────────

const makeEmptyScores = (projects) =>
  Object.fromEntries(
    projects.map((p) => [
      p.project_id,
      Object.fromEntries(CRITERIA.map((c) => [c.id, null])),
    ])
  );

const makeEmptyComments = (projects) =>
  Object.fromEntries(projects.map((p) => [p.project_id, ""]));

const makeEmptyTouched = (projects) =>
  Object.fromEntries(
    projects.map((p) => [
      p.project_id,
      Object.fromEntries(CRITERIA.map((c) => [c.id, false])),
    ])
  );

const makeAllTouched = (projects) =>
  Object.fromEntries(
    projects.map((p) => [
      p.project_id,
      Object.fromEntries(CRITERIA.map((c) => [c.id, true])),
    ])
  );

// ── Pure helpers ──────────────────────────────────────────────

export const isScoreFilled = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v);
  const trimmed = String(v).trim();
  if (trimmed === "") return false;
  return Number.isFinite(Number(trimmed));
};

const isAllFilled = (scores, pid) =>
  CRITERIA.every((c) => isScoreFilled(scores[pid]?.[c.id]));

const isAllComplete = (scores, projects) =>
  projects.every((p) => isAllFilled(scores, p.project_id));

export const countFilled = (scores, projects) =>
  (projects || []).reduce(
    (t, p) =>
      t +
      CRITERIA.reduce(
        (n, c) => n + (isScoreFilled(scores[p.project_id]?.[c.id]) ? 1 : 0),
        0
      ),
    0
  );

const normalizeScoreValue = (val, max) => {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseInt(String(val), 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, 0), max);
};

const buildScoreSnapshot = (scores, comment) => {
  const normalizedScores = {};
  let hasAnyScores = false;
  CRITERIA.forEach((c) => {
    const v = normalizeScoreValue(scores?.[c.id], c.max);
    normalizedScores[c.id] = v;
    if (isScoreFilled(v)) hasAnyScores = true;
  });
  const cleanComment = String(comment ?? "");
  const key =
    `${CRITERIA.map((c) => (normalizedScores[c.id] ?? "")).join("|")}::${cleanComment}`;
  return {
    normalizedScores,
    comment: cleanComment,
    key,
    hasAnyScores,
    hasComment: cleanComment.trim() !== "",
  };
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export default function useJuryState() {

  // ── Identity (from DB after PIN login) ────────────────────
  const [jurorId,  setJurorId]  = useState("");
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");

  // ── Semester ──────────────────────────────────────────────
  const [semesters,    setSemesters]    = useState([]);
  const [semesterId,   setSemesterId]   = useState("");
  const [semesterName, setSemesterName] = useState("");
  const [activeSemesterInfo, setActiveSemesterInfo] = useState(null);
  const [activeProjectCount, setActiveProjectCount] = useState(null);
  const [progressCheck, setProgressCheck] = useState(null);

  // ── Dynamic projects (from DB) ────────────────────────────
  // Shape: [{ project_id, group_no, project_title, group_students }]
  const [projects, setProjects] = useState([]);

  // ── Step / navigation ─────────────────────────────────────
  const [step,    setStep]    = useState("identity");
  const [current, setCurrent] = useState(0);

  // ── Scoring state ─────────────────────────────────────────
  const [scores,   setScores]   = useState({});
  const [comments, setComments] = useState({});
  const [touched,  setTouched]  = useState({});

  const [groupSynced, setGroupSynced] = useState({});
  const [editMode,    setEditMode]    = useState(false);
  const [editAllowed, setEditAllowed] = useState(false);
  const [editLockActive, setEditLockActive] = useState(false);

  const [doneScores,   setDoneScores]   = useState(null);
  const [doneComments, setDoneComments] = useState(null);

  // ── Loading / save state ──────────────────────────────────
  // null = idle; { stage: "loading"|"error", message: string }
  const [loadingState, setLoadingState] = useState(null);
  const [saveStatus,   setSaveStatus]   = useState("idle");

  // ── Auth state ────────────────────────────────────────────
  const [pinError, setPinError] = useState("");
  const [pinErrorCode, setPinErrorCode] = useState("");
  const [pinAttemptsLeft, setPinAttemptsLeft] = useState(MAX_PIN_ATTEMPTS);
  const [pinLockedUntil, setPinLockedUntil] = useState("");
  const [authError, setAuthError] = useState("");
  const [issuedPin, setIssuedPin] = useState("");

  // ── Submission confirmation ───────────────────────────────
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const _toast = useToast();
  const setSubmitError = (msg) => { if (msg) _toast.error(msg); };

  // ── Refs ──────────────────────────────────────────────────
  const doneFiredRef     = useRef(false);
  const submitPendingRef = useRef(false);

  // stateRef: always-fresh snapshot for async callbacks
  const stateRef = useRef({});
  stateRef.current = { jurorId, semesterId, projects, scores, comments, current };

  // pendingScoresRef / pendingCommentsRef:
  // Updated synchronously in onChange handlers — writeGroup reads these
  // so it always has the latest values regardless of render timing.
  const pendingScoresRef   = useRef(scores);
  const pendingCommentsRef = useRef(comments);
  const lastWrittenRef     = useRef({});
  const semesterSelectLockRef = useRef(false);

  // ── Derived ───────────────────────────────────────────────
  const project     = projects[current] || null;
  const totalFields = projects.length * CRITERIA.length;
  const progressPct =
    totalFields > 0
      ? Math.round((countFilled(scores, projects) / totalFields) * 100)
      : 0;
  const allComplete = projects.length > 0 && isAllComplete(scores, projects);

  const clearLocalSession = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  // ── Core write: single group → single score row ───────────
  // Reads from pendingScoresRef / pendingCommentsRef — always fresh.
  const writeGroup = useCallback(
    async (pid) => {
      const { jurorId: jid, semesterId: sid } = stateRef.current;
      if (!jid || !sid || !pid) return false;

      const s = pendingScoresRef.current;
      const c = pendingCommentsRef.current;
      const currentComment = String(c[pid] || "");
      const snapshot = buildScoreSnapshot(s[pid], currentComment);

      if (!snapshot.hasAnyScores && !snapshot.hasComment && !lastWrittenRef.current[pid]) {
        return true; // truly untouched, skip
      }

      const last  = lastWrittenRef.current[pid];
      if (last && last.key === snapshot.key) {
        return true; // no data changes
      }

      setSaveStatus("saving");
      try {
        await upsertScore(sid, pid, jid, snapshot.normalizedScores, snapshot.comment);
        lastWrittenRef.current[pid] = { key: snapshot.key };
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);

        if (isAllFilled(s, pid)) {
          setGroupSynced((prev) => ({ ...prev, [pid]: true }));
        }
        return true;
      } catch (_) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
        return false;
      }
    },
    [] // stateRef and refs are stable
  );

  // ── Group navigation with guaranteed write ────────────────
  const handleNavigate = useCallback(
    async (newIndex) => {
      const { current: cur, projects: projs } = stateRef.current;
      const currentPid = projs[cur]?.project_id;
      if (currentPid) await writeGroup(currentPid);
      setCurrent(newIndex);
    },
    [writeGroup]
  );

  // ── Submit handlers ───────────────────────────────────────

  const handleRequestSubmit = useCallback(async () => {
    setSubmitError("");
    const { scores: s, projects: projs } = stateRef.current;
    if (!isAllComplete(s, projs)) {
      setTouched(makeAllTouched(projs));
      const firstIncomplete = projs.findIndex(
        (p) => !isAllFilled(s, p.project_id)
      );
      if (firstIncomplete >= 0) setCurrent(firstIncomplete);
      return;
    }
    if (submitPendingRef.current) return;
    submitPendingRef.current = true;
    setLoadingState({ stage: "loading", message: "Saving latest scores…" });

    let allSaved = true;
    for (const p of projs) {
      const ok = await writeGroup(p.project_id);
      if (!ok) allSaved = false;
    }

    setLoadingState(null);
    if (!allSaved) {
      setSubmitError("Could not save all scores. Please check your connection and try again.");
      submitPendingRef.current = false;
      return;
    }

    setConfirmingSubmit(true);
  }, [writeGroup]);

  // ── Auto-upgrade groupSynced ──────────────────────────────
  useEffect(() => {
    if (step !== "eval" || editMode) return;
    const newly = {};
    projects.forEach((p) => {
      if (!groupSynced[p.project_id] && isAllFilled(scores, p.project_id)) {
        newly[p.project_id] = true;
      }
    });
    if (Object.keys(newly).length > 0) {
      setGroupSynced((prev) => ({ ...prev, ...newly }));
    }
  }, [scores, step, groupSynced, editMode, projects]);

  // ── Auto-done: show confirmation when all groups filled ───
  useEffect(() => {
    if (step !== "eval" || doneFiredRef.current || editMode) return;
    if (submitPendingRef.current) return;
    if (projects.length === 0) return;
    if (!projects.every((p) => groupSynced[p.project_id])) return;

    handleRequestSubmit();
  }, [groupSynced, step, editMode, projects, handleRequestSubmit]);

  // ── Score handlers ────────────────────────────────────────

  const handleScore = useCallback(
    (pid, cid, val) => {
      const stored = val === "" ? null : val;
      const newScores = {
        ...pendingScoresRef.current,
        [pid]: { ...pendingScoresRef.current[pid], [cid]: stored },
      };
      pendingScoresRef.current = newScores;
      setScores(newScores);
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      if (!isScoreFilled(stored)) {
        setGroupSynced((prev) => ({ ...prev, [pid]: false }));
      }
    },
    []
  );

  const handleScoreBlur = useCallback(
    (pid, cid) => {
      const crit = CRITERIA.find((c) => c.id === cid);
      setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      // Clamp and normalize value
      const val       = pendingScoresRef.current[pid]?.[cid];
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
        ...pendingScoresRef.current,
        [pid]: { ...pendingScoresRef.current[pid], [cid]: normalized },
      };
      pendingScoresRef.current = newScores;
      setScores(newScores);
      writeGroup(pid);
    },
    [writeGroup]
  );

  const handleCommentChange = useCallback((pid, val) => {
    pendingCommentsRef.current = { ...pendingCommentsRef.current, [pid]: val };
    setComments((prev) => ({ ...prev, [pid]: val }));
  }, []);

  const handleCommentBlur = useCallback(
    (pid) => {
      writeGroup(pid);
    },
    [writeGroup]
  );

  const handleConfirmSubmit = useCallback(async () => {
    setConfirmingSubmit(false);
    setSubmitError("");
    setLoadingState({ stage: "loading", message: "Submitting scores…" });

    const {
      scores: s,
      comments: c,
      jurorId: jid,
      semesterId: sid,
      projects: projs,
    } = stateRef.current;

    if (!jid || !sid || !Array.isArray(projs) || projs.length === 0) {
      setLoadingState(null);
      submitPendingRef.current = false;
      return;
    }

    // Flush any pending edits before finalizing.
    let allSaved = true;
    for (const p of projs) {
      const ok = await writeGroup(p.project_id);
      if (!ok) allSaved = false;
    }
    if (!allSaved) {
      setLoadingState(null);
      setSubmitError("Could not save all scores. Please check your connection and try again.");
      submitPendingRef.current = false;
      return;
    }

    try {
      const ok = await finalizeJurorSubmission(sid, jid);
      if (!ok) throw new Error("finalize_failed");

      doneFiredRef.current = true;
      setDoneScores({ ...s });
      setDoneComments({ ...c });
      setEditMode(false);
      setStep("done");
      setEditAllowed(false);

      // Refresh projects to get submission timestamps for DoneStep.
      listProjects(sid, jid)
        .then((projectList) => {
          const uiProjects = projectList.map((p) => ({
            project_id:     p.project_id,
            group_no:       p.group_no,
            project_title:  p.project_title,
            group_students: p.group_students,
            final_submitted_at: p.final_submitted_at,
            updated_at: p.updated_at,
          }));
          setProjects(uiProjects);
        })
        .catch(() => {});
    } catch (_) {
      // Keep user in eval mode; submission didn't finalize.
      setSubmitError("Final submission failed. Please try again.");
    } finally {
      setLoadingState(null);
      submitPendingRef.current = false;
    }
  }, [writeGroup]);

  const handleCancelSubmit = useCallback(() => {
    setConfirmingSubmit(false);
    submitPendingRef.current = false;
  }, []);

  useEffect(() => {
    if (step !== "done" || !jurorId || !semesterId) return;
    let alive = true;
    const refreshEditState = async () => {
      try {
        const editState = await getJurorEditState(semesterId, jurorId);
        if (!alive) return;
        setEditAllowed(!!editState?.edit_allowed);
        setEditLockActive(!!editState?.lock_active);
      } catch {}
    };

    refreshEditState();
    const timer = setInterval(refreshEditState, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [step, jurorId, semesterId]);

  // ── Edit-mode from DoneStep ───────────────────────────────
  const handleEditScores = useCallback(() => {
    if (!editAllowed) return;
    const s = doneScores || scores;
    const c = doneComments || comments;
    pendingScoresRef.current   = s;
    pendingCommentsRef.current = c;
    lastWrittenRef.current     = Object.fromEntries(
      Object.keys(s || {}).map((pid) => {
        const snapshot = buildScoreSnapshot(s[pid], c?.[pid]);
        return [pid, { key: snapshot.key }];
      })
    );
    setScores(s);
    setComments(c);
    setEditMode(true);
    doneFiredRef.current = false;
    setGroupSynced(
      Object.fromEntries(projects.map((p) => [p.project_id, true]))
    );
    setStep("eval");
  }, [editAllowed, doneScores, doneComments, scores, comments, projects]);

  // ── Identity submit (name + institution) ──────────────────
  const handleIdentitySubmit = useCallback(async () => {
    const name = juryName.trim();
    const inst = juryDept.trim();
    if (!name || !inst) {
      setAuthError("Please enter your full name and institution.");
      return;
    }
    setAuthError("");
    setLoadingState({ stage: "loading", message: "Loading semesters…" });
    try {
      const semesterList = await listSemesters();
      const active = (semesterList || []).filter((s) => s.is_active);
      setSemesters(active);
      if (active.length === 1) {
        await handleSemesterSelect(active[0]);
        return;
      }
      setLoadingState(null);
      setStep("semester");
    } catch (_) {
      setLoadingState(null);
      setAuthError("Could not load semesters. Please try again.");
    }
  }, [juryName, juryDept]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await getActiveSemester();
        if (!alive) return;
        setActiveSemesterInfo(res || null);
        if (res?.id) {
          try {
            const projectList = await listProjects(res.id, null);
            if (!alive) return;
            setActiveProjectCount(projectList.length);
          } catch {
            if (alive) setActiveProjectCount(null);
          }
        } else {
          setActiveProjectCount(null);
        }
      } catch {
        if (alive) setActiveProjectCount(null);
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  // ── PIN submit (resume) ───────────────────────────────────
  const handlePinSubmit = useCallback(async (enteredPin) => {
    setPinError("");
    setPinErrorCode("");
    setPinLockedUntil("");
    setLoadingState({ stage: "loading", message: "Verifying…" });
    try {
      const res = await verifyJurorPin(semesterId, juryName, juryDept, enteredPin);
      if (!res?.ok) {
        setLoadingState(null);
        const failedAttempts =
          typeof res?.failed_attempts === "number" ? res.failed_attempts : null;
        const lockedUntil = res?.locked_until || "";
        const lockedDate = lockedUntil ? new Date(lockedUntil) : null;
        const isLocked =
          res?.error_code === "locked"
          || (lockedDate && !Number.isNaN(lockedDate.getTime()) && lockedDate > new Date())
          || (failedAttempts !== null && failedAttempts >= MAX_PIN_ATTEMPTS);
        if (res?.error_code === "semester_inactive") {
          setPinErrorCode("semester_inactive");
          setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
          setPinError("This semester is no longer active. Please start a new evaluation.");
        } else if (res?.error_code === "not_found") {
          setPinErrorCode("not_found");
          setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
          setPinError("No juror found with this name/institution.");
        } else if (res?.error_code === "no_pin") {
          setPinErrorCode("no_pin");
          setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
          setPinError("No PIN found for this semester. Please start a new evaluation.");
        } else if (isLocked) {
          setPinErrorCode("locked");
          setPinAttemptsLeft(0);
          setPinLockedUntil(lockedUntil);
          setPinError("locked");
        } else {
          setPinErrorCode("invalid");
          if (failedAttempts !== null) {
            setPinAttemptsLeft(Math.max(0, MAX_PIN_ATTEMPTS - failedAttempts));
          }
          setPinError("Incorrect PIN.");
        }
        return;
      }
      const jid = res.juror_id;
      const nextName = res.juror_name || juryName;
      const nextInst = res.juror_inst || juryDept;
      if (res.juror_name) setJuryName(res.juror_name);
      if (res.juror_inst) setJuryDept(res.juror_inst);
      setJurorId(jid);
      if (res?.pin_plain_once) {
        setIssuedPin(res.pin_plain_once);
        setPinError("");
        setPinErrorCode("");
        setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
        setPinLockedUntil("");
        setLoadingState(null);
        setStep("pin_reveal");
        return;
      }
      setIssuedPin("");
      setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
      setPinLockedUntil("");
      setLoadingState(null);
      await _loadSemester(
        { id: semesterId, name: semesterName },
        jid,
        { name: nextName, inst: nextInst },
        { showProgressCheck: true, showEmptyProgress: false }
      );
    } catch (_) {
      setLoadingState(null);
      setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
      setPinErrorCode("network");
      setPinLockedUntil("");
      setPinError("Connection error. Please try again.");
    }
  }, [semesterId, semesterName, juryName, juryDept]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Internal: load semester + projects ───────────────────
  // Shared by handlePinSubmit (auto-advance) and handleSemesterSelect.
  const _loadSemester = async (semester, overrideJurorId, identityOverride, options = {}) => {
    const jid = overrideJurorId || stateRef.current.jurorId;
      const { showProgressCheck = false, showEmptyProgress = false } = options;
    setLoadingState({ stage: "loading", message: "Loading projects…" });
    try {
      const projectList = await listProjects(semester.id, jid);
      let editState = null;
      try {
        editState = await getJurorEditState(semester.id, jid);
      } catch {}

      setSemesterId(semester.id);
      setSemesterName(semester.name);

      // Seed scores / comments from existing DB data
      const seedScores   = Object.fromEntries(
        projectList.map((p) => [p.project_id, { ...p.scores }])
      );
      const seedComments = Object.fromEntries(
        projectList.map((p) => [p.project_id, p.comment || ""])
      );
      const seedTouched  = makeEmptyTouched(projectList);
      // A project is "synced" if all criteria are filled (independent of final submission)
      const seedSynced   = Object.fromEntries(
        projectList
          .filter((p) => isAllFilled(seedScores, p.project_id))
          .map((p) => [p.project_id, true])
      );

      // Strip to just the fields the UI needs (scores live in state separately)
          const uiProjects = projectList.map((p) => ({
            project_id:     p.project_id,
            group_no:       p.group_no,
            project_title:  p.project_title,
            group_students: p.group_students,
            final_submitted_at: p.final_submitted_at,
            updated_at: p.updated_at,
          }));

      pendingScoresRef.current   = seedScores;
      pendingCommentsRef.current = seedComments;
      lastWrittenRef.current     = Object.fromEntries(
        projectList.map((p) => {
          const snapshot = buildScoreSnapshot(seedScores[p.project_id], seedComments[p.project_id]);
          return [p.project_id, { key: snapshot.key }];
        })
      );

      setProjects(uiProjects);
      setScores(seedScores);
      setComments(seedComments);
      setTouched(seedTouched);
      setGroupSynced(seedSynced);
      setCurrent(0);
      doneFiredRef.current = false;
      submitPendingRef.current = false;
      setLoadingState(null);
      const canEdit = !!editState?.edit_allowed;
      setEditAllowed(canEdit);
      setEditLockActive(!!editState?.lock_active);
      const allCompleteNow = uiProjects.length > 0 && isAllComplete(seedScores, uiProjects);
      const finalSubmittedAt = projectList.find((p) => p.final_submitted_at)?.final_submitted_at || "";
      const isFinalSubmitted = Boolean(finalSubmittedAt);
      const progressRows = projectList
        .filter((p) => {
          if (isFinalSubmitted) return true;
          const scores = p.scores || {};
          const hasScore = Object.values(scores).some(isScoreFilled);
          const hasComment = String(p.comment || "").trim() !== "";
          return hasScore || hasComment;
        })
        .map((p) => {
          const scores = p.scores || {};
          const hasScore = Object.values(scores).some(isScoreFilled);
          const hasComment = String(p.comment || "").trim() !== "";
          const hasAny = hasScore || hasComment;
          const status = isFinalSubmitted
            ? "group_submitted"
            : (hasAny ? "in_progress" : "not_started");
          const timestamp = isFinalSubmitted
            ? (p.final_submitted_at || finalSubmittedAt || "")
            : (hasAny ? (p.updated_at || "") : "");
          return ({
            projectId: p.project_id,
            status,
            total: p.total ?? null,
            timestamp,
          });
        });
      const hasProgress = progressRows.length > 0;
      const filledCount = projectList.filter((p) => isAllFilled(seedScores, p.project_id)).length;
      const totalCount = projectList.length;
      const allSubmitted = isFinalSubmitted;
      if (isFinalSubmitted) {
        setDoneScores({ ...seedScores });
        setDoneComments({ ...seedComments });
        setEditMode(false);
        setProgressCheck(null);
        setStep("done");
      } else {
        setDoneScores(null);
        setDoneComments(null);
        if (showProgressCheck && (hasProgress || showEmptyProgress)) {
          setProgressCheck({
            rows: progressRows,
            filledCount,
            totalCount,
            allSubmitted,
            editAllowed: canEdit,
            nextStep: "eval",
          });
          setStep("progress_check");
        } else {
          setStep("eval");
        }
      }
    } catch (_) {
      setLoadingState(null);
      setPinError("Could not load projects. Please try again.");
      setStep("identity");
    }
  };

  // ── Semester selection (from SemesterStep) ────────────────
  const handleSemesterSelect = useCallback(
    async (semester) => {
      if (semesterSelectLockRef.current) return;
      if (!semester?.is_active) {
        setAuthError("Only the active semester can be evaluated.");
        setStep("identity");
        return;
      }
      const name = juryName.trim();
      const inst = juryDept.trim();
      if (!name || !inst) {
        setAuthError("Please enter your full name and institution.");
        setStep("identity");
        return;
      }
      semesterSelectLockRef.current = true;
      setAuthError("");
      setSemesterId(semester.id);
      setSemesterName(semester.name);
      setLoadingState({ stage: "loading", message: "Preparing access…" });
      try {
        const res = await createOrGetJurorAndIssuePin(semester.id, name, inst);
        if (res?.juror_name) setJuryName(res.juror_name);
        if (res?.juror_inst) setJuryDept(res.juror_inst);
        if (res?.needs_pin) {
          setJurorId(res.juror_id || "");
          setIssuedPin("");
          setPinError("");
          const lockedUntil = res?.locked_until || "";
          const lockedDate = lockedUntil ? new Date(lockedUntil) : null;
          const isLocked = lockedDate && !Number.isNaN(lockedDate.getTime()) && lockedDate > new Date();
          if (isLocked) {
            setPinErrorCode("locked");
            setPinAttemptsLeft(0);
            setPinLockedUntil(lockedUntil);
          } else {
            setPinErrorCode("");
            setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
            setPinLockedUntil("");
          }
          setLoadingState(null);
          setStep("pin");
          return;
        }
        setJurorId(res?.juror_id || "");
        setIssuedPin(res?.pin_plain_once || "");
        setPinError("");
        setPinErrorCode("");
        setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
        setPinLockedUntil("");
        setLoadingState(null);
        setStep("pin_reveal");
      } catch (e) {
        semesterSelectLockRef.current = false;
        setLoadingState(null);
        if (String(e?.message || "").includes("semester_inactive")) {
          setAuthError("This semester is no longer active. Please try again.");
        } else {
          setAuthError("Could not start the evaluation. Please try again.");
        }
        setStep("identity");
      }
    },
    [juryName, juryDept]
  );

  const handlePinRevealContinue = useCallback(async () => {
    if (!jurorId || !semesterId) return;
    setIssuedPin("");
      await _loadSemester(
        { id: semesterId, name: semesterName },
        jurorId,
        { name: juryName, inst: juryDept },
        { showProgressCheck: true, showEmptyProgress: true }
      );
  }, [jurorId, semesterId, semesterName, juryName, juryDept]);

  const handleProgressContinue = useCallback(() => {
    if (!progressCheck?.nextStep) return;
    setStep(progressCheck.nextStep);
    setProgressCheck(null);
  }, [progressCheck]);

  // NOTE: We intentionally do NOT auto-resume. PIN is always required on entry.

  // ── Full reset ────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setJurorId("");
    setJuryName("");
    setJuryDept("");
    setSemesters([]);
    setSemesterId("");
    setSemesterName("");
    setActiveProjectCount(null);
    setProgressCheck(null);
    setProjects([]);
    setStep("identity");
    setCurrent(0);
    setScores({});
    setComments({});
    setTouched({});
    setGroupSynced({});
    setEditMode(false);
    setEditAllowed(false);
    setEditLockActive(false);
    setDoneScores(null);
    setDoneComments(null);
    setLoadingState(null);
    setSaveStatus("idle");
    setPinError("");
    setPinErrorCode("");
    setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
    setPinLockedUntil("");
    setAuthError("");
    setIssuedPin("");
    setConfirmingSubmit(false);
    pendingScoresRef.current   = {};
    pendingCommentsRef.current = {};
    lastWrittenRef.current     = {};
    semesterSelectLockRef.current = false;
    doneFiredRef.current       = false;
    submitPendingRef.current   = false;
  }, []);

  // ─────────────────────────────────────────────────────────
  return {
    // Identity
    jurorId,
    juryName, setJuryName,
    juryDept, setJuryDept,
    authError,
    issuedPin,

    // Semester
    semesters,
    semesterId,
    semesterName,
    activeSemesterInfo,
    activeProjectCount,
    progressCheck,

    // Projects (dynamic)
    projects,

    // Step / navigation
    step, setStep,
    current,
    handleNavigate,

    // Scoring
    scores, comments, touched,
    handleScore, handleScoreBlur,
    handleCommentChange, handleCommentBlur,

    // Derived
    project, progressPct, allComplete,
    groupSynced, editMode, editAllowed, editLockActive,
    doneScores, doneComments,

    // Loading
    loadingState,
    saveStatus,

    // PIN
    pinError,
    pinErrorCode,
    pinAttemptsLeft,
    pinLockedUntil,
    handlePinSubmit,
    handleIdentitySubmit,
    handlePinRevealContinue,
    handleProgressContinue,

    // Semester
    handleSemesterSelect,

    // Submit
    confirmingSubmit,
    handleRequestSubmit,
    handleConfirmSubmit,
    handleCancelSubmit,

    // Edit
    handleEditScores,
    handleFinalSubmit: handleRequestSubmit,

    resetAll,
    clearLocalSession,
  };
}
