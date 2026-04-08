// src/jury/steps/PinStep.jsx
import { useRef, useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import FbAlert from "../../shared/ui/FbAlert";
import SpotlightTour from "../components/SpotlightTour";
import "../../styles/jury.css";

const PIN_STEP_TOUR_STEPS = [
  {
    selector: ".ps-tour-inputs",
    title: "Enter Your PIN",
    body: "Type your 4-digit PIN one digit at a time. The cursor moves automatically after each digit.",
    placement: "below",
  },
  {
    selector: ".ps-tour-submit",
    title: "Verify & Continue",
    body: "Once all 4 digits are filled, click here to verify. You have 5 attempts before a temporary lockout.",
    placement: "above",
  },
];

export default function PinStep({ state, onBack }) {
  const pinRefs = useRef([]);
  const [submitting, setSubmitting] = useState(false);
  const [filledCount, setFilledCount] = useState(0);

  // Clear and refocus on PIN error; also reset spinner
  useEffect(() => {
    if (!state.pinError) return;
    setSubmitting(false);
    setFilledCount(0);
    pinRefs.current.forEach((ref) => { if (ref) ref.value = ""; });
    pinRefs.current[0]?.focus();
  }, [state.pinError]);

  const updateFilledCount = () => {
    const count = pinRefs.current.filter((ref) => ref?.value).length;
    setFilledCount(count);
  };

  const handlePinChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, "").slice(0, 1);
    pinRefs.current[index].value = cleanValue;
    updateFilledCount();

    if (cleanValue && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinRefs.current[index].value && index > 0) {
      pinRefs.current[index - 1]?.focus();
      setTimeout(updateFilledCount, 0);
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
          Enter the 4-digit PIN from the coordinators
        </div>

        {/* PIN inputs — larger */}
        <div className="dj-pin-display dj-pin-display--lg ps-tour-inputs">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => (pinRefs.current[i] = el)}
              type="text"
              className="dj-pin-input dj-pin-input--lg"
              maxLength="1"
              inputMode="numeric"
              onChange={(e) => handlePinChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={!!state.pinLockedUntil}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {/* Dot progress indicator */}
        <div className="pin-dot-indicator">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`pin-dot${i < filledCount ? " filled" : ""}`}
            />
          ))}
        </div>

        {/* Inline error */}
        {state.pinError && state.pinErrorCode !== "locked" && (
          <FbAlert variant="danger" style={{ marginTop: 4 }}>
            {state.pinErrorCode === "invalid"
              ? `Incorrect PIN — ${state.pinAttemptsLeft} attempt${state.pinAttemptsLeft === 1 ? "" : "s"} remaining`
              : state.pinError}
          </FbAlert>
        )}

        <button
          className="btn-landing-primary ps-tour-submit"
          onClick={handleSubmit}
          disabled={!!state.pinLockedUntil || submitting}
          style={{ width: "100%", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting && <Loader2 size={15} className="jg-spin" />}
          {submitting ? "Verifying…" : "Verify PIN"}
        </button>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <a className="form-link" onClick={onBack} style={{ cursor: "pointer" }}>
            ← Back
          </a>
        </div>
      </div>

      <SpotlightTour
        sessionKey="dj_tour_pin_step"
        steps={PIN_STEP_TOUR_STEPS}
        delay={800}
      />
    </div>
  );
}
