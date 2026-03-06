// src/jury/PinRevealStep.jsx
// ============================================================
// One-time PIN reveal after first-time registration.
// ============================================================

import { useState } from "react";
import { KeyRoundIcon, InfoIcon } from "../shared/Icons";

export default function PinRevealStep({ pin, onContinue, onBack }) {
  const [copied, setCopied] = useState(false);
  const normalizedPin = String(pin || "").replace(/\D/g, "").slice(0, 4);
  const digits = Array.from({ length: 4 }, (_, idx) => normalizedPin[idx] || "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="premium-screen">
      <div className="premium-card">
        <div className="premium-header">
          <div className="premium-icon-square" aria-hidden="true"><KeyRoundIcon /></div>
          <div className="premium-title">Your Access PIN</div>
          <div className="premium-subtitle">This PIN will be shown only once. Please save it.</div>
        </div>

        <div className="pin-display pin-display--reveal" aria-label="One-time PIN">
          {digits.map((d, idx) => (
            <span key={idx} className="pin-digit">{d}</span>
          ))}
        </div>

        <div className="pin-reveal-actions">
          <button type="button" className="premium-btn-secondary pin-reveal-copy" onClick={handleCopy}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy-icon lucide-copy" aria-hidden="true">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            {copied ? "Copied" : "Copy PIN"}
          </button>
        </div>

        <div className="premium-info-strip warn">
          <span className="info-strip-icon" aria-hidden="true"><InfoIcon /></span>
          <span>You will need this PIN to resume your evaluation later or from another device.</span>
        </div>

        <button className="premium-btn-primary" onClick={onContinue}>
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
