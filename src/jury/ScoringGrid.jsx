// src/jury/ScoringGrid.jsx
// ============================================================
// Criterion input cards + comment box + total bar + submit buttons.
// Receives all score state and handlers as props from EvalStep.
// ============================================================

import { memo, useState } from "react";
import { CRITERIA } from "../config";
import { ChevronDownIcon, TriangleAlertIcon } from "../shared/Icons";
import LevelPill from "../shared/LevelPill";

function parseScoreInput(raw, max) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 0 || n > max) return null;
  return n;
}

function getRubricRangeBounds(rubricRow) {
  const min = Number(rubricRow?.min);
  const max = Number(rubricRow?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

const ScoringGrid = memo(function ScoringGrid({
  pid,
  scoresPid,
  commentsPid,
  touchedPid,
  lockActive,
  handleScore,
  handleScoreBlur,
  handleCommentChange,
  handleCommentBlur,
  totalScore,
  allComplete,
  editMode,
  completedGroups,
  totalGroups,
  handleFinalSubmit,
}) {
  const [openRubric, setOpenRubric] = useState(null);

  const updateDescScrollState = (el) => {
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    el.classList.toggle("has-overflow", hasOverflow);
    el.classList.toggle("is-scrolled", el.scrollLeft > 0);
  };
  const handleDescScroll = (e) => updateDescScrollState(e.currentTarget);

  return (
    <>
      {/* Criterion cards */}
      {CRITERIA.map((crit) => {
        const val         = scoresPid?.[crit.id] ?? "";
        const showMissing = touchedPid?.[crit.id] && (val === "" || val == null);
        const barPct      = ((parseInt(val, 10) || 0) / crit.max) * 100;
        const numericScore = parseScoreInput(val, crit.max);
        const isInvalid   = !lockActive && showMissing;

        return (
          <div key={crit.id} className={`crit-card${isInvalid ? " invalid" : ""}${openRubric === crit.id ? " rubric-open" : ""}${lockActive ? " is-locked" : ""}`}>
            <div className="crit-header">
              <div className="crit-title-row">
                <div className="crit-label">
                  {crit.label}
                  {crit.mudek && crit.mudek.length > 0 && (
                    <span className="mudek-code-badge">MÜDEK {crit.mudek.join(", ")}</span>
                  )}
                </div>
                <button
                  className={`rubric-btn${openRubric === crit.id ? " is-open" : ""}`}
                  onClick={() => setOpenRubric(openRubric === crit.id ? null : crit.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="rubric-btn-icon">
                    <path d="M16 5H3" />
                    <path d="M16 12H3" />
                    <path d="M11 19H3" />
                    <path d="m15 18 2 2 4-4" />
                  </svg>
                  View Rubric
                  <span className={`rubric-chevron${openRubric === crit.id ? " open" : ""}`}>
                    <ChevronDownIcon />
                  </span>
                </button>
              </div>
              <div className="crit-max">Maximum: {crit.max} pts</div>
              {crit.blurb && (
                <div
                  className="crit-desc swipe-x"
                  ref={updateDescScrollState}
                  onScroll={handleDescScroll}
                  onPointerEnter={handleDescScroll}
                  onTouchStart={handleDescScroll}
                >
                  {crit.blurb}
                </div>
              )}
            </div>

            {openRubric === crit.id && (
              <div className="rubric-table">
                {crit.rubric.map((r) => {
                  const bounds = getRubricRangeBounds(r);
                  const isActive = Boolean(
                    bounds &&
                    numericScore !== null &&
                    numericScore >= bounds.min &&
                    numericScore <= bounds.max
                  );
                  return (
                    <div
                      key={r.range}
                      className={`rubric-row${isActive ? " active" : ""}`}
                      data-min={bounds?.min}
                      data-max={bounds?.max}
                    >
                      <div className="rubric-range">{r.range}</div>
                      <LevelPill variant={r.level}>{r.level}</LevelPill>
                      <div className="rubric-desc">{r.desc}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="score-input-row">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={val}
                onChange={(e) => handleScore(pid, crit.id, e.target.value)}
                onBlur={() => handleScoreBlur(pid, crit.id)}
                placeholder="—"
                className="score-input"
                disabled={lockActive}
              />
              <span className="score-bar-wrap">
                <span className="score-bar" style={{ width: `${barPct}%` }} />
              </span>
              <span className="score-pct">
                {val !== "" && val != null ? `${val} / ${crit.max}` : `— / ${crit.max}`}
              </span>
            </div>

            {!lockActive && showMissing && (
              <div className="required-hint">
                <TriangleAlertIcon />
                Required
              </div>
            )}
          </div>
        );
      })}

      {/* Comments */}
      <div className="crit-card comment-card">
        <div className="crit-label">Comments (Optional)</div>
        <textarea
          value={commentsPid || ""}
          onChange={(e) => handleCommentChange(pid, e.target.value)}
          onBlur={() => handleCommentBlur(pid)}
          placeholder="Optional feedback on the project, presentation, or teamwork."
          rows={3}
          disabled={lockActive}
        />
      </div>

      {/* Running total */}
      <div className="total-bar">
        <span className="total-label">Total</span>
        <span className={`total-score${totalScore >= 80 ? " high" : totalScore >= 60 ? " mid" : ""}`}>
          {totalScore} / 100
        </span>
      </div>

      {/* Submit All — normal mode, all filled */}
      {allComplete && !editMode && (
        <button
          className="premium-btn-primary eval-submit-btn"
          style={{ width: "100%", marginTop: 8 }}
          onClick={handleFinalSubmit}
          disabled={lockActive}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-pen-line-icon lucide-clipboard-pen-line" aria-hidden="true">
            <rect width="8" height="4" x="8" y="2" rx="1" />
            <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" />
            <path d="M16 4h2a2 2 0 0 1 1.73 1" />
            <path d="M8 18h1" />
            <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
          </svg>
          Submit All Evaluations
        </button>
      )}

      {/* Submit Final — edit mode only */}
      {editMode && (
        <button
          className={`premium-btn-primary eval-submit-btn ${allComplete ? "eval-submit-green" : "eval-submit-amber"}`}
          style={{ width: "100%", marginTop: 8 }}
          onClick={handleFinalSubmit}
          disabled={lockActive || !allComplete}
        >
          {allComplete ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send-icon lucide-send" aria-hidden="true">
              <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
              <path d="m21.854 2.147-10.94 10.939" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-pen-line-icon lucide-clipboard-pen-line" aria-hidden="true">
              <rect width="8" height="4" x="8" y="2" rx="1" />
              <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" />
              <path d="M16 4h2a2 2 0 0 1 1.73 1" />
              <path d="M8 18h1" />
              <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
            </svg>
          )}
          {allComplete
            ? "Submit Final Scores"
            : `Complete Required Scores (${completedGroups}/${totalGroups})`}
        </button>
      )}
    </>
  );
});

export default ScoringGrid;
