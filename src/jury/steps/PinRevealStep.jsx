// src/jury/steps/PinRevealStep.jsx
import { useState } from "react";
import "../../styles/jury.css";

export default function PinRevealStep({ state, onBack }) {
  const [copied, setCopied] = useState(false);

  const pin = state.issuedPin || "";
  const digits = pin.split("");
  const period = state.currentPeriodInfo;

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card" style={{ textAlign: "center" }}>
        {/* Icon */}
        <div className="jury-icon-box" style={{ margin: "0 auto 14px" }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 26, height: 26 }}
          >
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="M11.5 11.5L17 6" />
            <path d="M15 8l4-4" />
            <path d="M17 6l2 2" />
          </svg>
        </div>

        {/* Title */}
        <div className="jury-title">Your Session PIN</div>
        <div className="jury-sub" style={{ marginBottom: 20 }}>
          Use this PIN to resume your evaluation if you get disconnected.
        </div>

        {/* PIN digits */}
        <div className="dj-pin-display">
          {(digits.length === 4 ? digits : ["-", "-", "-", "-"]).map((d, i) => (
            <div key={i} className="dj-pin-digit">{d}</div>
          ))}
        </div>

        {/* Copy PIN */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <button
            className="dj-btn-secondary"
            onClick={handleCopy}
            style={{ padding: "6px 14px", fontSize: "11px", gap: 5 }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: 14, height: 14 }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        {/* Juror metadata */}
        <div className="dj-pin-meta">
          <div className="dj-pin-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="pin-meta-label">Juror</span>
            <span className="pin-meta-value">{state.juryName}</span>
          </div>
          {period?.organizations?.institution_name && (
            <div className="dj-pin-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 10 3 12 0v-5" />
              </svg>
              <span className="pin-meta-label">Organization</span>
              <span className="pin-meta-value">
                {period.organizations.institution_name}
                {period.organizations.name ? ` — ${period.organizations.name}` : ""}
              </span>
            </div>
          )}
          {period?.name && (
            <div className="dj-pin-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="pin-meta-label">Period</span>
              <span className="pin-meta-value">{period.name}</span>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="dj-info blue" style={{ marginTop: 16, marginBottom: 18, textAlign: "left" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>Keep this PIN private. You will need it if you close the browser and return later.</span>
        </div>

        {/* Begin Evaluation */}
        <button
          className="dj-btn-primary"
          onClick={() => state.handlePinRevealContinue()}
          style={{ width: "100%" }}
        >
          Begin Evaluation
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ width: 16, height: 16, marginLeft: 6 }}
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
