// src/JuryForm.jsx
// ============================================================
// Jury evaluation form.
// Key behaviors:
//   - Draft auto-saved to localStorage on every change
//   - Periodic 2-min sync to Google Sheets with "in_progress" status
//     (only rows that still have empty scores are sent as in_progress;
//      rows that are fully scored but not yet submitted stay in_progress too)
//   - On "Start Evaluation": immediate first ping with in_progress
//   - On "Submit All": sends ALL rows with "submitted" status
//   - Sticky single-bar header: back btn | group info | nav
//   - Full state reset on submit → back to home
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

const STORAGE_KEY   = "ee492_jury_draft_v1";
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes

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

// ── Fire-and-forget POST to Apps Script ──────────────────────
async function syncToSheet(rows) {
  if (!SCRIPT_URL || !rows.length) return;
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
  } catch (_) { /* best-effort, silently ignore */ }
}

// ── Compute total score for one project ──────────────────────
const calcTotal = (scores, pid) =>
  CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);

export default function JuryForm({ onBack }) {
  const [juryName,        setJuryName]        = useState("");
  const [juryDept,        setJuryDept]        = useState("");
  const [step,            setStep]            = useState("info");
  const [current,        setCurrent]          = useState(0);
  const [scores,          setScores]          = useState(makeEmptyScores);
  const [comments,        setComments]        = useState(makeEmptyComments);
  const [openRubric,      setOpenRubric]      = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [touched,         setTouched]         = useState(makeEmptyTouched);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftLoaded,     setDraftLoaded]     = useState(false);
  const [showBackMenu,    setShowBackMenu]    = useState(false);
  const [submitError,     setSubmitError]     = useState(null);

  const draftNameRef = useRef(""); // tracks name from loaded draft

  // ── Load draft from localStorage on first mount ─────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const p = JSON.parse(saved);
      if (p.juryName) { setJuryName(p.juryName); draftNameRef.current = p.juryName; }
      if (p.juryDept)  setJuryDept(p.juryDept);
      if (p.scores)    setScores(p.scores);
      if (p.comments)  setComments(p.comments);
      if (typeof p.current === "number") setCurrent(p.current);
      if (p.step === "eval") { setStep("eval"); setDraftLoaded(true); }
      else if (p.juryName)   setDraftLoaded(true);
    } catch (e) { console.warn("Draft load failed:", e); }
  }, []);

  // ── Auto-save draft to localStorage during eval ─────────────
  useEffect(() => {
    if (step !== "eval") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(
        { juryName, juryDept, scores, comments, current, step }
      ));
    } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, step]);

  // ── Build in_progress sync payload ──────────────────────────
  // All projects get status "in_progress" during active evaluation.
  // They will be overwritten with "submitted" only when the juror submits.
  const buildInProgressRows = useCallback(() =>
    PROJECTS.map((p) => ({
      juryName:    juryName.trim(),
      juryDept:    juryDept.trim(),
      timestamp:   new Date().toLocaleString("en-GB"),
      projectId:   p.id,
      projectName: p.name,
      design:      scores[p.id]?.design    ?? "",
      technical:   scores[p.id]?.technical ?? "",
      delivery:    scores[p.id]?.delivery  ?? "",
      teamwork:    scores[p.id]?.teamwork  ?? "",
      total:       calcTotal(scores, p.id),
      comments:    comments[p.id] || "",
      status:      "in_progress", // always in_progress until final submit
    }))
  , [juryName, juryDept, scores, comments]);

  // ── Build submitted payload (called only on final submit) ───
  const buildSubmittedRows = useCallback(() =>
    PROJECTS.map((p) => ({
      juryName:    juryName.trim(),
      juryDept:    juryDept.trim(),
      timestamp:   new Date().toLocaleString("en-GB"),
      projectId:   p.id,
      projectName: p.name,
      design:      scores[p.id]?.design    ?? "",
      technical:   scores[p.id]?.technical ?? "",
      delivery:    scores[p.id]?.delivery  ?? "",
      teamwork:    scores[p.id]?.teamwork  ?? "",
      total:       calcTotal(scores, p.id),
      comments:    comments[p.id] || "",
      status:      "submitted", // only set on explicit submit
    }))
  , [juryName, juryDept, scores, comments]);

  // ── Periodic 2-minute in_progress sync ──────────────────────
  useEffect(() => {
    if (step !== "eval" || !juryName.trim()) return;
    const id = setInterval(() => {
      syncToSheet(buildInProgressRows());
    }, SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [step, juryName, buildInProgressRows]);

  // ── Full state reset ─────────────────────────────────────────
  const resetAll = () => {
    setJuryName(""); setJuryDept(""); setStep("info"); setCurrent(0);
    setScores(makeEmptyScores()); setComments(makeEmptyComments());
    setTouched(makeEmptyTouched()); setSubmitAttempted(false);
    setSubmitting(false); setDraftLoaded(false);
    setShowBackMenu(false); setSubmitError(null);
    draftNameRef.current = "";
  };

  // ── Scoring helpers ──────────────────────────────────────────
  const project         = PROJECTS[current];
  const allFilled       = (pid) => CRITERIA.every((c) => scores[pid][c.id] !== "");
  const incompleteCount = PROJECTS.reduce((n, p) => n + (allFilled(p.id) ? 0 : 1), 0);
  const firstIncomplete = PROJECTS.findIndex((p) => !allFilled(p.id));
  const completedCount  = PROJECTS.length - incompleteCount;

  const markTouched = (pid, cid) =>
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

  const markAllMissingTouched = (pid) =>
    setTouched((prev) => ({
      ...prev,
      [pid]: Object.fromEntries(
        CRITERIA.map((c) => [c.id, prev[pid]?.[c.id] || scores[pid][c.id] !== "" ? prev[pid]?.[c.id] : true])
      ),
    }));

  const handleScore = (pid, cid, val) => {
    const crit    = CRITERIA.find((c) => c.id === cid);
    const parsed  = val === "" ? "" : parseInt(val, 10);
    const clamped = val === "" ? "" : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), crit.max);
    setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: clamped } }));
    markTouched(pid, cid);
  };

  // ── Final submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);
    PROJECTS.forEach((p) => { if (!allFilled(p.id)) markAllMissingTouched(p.id); });
    if (firstIncomplete !== -1) { setCurrent(firstIncomplete); alert("Please complete all scores before submitting."); return; }

    setSubmitting(true);
    try {
      if (!SCRIPT_URL) throw new Error("Missing APP_CONFIG.scriptUrl");
      // Send all rows with "submitted" status — overwrites any in_progress rows
      await syncToSheet(buildSubmittedRows());
      localStorage.removeItem(STORAGE_KEY);
      setStep("done");
    } catch (_) {
      setSubmitError("Submission failed. Please check your internet connection and try again.");
    }
    setSubmitting(false);
  };

  // ════════════════════════════════════════════════════════════
  // DONE screen
  // ════════════════════════════════════════════════════════════
  if (step === "done") {
    return (
      <div className="done-screen">
        <div className="done-card">
          <div className="done-icon">✅</div>
          <h2>Evaluation Submitted</h2>
          <p>Thank you for reviewing the projects. 🙏</p>
          <p className="done-note">If needed, you may submit again to update your scores.</p>
          <div className="done-summary">
            {PROJECTS.map((p) => (
              <div key={p.id} className="done-row">
                <span>{p.name}</span>
                <span className="done-score">{calcTotal(scores, p.id)} / 100</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={() => { resetAll(); onBack(); }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // INFO screen
  // ════════════════════════════════════════════════════════════
  if (step === "info") {
    const nameChanged =
      draftNameRef.current &&
      juryName.trim() &&
      juryName.trim().toLowerCase() !== draftNameRef.current.toLowerCase();

    const handleStart = () => {
      setStep("eval");
      // Immediate first ping so admin sees this juror right away
      if (juryName.trim() && SCRIPT_URL) {
        syncToSheet(
          PROJECTS.map((p) => ({
            juryName: juryName.trim(), juryDept: juryDept.trim(),
            timestamp: new Date().toLocaleString("en-GB"),
            projectId: p.id, projectName: p.name,
            design: "", technical: "", delivery: "", teamwork: "",
            total: 0, comments: "", status: "in_progress",
          }))
        );
      }
    };

    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div><h2>Evaluation Form</h2><p>EE 492 Poster Presentation</p></div>
        </div>

        {draftLoaded && (
          <div className="info-draft-banner">
            <span>💾</span>
            <span>Saved draft found — you can continue from where you left off.</span>
          </div>
        )}

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
          {nameChanged && (
            <div className="draft-name-warning">
              ⚠️ Entering a different name will overwrite the saved draft when you start evaluating.
            </div>
          )}
          <button className="btn-primary" disabled={!juryName.trim() || !juryDept.trim()} onClick={handleStart}>
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

      {/* ── Sticky combined header ───────────────────────────
          Row 1: back button | project name + desc + students
          Row 2: prev | dropdown select | next  +  progress segments
      ──────────────────────────────────────────────────────── */}
      <div className="eval-sticky-header">

        {/* Back button — top-left corner */}
        <button
          className="eval-back-btn"
          onClick={() => setShowBackMenu(true)}
          aria-label="Back"
        >←</button>

        {/* Project info row */}
        <div className="eval-project-info">
          <div className="eval-project-name">{project.name}</div>
          {project.desc && (
            <div className="eval-project-desc">{project.desc}</div>
          )}
          {APP_CONFIG.showStudents && project.students?.length > 0 && (
            <div className="eval-project-students">
              👥 {project.students.join(" · ")}
            </div>
          )}
        </div>

        {/* Navigation + segment progress row */}
        <div className="eval-nav-row">
          <button
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            aria-label="Previous group"
          >←</button>

          <select
            className="group-nav-select"
            value={current}
            onChange={(e) => setCurrent(Number(e.target.value))}
            aria-label="Select group"
          >
            {PROJECTS.map((p, i) => (
              <option key={p.id} value={i}>
                {p.name} {allFilled(p.id) ? "✅" : submitAttempted ? "⚠️" : ""}
              </option>
            ))}
          </select>

          <button
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1}
            aria-label="Next group"
          >→</button>

          {/* Compact segment progress */}
          <div className="eval-seg-bar">
            {PROJECTS.map((p, i) => (
              <button
                key={p.id}
                className={`eval-seg ${allFilled(p.id) ? "done" : ""} ${i === current ? "active" : ""}`}
                onClick={() => setCurrent(i)}
                title={p.name}
              >
                {allFilled(p.id) ? "✓" : i + 1}
              </button>
            ))}
            <span className="eval-seg-count">{completedCount}/{PROJECTS.length}</span>
          </div>
        </div>
      </div>

      {/* Back menu overlay */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div className="back-menu" onClick={(e) => e.stopPropagation()}>
            <p className="back-menu-title">What would you like to do?</p>
            <p className="back-menu-sub">Your draft is saved and you can resume any time.</p>
            <button className="back-menu-btn primary"   onClick={() => { setShowBackMenu(false); onBack(); }}>🏠 Go to Home</button>
            <button className="back-menu-btn secondary" onClick={() => { setShowBackMenu(false); setStep("info"); }}>✏️ Edit Name / Department</button>
            <button className="back-menu-btn ghost"     onClick={() => setShowBackMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Eval body ────────────────────────────────────── */}
      <div className="eval-body">

        {/* Criteria cards */}
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
                  type="number" min="0" max={crit.max}
                  value={scores[project.id][crit.id]}
                  onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                  onBlur={() => markTouched(project.id, crit.id)}
                  placeholder="—" className="score-input"
                />
                <span className="score-bar-wrap">
                  <span className="score-bar" style={{ width: `${((parseInt(scores[project.id][crit.id], 10) || 0) / crit.max) * 100}%` }} />
                </span>
                <span className="score-pct">
                  {scores[project.id][crit.id] !== "" ? `${scores[project.id][crit.id]} / ${crit.max}` : `— / ${crit.max}`}
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
            placeholder="Any additional comments about this group..."
            rows={3}
          />
        </div>

        {/* Total */}
        <div className="total-bar">
          <span>Total</span>
          <span className={`total-score ${calcTotal(scores, project.id) >= 80 ? "high" : calcTotal(scores, project.id) >= 60 ? "mid" : ""}`}>
            {calcTotal(scores, project.id)} / 100
          </span>
        </div>

        {submitError && <div className="submit-error-msg">⚠️ {submitError}</div>}

        <button
          className={`btn-primary full ${incompleteCount === 0 ? "green" : ""}`}
          disabled={submitting}
          onClick={() => {
            if (incompleteCount === 0) { handleSubmit(); return; }
            setSubmitAttempted(true);
            PROJECTS.forEach((p) => { if (!allFilled(p.id)) markAllMissingTouched(p.id); });
            if (firstIncomplete !== -1) setCurrent(firstIncomplete);
          }}
        >
          {submitting ? "Submitting…"
            : incompleteCount === 0 ? "✓ Submit All Evaluations"
            : `Complete remaining groups (${incompleteCount})`}
        </button>
      </div>
    </div>
  );
}
