// src/jury/EvalStep.jsx
// ============================================================
// Step 3 — The scoring form.
//
// Layout:
//   Sticky header row 1:
//     [home btn]  [project info]  [juror identity card]
//      34×34px     flex:1          fixed width, same height as home btn
//
//   The juror identity card replaces the old Save button.
//   It shows name + dept and a passive "auto-saving" indicator.
//   No explicit save action — every score change is written to
//   Sheets automatically (350 ms debounce + 30 s background sync).
//
//   Sticky header row 2: prev | group dropdown | next
//   Sticky header row 3: progress bar
//   Body: criterion cards + comments + running total
//         in edit mode: Submit Final button at bottom
// ============================================================

import { useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "../config";
import { isAllFilled, countFilled } from "./useJuryState";
import { HomeIcon } from "../shared/Icons";

// Progress bar gradient: red → orange → yellow → green
function progressGradient(pct) {
  if (pct === 0)  return "#e2e8f0";
  if (pct < 34)   return "linear-gradient(90deg,#ef4444,#f97316)";
  if (pct < 67)   return "linear-gradient(90deg,#f97316,#eab308)";
  if (pct < 100)  return "linear-gradient(90deg,#eab308,#84cc16)";
  return "linear-gradient(90deg,#84cc16,#22c55e)";
}

// Passive save indicator label — driven by saveStatus prop.
function SaveIndicator({ saveStatus }) {
  if (saveStatus === "saving") return <span className="autosave-dot saving">⏳ Saving…</span>;
  if (saveStatus === "saved")  return <span className="autosave-dot saved">✓ Saved</span>;
  return <span className="autosave-dot idle">● Auto-saving</span>;
}

export default function EvalStep({
  juryName,
  juryDept,
  current, setCurrent,
  scores, comments, touched,
  groupSynced, editMode,
  progressPct, allComplete,
  saveStatus,
  handleScore, handleScoreBlur, handleCommentChange,
  handleFinalSubmit,
  onGoHome,
}) {
  const [showBackMenu, setShowBackMenu] = useState(false);
  const [openRubric,   setOpenRubric]   = useState(null);

  const project = PROJECTS[current];

  // Dropdown option label: completion checkmark + fill count.
  const groupLabel = (p) => {
    const filled = CRITERIA.filter((c) => scores[p.id]?.[c.id] !== "").length;
    return `${isAllFilled(scores, p.id) ? "✅" : "⚠️"} ${p.name} (${filled}/${CRITERIA.length})`;
  };

  return (
    <div className="form-screen eval-screen">

      {/* ── Sticky header ────────────────────────────────── */}
      <div className="eval-sticky-header">

        {/* Row 1: home btn | project info | juror card */}
        <div className="eval-top-row">

          {/* Home button — 34×34, same height as juror card */}
          <button
            className="eval-back-btn"
            onClick={() => setShowBackMenu(true)}
            aria-label="Back to home"
          >
            <HomeIcon />
          </button>

          {/* Project name + desc + students */}
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

          {/* Juror identity card — same height as home button,
              stretches to fill available width on the right side.
              Shows name, dept, and a passive auto-save indicator. */}
          <div className="juror-card">
            <div className="juror-card-top">
              <span className="juror-card-icon">👤</span>
              <span className="juror-card-name">{juryName}</span>
            </div>
            {juryDept && (
              <div className="juror-card-dept">{juryDept}</div>
            )}
            <SaveIndicator saveStatus={saveStatus} />
          </div>
        </div>

        {/* Row 2: prev | group selector | next */}
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
          >
            {PROJECTS.map((p, i) => (
              <option key={p.id} value={i}>{groupLabel(p)}</option>
            ))}
          </select>

          <button
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1}
            aria-label="Next group"
          >→</button>
        </div>

        {/* Row 3: progress bar */}
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

      {/* ── Home confirmation overlay ─────────────────────── */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div className="back-menu" onClick={(e) => e.stopPropagation()}>
            <p className="back-menu-title">Leave evaluation?</p>
            <p className="back-menu-sub">
              Your progress is auto-saved and you can resume any time.
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

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="eval-body">

        {/* Status banners */}
        {groupSynced[project.id] && !editMode && (
          <div className="group-done-banner">
            ✅ Scores saved for this group. Continue with other groups.
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
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={crit.max}
                  value={val}
                  onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                  onBlur={()  => handleScoreBlur(project.id, crit.id)}
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
              <span className={`total-score ${total >= 80 ? "high" : total >= 60 ? "mid" : ""}`}>
                {total} / 100
              </span>
            );
          })()}
        </div>

        {/* Submit Final — visible only in edit mode */}
        {editMode && (
          <button
            className="btn-primary"
            style={{ width: "100%", marginTop: 8, opacity: allComplete ? 1 : 0.65 }}
            onClick={handleFinalSubmit}
            title={allComplete ? "Submit all evaluations" : "Fill in all scores first"}
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
