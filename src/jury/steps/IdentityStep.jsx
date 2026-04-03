// src/jury/steps/IdentityStep.jsx
import { useState } from "react";
import "../../styles/jury.css";

export default function IdentityStep({ state, onBack }) {
  const [juryName, setJuryName] = useState(state.juryName || "");
  const [affiliation, setAffiliation] = useState(state.affiliation || "");
  const [error, setError] = useState("");

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
      <div className="jury-card dj-glass-card">
        <div className="jury-brand">
          <span>V</span>ERA
        </div>
        <div className="jury-sub" style={{ marginBottom: "4px" }}>
          Academic Evaluation Platform
        </div>

        <div className="jury-icon-box">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: "24px", height: "24px" }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <div className="jury-title">Welcome to VERA</div>
        <div className="jury-sub">
          Enter your information to begin the evaluation
        </div>

        {state.authError && (
          <div className="dj-error">{state.authError}</div>
        )}

        {error && <div className="dj-error">{error}</div>}

        <div className="dj-form-group">
          <label className="dj-form-label">Your Name</label>
          <input
            type="text"
            className="dj-form-input"
            placeholder="Full name"
            value={juryName}
            onChange={(e) => setJuryName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="dj-form-group">
          <label className="dj-form-label">Affiliation</label>
          <input
            type="text"
            className="dj-form-input"
            placeholder="e.g. Department, University"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          className="dj-btn-primary"
          onClick={handleSubmit}
          disabled={!juryName.trim() || !affiliation.trim()}
          style={{ width: "100%", marginTop: "16px" }}
        >
          Continue
        </button>

        <button
          className="dj-btn-secondary"
          onClick={onBack}
          style={{
            width: "100%",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
