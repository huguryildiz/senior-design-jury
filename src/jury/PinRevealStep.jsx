// src/jury/PinRevealStep.jsx
// ============================================================
// One-time PIN reveal after first-time registration.
// ============================================================

import { useState } from "react";
import { KeyRoundIcon, InfoIcon } from "../shared/Icons";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export default function PinRevealStep({ pin, onContinue, onBack }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const normalizedPin = String(pin || "").replace(/\D/g, "").slice(0, 4);
  const digits = Array.from({ length: 4 }, (_, idx) => normalizedPin[idx] || "");

  const handleCopy = async () => {
    const valueToCopy = normalizedPin;
    if (!valueToCopy) {
      setCopied(false);
      return;
    }

    const markCopied = () => {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    };

    const markFailed = () => {
      setCopied(false);
      setCopyFailed(true);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(valueToCopy);
        markCopied();
        return;
      }
    } catch {
      // Fallback to execCommand below.
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = valueToCopy;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        markCopied();
        return;
      }
    } catch {
      // ignore
    }

    markFailed();
  };

  return (
    <div className="premium-screen">
      <div className="premium-card">
        <div className="premium-header">
          <div className="premium-icon-square" aria-hidden="true"><KeyRoundIcon /></div>
          <div className="premium-title">Your Access PIN</div>
          <div className="premium-subtitle">This PIN will be shown only once. Save it before continuing.</div>
        </div>

        <div className="pin-display pin-display--reveal" aria-label="One-time PIN">
          {digits.map((d, idx) => (
            <span key={idx} className="pin-digit">{d}</span>
          ))}
        </div>

        <div className="pin-reveal-actions">
          <button type="button" className="premium-btn-secondary pin-reveal-copy" onClick={handleCopy}>
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy-check-icon lucide-copy-check" aria-hidden="true">
                <path d="m12 15 2 2 4-4" />
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy-icon lucide-copy" aria-hidden="true">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
            {copied ? "Copied" : "Copy PIN"}
          </button>
        </div>

        {copyFailed && (
          <div className="pin-reveal-copy-error" role="alert">
            Could not copy automatically. Please note your PIN manually.
          </div>
        )}

        <div className="premium-info-strip warn">
          <span className="info-strip-icon" aria-hidden="true"><InfoIcon /></span>
          <span>Use this PIN to resume your evaluation later or on another device.</span>
        </div>

        {isDemoMode && (
          <div className="premium-info-strip">
            <span className="info-strip-icon" aria-hidden="true"><InfoIcon /></span>
            <span>In production, each juror receives a unique 4-digit PIN for secure access.</span>
          </div>
        )}

        <label className="pin-reveal-confirm-label">
          <input
            type="checkbox"
            className="pin-reveal-confirm-checkbox"
            checked={pinSaved}
            onChange={(e) => setPinSaved(e.target.checked)}
          />
          I have noted / saved my PIN
        </label>

        <button className="premium-btn-primary" onClick={onContinue} disabled={!pinSaved}>
          Continue →
        </button>
        {onBack && (
          <button className="premium-btn-link" type="button" onClick={onBack}>
            ← Return Home
          </button>
        )}
      </div>
    </div>
  );
}
