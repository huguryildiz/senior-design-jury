// src/jury/InfoStep.jsx
// ============================================================
// Step 1 — Juror identity form.
//
// In the single-entry-point flow, this screen only collects
// name and department. All cloud-draft decisions happen AFTER
// PIN verification (see useJuryState.checkDraftAfterPin).
//
// Design:
//   - Name and department cannot be changed once evaluation begins.
//   - The Start button always triggers PIN verification.
//   - No cloud draft banner here — shown post-PIN on cloudChoice step.
// ============================================================

import { HomeIcon } from "../shared/Icons";

export default function InfoStep({
  juryName, setJuryName,
  juryDept, setJuryDept,
  onStart,
  onBack,
}) {
  const canStart = juryName.trim().length > 0 && juryDept.trim().length > 0;

  function handleKeyDown(e) {
    if (e.key === "Enter" && canStart) onStart();
  }

  return (
    <div className="form-screen">
      {/* Header */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          <HomeIcon />
        </button>
        <div>
          <h2>Evaluation Form</h2>
          <p>EE 491/492 — Senior Project Poster Day</p>
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
            onKeyDown={handleKeyDown}
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
            onKeyDown={handleKeyDown}
            placeholder="e.g. EEE Dept. / TED University"
          />
        </div>

        <p className="draft-device-note">
          ℹ️ Your progress is saved automatically every 30 seconds. You can
          continue from any device — just enter the same name and department.
          A PIN will be assigned on first login to protect your evaluations.
        </p>

        <button
          className="btn-primary"
          disabled={!canStart}
          onClick={onStart}
        >
          Start Evaluation →
        </button>
      </div>
    </div>
  );
}
