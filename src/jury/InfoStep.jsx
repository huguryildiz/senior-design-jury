// src/jury/InfoStep.jsx
// ============================================================
// Step 1 — Juror identity form.
//
// The juror enters their name and department, then clicks
// "Start Evaluation". All cloud-state feedback (saved progress,
// already submitted) is handled by SheetsProgressDialog which
// is rendered as an overlay in JuryForm after PIN verification.
//
// This component is intentionally simple: it collects identity
// and delegates everything else downstream.
// ============================================================

import { HomeIcon } from "../shared/Icons";

export default function InfoStep({
  juryName, setJuryName,
  juryDept, setJuryDept,
  onStart,
  onBack,
}) {
  const canStart = juryName.trim().length > 0 && juryDept.trim().length > 0;

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

        {/* Identity is locked once evaluation starts */}
        <div className="identity-warning">
          ⚠️ Please enter your name and department carefully. Once you begin the
          evaluation, these cannot be changed.
        </div>

        <div className="field">
          <label htmlFor="jury-name">Full Name <span className="req">*</span></label>
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
          <label htmlFor="jury-dept">Department / Institution <span className="req">*</span></label>
          <input
            id="jury-dept"
            value={juryDept}
            onChange={(e) => setJuryDept(e.target.value)}
            placeholder="e.g. EEE Dept. / TED University"
            onKeyDown={(e) => { if (e.key === "Enter" && canStart) onStart(); }}
          />
        </div>

        <p className="draft-device-note">
          ℹ️ Scores save automatically when you fill in each field or navigate between groups.
          Your PIN lets you continue from any device.
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
