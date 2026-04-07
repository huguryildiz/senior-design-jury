// src/jury/steps/IdentityStep.jsx
import { useState, useEffect } from "react";
import {
  Building2,
  CalendarDays,
  GraduationCap,
  Loader2,
  UserRound,
  Users,
} from "lucide-react";
import FbAlert from "@/shared/ui/FbAlert";
import "../../styles/jury.css";

export default function IdentityStep({ state, onBack }) {
  const [juryName, setJuryName] = useState(state.juryName || "");
  const [affiliation, setAffiliation] = useState(state.affiliation || "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const period = state.currentPeriodInfo;

  useEffect(() => { setSubmitting(false); }, [state.authError]);
  const projectCount = Number(state.activeProjectCount || 0);

  const handleSubmit = () => {
    setError("");
    if (!juryName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!affiliation.trim()) {
      setError("Please enter your affiliation.");
      return;
    }
    // Pass values directly — React state setters are async and would be
    // stale by the time handleIdentitySubmit reads identity.juryName.
    setSubmitting(true);
    state.handleIdentitySubmit(juryName, affiliation);
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

        {period && (
          <div className="jury-meta-grid">
            {period.organizations?.name && (
              <div className="jury-meta-cell">
                <div className="jury-meta-icon jury-meta-icon--blue">
                  <GraduationCap size={14} strokeWidth={2} />
                </div>
                <div className="jury-meta-text">
                  <span className="jury-meta-label">Department</span>
                  <span className="jury-meta-value">{period.organizations.name}</span>
                </div>
              </div>
            )}
            {period.organizations?.institution_name && (
              <div className="jury-meta-cell">
                <div className="jury-meta-icon jury-meta-icon--violet">
                  <Building2 size={14} strokeWidth={2} />
                </div>
                <div className="jury-meta-text">
                  <span className="jury-meta-label">Institution</span>
                  <span className="jury-meta-value">{period.organizations.institution_name}</span>
                </div>
              </div>
            )}
            {period.name && (
              <div className="jury-meta-cell">
                <div className="jury-meta-icon jury-meta-icon--amber">
                  <CalendarDays size={14} strokeWidth={2} />
                </div>
                <div className="jury-meta-text">
                  <span className="jury-meta-label">Period</span>
                  <span className="jury-meta-value">{period.name}</span>
                </div>
              </div>
            )}
            {projectCount > 0 && (
              <div className="jury-meta-cell">
                <div className="jury-meta-icon jury-meta-icon--green">
                  <Users size={14} strokeWidth={2} />
                </div>
                <div className="jury-meta-text">
                  <span className="jury-meta-label">Groups</span>
                  <span className="jury-meta-value">{projectCount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info alert */}
        <FbAlert
          variant="info"
          style={{ textAlign: "left", marginBottom: 12, padding: "7px 10px" }}
        >
          Name and Affiliation cannot be changed once evaluation starts.
        </FbAlert>

        {(state.authError || error) && (
          <FbAlert variant="danger" style={{ marginBottom: 12, padding: "7px 10px" }}>
            {state.authError || error}
          </FbAlert>
        )}

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
          className="btn-landing-primary"
          onClick={handleSubmit}
          disabled={!juryName.trim() || !affiliation.trim() || submitting}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting && <Loader2 size={15} className="jg-spin" />}
          {submitting ? "Verifying…" : "Start Evaluation"}
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
