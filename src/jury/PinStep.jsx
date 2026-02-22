// src/jury/PinStep.jsx
// ============================================================
// PIN entry and first-registration screens.
//
// pinStep values:
//   "new"      – First login: show generated PIN to save
//   "entering" – Returning juror: enter PIN to continue
//   "locked"   – Too many failed attempts
// ============================================================

import { useState } from "react";
import { KeyIcon } from "../shared/Icons";

export default function PinStep({
  pinStep,
  pinError,
  newPin,
  attemptsLeft,
  juryName,
  juryDept,
  onPinSubmit,   // (pin: string) => void
  onPinAcknowledge, // () => void — for "new" step after showing PIN
  onBack,
}) {
  const [inputPin, setInputPin] = useState("");

  // ── New PIN: show generated PIN once ─────────────────────
  if (pinStep === "new") {
    return (
      <div className="form-screen">
        <div className="info-card pin-card">
          <div className="pin-icon"><KeyIcon /></div>
          <h3>Your Access PIN</h3>
          <p className="pin-intro">
            Welcome, <strong>{juryName}</strong>! A PIN has been generated for your account.
            Please save this PIN — you will need it every time you log in.
          </p>

          <div className="pin-display">
            {newPin.split("").map((d, i) => (
              <span key={i} className="pin-digit">{d}</span>
            ))}
          </div>

          <p className="pin-hint">
            🔒 This PIN protects your evaluations. If you lose it, contact the admin.
          </p>

          <button className="btn-primary" onClick={onPinAcknowledge}>
            I've saved my PIN — Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Locked ───────────────────────────────────────────────
  if (pinStep === "locked") {
    return (
      <div className="form-screen">
        <div className="info-card pin-card">
          <div className="pin-icon lock-icon">🔒</div>
          <h3>Account Locked</h3>
          <p className="pin-error-msg">{pinError}</p>
          <button className="btn-ghost" onClick={onBack}>← Go Back</button>
        </div>
      </div>
    );
  }

  // ── Entering PIN ──────────────────────────────────────────
  return (
    <div className="form-screen">
      <div className="info-card pin-card">
        <div className="pin-icon"><KeyIcon /></div>
        <h3>Enter Your PIN</h3>
        <p className="pin-intro">
          Welcome back, <strong>{juryName}</strong>.<br />
          Please enter your 4-digit PIN to continue.
        </p>

        <div className="pin-input-row">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputPin.length === 4) onPinSubmit(inputPin);
            }}
            className="pin-input"
            autoFocus
          />
        </div>

        {pinError && (
          <div className="pin-error-msg">{pinError}</div>
        )}

        <button
          className="btn-primary"
          disabled={inputPin.length !== 4}
          onClick={() => onPinSubmit(inputPin)}
        >
          Verify PIN
        </button>

        <button className="btn-ghost" style={{ marginTop: 8 }} onClick={onBack}>
          ← Change Name / Department
        </button>
      </div>
    </div>
  );
}
