// src/jury/DoneStep.jsx
// ============================================================
// Step 3 — Confirmation / thank-you screen.
// Shows the submitted scores per group with an option to edit.
// ============================================================

import { PROJECTS, CRITERIA } from "../config";
import { HomeIcon } from "../shared/Icons";

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

  return (
    <div className="done-screen">
      <div className="done-card">
        <div className="done-icon">🎉</div>
        <h2>Thank You!</h2>
        <p className="done-subtitle">
          Your evaluations have been recorded successfully.<br />
          We appreciate your time and valuable feedback.
        </p>

        <div className="done-summary">
          {PROJECTS.map((p) => (
            <div key={p.id} className="done-row">
              <div className="done-row-left">
                <span className="done-row-name">{p.name}</span>
                {p.desc && (
                  <span className="done-row-desc">{p.desc}</span>
                )}
                {displayComments?.[p.id] && (
                  <div className="done-comment">
                    💬 {displayComments[p.id]}
                  </div>
                )}
              </div>
              <span className="done-score">
                {groupTotal(displayScores, p.id)} / 100
              </span>
            </div>
          ))}
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
