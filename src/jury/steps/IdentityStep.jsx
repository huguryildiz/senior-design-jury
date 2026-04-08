// src/jury/steps/IdentityStep.jsx
import { useState, useEffect } from "react";
import {
  Building2,
  CalendarDays,
  Loader2,
  UserRound,
  Users,
} from "lucide-react";
import { jurorInitials } from "../../admin/utils/jurorIdentity";
import FbAlert from "../../shared/ui/FbAlert";
import SpotlightTour from "../components/SpotlightTour";
import "../../styles/jury.css";

const IDENTITY_TOUR_STEPS = [
  {
    selector: ".jury-meta-wrapper",
    title: "Event Details",
    body: "This shows the organization, evaluation period, and number of groups you'll be scoring.",
    placement: "below",
  },
  {
    selector: ".id-tour-name",
    title: "Your Full Name",
    body: "Enter your name as it should appear on the evaluation report. Titles like Prof. or Dr. are optional.",
    placement: "below",
  },
  {
    selector: ".id-tour-affiliation",
    title: "Your Affiliation",
    body: "Enter your university, department, or company. This helps organizers identify jury members.",
    placement: "above",
  },
  {
    selector: ".id-tour-email",
    title: "E-mail (Optional)",
    body: "Used for PIN recovery, evaluation reports, and important notifications from organizers. You can leave this blank if you prefer.",
    placement: "above",
  },
  {
    selector: ".id-tour-submit",
    title: "Start Evaluation",
    body: "Once your details are filled in, click here to begin. You'll receive a PIN for secure access.",
    placement: "above",
  },
];

export default function IdentityStep({ state, onBack }) {
  const [juryName, setJuryName] = useState(state.juryName || "");
  const [affiliation, setAffiliation] = useState(state.affiliation || "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const period = state.currentPeriodInfo;

  useEffect(() => { setSubmitting(false); }, [state.authError]);
  const projectCount = Number(state.activeProjectCount || 0);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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
    if (email.trim() && !isValidEmail(email.trim())) {
      setError("Please enter a valid e-mail address.");
      return;
    }
    setSubmitting(true);
    state.handleIdentitySubmit(juryName, affiliation, email.trim() || null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const initials = juryName.trim() ? jurorInitials(juryName) : "";

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        {/* Brand mark — matches admin sidebar sb-logo-text */}
        <div className="jury-brand-mark"><span>V</span>ERA</div>

        {/* Icon */}
        <div className="jury-icon-box jury-icon-box--sm">
          <UserRound size={20} strokeWidth={1.5} />
        </div>

        <div className="jury-title">Jury Information</div>
        <div className="jury-sub">
          Enter your details to begin the evaluation.
        </div>

        {/* Meta info */}
        {period && (
          <div className="jury-meta-wrapper">
            {/* Organization — full-width card with name + subtitle */}
            {period.organizations?.name && (
              <div className="jury-meta-cell jury-meta-cell--wide">
                <div className="jury-meta-icon jury-meta-icon--violet">
                  <Building2 size={14} strokeWidth={2} />
                </div>
                <div className="jury-meta-text">
                  <span className="jury-meta-label">Organization</span>
                  <span className="jury-meta-value">{period.organizations.name}</span>
                  {period.organizations?.subtitle && (
                    <span className="jury-meta-sub">{period.organizations.subtitle}</span>
                  )}
                </div>
              </div>
            )}
            <div className="jury-meta-grid jury-meta-grid--2col">
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
          </div>
        )}

        {/* Error */}
        {(state.authError || error) && (
          <FbAlert variant="danger">{state.authError || error}</FbAlert>
        )}

        {/* Name field with avatar preview */}
        <div className="form-group id-tour-name">
          <label className="form-label">Full Name <span className="form-required">*</span></label>
          <div className="form-input-with-avatar">
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Jane Smith"
              value={juryName}
              onChange={(e) => setJuryName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {initials && (
              <div className="jury-avatar-preview">{initials}</div>
            )}
          </div>
        </div>

        <div className="form-group id-tour-affiliation">
          <label className="form-label">Affiliation <span className="form-required">*</span></label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. TED University / EE"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="form-group id-tour-email">
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
          className="btn-landing-primary id-tour-submit"
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

      {/* Guided tour — first visit only */}
      {period && (
        <SpotlightTour
          sessionKey="dj_tour_identity"
          steps={IDENTITY_TOUR_STEPS}
          delay={900}
        />
      )}
    </div>
  );
}
