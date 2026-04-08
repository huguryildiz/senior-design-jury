// src/jury/steps/PinRevealStep.jsx
import { useState } from "react";
import { ArrowRight, Copy, Check, KeyRound, Loader2 } from "lucide-react";
import SpotlightTour from "../components/SpotlightTour";
import "../../styles/jury.css";

const PIN_REVEAL_TOUR_STEPS = [
  {
    selector: ".pr-tour-pin",
    title: "Your Unique PIN",
    body: "This 4-digit PIN is unique to you and this session. You'll need it to log back in if you close the browser or get disconnected.",
    placement: "below",
  },
  {
    selector: ".pr-tour-copy",
    title: "Save Your PIN",
    body: "Tap here to copy the PIN to your clipboard. You can also write it down or take a screenshot.",
    placement: "below",
  },
  {
    selector: ".pr-tour-begin",
    title: "Start Scoring",
    body: "Once you've saved your PIN, click here to begin evaluating projects. Your progress is saved automatically.",
    placement: "above",
  },
];

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
          <KeyRound size={24} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div className="jury-title">Your Session PIN</div>
        <div className="jury-sub" style={{ marginBottom: 20 }}>
          Use this PIN to resume your evaluation if you get disconnected.
        </div>

        {/* PIN digits in shield wrapper */}
        <div className="pin-shield pr-tour-pin">
          <div className="dj-pin-display dj-pin-display--lg">
            {(digits.length === 4 ? digits : ["-", "-", "-", "-"]).map((d, i) => (
              <div key={i} className="dj-pin-digit dj-pin-digit--reveal">{d}</div>
            ))}
          </div>
        </div>

        {/* Copy PIN */}
        <div className="pr-tour-copy" style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <button
            className="dj-btn-secondary"
            onClick={handleCopy}
            style={{ padding: "6px 14px", fontSize: "11px", gap: 5, width: "fit-content" }}
          >
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        {/* Info line (dot-prefix) */}
        <div className="jury-info-line" style={{ textAlign: "left" }}>
          <span className="jury-info-dot" />
          Keep this PIN private. You will need it to resume later.
        </div>

        {/* Begin Evaluation */}
        <button
          className="btn-landing-primary pr-tour-begin"
          onClick={() => { setSubmitting(true); state.handlePinRevealContinue(); }}
          disabled={submitting}
          style={{ width: "100%", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting ? <Loader2 size={15} className="jg-spin" /> : <ArrowRight size={16} strokeWidth={2} />}
          {submitting ? "Loading…" : "Begin Evaluation"}
        </button>
      </div>

      <SpotlightTour
        sessionKey="dj_tour_pin_reveal"
        steps={PIN_REVEAL_TOUR_STEPS}
        delay={800}
      />
    </div>
  );
}
