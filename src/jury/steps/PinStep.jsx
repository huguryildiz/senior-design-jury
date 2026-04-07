// src/jury/steps/PinStep.jsx
import { useRef, useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import "../../styles/jury.css";

export default function PinStep({ state, onBack }) {
  const pinRefs = useRef([]);
  const [submitting, setSubmitting] = useState(false);

  // Clear and refocus on PIN error; also reset spinner
  useEffect(() => {
    if (!state.pinError) return;
    setSubmitting(false);
    pinRefs.current.forEach((ref) => { if (ref) ref.value = ""; });
    pinRefs.current[0]?.focus();
  }, [state.pinError]);

  const handlePinChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, "").slice(0, 1);
    pinRefs.current[index].value = cleanValue;

    if (cleanValue && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinRefs.current[index].value && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const pin = pinRefs.current.map((ref) => ref.value || "").join("");
    if (pin.length === 4) {
      setSubmitting(true);
      state.handlePinSubmit(pin);
    }
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        <div className="jury-icon-box primary">
          <Lock size={24} strokeWidth={1.5} />
        </div>

        <div className="jury-title">Enter Your PIN</div>
        <div className="jury-sub">
          You will receive a 4-digit PIN from the coordinators
        </div>

        {state.pinError && <div className="dj-error">{state.pinError}</div>}

        {state.pinLockedUntil && (
          <div className="dj-error">
            Too many attempts. Try again in {state.pinAttemptsLeft} minutes.
          </div>
        )}

        <div className="dj-pin-display">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => (pinRefs.current[i] = el)}
              type="text"
              className="dj-pin-input"
              maxLength="1"
              inputMode="numeric"
              onChange={(e) => handlePinChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={!!state.pinLockedUntil}
            />
          ))}
        </div>

        <button
          className="btn-landing-primary"
          onClick={handleSubmit}
          disabled={!!state.pinLockedUntil || submitting}
          style={{ width: "100%", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting && <Loader2 size={15} className="jg-spin" />}
          {submitting ? "Verifying…" : "Verify PIN"}
        </button>

        <button
          className="dj-btn-secondary"
          onClick={onBack}
          style={{ width: "100%", marginTop: "8px" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
