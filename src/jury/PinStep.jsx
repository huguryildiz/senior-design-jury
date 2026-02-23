// src/jury/PinStep.jsx
// ============================================================
// PIN authentication screen.
//
// pinStep values:
//   "new"      — First login: display the generated PIN once so
//                the juror can save it. Continues on acknowledge.
//   "entering" — Returning juror: enter 4-digit PIN to continue.
//   "locked"   — Too many failed attempts. Admin must reset.
// ============================================================

// Updated PIN input section (4-box OTP style)

import { useEffect, useRef, useState } from "react";
import { KeyIcon } from "../shared/Icons";

export default function PinStep({
  pinStep,
  pinError,
  newPin,
  attemptsLeft,
  juryName,
  onPinSubmit,       // (pin: string) => void
  onPinAcknowledge,  // () => void  — after juror saves their new PIN
}) {
  // OTP-style 4-box PIN input
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputsRef = useRef([]);

  const pin = digits.join("");
  const isComplete = pin.length === 4 && digits.every((d) => d !== "");

  // Clear digits when entering/leaving this screen or switching juror
  useEffect(() => {
    setDigits(["", "", "", ""]);
  }, [pinStep, juryName]);

  const focusIndex = (i) => inputsRef.current[i]?.focus();

  const setDigitAt = (index, val) => {
    const clean = String(val || "").replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 3) focusIndex(index + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        focusIndex(index - 1);
      }
    }
    if (e.key === "Enter" && isComplete) {
      onPinSubmit(pin);
    }
  };

  const handlePaste = (e) => {
    const txt = (e.clipboardData || window.clipboardData).getData("text") || "";
    const only = txt.replace(/\D/g, "").slice(0, 4);
    if (!only) return;
    e.preventDefault();
    const next = ["", "", "", ""];
    for (let i = 0; i < only.length; i++) next[i] = only[i];
    setDigits(next);
    focusIndex(Math.min(only.length, 3));
  };

  // ── New PIN: show once ────────────────────────────────────
  if (pinStep === "new") {
    return (
      <div className="form-screen">
        <div className="info-card pin-card">
          <div className="pin-icon-wrap">
            <KeyIcon />
          </div>
          <h3>Your Access PIN</h3>
          <p className="pin-intro">
            Welcome, <strong>{juryName}</strong>! A 4-digit PIN has been assigned
            to protect your evaluations. Please save it — you will need it every
            time you log in from a new device or browser tab.
          </p>

          <div className="pin-display" aria-label="Your PIN">
            {String(newPin).split("").map((d, i) => (
              <span key={i} className="pin-digit">{d}</span>
            ))}
          </div>

          <p className="pin-hint">
            🔒 Keep this PIN private. If you lose it, contact the admin to reset it.
          </p>

          <button className="btn-primary" onClick={onPinAcknowledge}>
            I've saved my PIN — Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Locked ────────────────────────────────────────────────
  if (pinStep === "locked") {
    return (
      <div className="form-screen">
        <div className="info-card pin-card">
          <div className="pin-icon-wrap lock-icon">🔒</div>
          <h3>Account Locked</h3>
          <p className="pin-error-msg">{pinError}</p>
        </div>
      </div>
    );
  }

  // ── Enter PIN ─────────────────────────────────────────────
  return (
    <div className="form-screen">
      <div className="info-card pin-card">
        <div className="pin-icon-wrap">
          <KeyIcon />
        </div>
        <h3>Enter Your PIN</h3>
        <p className="pin-intro">
          Welcome back, <strong>{juryName}</strong>. Enter your 4-digit PIN to continue.
        </p>

        <div className="pin-box-row" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              className="pin-box"
              value={digit}
              onChange={(e) => setDigitAt(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              autoComplete="off"
              spellCheck={false}
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {pinError && <div className="pin-error-msg">{pinError}</div>}

        <button
          className="btn-primary"
          disabled={!isComplete}
          onClick={() => onPinSubmit(pin)}
        >
          Verify PIN
        </button>

        {typeof attemptsLeft === "number" && attemptsLeft < 3 && attemptsLeft > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
            Attempts remaining: {attemptsLeft}
          </div>
        )}
      </div>
    </div>
  );
}
