// src/jury/EvalStep.jsx
// ============================================================
// Step 2: The main scoring form.
// One project at a time; sticky header with navigation + progress.
// ============================================================

import { useState } from "react";
import { PROJECTS, CRITERIA } from "../config";
import { APP_CONFIG } from "../config";
import { isAllFilled, countFilled, makeAllTouched } from "./useJuryState";
import { HomeIcon, SaveIcon } from "../shared/Icons";

// Progress bar colour: red → orange → yellow → green as % grows
function progressColor(pct) {
  if (pct === 0)   return "#e2e8f0";
  if (pct < 33)    return "linear-gradient(90deg,#ef4444,#f97316)";
  if (pct < 66)    return "linear-gradient(90deg,#ef4444,#f97316,#eab308)";
  if (pct < 100)   return "linear-gradient(90deg,#f97316,#eab308,#84cc16)";
  return "linear-gradient(90deg,#eab308,#22c55e)";
}

export default function EvalStep({
  juryName,
  current, setCurrent,
  scores, comments, touched,
  groupSynced,
  editMode,
  progressPct,
  allComplete,
  saveStatus,
  handleScore,
  handleScoreBlur,
  handleCommentChange,
  handleFinalSubmit,
  saveCloudDraft,
  onBack,            // back to info screen (after confirmation menu)
  onGoHome,          // go all the way back to App home
}) {
  const [showBackMenu, setShowBackMenu] = useState(false);
  const [openRubric,   setOpenRubric]   = useState(null);

  const project = PROJECTS[current];
  const pColor  = progressColor(progressPct);

  // Filled count for each group (shown in dropdown)
  const groupLabel = (p) => {
    const filled  = CRITERIA.filter((c) => scores[p.id]?.[c.id] !== "").length;
    const checkMark = isAllFilled(scores, p.id) ? "✅" : "⚠️";
    return `${checkMark} ${p.name} (${filled}/${CRITERIA.length})`;
  };

  return (
    <div className="form-screen eval-screen">
      {/* ── Sticky header ─────────────────────────────────── */}
      <div className="eval-sticky-header">
        {/* Row 1: back + project info + save */}
        <div className="eval-top-row">
          <button
            className="eval-back-btn"
            onClick={() => setShowBackMenu(true)}
            aria-label="Back"
          >
            <HomeIcon />
          </button>

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

        {/* Row 2: prev / dropdown / next */}
        <div className="eval-nav-row">
          <button
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            aria-label="Previous group"
          >
            ←
          </button>

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
          >
            →
          </button>
        </div>

        {/* Row 3: progress bar */}
        <div className="eval-progress-wrap">
          <div className="eval-progress-track">
            <div
              className="eval-progress-fill"
              style={{ width: `${progressPct}%`, background: pColor }}
            />
            <span className="eval-progress-label">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* ── Back / exit menu ─────────────────────────────── */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div className="back-menu" onClick={(e) => e.stopPropagation()}>
            <p className="back-menu-title">What would you like to do?</p>
            <p className="back-menu-sub">Your draft is saved and you can resume any time.</p>
            <button
              className="back-menu-btn primary"
              onClick={() => { saveCloudDraft(); setShowBackMenu(false); onGoHome(); }}
            >
              🏠 Go to Home
            </button>
            <button
              className="back-menu-btn secondary"
              onClick={() => { setShowBackMenu(false); onBack(); }}
            >
              ✏️ Edit Name / Department
            </button>
            <button className="back-menu-btn ghost" onClick={() => setShowBackMenu(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="eval-body">
        {/* Group done / edit mode banner */}
        {groupSynced[project.id] && !editMode && (
          <div className="group-done-banner">
            ✅ Scores saved for this group. Continue with other groups.
          </div>
        )}
        {editMode && (
          <div className="group-done-banner edit-mode-banner">
            ✏️ Edit mode — modify scores then click "Submit Final" below.
          </div>
        )}

        {/* Criteria cards */}
        {CRITERIA.map((crit) => {
          const val         = scores[project.id]?.[crit.id] ?? "";
          const isMissing   = val === "";
          const showMissing = touched[project.id]?.[crit.id] && isMissing;
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
                  onBlur={() => handleScoreBlur(project.id, crit.id)}
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
            placeholder="Any additional comments about this group…"
            rows={3}
          />
        </div>

        {/* Total */}
        <div className="total-bar">
          <span>Total</span>
          {(() => {
            const total = CRITERIA.reduce((s, c) => s + (parseInt(scores[project.id]?.[c.id], 10) || 0), 0);
            const cls   = total >= 80 ? "high" : total >= 60 ? "mid" : "";
            return <span className={`total-score ${cls}`}>{total} / 100</span>;
          })()}
        </div>

        {/* Submit Final — edit mode only */}
        {editMode && (
          <button
            className="btn-primary"
            style={{ width: "100%", marginTop: 8, opacity: allComplete ? 1 : 0.6 }}
            onClick={handleFinalSubmit}
            title={allComplete ? "Submit all scores" : "Fill in all scores before submitting"}
          >
            {allComplete
              ? "✅ Submit Final"
              : `⚠️ Submit Final (${countFilled(scores)}/${PROJECTS.length * CRITERIA.length} filled)`}
          </button>
        )}
      </div>
    </div>
  );
}
