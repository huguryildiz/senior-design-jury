// src/jury/InfoStep.jsx
// ============================================================
// Step 1: Juror identity form.
// Shows cloud draft / already-submitted banners when relevant.
// The Start button triggers PIN verification before entering eval.
// ============================================================

import { PROJECTS } from "../config";
import { isAllFilled } from "./useJuryState";
import { HomeIcon } from "../shared/Icons";

export default function InfoStep({
  juryName, setJuryName,
  juryDept, setJuryDept,
  cloudChecking,
  cloudDraft,
  alreadySubmitted,
  scores,
  onStart,          // triggers PIN check → eval
  onResumeCloud,
  onStartFresh,
  onResubmit,
  onViewScores,
  onBack,
}) {
  const hasName = juryName.trim().length > 0;
  const hasDept = juryDept.trim().length > 0;
  const canStart = hasName && hasDept && !cloudChecking;

  return (
    <div className="form-screen">
      {/* Header */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          <HomeIcon />
        </button>
        <div>
          <h2>Evaluation Form</h2>
          <p>EE 492 Poster Presentation</p>
        </div>
      </div>

      <div className="info-card">
        <h3>Jury Member Information</h3>

        <div className="field">
          <label htmlFor="jury-name">Full Name *</label>
          <input
            id="jury-name"
            value={juryName}
            onChange={(e) => setJuryName(e.target.value)}
            placeholder="e.g. Prof. Dr. Jane Smith"
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="jury-dept">Department / Institution *</label>
          <input
            id="jury-dept"
            value={juryDept}
            onChange={(e) => setJuryDept(e.target.value)}
            placeholder="e.g. EEE Dept. / TED University"
          />
        </div>

        {/* Cloud checking indicator */}
        {cloudChecking && (
          <div className="cloud-checking">🔍 Checking for saved progress…</div>
        )}

        {/* Already submitted banner */}
        {!cloudChecking && alreadySubmitted && (
          <div className="cloud-draft-banner banner-done">
            <div className="cloud-draft-title">✅ All evaluations submitted</div>
            <div className="cloud-draft-sub">
              {PROJECTS.length} / {PROJECTS.length} groups completed
            </div>
            <div className="cloud-draft-actions">
              <button className="btn-primary" onClick={onViewScores}>
                View My Scores
              </button>
              <button className="btn-secondary" onClick={onResubmit}>
                Edit / Re-submit
              </button>
            </div>
          </div>
        )}

        {/* In-progress cloud draft banner */}
        {!cloudChecking && !alreadySubmitted && cloudDraft && (
          <div className="cloud-draft-banner banner-draft">
            <div className="cloud-draft-title">☁️ Saved progress found</div>
            <div className="cloud-draft-sub">
              {PROJECTS.filter((p) => isAllFilled(cloudDraft.scores || {}, p.id)).length}
              {" / "}{PROJECTS.length} groups completed
            </div>
            <div className="cloud-draft-actions">
              <button className="btn-primary"    onClick={onResumeCloud}>Resume</button>
              <button className="btn-secondary"  onClick={onStartFresh}>Start Fresh</button>
            </div>
          </div>
        )}

        {/* Start button — hidden when draft/submitted banners are shown */}
        {!alreadySubmitted && !cloudChecking && !cloudDraft && (
          <>
            <div className="draft-device-note">
              ℹ️ Your progress is auto-saved to the cloud. You can continue from any device
              by entering the same name and department. A PIN will be created for security.
            </div>
            <button
              className="btn-primary"
              disabled={!canStart}
              onClick={onStart}
            >
              {cloudChecking ? "Checking…" : "Start Evaluation →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
