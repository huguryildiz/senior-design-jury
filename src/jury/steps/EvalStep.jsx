// src/jury/steps/EvalStep.jsx
// Scoring workspace — 1:1 port of vera-premium-prototype.html #dj-step-eval.
import { useState } from "react";
import "../../styles/jury.css";
import RubricSheet from "../components/RubricSheet";
import SpotlightTour from "../components/SpotlightTour";

// Per-criterion color scheme (matches prototype djCriteria color map)
const CRIT_PALETTE = [
  { color: "#60a5fa", light: "#93c5fd", rgb: "96,165,250" },   // blue
  { color: "#4ade80", light: "#86efac", rgb: "74,222,128" },   // green
  { color: "#818cf8", light: "#a5b4fc", rgb: "129,140,248" },  // indigo
  { color: "#fbbf24", light: "#fcd34d", rgb: "251,191,36" },   // amber
  { color: "#f472b6", light: "#f9a8d4", rgb: "244,114,182" },  // pink
  { color: "#2dd4bf", light: "#5eead4", rgb: "45,212,191" },   // teal
];

function getCritPalette(index) {
  return CRIT_PALETTE[index % CRIT_PALETTE.length];
}

export default function EvalStep({ state, onBack }) {
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [rubricCritIndex, setRubricCritIndex] = useState(null);

  if (!state.project) {
    return (
      <div className="jury-step">
        <div className="jury-card dj-glass-card">
          <div className="jury-title">Loading...</div>
        </div>
      </div>
    );
  }

  const projId = state.project.project_id;
  const projIdx = state.current;
  const total = state.projects.length;
  const hasPrev = projIdx > 0;
  const hasNext = projIdx < total - 1;

  // Total score computation
  const totalMax = state.effectiveCriteria.reduce((s, c) => s + (c.max || 0), 0);
  let totalScore = 0;
  let filledCount = 0;
  state.effectiveCriteria.forEach((c) => {
    const v = state.scores[projId]?.[c.id];
    if (v !== "" && v != null) { totalScore += Number(v) || 0; filledCount++; }
  });
  const allCritFilled = filledCount === state.effectiveCriteria.length;
  const statusText = `${filledCount}/${state.effectiveCriteria.length} scored`;

  return (
    <div
      id="dj-step-eval"
      style={{ minHeight: "100vh", justifyContent: "flex-start", position: "relative", padding: "8px 16px 74px", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div className="dj-eval-workspace">

        {/* ── Compact Header (juror info) ── */}
        <div className="dj-fh-header">
          <div className="dj-fh-header-left">
            <div className="dj-fh-header-name">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0112 0v1" />
              </svg>
              <span>{state.juryName}</span>
            </div>
            <div className="dj-fh-header-dept">{state.affiliation}</div>
          </div>
          <div className="dj-fh-header-right">
            {state.saveStatus === "saving" ? (
              <span className="dj-save-pill saving">Saving...</span>
            ) : (
              <span className="dj-save-pill saved">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                  <path d="m17 15-5.5 5.5L9 18" /><path d="M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327" />
                </svg>
                Saved
              </span>
            )}
            <span className="dj-badge" style={{ fontSize: 8, padding: "2px 8px" }}>Live</span>
            <button className="dj-home-btn" onClick={onBack} title="Return Home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Group Bar (project card) ── */}
        <div className="dj-group-bar">
          <div className="dj-group-bar-info">
            <div className="dj-group-bar-title">{state.project.title}</div>
            <div className="dj-group-bar-sub">{state.project.members || ""}</div>
          </div>
          <div className="dj-group-bar-nav" onClick={(e) => e.stopPropagation()}>
            <button className="dj-nav-btn" onClick={() => hasPrev && state.handleNavigate(projIdx - 1)} disabled={!hasPrev} style={{ height: 30, padding: "0 8px", borderRadius: 7 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="dj-group-bar-num">{projIdx + 1}/{total}</span>
            <button className="dj-nav-btn" onClick={() => hasNext && state.handleNavigate(projIdx + 1)} disabled={!hasNext} style={{ height: 30, padding: "0 8px", borderRadius: 7 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="dj-fh-progress">
          <div className="dj-fh-progress-track">
            <div className="dj-fh-progress-fill" style={{ width: `${state.progressPct}%` }} />
          </div>
          <span className="dj-fh-progress-pct">{state.progressPct}%</span>
        </div>

        {/* ── Info banner ── */}
        <div className="dj-info amber" style={{ marginBottom: 10, fontSize: "10.5px", padding: "8px 12px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <span>Scores are saved automatically and reflected instantly in the admin panel.</span>
        </div>

        {/* ── Criteria Cards ── */}
        {state.effectiveCriteria.map((crit, ci) => {
          const score = state.scores[projId]?.[crit.id] ?? "";
          const numScore = Number(score) || 0;
          const pct = crit.max > 0 ? Math.min((numScore / crit.max) * 100, 100) : 0;
          const isFilled = score !== "" && score != null;
          const p = getCritPalette(ci);

          return (
            <div
              key={crit.id}
              className={`dj-crit${isFilled ? " scored" : ""}`}
              style={{
                "--dj-criterion-color": p.color,
                "--dj-criterion-color-light": p.light,
                "--dj-criterion-color-rgb": p.rgb,
              }}
            >
              <div className="dj-crit-top">
                <div className="dj-crit-name">
                  <span className="dj-crit-dot" />
                  {crit.label}
                </div>
                <button className="dj-rubric-btn" onClick={() => setRubricCritIndex(ci)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                    <path d="M16 5H3" /><path d="M16 12H3" /><path d="M11 19H3" /><path d="m15 18 2 2 4-4" />
                  </svg>
                  Rubric
                </button>
              </div>
              <div className="dj-score-row">
                <input
                  type="number"
                  inputMode="numeric"
                  className="dj-score-input"
                  min="0"
                  max={crit.max}
                  placeholder="—"
                  value={score}
                  onChange={(e) => state.handleScore(projId, crit.id, e.target.value)}
                  onBlur={() => state.handleScoreBlur(projId, crit.id)}
                />
                <span className="dj-score-bar">
                  <span className="dj-score-bar-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="dj-score-frac">
                  {isFilled ? numScore : "—"} / {crit.max}
                </span>
              </div>
            </div>
          );
        })}

        {/* ── Comments ── */}
        <div className="dj-comment-box">
          <div className="dj-crit-name" style={{ marginBottom: 6, fontSize: "12.5px" }}>Comments (Optional)</div>
          <textarea
            className="dj-textarea"
            placeholder="Optional feedback on the project, presentation, or teamwork."
            value={state.comments[projId] || ""}
            onChange={(e) => state.handleCommentChange(projId, e.target.value)}
            onBlur={() => state.handleCommentBlur(projId)}
          />
        </div>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="dj-sticky-bottom" style={{ display: "flex" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span className="dj-bottom-total">
            {allCritFilled ? totalScore : "—"}{" "}
            <span style={{ fontSize: 11, color: "var(--text-muted,#475569)" }}>/ {totalMax}</span>
          </span>
          <span className={`dj-bottom-status ${allCritFilled ? "success" : "warning"}`}>
            {allCritFilled ? "✓ " : ""}{statusText}
          </span>
        </div>
        <button
          className={`dj-bottom-submit ${state.allComplete ? "active" : "disabled"}`}
          onClick={() => state.allComplete && setShowSubmitConfirm(true)}
          disabled={!state.allComplete}
        >
          Submit ▶
        </button>
      </div>

      {/* ── Rubric bottom sheet ── */}
      {rubricCritIndex !== null && (
        <RubricSheet
          crit={state.effectiveCriteria[rubricCritIndex]}
          score={state.scores[projId]?.[state.effectiveCriteria[rubricCritIndex]?.id] ?? ""}
          outcomeLookup={state.outcomeLookup}
          onClose={() => setRubricCritIndex(null)}
        />
      )}

      {/* ── Spotlight guided tour (first visit only) ── */}
      <SpotlightTour />

      {/* ── Submit confirmation overlay ── */}
      {showSubmitConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div className="jury-card dj-glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="jury-icon-box primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 24, height: 24 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="jury-title">Submit Your Scores?</div>
            <div className="jury-sub">You have completed all evaluations. Your scores will be saved and submitted.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="dj-btn-secondary" onClick={() => setShowSubmitConfirm(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="dj-btn-primary" onClick={() => { state.handleConfirmSubmit(); setShowSubmitConfirm(false); }} style={{ flex: 1 }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
