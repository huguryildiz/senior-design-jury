// src/jury/steps/IdentityStep.jsx
import { useState } from "react";
import {
  Building2,
  CalendarDays,
  GraduationCap,
  Info,
  UserRound,
  Users,
} from "lucide-react";
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
          <UserRound size={24} strokeWidth={1.5} />
        </div>

        <div className="jury-title">Jury Information</div>
        <div className="jury-sub">
          Enter your details to begin the evaluation
        </div>

        {/* Period meta — single row, flex-wrap for narrow widths */}
        {period && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
              fontSize: "11px",
              color: "var(--text-tertiary, #64748b)",
            }}
          >
            {period.organizations?.institution_name && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <GraduationCap size={12} strokeWidth={2} />
                {period.organizations.institution_name}
              </span>
            )}
            {period.organizations?.name && (
              <>
                <span style={{ opacity: 0.4 }}>&middot;</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Building2 size={12} strokeWidth={2} />
                  {period.organizations.name}
                </span>
              </>
            )}
            {period.name && (
              <>
                <span style={{ opacity: 0.4 }}>&middot;</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CalendarDays size={12} strokeWidth={2} />
                  {period.name}
                </span>
              </>
            )}
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
            {projectCount > 0 && (
              <>
                <span style={{ opacity: 0.4 }}>&middot;</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Users size={12} strokeWidth={2} />
                  {projectCount} Groups
                </span>
              </>
            )}
          </div>
        )}

        {/* Info alert */}
        <div
          className="fb-alert fba-info"
          style={{ textAlign: "left", marginBottom: 12, padding: "7px 10px" }}
        >
          <div className="fb-alert-icon" style={{ width: 20, height: 20 }}>
            <Info size={11} strokeWidth={2} />
          </div>
          <div className="fb-alert-body">
            <div className="fb-alert-desc" style={{ fontSize: "10.5px" }}>
              Name and Affiliation cannot be changed once evaluation starts.
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
