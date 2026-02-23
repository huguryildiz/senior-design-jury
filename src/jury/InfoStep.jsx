// src/jury/InfoStep.jsx
// ============================================================
// Step 1 — Juror identity form.
//
// Design decisions:
//   - Name and department cannot be changed once the juror
//     starts scoring. A permanent static warning makes this clear
//     upfront. There is no "Edit Name / Department" option anywhere.
//   - The Start button always triggers PIN verification (even for
//     already-submitted jurors — they must prove identity first).
//   - Cloud draft and already-submitted banners show conditionally
//     after the cloud lookup completes.
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
  onStart,
  onResumeCloud,
  onStartFresh,
  onBack,         // back to landing page
}) {
  const canStart = juryName.trim().length > 0
                && juryDept.trim().length > 0
                && !cloudChecking;

  return (
    <div className="form-screen">
      {/* Header */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          <HomeIcon />
        </button>
        <div>
          <h2>Evaluation Form</h2>
          <p>EE 491/492 — Senior Design Poster Day</p>
        </div>
      </div>

      <div className="info-card">
        <h3>Jury Member Information</h3>

        {/* Permanent identity warning */}
        <div className="identity-warning">
          ⚠️ Please enter your name and department carefully. Once you begin the
          evaluation, these cannot be changed.
        </div>

        <div className="field">
          <label htmlFor="jury-name">Full Name *</label>
          <input
            id="jury-name"
            value={juryName}
            onChange={(e) => setJuryName(e.target.value)}
            placeholder="e.g. Prof. Dr. Jane Smith"
            autoComplete="name"
            autoFocus
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

        {/* Cloud status indicators */}
        {cloudChecking && (
          <div className="cloud-checking">
            🔍 Checking for saved progress…
          </div>
        )}

        {/* Already-submitted banner */}
        {!cloudChecking && alreadySubmitted && (
          <div className="cloud-draft-banner banner-done">
            <div className="cloud-draft-title">✅ All evaluations submitted</div>
            <div className="cloud-draft-sub">
              {PROJECTS.length} / {PROJECTS.length} groups completed
            </div>
            <div className="cloud-draft-actions">
              {/* Both actions go through onStart → PIN check first */}
              <button className="btn-primary" onClick={onStart}>
                View / Edit My Scores
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
              <button className="btn-primary"   onClick={onResumeCloud}>Resume</button>
              <button className="btn-secondary" onClick={onStartFresh}>Start Fresh</button>
            </div>
          </div>
        )}

        {/* Normal start — shown when no draft/submitted state */}
        {!alreadySubmitted && !cloudChecking && !cloudDraft && (
          <>
            <p className="draft-device-note">
              ℹ️ Your progress is auto-saved every 30 seconds. You can continue from
              any device using the same name and department. A PIN will be assigned
              on first login to protect your evaluations.
            </p>
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
