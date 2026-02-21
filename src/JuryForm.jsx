// src/JuryForm.jsx
// ============================================================
// Jury evaluation form with:
//   - Draft auto-save to localStorage
//   - Auto-sync to Google Sheets every 2 minutes (in_progress)
//   - Sticky segmented progress bar at the top
//   - Project card showing description + students
//   - Full state reset on submit/back
// ============================================================

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

const STORAGE_KEY   = "ee492_jury_draft_v1";
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes in ms

// ── State factory helpers ─────────────────────────────────────
function makeEmptyScores() {
  return Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, ""]))])
  );
}
function makeEmptyComments() {
  return Object.fromEntries(PROJECTS.map((p) => [p.id, ""]));
}
function makeEmptyTouched() {
  return Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, false]))])
  );
}

// ── Send rows to Apps Script (fire-and-forget, no-cors) ───────
async function syncToSheet(rows) {
  if (!SCRIPT_URL) return;
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
  } catch (_) {
    // Silently ignore — sync is best-effort
  }
}

export default function JuryForm({ onBack }) {
  const [juryName,        setJuryName]        = useState("");
  const [juryDept,        setJuryDept]        = useState("");
  const [step,            setStep]            = useState("info"); // "info" | "eval" | "done"
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

  // Used to detect name change vs saved draft (shows overwrite warning)
  const draftNameRef = useRef("");

  // ── Load draft from localStorage on mount ──────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);

      if (parsed.juryName) { setJuryName(parsed.juryName); draftNameRef.current = parsed.juryName; }
      if (parsed.juryDept)  setJuryDept(parsed.juryDept);
      if (parsed.scores)    setScores(parsed.scores);
      if (parsed.comments)  setComments(parsed.comments);
      if (typeof parsed.current === "number") setCurrent(parsed.current);
      if (parsed.step === "eval") { setStep("eval"); setDraftLoaded(true); }
      else if (parsed.juryName)   setDraftLoaded(true);
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
  }, []);

  // ── Auto-save draft to localStorage whenever eval state changes
  useEffect(() => {
    if (step !== "eval") return;
    const draft = { juryName, juryDept, scores, comments, current, step };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch (_) {}
  }, [juryName, juryDept, scores, comments, current, step]);

  // ── Build sync payload (all projects, current scores) ────────
  const buildSyncRows = useCallback((status) => {
    return PROJECTS.map((p) => ({
      juryName:    juryName.trim(),
      juryDept:    juryDept.trim(),
      timestamp:   new Date().toLocaleString("en-GB"),
      projectId:   p.id,
      projectName: p.name,
      design:      scores[p.id]?.design    ?? "",
      technical:   scores[p.id]?.technical ?? "",
      delivery:    scores[p.id]?.delivery  ?? "",
      teamwork:    scores[p.id]?.teamwork  ?? "",
      total:       CRITERIA.reduce((s, c) => s + (parseInt(scores[p.id]?.[c.id], 10) || 0), 0),
      comments:    comments[p.id] || "",
      status,
    }));
  }, [juryName, juryDept, scores, comments]);

  // ── Periodic 2-minute sync while evaluating ──────────────────
  useEffect(() => {
    if (step !== "eval") return;
    const id = setInterval(() => {
      if (juryName.trim()) syncToSheet(buildSyncRows("in_progress"));
    }, SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [step, buildSyncRows, juryName]);

  // ── Full state reset ──────────────────────────────────────────
  const resetAll = () => {
    setJuryName(""); setJuryDept(""); setStep("info"); setCurrent(0);
    setScores(makeEmptyScores()); setComments(makeEmptyComments());
    setTouched(makeEmptyTouched()); setSubmitAttempted(false);
    setSubmitting(false); setDraftLoaded(false);
    setShowBackMenu(false); setSubmitError(null);
    draftNameRef.current = "";
  };

  // ── Derived values ────────────────────────────────────────────
  const project      = PROJECTS[current];
  const total        = (pid) => CRITERIA.reduce((s, c) => s + (parseInt(scores[pid][c.id], 10) || 0), 0);
  const allFilled    = (pid) => CRITERIA.every((c) => scores[pid][c.id] !== "");
  const incompleteCount    = PROJECTS.reduce((acc, p) => acc + (allFilled(p.id) ? 0 : 1), 0);
  const firstIncompleteIdx = PROJECTS.findIndex((p) => !allFilled(p.id));
  const completedCount     = PROJECTS.length - incompleteCount;

  const markTouched = (pid, cid) =>
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

  const markMissingTouched = (pid) =>
    setTouched((prev) => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        ...Object.fromEntries(
          CRITERIA.map((c) => [
            c.id,
            prev[pid]?.[c.id] || scores[pid][c.id] !== "" ? prev[pid]?.[c.id] : true,
          ])
        ),
      },
    }));

  const handleScore = (pid, cid, val) => {
    const crit   = CRITERIA.find((c) => c.id === cid);
    const parsed = val === "" ? "" : parseInt(val, 10);
    const clamped =
      val === "" ? "" : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), crit.max);
    setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: clamped } }));
    markTouched(pid, cid);
  };

  // ── Submit all evaluations ────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);
    PROJECTS.forEach((p) => { if (!allFilled(p.id)) markMissingTouched(p.id); });

    const firstBad = PROJECTS.findIndex((p) => !allFilled(p.id));
    if (firstBad !== -1) {
      setCurrent(firstBad);
      alert("Please complete all required scores before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      if (!SCRIPT_URL) throw new Error("Missing APP_CONFIG.scriptUrl in src/config.js");
      await syncToSheet(buildSyncRows("submitted"));
      localStorage.removeItem(STORAGE_KEY);
      setStep("done");
    } catch (e) {
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
                <span className="done-score">{total(p.id)} / 100</span>
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
    // Warn if the user typed a different name than the saved draft
    const nameChanged =
      draftNameRef.current &&
      juryName.trim() &&
      juryName.trim().toLowerCase() !== draftNameRef.current.toLowerCase();

    // When "Start Evaluation" is clicked, send a first in_progress ping immediately
    const handleStart = async () => {
      setStep("eval");
      // Fire initial ping so admin sees this juror as in_progress right away
      if (juryName.trim() && SCRIPT_URL) {
        const initRows = PROJECTS.map((p) => ({
          juryName:    juryName.trim(),
          juryDept:    juryDept.trim(),
          timestamp:   new Date().toLocaleString("en-GB"),
          projectId:   p.id,
          projectName: p.name,
          design: "", technical: "", delivery: "", teamwork: "",
          total: 0, comments: "", status: "in_progress",
        }));
        syncToSheet(initRows); // fire-and-forget
      }
    };

    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div>
            <h2>Evaluation Form</h2>
            <p>EE 492 Poster Presentation</p>
          </div>
        </div>

        {/* Saved draft notification */}
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

          {/* Warn if name differs from the loaded draft */}
          {nameChanged && (
            <div className="draft-name-warning">
              ⚠️ Entering a different name will overwrite the saved draft when you start evaluating.
            </div>
          )}

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
    <div className="form-screen">

      {/* ── Sticky segmented progress bar ────────────────────── */}
      <div className="sticky-progress">
        {PROJECTS.map((p, i) => {
          const done = allFilled(p.id);
          const active = i === current;
          return (
            <button
              key={p.id}
              className={`sticky-seg ${done ? "done" : ""} ${active ? "active" : ""}`}
              onClick={() => setCurrent(i)}
              title={p.name}
            >
              <span className="sticky-seg-label">{i + 1}</span>
              {done && <span className="sticky-seg-check">✓</span>}
            </button>
          );
        })}
        <div className="sticky-progress-count">
          {completedCount}/{PROJECTS.length}
        </div>
      </div>

      {/* ── Form header ──────────────────────────────────────── */}
      <div className="form-header">
        <button
          className="back-btn"
          onClick={() => setShowBackMenu((v) => !v)}
          aria-label="Back"
        >←</button>

        {/* Inline back-action menu (bottom sheet style) */}
        {showBackMenu && (
          <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
            <div className="back-menu" onClick={(e) => e.stopPropagation()}>
              <p className="back-menu-title">What would you like to do?</p>
              <p className="back-menu-sub">Your draft is saved and you can resume any time.</p>
              <button className="back-menu-btn primary" onClick={() => { setShowBackMenu(false); onBack(); }}>
                🏠 Go to Home
              </button>
              <button className="back-menu-btn secondary" onClick={() => { setShowBackMenu(false); setStep("info"); }}>
                ✏️ Edit Name / Department
              </button>
              <button className="back-menu-btn ghost" onClick={() => setShowBackMenu(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div>
          <h2>{project.name}</h2>
          <p>{juryName || "Jury"}</p>
        </div>

        {/* Dot indicators for quick overview */}
        <div className="progress-dots">
          {PROJECTS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`dot-btn ${i === current ? "active" : ""} ${allFilled(p.id) ? "done" : ""}`}
              onClick={() => setCurrent(i)}
              title={allFilled(p.id) ? "Complete" : "Missing scores"}
            >
              <span className="dot" />
            </button>
          ))}
        </div>
      </div>

      <div className="eval-body">

        {/* ── Group navigation ─────────────────────────────── */}
        <div className="group-nav" role="navigation" aria-label="Group navigation">
          <button
            type="button" className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0} aria-label="Previous group"
          >←</button>

          <div className="group-nav-title">
            <div className="group-nav-main">{project.name}</div>
            <div className="group-nav-sub">
              {current + 1} / {PROJECTS.length}
              {allFilled(project.id) ? (
                <span className="group-nav-status ok">· Complete</span>
              ) : submitAttempted ? (
                <span className="group-nav-status missing">· Missing</span>
              ) : (
                <span className="group-nav-status neutral">· In progress</span>
              )}
            </div>
          </div>

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
            type="button" className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1} aria-label="Next group"
          >→</button>
        </div>

        {/* ── Project info card (desc + students) ──────────── */}
        <div className="project-info-card">
          <div className="project-info-desc">{project.desc}</div>
          {APP_CONFIG.showStudents && project.students?.length > 0 && (
            <div className="project-info-students">
              👥 {project.students.join(" · ")}
            </div>
          )}
        </div>

        {/* ── Criteria score cards ──────────────────────────── */}
        {CRITERIA.map((crit) => {
          const isMissing  = scores[project.id][crit.id] === "";
          const showMissing = (touched[project.id][crit.id] || submitAttempted) && isMissing;

          return (
            <div key={crit.id} className={`crit-card ${showMissing ? "invalid" : ""}`}>
              <div className="crit-header">
                <div>
                  <div className="crit-label">{crit.label}</div>
                  <div className="crit-max">Maximum: {crit.max} pts</div>
                </div>
                <button
                  className="rubric-btn"
                  onClick={() => setOpenRubric(openRubric === crit.id ? null : crit.id)}
                >
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
                  <span
                    className="score-bar"
                    style={{ width: `${((parseInt(scores[project.id][crit.id], 10) || 0) / crit.max) * 100}%` }}
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

        {/* ── Comments ─────────────────────────────────────── */}
        <div className="crit-card comment-card">
          <div className="crit-label">Comments (Optional)</div>
          <textarea
            value={comments[project.id]}
            onChange={(e) => setComments((prev) => ({ ...prev, [project.id]: e.target.value }))}
            placeholder="Any additional comments about this group..."
            rows={3}
          />
        </div>

        {/* ── Total bar ────────────────────────────────────── */}
        <div className="total-bar">
          <span>Total</span>
          <span className={`total-score ${total(project.id) >= 80 ? "high" : total(project.id) >= 60 ? "mid" : ""}`}>
            {total(project.id)} / 100
          </span>
        </div>

        {/* ── Network / submit error ────────────────────────── */}
        {submitError && (
          <div className="submit-error-msg">⚠️ {submitError}</div>
        )}

        {/* ── Submit / next group button ────────────────────── */}
        <button
          className={`btn-primary full ${incompleteCount === 0 ? "green" : ""}`}
          disabled={submitting}
          onClick={() => {
            if (incompleteCount === 0) { handleSubmit(); return; }
            setSubmitAttempted(true);
            PROJECTS.forEach((p) => { if (!allFilled(p.id)) markMissingTouched(p.id); });
            if (firstIncompleteIdx !== -1) setCurrent(firstIncompleteIdx);
          }}
        >
          {submitting
            ? "Submitting..."
            : incompleteCount === 0
            ? "✓ Submit All Evaluations"
            : `Complete remaining groups (${incompleteCount})`}
        </button>

      </div>
    </div>
  );
}
