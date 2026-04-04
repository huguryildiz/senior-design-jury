// src/jury/steps/IdentityStep.jsx
import { useState } from "react";
import "../../styles/jury.css";

export default function IdentityStep({ state, onBack }) {
  const [juryName, setJuryName] = useState(state.juryName || "");
  const [affiliation, setAffiliation] = useState(state.affiliation || "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const period = state.currentPeriodInfo;
  const projectCount = state.activeProjectCount;

  const handleSubmit = () => {
    setError("");
    if (!juryName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!affiliation.trim()) {
      setError("Please enter your affiliation");
      return;
    }

    state.setJuryName(juryName);
    state.setAffiliation(affiliation);
    state.handleIdentitySubmit();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card" style={{ maxWidth: 400 }}>
        <div className="jury-icon-box">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: 24, height: 24 }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <div className="jury-title">Jury Information</div>
        <div className="jury-sub">
          Enter your details to begin the evaluation
        </div>

        {/* Period info banner */}
        {period && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              justifyContent: "center",
              marginBottom: 16,
              fontSize: "11px",
              color: "var(--text-tertiary, #64748b)",
            }}
          >
            {/* University */}
            {period.organizations?.institution_name && (
              <>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 10 3 12 0v-5" />
                  </svg>
                  {period.organizations.institution_name}
                </span>
                <span style={{ opacity: 0.4 }}>&middot;</span>
              </>
            )}
            {/* Department */}
            {period.organizations?.name && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a4 4 0 0 0-8 0v2" />
                </svg>
                {period.organizations.name}
              </span>
            )}
          </div>
        )}
        {period && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              justifyContent: "center",
              marginBottom: 16,
              fontSize: "11px",
              color: "var(--text-tertiary, #64748b)",
            }}
          >
            {/* Semester */}
            {period.name && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {period.name}
              </span>
            )}
            {/* Event date */}
            {period.poster_date && (
              <>
                <span style={{ opacity: 0.4 }}>&middot;</span>
                <span>
                  {new Date(period.poster_date + "T00:00:00").toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </span>
              </>
            )}
            {/* Group count */}
            {projectCount > 0 && (
              <>
                <span style={{ opacity: 0.4 }}>&middot;</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {projectCount} Groups
                </span>
              </>
            )}
          </div>
        )}

        {/* Info alert */}
        <div
          className="fb-alert fba-info"
          style={{ textAlign: "left", marginBottom: 16, padding: "9px 12px" }}
        >
          <div className="fb-alert-icon" style={{ width: 22, height: 22 }}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" style={{ width: 12, height: 12 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <div className="fb-alert-body">
            <div className="fb-alert-desc" style={{ fontSize: "11px" }}>
              Name and affiliation cannot be changed once evaluation starts.
            </div>
          </div>
        </div>

        {state.authError && (
          <div className="dj-error">{state.authError}</div>
        )}

        {error && <div className="dj-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Jane Smith"
            value={juryName}
            onChange={(e) => setJuryName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Affiliation</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. TED University / EE"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            E-mail{" "}
            <span style={{ fontWeight: 400, color: "var(--text-quaternary, #475569)" }}>
              (optional)
            </span>
          </label>
          <input
            type="email"
            className="form-input"
            placeholder="jury@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!juryName.trim() || !affiliation.trim()}
          style={{ width: "100%" }}
        >
          Start Evaluation
        </button>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <a
            className="form-link"
            onClick={onBack}
            style={{ cursor: "pointer" }}
          >
            &larr; Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
