// src/jury/steps/EvalStep.jsx
// Scoring workspace — 1:1 port of vera-premium-prototype.html #dj-step-eval.
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Home,
  Info,
  ListChecks,
  Pencil,
  Send,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import "../../styles/jury.css";
import RubricSheet from "../components/RubricSheet";
import SpotlightTour from "../components/SpotlightTour";
import SegmentedBar from "../components/SegmentedBar";
import ProjectDrawer from "../components/ProjectDrawer";
import { StudentNames } from "@/shared/ui/EntityMeta";

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
  const [rubricCritIndex, setRubricCritIndex] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const inputsLocked = !!state.editLockActive;

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
              <UserRound size={16} strokeWidth={2} />
              <span>{state.juryName}</span>
            </div>
            <div className="dj-fh-header-dept">{state.affiliation}</div>
          </div>
          <div className="dj-fh-header-right">
            {state.saveStatus === "saving" ? (
              <span className="dj-save-pill saving">Saving...</span>
            ) : (
              <span className="dj-save-pill saved">
                <Check size={12} strokeWidth={2.5} />
                Saved
              </span>
            )}
            <span className="dj-badge" style={{ fontSize: 8, padding: "2px 8px" }}>Live</span>
            <button className="dj-home-btn" onClick={onBack} title="Return Home">
              <Home size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Group Bar (tappable → opens drawer) ── */}
        <div className="dj-group-bar" onClick={() => setDrawerOpen(true)}>
          <div className="dj-group-bar-info">
            <div className="dj-group-bar-title">{state.project.title}</div>
            <div className="dj-group-bar-sub"><StudentNames names={state.project.members} /></div>
          </div>
          <div className="dj-group-bar-right">
            <span className="dj-group-bar-num">{projIdx + 1}/{total}</span>
            <span className="dj-group-bar-chevron">
              <ChevronDown size={14} strokeWidth={2.5} />
            </span>
          </div>
        </div>

        {/* ── Segmented Progress Bar ── */}
        <SegmentedBar
          projects={state.projects}
          scores={state.scores}
          criteria={state.effectiveCriteria}
          current={projIdx}
          onNavigate={state.handleNavigate}
        />
        <hr style={{ border: "none", borderBottom: "1px solid rgba(148,163,184,0.08)", margin: "6px 0 8px" }} />

        {/* ── Info banner ── */}
        <div className="dj-info amber" style={{ marginBottom: 10, fontSize: "10.5px", padding: "8px 12px" }}>
          <Info size={12} strokeWidth={2} />
          <span>Scores are saved automatically and reflected instantly in the admin panel.</span>
        </div>
        {inputsLocked && (
          <div className="dj-info red" style={{ marginBottom: 10, fontSize: "10.5px", padding: "8px 12px" }}>
            <TriangleAlert size={12} strokeWidth={2} />
            <span>This evaluation period is locked. Score inputs are disabled.</span>
          </div>
        )}

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
                  <ListChecks size={13} strokeWidth={2} />
                  Rubric
                </button>
              </div>
              <div className="dj-score-row">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="dj-score-input"
                  placeholder="—"
                  value={score}
                  disabled={inputsLocked}
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
            disabled={inputsLocked}
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
          className={`dj-bottom-submit ${state.allComplete && !inputsLocked ? "active" : "disabled"}`}
          onClick={() => state.allComplete && !inputsLocked && state.handleRequestSubmit()}
          disabled={!state.allComplete || inputsLocked}
        >
          Submit ▶
        </button>
      </div>

      {/* ── Project selection drawer ── */}
      <ProjectDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projects={state.projects}
        scores={state.scores}
        criteria={state.effectiveCriteria}
        current={projIdx}
        onNavigate={state.handleNavigate}
      />

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
      {state.confirmingSubmit && (
        <div
          className="dj-overlay show"
          onClick={state.handleCancelSubmit}
        >
          <div className="dj-glass dj-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="jury-icon-box primary" style={{ margin: "0 auto 14px" }}>
              <Check size={24} strokeWidth={1.8} />
            </div>
            <div className="dj-h1">Confirm Final Submission</div>
            <div className="dj-confirm-warn">
              <TriangleAlert size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>You have completed all evaluations. Submitting will finalize your scores.</span>
            </div>
            <div className="dj-confirm-actions">
              <button
                className="dj-btn-primary"
                style={{ width: "100%" }}
                onClick={state.handleConfirmSubmit}
              >
                <Send size={15} strokeWidth={2} />
                Submit Final Scores
              </button>
              <button
                className="dj-btn-secondary"
                style={{ width: "100%" }}
                onClick={state.handleCancelSubmit}
              >
                <Pencil size={15} strokeWidth={2} />
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
