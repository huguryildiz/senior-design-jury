// src/jury/steps/ProgressStep.jsx
// ============================================================
// Loading / Progress step — always shown after PIN verification.
// Shows either "Welcome Back" (in-progress) or "Ready to Begin"
// (fresh start) with evaluation stats.
// ============================================================

import { useState } from "react";
import { Loader2, Play, Rocket, LayoutGrid, Clock, ChevronDown } from "lucide-react";
import SpotlightTour from "../components/SpotlightTour";
import { formatDate } from "@/shared/lib/dateUtils";
import "../../styles/jury.css";

const PROGRESS_TOUR_STEPS = [
  {
    selector: ".ps-tour-criteria",
    title: "What You'll Score",
    body: "Each group is evaluated across these criteria. Tap any criterion to see the scoring description.",
    placement: "below",
  },
  {
    selector: ".ps-tour-action",
    title: "Start When Ready",
    body: "Your progress is saved automatically after each group — you can close the browser and resume anytime with your PIN.",
    placement: "above",
  },
];

const RESUME_TOUR_STEPS = [
  {
    selector: ".ps-tour-progress",
    title: "Your Progress",
    body: "Pick up right where you left off. Already-scored groups are saved and won't be lost.",
    placement: "below",
  },
  {
    selector: ".ps-tour-action",
    title: "Resume Evaluation",
    body: "Click to continue from where you left off.",
    placement: "above",
  },
];

function formatLastActive(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const oneDay = 86400000;
  if (diff < oneDay && d.getDate() === now.getDate()) return "Today";
  if (diff < 2 * oneDay) return "Yesterday";
  return formatDate(d);
}

export default function ProgressStep({ state, onBack }) {
  const [submitting, setSubmitting] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const pc = state.progressCheck;
  const isResume = !!pc?.isInProgress;

  const handleContinue = () => {
    setSubmitting(true);
    state.handleProgressContinue();
  };

  const groupsCompleted = pc?.groupsCompleted || 0;
  const totalGroups = pc?.totalCount || state.activeProjectCount || 0;
  const progressPct = totalGroups > 0 ? Math.round((groupsCompleted / totalGroups) * 100) : 0;
  const criteria = state.effectiveCriteria || [];
  const totalPts = criteria.reduce((s, c) => s + (c.max || 0), 0);
  const estMinutes = Math.max(1, Math.round(totalGroups * 3));

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        {/* Icon */}
        <div className={`jury-icon-box ${isResume ? "primary" : "success"}`} style={{ margin: "0 auto 14px" }}>
          {isResume
            ? <Play size={24} strokeWidth={1.5} fill="currentColor" />
            : <Rocket size={24} strokeWidth={1.5} />}
        </div>

        {/* Title */}
        <div className="jury-title">
          {isResume ? "Welcome Back" : "Ready to Begin"}
        </div>
        <div className="jury-sub" style={{ marginBottom: 20 }}>
          {isResume
            ? "You have an in-progress evaluation"
            : `Score each group across ${criteria.length} criteria`}
        </div>

        {/* Stats card */}
        <div className="progress-stats-card">
          {isResume ? (
            <div className="ps-tour-progress">
              <div className="progress-stats-grid">
                <div className="progress-stat-cell">
                  <span className="progress-stat-big">{groupsCompleted}/{totalGroups}</span>
                  <span className="progress-stat-caption">Groups Completed</span>
                </div>
                <div className="progress-stat-cell">
                  <span className="progress-stat-big">{formatLastActive(pc?.lastWorkedAt)}</span>
                  <span className="progress-stat-caption">Last Active</span>
                </div>
              </div>
              <div className="progress-bar-section">
                <div className="jury-progress-bar" style={{ margin: 0 }}>
                  <div className="jury-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="progress-pct">{progressPct}%</span>
              </div>
            </div>
          ) : (
            <div className="ps-tour-criteria">
              {/* Meta pills */}
              <div className="ps-meta-row">
                <span className="ps-meta-pill">
                  <LayoutGrid size={11} />
                  {totalGroups} group{totalGroups !== 1 ? "s" : ""}
                </span>
                <span className="ps-meta-pill">
                  <Clock size={11} />
                  ~{estMinutes} min
                </span>
              </div>

              {/* Criteria breakdown */}
              {criteria.length > 0 && (
                <>
                  <div className="ps-criteria-header">Evaluation Criteria</div>
                  {criteria.map((c) => {
                    const key = c.key || c.id;
                    const isOpen = expandedKey === key;
                    return (
                      <div key={key} className="ps-criterion-row-wrap">
                        <button
                          className={`ps-criterion-row ${isOpen ? "ps-criterion-row--open" : ""}`}
                          onClick={() => setExpandedKey(isOpen ? null : key)}
                        >
                          <span className="ps-criterion-dot" style={{ background: c.color }} />
                          <span className="ps-criterion-name">{c.shortLabel || c.label}</span>
                          <span className="ps-criterion-pts">{c.max} pts</span>
                          <ChevronDown size={13} className="ps-criterion-chevron" />
                        </button>
                        {isOpen && c.blurb && (
                          <div className="ps-criterion-blurb">{c.blurb}</div>
                        )}
                      </div>
                    );
                  })}
                  {totalPts > 0 && (
                    <div className="ps-criteria-total">
                      <span>Total</span>
                      <span>{totalPts} pts</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <button
          className={`btn-landing-primary ps-tour-action ${isResume ? "" : "btn-success"}`}
          onClick={handleContinue}
          disabled={submitting}
          style={{ width: "100%", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting
            ? <Loader2 size={15} className="jg-spin" />
            : <Play size={16} strokeWidth={2} fill="currentColor" />}
          {submitting
            ? "Loading…"
            : isResume ? "Resume Evaluation" : "Start Evaluation"}
        </button>

        {isResume && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <a className="form-link" onClick={() => state.resetAll?.()} style={{ cursor: "pointer" }}>← Start Fresh</a>
          </div>
        )}
      </div>

      <SpotlightTour
        sessionKey={isResume ? "dj_tour_progress_resume" : "dj_tour_progress_fresh"}
        steps={isResume ? RESUME_TOUR_STEPS : PROGRESS_TOUR_STEPS}
        delay={800}
      />
    </div>
  );
}
