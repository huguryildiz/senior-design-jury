// src/jury/steps/PinRevealStep.jsx
import { useState } from "react";
import { ArrowRight, Copy, Info, KeyRound, Loader2 } from "lucide-react";
import "../../styles/jury.css";

export default function PinRevealStep({ state, onBack }) {
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pin = state.issuedPin || "";
  const digits = pin.split("");
  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(pin);
      } else {
        const ta = document.createElement("textarea");
        ta.value = pin;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silently fail */ }
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card" style={{ textAlign: "center" }}>
        {/* Icon */}
        <div className="jury-icon-box" style={{ margin: "0 auto 14px" }}>
          <KeyRound size={26} strokeWidth={1.5} />
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
            <Copy size={14} strokeWidth={2} />
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        {/* Info banner */}
        <div className="dj-info blue" style={{ marginTop: 16, marginBottom: 18, textAlign: "left" }}>
          <Info size={16} strokeWidth={2} />
          <span>Keep this PIN private. You will need it if you close the browser and return later.</span>
        </div>

        {/* Begin Evaluation */}
        <button
          className="btn-landing-primary"
          onClick={() => { setSubmitting(true); state.handlePinRevealContinue(); }}
          disabled={submitting}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting ? <Loader2 size={15} className="jg-spin" /> : <ArrowRight size={16} strokeWidth={2} />}
          {submitting ? "Loading…" : "Begin Evaluation"}
        </button>
      </div>
    </div>
  );
}
