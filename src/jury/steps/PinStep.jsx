// src/jury/steps/PinStep.jsx
import { useRef, useEffect } from "react";
import "../../styles/jury.css";

export default function PinStep({ state, onBack }) {
  const pinRefs = useRef([]);

  // Clear and refocus on PIN error
  useEffect(() => {
    if (!state.pinError) return;
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
      state.handlePinSubmit(pin);
    }
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        <div className="jury-icon-box primary">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: "24px", height: "24px" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
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
          className="dj-btn-primary"
          onClick={handleSubmit}
          disabled={!!state.pinLockedUntil}
          style={{ width: "100%", marginTop: "16px" }}
        >
          Verify PIN
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
