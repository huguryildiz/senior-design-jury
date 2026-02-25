// src/jury/DoneStep.jsx
// ============================================================
// Step 3 — Confirmation / thank-you screen.
// Shows the submitted scores per group with an option to edit.
// ============================================================

import { useState } from "react";
import { PROJECTS, CRITERIA } from "../config";
import { HomeIcon, ChevronDownIcon } from "../shared/Icons";

function groupTotal(scores, pid) {
  return CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);
}

export default function DoneStep({
  doneScores,
  doneComments,
  scores,
  comments,
  onEditScores,
  onBack,
}) {
  // Fall back to live scores/comments if done-snapshots are null
  // (e.g. when navigating to done screen from the info page).
  const displayScores   = doneScores   || scores;
  const displayComments = doneComments || comments;

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  function toggleGroup(id) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="done-screen">
      <div className="done-card">
        <div className="done-icon">🎉</div>
        <h2>Thank You!</h2>
        <p className="done-subtitle">
          Your evaluations have been recorded—thank you for your feedback.
        </p>

        <div className="done-summary">
          {PROJECTS.map((p) => {
            const isExpanded = expandedGroups.has(p.id);
            const panelId = `done-group-panel-${p.id}`;
            const hasDetails =
              !!p.desc || p.students?.length > 0 || !!displayComments?.[p.id];
            return (
              <div key={p.id} className="done-row-wrap">
                {/* Clickable header — always visible */}
                <div
                  className="done-row group-accordion-header"
                  role="button"
                  tabIndex={hasDetails ? 0 : -1}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => { if (hasDetails) toggleGroup(p.id); }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && hasDetails) {
                      e.preventDefault();
                      toggleGroup(p.id);
                    }
                  }}
                  style={{ cursor: hasDetails ? "pointer" : "default" }}
                >
                  <span className="done-row-name">{p.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span className="done-score">
                      {groupTotal(displayScores, p.id)} / 100
                    </span>
                    {hasDetails && (
                      <span className={`group-accordion-chevron${isExpanded ? " open" : ""}`}>
                        <ChevronDownIcon />
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable panel */}
                <div id={panelId} className={`group-accordion-panel${isExpanded ? " open" : ""}`}>
                  <div className="group-accordion-panel-inner done-accordion-inner">
                    {p.desc && <span className="done-row-desc">{p.desc}</span>}
                    {p.students?.length > 0 && (
                      <span className="done-row-students">👥 {p.students.join(" · ")}</span>
                    )}
                    {displayComments?.[p.id] && (
                      <div className="done-comment">💬 {displayComments[p.id]}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="done-actions">
          <button className="btn-secondary" onClick={onEditScores}>
            ✏️ Edit Scores
          </button>
          <button className="btn-primary" onClick={onBack}>
            <HomeIcon /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
