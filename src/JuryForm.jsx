// src/JuryForm.jsx
// ============================================================
// Jury evaluation form with cloud draft sync.
//
// Draft priority (highest to lowest):
//   1. Cloud draft (Apps Script Drafts sheet) — cross-device
//   2. localStorage draft — same browser fallback
//
// Submission status flow:
//   in_progress      – juror started, group not fully scored
//   group_submitted  – this specific group fully scored (auto-synced instantly)
//   all_submitted    – all groups fully scored; sent automatically
//
// Key behaviors:
//   - Info screen: name+dept entered → debounced cloud draft lookup
//   - Start: immediate in_progress ping for all groups
//   - Each group completed: auto-sync as group_submitted INSTANTLY (no button needed)
//   - Every 2 min: periodic sync + cloud draft save
//   - All groups done: auto-transition to "Thank You" done screen after 800ms
//   - Done screen: scores summary + back to home
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

const STORAGE_KEY   = "ee492_jury_draft_v1";
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
const DEBOUNCE_MS   = 500;

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

// ── Derived score helpers ─────────────────────────────────────
const calcTotal   = (scores, pid) =>
  CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);
const isAllFilled = (scores, pid) =>
  CRITERIA.every((c) => scores[pid]?.[c.id] !== "");
const countFilled = (scores) =>
  PROJECTS.reduce((t, p) =>
    t + CRITERIA.reduce((n, c) => n + (scores[p.id][c.id] !== "" ? 1 : 0), 0), 0);

// ── Fire-and-forget POST ──────────────────────────────────────
async function postToSheet(body) {
  if (!SCRIPT_URL) return;
  try {
    await fetch(SCRIPT_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (_) {}
}

// ── Build one evaluation row for a single project ─────────────
// projectName uses desc so Google Sheets "Group Name" column shows the description
function buildRow(juryName, juryDept, scores, comments, project, status) {
  return {
    juryName, juryDept,
    timestamp:   new Date().toLocaleString("en-GB"),
    projectId:   project.id,
    projectName: project.desc || project.name,
    design:      scores[project.id]?.design    ?? "",
    technical:   scores[project.id]?.technical ?? "",
    delivery:    scores[project.id]?.delivery  ?? "",
    teamwork:    scores[project.id]?.teamwork  ?? "",
    total:       calcTotal(scores, project.id),
    comments:    comments[project.id] || "",
    status,
  };
}

// ── SVG Home icon ─────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

export default function JuryForm({ onBack }) {
  const [juryName,        setJuryName]        = useState("");
  const [juryDept,        setJuryDept]        = useState("");
  const [step,            setStep]            = useState("info");
  const [current,         setCurrent]         = useState(0);
  const [scores,          setScores]          = useState(makeEmptyScores);
  const [comments,        setComments]        = useState(makeEmptyComments);
  const [openRubric,      setOpenRubric]      = useState(null);
  const [touched,         setTouched]         = useState(makeEmptyTouched);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showBackMenu,    setShowBackMenu]    = useState(false);
  const [groupSynced,     setGroupSynced]     = useState({});
  const [cloudDraft,      setCloudDraft]      = useState(null);
  const [cloudChecking,   setCloudChecking]   = useState(false);
  const [localDraftOwner, setLocalDraftOwner] = useState(null);
  // Prevent double-trigger of "all done" transition
  const doneFiredRef = useRef(false);

  const debounceRef = useRef(null);

  // ── Load localStorage draft info on mount ───────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const p = JSON.parse(saved);
      if (p.juryName) setLocalDraftOwner(p.juryName);
    } catch (_) {}
  }, []);

  // ── Apply a draft object to form state ──────────────────────
  const applyDraft = useCallback((draft) => {
    if (draft.juryName) setJuryName(draft.juryName);
    if (draft.juryDept) setJuryDept(draft.juryDept);
    if (draft.scores)   setScores(draft.scores);
    if (draft.comments) setComments(draft.comments);
    if (typeof draft.current === "number") setCurrent(draft.current);
    if (draft.groupSynced) setGroupSynced(draft.groupSynced);
  }, []);

  // ── Cloud draft lookup (debounced) ───────────────────────────
  const lookupCloudDraft = useCallback(async (name, dept) => {
    const n = name.trim(), d = dept.trim();
    if (!n || !SCRIPT_URL) return;
    setCloudChecking(true);
    setCloudDraft(null);
    try {
      const url = `${SCRIPT_URL}?action=loadDraft&juryName=${encodeURIComponent(n)}&juryDept=${encodeURIComponent(d)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.status === "ok" && json.draft) setCloudDraft(json.draft);
    } catch (_) {
    } finally {
      setCloudChecking(false);
    }
  }, []);

  useEffect(() => {
    if (step !== "info") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lookupCloudDraft(juryName, juryDept);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [juryName, juryDept, step, lookupCloudDraft]);

  // ── Auto-save draft to localStorage ─────────────────────────
  useEffect(() => {
    if (step !== "eval") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(
        { juryName, juryDept, scores, comments, current, groupSynced, step }
      ));
    } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, groupSynced, step]);

  // ── Save draft to cloud ───────────────────────────────────────
  const saveCloudDraft = useCallback(() => {
    if (!juryName.trim() || !SCRIPT_URL) return;
    postToSheet({
      action: "saveDraft",
      juryName: juryName.trim(),
      juryDept: juryDept.trim(),
      draft: { juryName: juryName.trim(), juryDept: juryDept.trim(), scores, comments, current, groupSynced },
    });
  }, [juryName, juryDept, scores, comments, current, groupSynced]);

  // ── Delete cloud draft ───────────────────────────────────────
  const deleteCloudDraft = useCallback(() => {
    if (!juryName.trim() || !SCRIPT_URL) return;
    postToSheet({ action: "deleteDraft", juryName: juryName.trim(), juryDept: juryDept.trim() });
  }, [juryName, juryDept]);

  // ── Periodic 2-minute sync ───────────────────────────────────
  useEffect(() => {
    if (step !== "eval" || !juryName.trim()) return;
    const id = setInterval(() => {
      const rows = PROJECTS.map((p) => {
        const status = groupSynced[p.id] ? "group_submitted" : "in_progress";
        return buildRow(juryName, juryDept, scores, comments, p, status);
      });
      postToSheet({ rows });
      saveCloudDraft();
    }, SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [step, juryName, juryDept, scores, comments, groupSynced, saveCloudDraft]);

  // ── Auto-sync group INSTANTLY when all 4 criteria filled ─────
  useEffect(() => {
    if (step !== "eval") return;
    const newlySynced = {};
    PROJECTS.forEach((p) => {
      if (!groupSynced[p.id] && isAllFilled(scores, p.id)) {
        newlySynced[p.id] = true;
        postToSheet({ rows: [buildRow(juryName, juryDept, scores, comments, p, "group_submitted")] });
      }
    });
    if (Object.keys(newlySynced).length > 0) {
      setGroupSynced((prev) => ({ ...prev, ...newlySynced }));
    }
  }, [scores, step, juryName, juryDept, comments, groupSynced]);

  // ── All groups done → auto-transition to done screen ─────────
  useEffect(() => {
    if (step !== "eval" || doneFiredRef.current) return;
    const allDone = PROJECTS.length > 0 && PROJECTS.every((p) => groupSynced[p.id]);
    if (!allDone) return;

    doneFiredRef.current = true;
    const timer = setTimeout(() => {
      // Upgrade all rows to all_submitted
      const rows = PROJECTS.map((p) =>
        buildRow(juryName, juryDept, scores, comments, p, "all_submitted")
      );
      postToSheet({ rows });
      deleteCloudDraft();
      localStorage.removeItem(STORAGE_KEY);
      setStep("done");
    }, 800);
    return () => clearTimeout(timer);
  }, [groupSynced, step, juryName, juryDept, scores, comments, deleteCloudDraft]);

  // ── Full state reset ─────────────────────────────────────────
  const resetAll = () => {
    setJuryName(""); setJuryDept(""); setStep("info"); setCurrent(0);
    setScores(makeEmptyScores()); setComments(makeEmptyComments());
    setTouched(makeEmptyTouched()); setSubmitAttempted(false);
    setShowBackMenu(false);
    setGroupSynced({}); setCloudDraft(null); setLocalDraftOwner(null);
    doneFiredRef.current = false;
  };

  // ── Derived values ────────────────────────────────────────────
  const project        = PROJECTS[current];
  const TOTAL_CRITERIA = PROJECTS.length * CRITERIA.length;
  const filledCount    = countFilled(scores);
  const progressPct    = Math.round((filledCount / TOTAL_CRITERIA) * 100);

  const progressColor = (() => {
    if (progressPct === 0)  return "#e2e8f0";
    if (progressPct < 33)   return "linear-gradient(90deg, #ef4444, #f97316)";
    if (progressPct < 66)   return "linear-gradient(90deg, #ef4444, #f97316, #eab308)";
    if (progressPct < 100)  return "linear-gradient(90deg, #f97316, #eab308, #84cc16)";
    return "linear-gradient(90deg, #eab308, #22c55e)";
  })();

  const markTouched = (pid, cid) =>
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

  const handleScore = (pid, cid, val) => {
    const crit    = CRITERIA.find((c) => c.id === cid);
    const parsed  = val === "" ? "" : parseInt(val, 10);
    const clamped = val === "" ? "" : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), crit.max);
    setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: clamped } }));
    markTouched(pid, cid);
  };

  // ════════════════════════════════════════════════════════════
  // DONE screen
  // ════════════════════════════════════════════════════════════
  if (step === "done") {
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
                </div>
                <span className="done-score">{calcTotal(scores, p.id)} / 100</span>
              </div>
            ))}
          </div>

          <div className="done-actions">
            <button className="btn-primary" onClick={() => { resetAll(); onBack(); }}>
              <HomeIcon /> Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // INFO screen
  // ════════════════════════════════════════════════════════════
  if (step === "info") {
    const handleStart = () => {
      setStep("eval");
      if (juryName.trim() && SCRIPT_URL) {
        const rows = PROJECTS.map((p) => buildRow(juryName, juryDept, scores, comments, p, "in_progress"));
        postToSheet({ rows });
      }
    };

    const handleResumeCloud = () => {
      applyDraft(cloudDraft);
      setCloudDraft(null);
      setStep("eval");
    };

    const handleStartFresh = () => {
      setCloudDraft(null);
      setScores(makeEmptyScores());
      setComments(makeEmptyComments());
      setGroupSynced({});
      setStep("eval");
      if (juryName.trim() && SCRIPT_URL) {
        const rows = PROJECTS.map((p) => buildRow(juryName, juryDept, scores, comments, p, "in_progress"));
        postToSheet({ rows });
      }
    };

    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack} aria-label="Back to home">
            <HomeIcon />
          </button>
          <div><h2>Evaluation Form</h2><p>EE 492 Poster Presentation</p></div>
        </div>

        {localDraftOwner && !cloudDraft && (
          <div className="info-draft-banner">
            💾 Local draft found for <strong>{localDraftOwner}</strong> — enter matching name &amp; dept to restore.
          </div>
        )}

        <div className="info-card">
          <h3>Jury Member Information</h3>

          <div className="field">
            <label>Full Name *</label>
            <input
              value={juryName}
              onChange={(e) => setJuryName(e.target.value)}
              placeholder="e.g. Prof. Dr. Jane Smith"
            />
          </div>
          <div className="field">
            <label>Department / Institution *</label>
            <input
              value={juryDept}
              onChange={(e) => setJuryDept(e.target.value)}
              placeholder="e.g. EEE Dept. / TED University"
            />
          </div>

          {cloudChecking && (
            <div className="cloud-checking">🔍 Checking for saved progress…</div>
          )}

          {cloudDraft && !cloudChecking && (
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

          <button
            className="btn-primary"
            disabled={!juryName.trim() || !juryDept.trim()}
            onClick={handleStart}
          >
            Start Evaluation →
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // EVAL screen
  // ════════════════════════════════════════════════════════════
  return (
    <div className="form-screen eval-screen">

      {/* ── Sticky combined header ───────────────────────── */}
      <div className="eval-sticky-header">

        <button
          className="eval-back-btn"
          onClick={() => setShowBackMenu(true)}
          aria-label="Back to home"
        >
          <HomeIcon />
        </button>

        <div className="eval-project-info">
          <div className="eval-project-name">{project.name}</div>
          {project.desc && <div className="eval-project-desc">{project.desc}</div>}
          {APP_CONFIG.showStudents && project.students?.length > 0 && (
            <div className="eval-project-students">👥 {project.students.join(" · ")}</div>
          )}
        </div>

        {/* Navigation row: prev | dropdown | next  (no segment buttons) */}
        <div className="eval-nav-row">
          <button className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0} aria-label="Previous group">←</button>

          <select className="group-nav-select" value={current}
            onChange={(e) => setCurrent(Number(e.target.value))} aria-label="Select group">
            {PROJECTS.map((p, i) => (
              <option key={p.id} value={i}>
                {p.name} {groupSynced[p.id] ? "✅" : ""}
              </option>
            ))}
          </select>

          <button className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1} aria-label="Next group">→</button>
        </div>

        {/* Progress bar */}
        <div className="eval-progress-wrap">
          <div className="eval-progress-track">
            <div className="eval-progress-fill" style={{
              width: `${progressPct}%`,
              background: progressColor,
            }} />
            <span className="eval-progress-label">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Back menu overlay */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div className="back-menu" onClick={(e) => e.stopPropagation()}>
            <p className="back-menu-title">What would you like to do?</p>
            <p className="back-menu-sub">Your draft is saved and you can resume any time.</p>
            <button className="back-menu-btn primary"   onClick={() => { saveCloudDraft(); setShowBackMenu(false); onBack(); }}>🏠 Go to Home</button>
            <button className="back-menu-btn secondary" onClick={() => { setShowBackMenu(false); setStep("info"); }}>✏️ Edit Name / Department</button>
            <button className="back-menu-btn ghost"     onClick={() => setShowBackMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Eval body ────────────────────────────────────── */}
      <div className="eval-body">

        {/* Group saved banner */}
        {groupSynced[project.id] && (
          <div className="group-done-banner">
            ✅ Scores saved for this group. Continue with other groups.
          </div>
        )}

        {/* Criteria score cards */}
        {CRITERIA.map((crit) => {
          const isMissing   = scores[project.id][crit.id] === "";
          const showMissing = (touched[project.id][crit.id] || submitAttempted) && isMissing;
          return (
            <div key={crit.id} className={`crit-card ${showMissing ? "invalid" : ""}`}>
              <div className="crit-header">
                <div>
                  <div className="crit-label">{crit.label}</div>
                  <div className="crit-max">Maximum: {crit.max} pts</div>
                </div>
                <button className="rubric-btn"
                  onClick={() => setOpenRubric(openRubric === crit.id ? null : crit.id)}>
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
                <input type="number" min="0" max={crit.max}
                  value={scores[project.id][crit.id]}
                  onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                  onBlur={() => markTouched(project.id, crit.id)}
                  placeholder="—" className="score-input" />
                <span className="score-bar-wrap">
                  <span className="score-bar" style={{
                    width: `${((parseInt(scores[project.id][crit.id], 10) || 0) / crit.max) * 100}%`
                  }} />
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

        {/* Comments */}
        <div className="crit-card comment-card">
          <div className="crit-label">Comments (Optional)</div>
          <textarea
            value={comments[project.id]}
            onChange={(e) => setComments((prev) => ({ ...prev, [project.id]: e.target.value }))}
            placeholder="Any additional comments about this group…"
            rows={3}
          />
        </div>

        {/* Total score */}
        <div className="total-bar">
          <span>Total</span>
          <span className={`total-score ${calcTotal(scores, project.id) >= 80 ? "high" : calcTotal(scores, project.id) >= 60 ? "mid" : ""}`}>
            {calcTotal(scores, project.id)} / 100
          </span>
        </div>

        {/* Next group shortcut button */}
        {current < PROJECTS.length - 1 && (
          <button
            className="btn-secondary full"
            onClick={() => setCurrent((i) => i + 1)}
          >
            Next Group →
          </button>
        )}
      </div>
    </div>
  );
}
