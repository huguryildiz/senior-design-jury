// src/jury/EvalStep.jsx
// ============================================================
// Step 3 — Scoring form.
//
// Header (sticky, 4 rows):
//   Row 1: Juror identity + save status
//   Row 2: [Home btn]  [Group info card]
//   Row 3: [← Prev]  [Group dropdown]  [Next →] + progress bar (combined)
//   Row 4: Progress bar
//
// Write strategy:
//   - Score onChange  → state only, no write
//   - Score onBlur    → clamp + writeGroup(pid)
//   - Comment onChange → state only, no write
//   - Comment onBlur  → writeGroup(pid)
//   - Navigation      → writeGroup(currentPid) then navigate
// ============================================================

import { useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "../config";
import { isAllFilled, countFilled } from "./useJuryState";
import { HomeIcon } from "../shared/Icons";

function progressGradient(pct) {
  if (pct === 0)   return "#e2e8f0";
  if (pct < 34)    return "linear-gradient(90deg,#ef4444,#f97316)";
  if (pct < 67)    return "linear-gradient(90deg,#f97316,#eab308)";
  if (pct < 100)   return "linear-gradient(90deg,#eab308,#84cc16)";
  return "linear-gradient(90deg,#84cc16,#22c55e)";
}

function SaveIndicator({ saveStatus }) {
  if (saveStatus === "saving") return <span className="autosave-dot saving">⏳ Saving…</span>;
  if (saveStatus === "saved")  return <span className="autosave-dot saved">✓ Saved</span>;
  return <span className="autosave-dot idle">● Auto-saving</span>;
}

export default function EvalStep({
  juryName, juryDept,
  current, onNavigate,
  scores, comments, touched,
  groupSynced, editMode,
  progressPct, allComplete,
  saveStatus,
  handleScore, handleScoreBlur,
  handleCommentChange, handleCommentBlur,
  handleFinalSubmit,
  onGoHome,
}) {
  const [showBackMenu, setShowBackMenu] = useState(false);
  const [openRubric,   setOpenRubric]   = useState(null);

  const project = PROJECTS[current];

  const groupLabel = (p, i) => {
    const filled = CRITERIA.filter((c) => scores[p.id]?.[c.id] !== "").length;
    const icon   = isAllFilled(scores, p.id) ? "✅" : "⚠️";
    return `${icon} ${p.name} (${filled}/${CRITERIA.length})`;
  };

  const goPrev = () => { if (current > 0) onNavigate(current - 1); };
  const goNext = () => { if (current < PROJECTS.length - 1) onNavigate(current + 1); };

  return (
    <div className="form-screen eval-screen">

      {/* ── Sticky header ── */}
      <div className="eval-sticky-header">

        {/* Row 1: identity + save status */}
        <div className="eval-identity-bar">
          <button
            className="eval-back-btn"
            onClick={() => setShowBackMenu(true)}
            aria-label="Home"
          >
            <HomeIcon />
          </button>

          <span className="eval-identity-icon">👤</span>
          <span className="eval-identity-name">{juryName}</span>
          {juryDept && <span className="eval-identity-dept">({juryDept})</span>}

          <span className="eval-identity-save">
            <SaveIndicator saveStatus={saveStatus} />
          </span>
        </div>

        {/* Row 2: group label + project name (single line, scrollable) */}
        <div className="eval-project-info">
          <span className="eval-project-label">
            Group {current + 1}
          </span>

          <span className="eval-project-name">
            {project.name}
          </span>
        </div>

        {/* Row 2b: students (separate scroll row) */}
        {APP_CONFIG.showStudents && project.students?.length > 0 && (
          <div className="eval-project-students">
            👥 {project.students.join(" · ")}
          </div>
        )}

        {/* Row 3: prev | dropdown | next (25% / 50% / 25%) */}
        <div className="eval-nav-row">
          <button
            className="group-nav-btn"
            onClick={goPrev}
            disabled={current === 0}
            aria-label="Previous group"
          >
            ←
          </button>

          <select
            className="group-nav-select"
            value={current}
            onChange={(e) => onNavigate(Number(e.target.value))}
          >
            {PROJECTS.map((p, i) => (
              <option key={p.id} value={i}>{groupLabel(p, i)}</option>
            ))}
          </select>

          <button
            className="group-nav-btn"
            onClick={goNext}
            disabled={current === PROJECTS.length - 1}
            aria-label="Next group"
          >
            →
          </button>
        </div>

        {/* Row 4: progress bar (full width) */}
        <div className="eval-progress-wrap">
          <div className="eval-progress-track">
            <div
              className="eval-progress-fill"
              style={{ width: `${progressPct}%`, background: progressGradient(progressPct) }}
            />
            <span className="eval-progress-label">{progressPct}%</span>
          </div>
        </div>

      </div>

      {/* ── Home confirmation overlay ── */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div className="back-menu" onClick={(e) => e.stopPropagation()}>
            <p className="back-menu-title">Leave evaluation?</p>
            <p className="back-menu-sub">
              Your progress is saved. You can continue any time.
            </p>
            <button
              className="back-menu-btn primary"
              onClick={() => { setShowBackMenu(false); onGoHome(); }}
            >
              🏠 Go to Home
            </button>
            <button
              className="back-menu-btn ghost"
              onClick={() => setShowBackMenu(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="eval-body">

        {groupSynced[project.id] && !editMode && (
          <div className="group-done-banner">
            ✅ All scores saved for this group.
          </div>
        )}
        {editMode && (
          <div className="group-done-banner edit-mode-banner">
            ✏️ Edit mode — adjust scores then click <strong>Submit Final</strong>.
          </div>
        )}

        {/* Criterion cards */}
        {CRITERIA.map((crit) => {
          const val         = scores[project.id]?.[crit.id] ?? "";
          const showMissing = touched[project.id]?.[crit.id] && val === "";
          const barPct      = ((parseInt(val, 10) || 0) / crit.max) * 100;

          return (
            <div key={crit.id} className={`crit-card${showMissing ? " invalid" : ""}`}>
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
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={crit.max}
                  value={val}
                  onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                  onBlur={()   => handleScoreBlur(project.id, crit.id)}
                  placeholder="—"
                  className="score-input"
                />
                <span className="score-bar-wrap">
                  <span className="score-bar" style={{ width: `${barPct}%` }} />
                </span>
                <span className="score-pct">
                  {val !== "" ? `${val} / ${crit.max}` : `— / ${crit.max}`}
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
            value={comments[project.id] || ""}
            onChange={(e) => handleCommentChange(project.id, e.target.value)}
            onBlur={()    => handleCommentBlur(project.id)}
            placeholder="Any additional feedback about this group…"
            rows={3}
          />
        </div>

        {/* Running total */}
        <div className="total-bar">
          <span>Total</span>
          {(() => {
            const total = CRITERIA.reduce(
              (s, c) => s + (parseInt(scores[project.id]?.[c.id], 10) || 0), 0
            );
            return (
              <span className={`total-score${total >= 80 ? " high" : total >= 60 ? " mid" : ""}`}>
                {total} / 100
              </span>
            );
          })()}
        </div>

        {/* Submit Final — edit mode only */}
        {editMode && (
          <button
            className="btn-primary"
            style={{ width: "100%", marginTop: 8, opacity: allComplete ? 1 : 0.65 }}
            onClick={handleFinalSubmit}
          >
            {allComplete
              ? "✅ Submit Final"
              : `⚠️ Submit Final (${countFilled(scores)} / ${PROJECTS.length * CRITERIA.length} filled)`}
          </button>
        )}
      </div>
    </div>
  );
}
