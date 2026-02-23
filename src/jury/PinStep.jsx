// src/jury/PinStep.jsx
// ============================================================
// PIN authentication screen.
//
// pinStep values:
//   "new"      — First login: display the generated PIN once so
//                the juror can save it. Continues on acknowledge.
//   "entering" — Returning juror: enter 4-digit PIN, then press
//                the OK button to submit.  Auto-submit on the
//                4th digit is intentionally removed — it caused
//                unintended submissions when users mis-typed and
//                quickly corrected the last digit.
//   "locked"   — Too many failed attempts. Admin must reset.
// ============================================================

import { useState, useRef, useEffect } from "react";
import { KeyIcon } from "../shared/Icons";

// ── 4-box PIN input with explicit OK button ───────────────────
function PinBoxes({ onSubmit, pinError }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Reset boxes whenever an error is shown so the user can retry cleanly.
  useEffect(() => {
    if (pinError) {
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinError]);

  function handleChange(i, val) {
    const d    = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i]    = d;
    setDigits(next);
    if (d && i < 3) inputRefs[i + 1].current?.focus();
    // No auto-submit — user must press OK.
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace") {
      if (digits[i] === "" && i > 0) {
        const next  = [...digits];
        next[i - 1] = "";
        setDigits(next);
        inputRefs[i - 1].current?.focus();
      } else {
        const next = [...digits];
        next[i]    = "";
        setDigits(next);
      }
    }
    if (e.key === "ArrowLeft"  && i > 0) inputRefs[i - 1].current?.focus();
    if (e.key === "ArrowRight" && i < 3) inputRefs[i + 1].current?.focus();
    // Enter key triggers submit if all boxes filled
    if (e.key === "Enter") {
      const pin = digits.join("");
      if (pin.length === 4) onSubmit(pin);
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length === 4) {
      const next = text.split("");
      setDigits(next);
      inputRefs[3].current?.focus();
    }
    e.preventDefault();
  }

  function handleOk() {
    const pin = digits.join("");
    if (pin.length === 4) onSubmit(pin);
  }

  const isComplete = digits.every((d) => d !== "");

  return (
    <div className="pin-input-group">
      <div className="pin-boxes-row">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            autoFocus={i === 0}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className="pin-box"
          />
        ))}
      </div>
      <button
        className="btn-primary pin-ok-btn"
        onClick={handleOk}
        disabled={!isComplete}
      >
        OK →
      </button>
    </div>
  );
}

export default function PinStep({
  pinStep,
  pinError,
  newPin,
  attemptsLeft,
  juryName,
  onPinSubmit,       // (pin: string) => void
  onPinAcknowledge,  // () => void
}) {
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
          Welcome back, <strong>{juryName}</strong>. Enter your 4-digit PIN and press OK to continue.
        </p>

        <PinBoxes onSubmit={onPinSubmit} pinError={pinError} />

        {pinError && <div className="pin-error-msg">{pinError}</div>}
      </div>
    </div>
  );
}
