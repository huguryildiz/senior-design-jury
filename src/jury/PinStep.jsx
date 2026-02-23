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

import { useEffect, useState } from "react";
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
  const [inputPin, setInputPin] = useState("");

  // Clear any previously-typed digits when entering/leaving the PIN screen
  // (prevents showing leftover dots from a prior attempt/session)
  useEffect(() => {
    setInputPin("");
  }, [pinStep, juryName]);

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

        <div className="pin-input-row">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={inputPin}
            onChange={(e) =>
              setInputPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputPin.length === 4) {
                onPinSubmit(inputPin);
                setInputPin("");
              }
            }}
            className="pin-input"
            autoFocus
          />
        </div>

        {pinError && <div className="pin-error-msg">{pinError}</div>}

        <button
          className="btn-primary"
          disabled={inputPin.length !== 4}
          onClick={() => {
            onPinSubmit(inputPin);
            setInputPin("");
          }}
        >
          Verify PIN
        </button>
      </div>
    </div>
  );
}
