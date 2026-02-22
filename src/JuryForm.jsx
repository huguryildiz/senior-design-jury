// src/JuryForm.jsx
// ============================================================
// v5.2 fixes:
//   - Add GET ?action=myscores (Apps Script) and use it to show
//     real submitted scores/comments on "View My Scores"
//   - Re-submit = open existing submitted scores for editing (no reset)
//   - Edit Scores (from Thank You) also unlocks Sheets via resetJuror
//   - Thank You page shows comments
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

const STORAGE_KEY   = "ee492_jury_draft_v1";
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const SYNC_INTERVAL = 2 * 60 * 1000;
const DEBOUNCE_MS   = 400;
const INSTANT_DELAY = 300;

// ── Empty state factories ─────────────────────────────────────
const makeEmptyScores = () =>
  Object.fromEntries(PROJECTS.map((p) => [
    p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, ""]))
  ]));

const makeEmptyComments = () =>
  Object.fromEntries(PROJECTS.map((p) => [p.id, ""]));

const makeEmptyTouched = () =>
  Object.fromEntries(PROJECTS.map((p) => [
    p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, false]))
  ]));

// Mark ALL criteria as touched (shows Required hints everywhere)
const makeAllTouched = () =>
  Object.fromEntries(PROJECTS.map((p) => [
    p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, true]))
  ]));

// ── Score helpers ─────────────────────────────────────────────
const calcTotal = (scores, pid) =>
  CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);

const isAllFilled = (scores, pid) =>
  CRITERIA.every((c) => scores[pid]?.[c.id] !== "");

const isAllComplete = (scores) =>
  PROJECTS.every((p) => isAllFilled(scores, p.id));

const countFilled = (scores) =>
  PROJECTS.reduce((t, p) =>
    t + CRITERIA.reduce((n, c) => n + (scores[p.id][c.id] !== "" ? 1 : 0), 0), 0);

const hasAnyCriteria = (scores, pid) =>
  CRITERIA.some((c) => scores[pid]?.[c.id] !== "");

// ── Fire-and-forget POST ──────────────────────────────────────
async function postToSheet(body) {
  if (!SCRIPT_URL) return;
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (_) {}
}

// ── Build evaluation row ──────────────────────────────────────
function buildRow(juryName, juryDept, scores, comments, project, status) {
  return {
    juryName,
    juryDept,
    timestamp: new Date().toLocaleString("en-GB"),
    projectId: project.id,
    projectName: project.name,
    design: scores[project.id]?.design ?? "",
    technical: scores[project.id]?.technical ?? "",
    delivery: scores[project.id]?.delivery ?? "",
    teamwork: scores[project.id]?.teamwork ?? "",
    total: calcTotal(scores, project.id),
    comments: comments[project.id] || "",
    status,
  };
}

// ── Fetch submitted scores/comments from Sheets ───────────────
function rowsToState(rows) {
  const es = makeEmptyScores();
  const ec = makeEmptyComments();

  (rows || []).forEach((r) => {
    const pid = Number(r.projectId);
    if (!pid) return;

    es[pid] = {
      ...es[pid],
      design:    r.design    ?? "",
      technical: r.technical ?? "",
      delivery:  r.delivery  ?? "",
      teamwork:  r.teamwork  ?? "",
    };
    ec[pid] = r.comments ?? "";
  });

  return { scores: es, comments: ec };
}

async function fetchMyScoresFromSheet(juryName, juryDept) {
  const n = (juryName || "").trim();
  const d = (juryDept || "").trim();
  if (!SCRIPT_URL || !n) return null;

  try {
    const url =
      `${SCRIPT_URL}?action=myscores` +
      `&juryName=${encodeURIComponent(n)}` +
      `&juryDept=${encodeURIComponent(d)}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== "ok") return null;

    return json.rows || [];
  } catch (_) {
    return null;
  }
}

// ── Icons ─────────────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
export default function JuryForm({ onBack, startAtEval = false }) {
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");

  const [step, setStep] = useState("info"); // "info" | "eval" | "done"
  const [current, setCurrent] = useState(0);

  const [scores, setScores] = useState(makeEmptyScores);
  const [comments, setComments] = useState(makeEmptyComments);

  const [openRubric, setOpenRubric] = useState(null);
  const [touched, setTouched] = useState(makeEmptyTouched);

  const [showBackMenu, setShowBackMenu] = useState(false);

  const [groupSynced, setGroupSynced] = useState({});
  const [cloudDraft, setCloudDraft] = useState(null);
  const [cloudChecking, setCloudChecking] = useState(false);

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved

  const [editMode, setEditMode] = useState(false);

  // Snapshot for DONE screen (so it doesn't change while editing)
  const [doneScores, setDoneScores] = useState(null);
  const [doneComments, setDoneComments] = useState(null);

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const doneFiredRef = useRef(false);
  const debounceRef = useRef(null);
  const instantRef = useRef(null);

  // ── On mount: restore from localStorage, optionally jump to eval ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const p = JSON.parse(saved);

      if (p.juryName) setJuryName(p.juryName);
      if (p.juryDept) setJuryDept(p.juryDept);

      if (startAtEval && p.step === "eval") {
        if (p.scores) setScores(p.scores);
        if (p.comments) setComments(p.comments);
        if (typeof p.current === "number") setCurrent(p.current);
        if (p.groupSynced) setGroupSynced(p.groupSynced);
        setStep("eval");
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Apply draft ───────────────────────────────────────────
  const applyDraft = useCallback((draft) => {
    if (draft.juryName) setJuryName(draft.juryName);
    if (draft.juryDept) setJuryDept(draft.juryDept);
    if (draft.scores) setScores(draft.scores);
    if (draft.comments) setComments(draft.comments);
    if (typeof draft.current === "number") setCurrent(draft.current);
    if (draft.groupSynced) setGroupSynced(draft.groupSynced);
  }, []);

  // ── Cloud lookup: verify FIRST, then loadDraft ─────────────
  const lookupCloud = useCallback(async (name, dept) => {
    const n = name.trim(), d = dept.trim();
    if (!n || !SCRIPT_URL) return;

    setCloudChecking(true);
    setCloudDraft(null);
    setAlreadySubmitted(false);

    try {
      // Step 1: verify
      const verifyUrl = `${SCRIPT_URL}?action=verify`
        + `&juryName=${encodeURIComponent(n)}`
        + `&juryDept=${encodeURIComponent(d)}`;

      const vRes = await fetch(verifyUrl, { cache: "no-store" });
      if (vRes.ok) {
        const vJson = await vRes.json();
        if (vJson.status === "ok" && vJson.submittedCount >= PROJECTS.length) {
          setAlreadySubmitted(true);
          return; // skip loadDraft
        }
      }

      // Step 2: loadDraft
      const draftUrl = `${SCRIPT_URL}?action=loadDraft`
        + `&juryName=${encodeURIComponent(n)}`
        + `&juryDept=${encodeURIComponent(d)}`;

      const dRes = await fetch(draftUrl, { cache: "no-store" });
      if (dRes.ok) {
        const dJson = await dRes.json();
        if (dJson.status === "ok" && dJson.draft) setCloudDraft(dJson.draft);
      }
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

  // ── localStorage auto-save ────────────────────────────────
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
    if (!juryName.trim() || !SCRIPT_URL) return;

    if (showFeedback) setSaveStatus("saving");

    postToSheet({
      action: "saveDraft",
      juryName: juryName.trim(),
      juryDept: juryDept.trim(),
      draft: { juryName: juryName.trim(), juryDept: juryDept.trim(), scores, comments, current, groupSynced },
    }).then(() => {
      if (showFeedback) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }, [juryName, juryDept, scores, comments, current, groupSynced]);

  const deleteCloudDraft = useCallback(() => {
    if (!juryName.trim() || !SCRIPT_URL) return;
    postToSheet({ action: "deleteDraft", juryName: juryName.trim(), juryDept: juryDept.trim() });
  }, [juryName, juryDept]);

  // ── Instant write on every score/comment change ───────────
  const instantWrite = useCallback((newScores, newComments, newGroupSynced) => {
    clearTimeout(instantRef.current);
    instantRef.current = setTimeout(() => {
      if (!juryName.trim()) return;

      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(newScores, p.id))
        .map((p) => {
          const allFilled = isAllFilled(newScores, p.id);
          const synced = newGroupSynced[p.id];
          return buildRow(
            juryName,
            juryDept,
            newScores,
            newComments,
            p,
            allFilled ? "group_submitted" : "in_progress"
          );
        });

      if (rows.length > 0) postToSheet({ rows });
    }, INSTANT_DELAY);
  }, [juryName, juryDept]);

  // ── Periodic 2-min sync ───────────────────────────────────
  useEffect(() => {
    if (step !== "eval" || !juryName.trim()) return;

    const id = setInterval(() => {
      const rows = PROJECTS
        .filter((p) => hasAnyCriteria(scores, p.id))
        .map((p) => buildRow(
          juryName,
          juryDept,
          scores,
          comments,
          p,
          isAllFilled(scores, p.id) ? "group_submitted" : "in_progress"
        ));

      if (rows.length > 0) postToSheet({ rows });
      saveCloudDraft();
    }, SYNC_INTERVAL);

    return () => clearInterval(id);
  }, [step, juryName, juryDept, scores, comments, groupSynced, saveCloudDraft]);

  // ── Auto-upgrade groupSynced ──────────────────────────────
  useEffect(() => {
  if (step !== "eval" || editMode) return; // ✅ edit modda otomatik upgrade yapma
  const newly = {};
  PROJECTS.forEach((p) => {
    if (!groupSynced[p.id] && isAllFilled(scores, p.id)) newly[p.id] = true;
  });
  if (Object.keys(newly).length > 0) setGroupSynced((prev) => ({ ...prev, ...newly }));
}, [scores, step, groupSynced, editMode]);

  // ── All groups done → done screen (only when NOT editing) ─
  useEffect(() => {
    if (step !== "eval" || doneFiredRef.current || editMode) return;
    if (!PROJECTS.every((p) => groupSynced[p.id])) return;

    doneFiredRef.current = true;

    const t = setTimeout(() => {
      postToSheet({ rows: PROJECTS.map((p) => buildRow(juryName, juryDept, scores, comments, p, "all_submitted")) });
      deleteCloudDraft();
      localStorage.removeItem(STORAGE_KEY);

      setDoneScores({ ...scores });
      setDoneComments({ ...comments });
      setStep("done");
    }, 800);

    return () => clearTimeout(t);
  }, [groupSynced, step, editMode, juryName, juryDept, scores, comments, deleteCloudDraft]);

  // ── Reset ─────────────────────────────────────────────────
  const resetAll = () => {
    setJuryName("");
    setJuryDept("");
    setStep("info");
    setCurrent(0);
    setScores(makeEmptyScores());
    setComments(makeEmptyComments());
    setTouched(makeEmptyTouched());
    setShowBackMenu(false);
    setGroupSynced({});
    setCloudDraft(null);
    setEditMode(false);
    setDoneScores(null);
    setDoneComments(null);
    setAlreadySubmitted(false);
    doneFiredRef.current = false;
  };

  // ── Edit Scores (from DONE) ────────────────────────────────
  // IMPORTANT: unlock Sheets (resetJuror) so all_submitted → in_progress
  const handleEditScores = () => {
    const useScores = doneScores || scores;
    const useComments = doneComments || comments;

    // Unlock on Sheets
    if (SCRIPT_URL) {
      postToSheet({ action: "resetJuror", juryName: juryName.trim(), juryDept: juryDept.trim() });
      // Optional: immediately write in_progress rows
      postToSheet({ rows: PROJECTS.map((p) => buildRow(juryName, juryDept, useScores, useComments, p, "in_progress")) });
    }

    setScores(useScores);
    setComments(useComments);

    setEditMode(true);
    doneFiredRef.current = false;

    // Prevent auto-done jump while editing
    setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));

    setStep("eval");

    // Mark as group_submitted (editing state)
    postToSheet({ rows: PROJECTS.map((p) => buildRow(juryName, juryDept, useScores, useComments, p, "group_submitted")) });
  };

  // ── Submit Final: validate ALL groups before sending ───────
  const handleFinalSubmit = () => {
    if (!isAllComplete(scores)) {
      setTouched(makeAllTouched());
      const firstIncomplete = PROJECTS.findIndex((p) => !isAllFilled(scores, p.id));
      if (firstIncomplete >= 0) setCurrent(firstIncomplete);
      return;
    }

    postToSheet({ rows: PROJECTS.map((p) => buildRow(juryName, juryDept, scores, comments, p, "all_submitted")) });
    deleteCloudDraft();
    localStorage.removeItem(STORAGE_KEY);

    setDoneScores({ ...scores });
    setDoneComments({ ...comments });

    setEditMode(false);
    doneFiredRef.current = true;
    setStep("done");
  };

  // ── handleScore ───────────────────────────────────────────
  const markTouched = (pid, cid) =>
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

  const handleScore = (pid, cid, val) => {
    const crit = CRITERIA.find((c) => c.id === cid);
    const parsed = val === "" ? "" : parseInt(val, 10);
    const clamped = val === "" ? "" : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), crit.max);

    const newScores = { ...scores, [pid]: { ...scores[pid], [cid]: clamped } };
    setScores(newScores);
    markTouched(pid, cid);

    // Downgrade groupSynced if criterion cleared
    let newGroupSynced = groupSynced;
    if (clamped === "" && groupSynced[pid]) {
      newGroupSynced = { ...groupSynced, [pid]: false };
      setGroupSynced(newGroupSynced);
    }

    instantWrite(newScores, comments, newGroupSynced);
  };

  const handleCommentChange = (pid, val) => {
    const nc = { ...comments, [pid]: val };
    setComments(nc);
    instantWrite(scores, nc, groupSynced);
  };

  // ── Derived ───────────────────────────────────────────────
  const project = PROJECTS[current];
  const progressPct = Math.round((countFilled(scores) / (PROJECTS.length * CRITERIA.length)) * 100);
  const allComplete = isAllComplete(scores);

  const progressColor = (() => {
    if (progressPct === 0) return "#e2e8f0";
    if (progressPct < 33) return "linear-gradient(90deg,#ef4444,#f97316)";
    if (progressPct < 66) return "linear-gradient(90deg,#ef4444,#f97316,#eab308)";
    if (progressPct < 100) return "linear-gradient(90deg,#f97316,#eab308,#84cc16)";
    return "linear-gradient(90deg,#eab308,#22c55e)";
  })();

  // ════════════════════════════════════════════════════════
  // DONE screen
  // ════════════════════════════════════════════════════════
  if (step === "done") {
    const displayScores = doneScores || scores;
    const displayComments = doneComments || comments;

    return (
      <div className="done-screen">
        <div className="done-card">
          <div className="done-icon">🎉</div>
          <h2>Thank You!</h2>
          <p className="done-subtitle">
            Your evaluations have been recorded successfully.<br />
            We appreciate your time and valuable feedback.
          </p>

          <div className="done-summary">
            {PROJECTS.map((p) => (
              <div key={p.id} className="done-row">
                <div className="done-row-left">
                  <span className="done-row-name">{p.name}</span>
                  {p.desc && <span className="done-row-desc">{p.desc}</span>}
                  {displayComments?.[p.id] && (
                    <div className="done-comment">💬 {displayComments[p.id]}</div>
                  )}
                </div>
                <span className="done-score">{calcTotal(displayScores, p.id)} / 100</span>
              </div>
            ))}
          </div>

          <div className="done-actions">
            <button className="btn-secondary" onClick={handleEditScores}>✏️ Edit Scores</button>
            <button className="btn-primary" onClick={() => { resetAll(); onBack(); }}>
              <HomeIcon /> Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // INFO screen
  // ════════════════════════════════════════════════════════
  if (step === "info") {
    // Re-submit = open existing submitted scores for editing
    const handleResubmit = async () => {
      const rows = await fetchMyScoresFromSheet(juryName, juryDept);
      if (rows && rows.length) {
        const st = rowsToState(rows);
        setScores(st.scores);
        setComments(st.comments);
        setDoneScores(st.scores);
        setDoneComments(st.comments);
      }

      // Unlock on Sheets
      if (SCRIPT_URL) {
        postToSheet({ action: "resetJuror", juryName: juryName.trim(), juryDept: juryDept.trim() });
      }

      setAlreadySubmitted(false);
      setEditMode(true);
      doneFiredRef.current = false;
      setGroupSynced(Object.fromEntries(PROJECTS.map((p) => [p.id, true])));
      setStep("eval");
    };

    const handleStart = () => {
      if (!juryName.trim() || !juryDept.trim()) return;
      if (alreadySubmitted) { setStep("done"); return; }
      setStep("eval");
      if (SCRIPT_URL) postToSheet({ rows: PROJECTS.map((p) => buildRow(juryName, juryDept, scores, comments, p, "in_progress")) });
    };

    const handleResumeCloud = () => { applyDraft(cloudDraft); setCloudDraft(null); setStep("eval"); };

    const handleStartFresh = () => {
      setCloudDraft(null);
      const es = makeEmptyScores(), ec = makeEmptyComments();
      setScores(es); setComments(ec); setGroupSynced({});
      doneFiredRef.current = false;
      setEditMode(false);
      setStep("eval");
      if (SCRIPT_URL) postToSheet({ rows: PROJECTS.map((p) => buildRow(juryName, juryDept, es, ec, p, "in_progress")) });
    };

    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}><HomeIcon /></button>
          <div><h2>Evaluation Form</h2><p>EE 492 Poster Presentation</p></div>
        </div>

        <div className="info-card">
          <h3>Jury Member Information</h3>

          <div className="field">
            <label>Full Name *</label>
            <input value={juryName} onChange={(e) => setJuryName(e.target.value)} placeholder="e.g. Prof. Dr. Jane Smith" />
          </div>

          <div className="field">
            <label>Department / Institution *</label>
            <input value={juryDept} onChange={(e) => setJuryDept(e.target.value)} placeholder="e.g. EEE Dept. / TED University" />
          </div>

          {cloudChecking && <div className="cloud-checking">🔍 Checking for saved progress…</div>}

          {/* All submitted banner */}
          {!cloudChecking && alreadySubmitted && (
            <div className="cloud-draft-banner" style={{ background: "#dcfce7", borderColor: "#86efac" }}>
              <div className="cloud-draft-title" style={{ color: "#166534" }}>✅ All evaluations submitted</div>
              <div className="cloud-draft-sub" style={{ color: "#166534" }}>
                {PROJECTS.length} / {PROJECTS.length} groups completed
              </div>

              <div className="cloud-draft-actions">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const rows = await fetchMyScoresFromSheet(juryName, juryDept);
                    if (rows && rows.length) {
                      const st = rowsToState(rows);
                      setDoneScores(st.scores);
                      setDoneComments(st.comments);
                    }
                    setStep("done");
                  }}
                >
                  View My Scores
                </button>

                <button className="btn-secondary" onClick={handleResubmit}>
                  Re-submit
                </button>
              </div>
            </div>
          )}

          {/* In-progress cloud draft banner */}
          {!cloudChecking && !alreadySubmitted && cloudDraft && (
            <div className="cloud-draft-banner">
              <div className="cloud-draft-title">☁️ Saved progress found</div>
              <div className="cloud-draft-sub">
                {PROJECTS.filter((p) => isAllFilled(cloudDraft.scores || {}, p.id)).length} / {PROJECTS.length} groups completed
              </div>
              <div className="cloud-draft-actions">
                <button className="btn-primary" onClick={handleResumeCloud}>Resume</button>
                <button className="btn-secondary" onClick={handleStartFresh}>Start Fresh</button>
              </div>
            </div>
          )}

          <div className="draft-device-note">
            ℹ️ Your progress is auto-saved to the cloud. You can continue from any device by entering the same name and department.
          </div>

          {/* Start button only when NOT alreadySubmitted and no draft */}
          {!alreadySubmitted && !cloudChecking && !cloudDraft && (
            <button
              className="btn-primary"
              disabled={!juryName.trim() || !juryDept.trim()}
              onClick={handleStart}
            >
              Start Evaluation →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // EVAL screen
  // ════════════════════════════════════════════════════════
  return (
    <div className="form-screen eval-screen">
      {/* Sticky header */}
      <div className="eval-sticky-header">
        {/* Row 1 */}
        <div className="eval-top-row">
          <button className="eval-back-btn" onClick={() => setShowBackMenu(true)} aria-label="Back">
            <HomeIcon />
          </button>

          <div className="eval-project-info">
            <div className="eval-project-name">{project.name}</div>
            {project.desc && <div className="eval-project-desc">{project.desc}</div>}
            {APP_CONFIG.showStudents && project.students?.length > 0 && (
              <div className="eval-project-students">👥 {project.students.join(" · ")}</div>
            )}
          </div>

          <button
            className={`save-draft-btn ${saveStatus === "saved" ? "saved" : ""}`}
            onClick={() => saveCloudDraft(true)}
            disabled={saveStatus === "saving"}
            title="Save draft to cloud"
          >
            <SaveIcon />
            {saveStatus === "saving" && <span>Saving…</span>}
            {saveStatus === "saved"  && <span>✓ Saved</span>}
            {saveStatus === "idle"   && <span>Save</span>}
          </button>
        </div>

        {/* Row 2 */}
        <div className="eval-nav-row">
          <button className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}>←</button>

          <select className="group-nav-select" value={current}
            onChange={(e) => setCurrent(Number(e.target.value))}>
            {PROJECTS.map((p, i) => (
              <option key={p.id} value={i}>
                {isAllFilled(scores, p.id) ? "✅" : "⚠️"} {p.name}
              </option>
            ))}
          </select>

          <button className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1}>→</button>
        </div>

        {/* Row 3 */}
        <div className="eval-progress-wrap">
          <div className="eval-progress-track">
            <div className="eval-progress-fill" style={{ width: `${progressPct}%`, background: progressColor }} />
            <span className="eval-progress-label">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Back menu */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div className="back-menu" onClick={(e) => e.stopPropagation()}>
            <p className="back-menu-title">What would you like to do?</p>
            <p className="back-menu-sub">Your draft is saved and you can resume any time.</p>
            <button className="back-menu-btn primary" onClick={() => { saveCloudDraft(); setShowBackMenu(false); onBack(); }}>🏠 Go to Home</button>
            <button className="back-menu-btn secondary" onClick={() => { setShowBackMenu(false); setStep("info"); }}>✏️ Edit Name / Department</button>
            <button className="back-menu-btn ghost" onClick={() => setShowBackMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="eval-body">
        {groupSynced[project.id] && !editMode && (
          <div className="group-done-banner">✅ Scores saved for this group. Continue with other groups.</div>
        )}

        {editMode && (
          <div className="group-done-banner" style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" }}>
            ✏️ Edit mode — modify scores then click "Submit Final" below.
          </div>
        )}

        {CRITERIA.map((crit) => {
          const isMissing   = scores[project.id][crit.id] === "";
          const showMissing = touched[project.id][crit.id] && isMissing;

          return (
            <div key={crit.id} className={`crit-card ${showMissing ? "invalid" : ""}`}>
              <div className="crit-header">
                <div>
                  <div className="crit-label">{crit.label}</div>
                  <div className="crit-max">Maximum: {crit.max} pts</div>
                </div>

                <button className="rubric-btn" onClick={() => setOpenRubric(openRubric === crit.id ? null : crit.id)}>
                  {openRubric === crit.id ? "Hide Rubric ▲" : "Show Rubric ▼"}
                </button>
              </div>

              {openRubric === crit.id && (
                <div className="rubric-table">
                  {crit.rubric.map((r) => (
                    <div key={r.range} className="rubric-row">
                      <div className="rubric-range">{r.range}</div>
                      <div className="rubric-level">{r.level}</div>
                      <div className="rubric-desc">{r.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="score-input-row">
                <input
                  type="number"
                  min="0"
                  max={crit.max}
                  value={scores[project.id][crit.id]}
                  onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                  onBlur={() => markTouched(project.id, crit.id)}
                  placeholder="—"
                  className="score-input"
                />

                <span className="score-bar-wrap">
                  <span
                    className="score-bar"
                    style={{
                      width: `${((parseInt(scores[project.id][crit.id], 10) || 0) / crit.max) * 100}%`
                    }}
                  />
                </span>

                <span className="score-pct">
                  {scores[project.id][crit.id] !== ""
                    ? `${scores[project.id][crit.id]} / ${crit.max}`
                    : `— / ${crit.max}`}
                </span>
              </div>

              {showMissing && <div className="required-hint">Required</div>}
            </div>
          );
        })}

        <div className="crit-card comment-card">
          <div className="crit-label">Comments (Optional)</div>
          <textarea
            value={comments[project.id]}
            onChange={(e) => handleCommentChange(project.id, e.target.value)}
            placeholder="Any additional comments about this group…"
            rows={3}
          />
        </div>

        <div className="total-bar">
          <span>Total</span>
          <span className={`total-score ${calcTotal(scores, project.id) >= 80 ? "high" : calcTotal(scores, project.id) >= 60 ? "mid" : ""}`}>
            {calcTotal(scores, project.id)} / 100
          </span>
        </div>

        {/* Submit Final — edit mode only */}
        {editMode && (
          <button
            className="btn-primary"
            style={{ width: "100%", marginTop: 8, opacity: allComplete ? 1 : 0.5 }}
            onClick={handleFinalSubmit}
            title={allComplete ? "Submit all scores" : "Fill in all scores before submitting"}
          >
            {allComplete ? "✅ Submit Final" : `⚠️ Submit Final (${countFilled(scores)}/${PROJECTS.length * CRITERIA.length} filled)`}
          </button>
        )}
      </div>
    </div>
  );
}