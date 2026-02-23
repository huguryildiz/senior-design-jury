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
  onPinSubmit,
  onPinAcknowledge,
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputsRef = useRef([]);

  useEffect(() => {
    setDigits(["", "", "", ""]);
  }, [pinStep, juryName]);

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      onPinSubmit(newDigits.join(""));
      setDigits(["", "", "", ""]);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  if (pinStep !== "entering") return null;

  return (
    <div className="form-screen">
      <div className="info-card pin-card">
        <div className="pin-icon-wrap">
          <KeyIcon />
        </div>
        <h3>Enter Your PIN</h3>
        <p className="pin-intro">
          Welcome back, <strong>{juryName}</strong>. Enter your 4-digit PIN.
        </p>

        <div className="pin-box-row">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              className="pin-box"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {pinError && <div className="pin-error-msg">{pinError}</div>}
      </div>
    </div>
  );
}
