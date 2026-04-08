// src/jury/steps/EvalStep.jsx
// Scoring workspace — 1:1 port of vera-premium-prototype.html #dj-step-eval.
import { useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Cloud,
  CloudUpload,
  ListChecks,
  Pencil,
  Send,
  TrendingUp,
  UserRound,
} from "lucide-react";
import FbAlert from "../../shared/ui/FbAlert";
import "../../styles/jury.css";
import RubricSheet from "../components/RubricSheet";
import SpotlightTour from "../components/SpotlightTour";
import SegmentedBar from "../components/SegmentedBar";
import ProjectDrawer from "../components/ProjectDrawer";
import { StudentNames } from "@/shared/ui/EntityMeta";

const RUBRIC_TOUR_STEPS = [
  {
    selector: ".dj-rub-meta",
    title: "Mapped Outcomes",
    body: "Each criterion is tied to accreditation program outcomes — these show exactly which skills and competencies are being assessed.",
    placement: "above",
  },
  {
    selector: ".dj-rub-sheet-row",
    title: "Scoring Bands",
    body: "Use these band descriptions to calibrate your score. The highlighted band updates automatically as you enter a value.",
    placement: "above",
  },
];

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
              <span className="dj-save-pill saving">
                <CloudUpload size={12} strokeWidth={2.5} />
                Saving...
              </span>
            ) : (
              <span className="dj-save-pill saved">
                <Cloud size={12} strokeWidth={2.5} />
                Saved
              </span>
            )}
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

        {/* ── Info line (subtle) ── */}
        <div className="jury-info-line" style={{ marginBottom: 10, fontSize: 11 }}>
          <span className="jury-info-dot jury-info-dot--amber" />
          Scores save automatically and reflect instantly in the admin panel.
        </div>
        {inputsLocked && (
          <FbAlert variant="danger" style={{ marginBottom: 10 }}>
            This evaluation period is locked. Score inputs are disabled.
          </FbAlert>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
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
        <>
          <RubricSheet
            crit={state.effectiveCriteria[rubricCritIndex]}
            score={state.scores[projId]?.[state.effectiveCriteria[rubricCritIndex]?.id] ?? ""}
            outcomeLookup={state.outcomeLookup}
            onClose={() => setRubricCritIndex(null)}
          />
          {/* Rendered here (not inside RubricSheet) so position:fixed works — .dj-rub-sheet has transform */}
          <SpotlightTour
            sessionKey="dj_tour_rubric"
            steps={RUBRIC_TOUR_STEPS}
            delay={500}
          />
        </>
      )}

      {/* ── Spotlight guided tour (first visit only) ── */}
      <SpotlightTour
        sessionKey="dj_tour_eval"
        steps={[
          { selector: ".dj-group-bar", title: "Current Group", body: "Tap here to see all groups at a glance and jump to any one directly.", placement: "below" },
          { selector: ".dj-seg-bar", title: "Progress Overview", body: "Each segment is a group — green means fully scored, amber means partial, grey means not started yet.", placement: "below" },
          { selector: ".dj-score-input", title: "Enter Your Score", body: "Type a number and move on. Scores are saved automatically — no submit needed after each group.", placement: "above" },
          { selector: ".dj-rubric-btn", title: "Scoring Rubric", body: "Unsure about a score? Tap Rubric to open the detailed band descriptions for this criterion.", placement: "below" },
          { selector: ".dj-comment-box", title: "Optional Comments", body: "Leave free-text feedback for the admin panel. Not visible to students.", placement: "above" },
          { selector: ".dj-sticky-bottom", title: "Submit When Done", body: "Once all groups are fully scored the Submit button activates. Your scores are already saved — this just finalises the session.", placement: "above" },
        ]}
      />

      {/* ── Submit confirmation tour ── */}
      {state.confirmingSubmit && (
        <SpotlightTour
          sessionKey="dj_tour_confirm"
          steps={[
            { selector: ".dj-confirm-summary", title: "Review Your Scores", body: "Check that all projects are scored and your average looks right before finalising.", placement: "below" },
            { selector: ".dj-confirm-btn.cancel", title: "Not Ready?", body: "Tap Keep Editing to go back and adjust any scores — nothing is locked yet.", placement: "above" },
            { selector: ".dj-confirm-btn.submit", title: "Finalise Submission", body: "Tap Submit to lock in your scores. This cannot be undone — scores will be marked as final.", placement: "above" },
          ]}
          delay={400}
        />
      )}

      {/* ── Submit confirmation overlay (B2 Minimal + Stats) ── */}
      {state.confirmingSubmit && (() => {
        const avgScore = total > 0 ? (totalScore / total).toFixed(1) : "—";
        const scoredProjects = state.projects.filter((p) => {
          const filled = state.effectiveCriteria.filter((c) => {
            const v = state.scores[p.project_id]?.[c.id];
            return v !== "" && v != null;
          }).length;
          return filled === state.effectiveCriteria.length;
        }).length;
        return (
          <div
            className="dj-overlay show"
            onClick={state.handleCancelSubmit}
          >
            <div className="dj-glass dj-confirm-card" onClick={(e) => e.stopPropagation()}>
              <div className="dj-confirm-ring">
                <Check size={26} strokeWidth={2} />
              </div>
              <div className="dj-confirm-title">Submit Final Scores?</div>
              <div className="dj-confirm-subtitle">Your scores will be recorded as final. This cannot be reversed.</div>
              <div className="dj-confirm-stats">
                <div className="dj-confirm-stat-card">
                  <div className="dj-confirm-stat-icon scored">
                    <ClipboardCheck size={16} strokeWidth={2} />
                  </div>
                  <div className="dj-confirm-stat-value avg-score-cell">
                    <span className="avg-score-value">{scoredProjects}</span>
                    <span className="avg-score-max">/{total}</span>
                  </div>
                  <div className="dj-confirm-stat-label">Projects Scored</div>
                </div>
                <div className="dj-confirm-stat-card">
                  <div className="dj-confirm-stat-icon avg">
                    <TrendingUp size={16} strokeWidth={2} />
                  </div>
                  <div className="dj-confirm-stat-value avg-score-cell">
                    <span className="avg-score-value">{totalScore > 0 ? (totalScore / state.projects.length).toFixed(1) : "—"}</span>
                    <span className="avg-score-max">/{totalMax}</span>
                  </div>
                  <div className="dj-confirm-stat-label">Average Score</div>
                </div>
              </div>
<div className="dj-confirm-btn-row">
                <button className="dj-confirm-btn cancel" onClick={state.handleCancelSubmit}>
                  <Pencil size={14} strokeWidth={2} />
                  Keep Editing
                </button>
                <button className="dj-confirm-btn submit" onClick={state.handleConfirmSubmit}>
                  <Send size={14} strokeWidth={2} />
                  Submit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
