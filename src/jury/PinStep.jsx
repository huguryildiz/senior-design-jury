// src/jury/PinStep.jsx
// ============================================================
// PIN authentication screen.
// Jurors enter their 4-digit access PIN.
//
// Props:
//   pinError    : string  — error message (empty = no error)
//   pinErrorCode: string  — "invalid" | "locked" | "not_found" | "no_pin" | "network" | ""
//   pinAttemptsLeft: number
//   pinLockedUntil: string (timestamptz)
//   onPinSubmit : (pin: string) => void
//   onBack      : () => void
// ============================================================

import { useState, useRef, useEffect, useId } from "react";
import { KeyRoundIcon, TriangleAlertIcon, LockIcon } from "../shared/Icons";

// ── 4-box PIN input with explicit OK button ───────────────────
function PinBoxes({ onSubmit, pinError, shake, disabled }) {
  const PIN_LEN = 4;
  const [digits, setDigits] = useState(Array.from({ length: PIN_LEN }, () => ""));
  const [showPin, setShowPin] = useState(false);
  const inputId = useId();
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Reset boxes whenever an error is shown so the user can retry cleanly.
  useEffect(() => {
    if (pinError) {
      setDigits(Array.from({ length: PIN_LEN }, () => ""));
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinError]);

  function handleChange(i, val) {
    if (disabled) return;
    const d    = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i]    = d;
    setDigits(next);
    if (d && i < PIN_LEN - 1) inputRefs[i + 1].current?.focus();
  }

  function handleKeyDown(i, e) {
    if (disabled) return;
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
    if (e.key === "ArrowRight" && i < PIN_LEN - 1) inputRefs[i + 1].current?.focus();
    if (e.key === "Enter") {
      const pin = digits.join("");
      if (pin.length === PIN_LEN) onSubmit(pin);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    if (disabled) return;
    const text = e.clipboardData?.getData("text") || "";
    const stripped = text.replace(/\D/g, "").slice(0, PIN_LEN);
    if (!stripped) return;
    const next = Array.from({ length: PIN_LEN }, (_, i) => stripped[i] || "");
    setDigits(next);
    const focusIdx = Math.min(stripped.length, PIN_LEN - 1);
    inputRefs[focusIdx].current?.focus();
  }

  function handleOk() {
    if (disabled) return;
    const pin = digits.join("");
    if (pin.length === PIN_LEN) onSubmit(pin);
  }

  const isComplete = digits.every((d) => d !== "");
  const isDisabled = disabled || !isComplete;

  return (
    <div className={`pin-input-group${shake ? " pin-input-group--shake" : ""}`}>
      <div className="pin-boxes-row" role="group" aria-label="4-digit PIN">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            maxLength={1}
            value={d}
            aria-label={`Digit ${i + 1} of 4`}
            name={`${inputId}-pin-${i}`}
            autoFocus={i === 0}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`pin-box${pinError ? " pin-box--error" : ""}`}
            disabled={disabled}
          />
        ))}
      </div>
      <button
        className="premium-btn-primary pin-ok-btn"
        onClick={handleOk}
        disabled={isDisabled}
      >
        Verify PIN →
      </button>
      <button
        type="button"
        className="pin-show-toggle"
        onClick={() => setShowPin((v) => !v)}
        aria-pressed={showPin}
        tabIndex={-1}
      >
        {showPin ? "Hide" : "Show"} PIN
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PinStep({
  pinError,
  pinErrorCode,
  pinAttemptsLeft,
  pinLockedUntil,
  onPinSubmit,
  onBack,
}) {
  const [shake,       setShake]       = useState(false);
  const authActiveRef = useRef(false);
  const isLocked = pinErrorCode === "locked";
  const attemptsLeft = typeof pinAttemptsLeft === "number" ? Math.max(0, pinAttemptsLeft) : null;
  const errorTitle =
    pinErrorCode === "locked"
      ? "Too many login attempts"
      : pinErrorCode === "network"
        ? "Connection error"
      : pinErrorCode === "not_found"
        ? "Juror not found"
        : pinErrorCode === "no_pin"
          ? "PIN required"
          : "Incorrect PIN";
  const lockedUntilText = (() => {
    if (!pinLockedUntil) return "";
    const d = new Date(pinLockedUntil);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (v) => String(v).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    return `${day}.${month}.${year} ${hour}:${minute}`;
  })();
  const errorDetail =
    pinErrorCode === "locked" && lockedUntilText
      ? `You cannot login until ${lockedUntilText}`
      : pinErrorCode === "invalid" && attemptsLeft !== null && attemptsLeft > 0
        ? `Please try again. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
      : pinError;

  useEffect(() => {
    if (!pinError) return;
    setShake(false);
    const raf = requestAnimationFrame(() => setShake(true));
    const t   = setTimeout(() => setShake(false), 260);
    try { if (navigator?.vibrate) navigator.vibrate([60, 40, 60]); } catch {}
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [pinError]);

  const handleVerify = async (pin) => {
    if (authActiveRef.current) return;
    authActiveRef.current = true;
    try {
      await Promise.resolve(onPinSubmit(pin));
    } catch {}
    authActiveRef.current = false;
  };

  if (isLocked) {
    return (
      <>
        <div className="premium-screen">
          <div className="premium-card">
            <div className="premium-header">
              <div className="premium-icon-square" aria-hidden="true">
                <LockIcon />
              </div>
              <div className="premium-title">Too many login attempts</div>
              <div className="premium-subtitle">This session has been temporarily locked for security reasons.</div>
            </div>

            <div className="premium-info-strip">
              <span className="info-strip-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </span>
              <div className="premium-info-strip-justify">
                {lockedUntilText
                  ? `You can try again after ${lockedUntilText}, or contact the administrator to reset your PIN.`
                  : "Please try again later."}
              </div>
            </div>

            {onBack && (
              <button className="premium-btn-link" type="button" onClick={onBack}
                style={{ marginTop: 4 }}>
                ← Return Home
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="premium-screen">
        <div className={`premium-card${shake ? " premium-card--shake" : ""}`}>
          <div className="premium-header">
            <div className="premium-icon-square" aria-hidden="true">
              <KeyRoundIcon />
            </div>
            <div className="premium-title">Enter your access PIN</div>
            <div className="premium-subtitle">Enter your 4-digit PIN to continue.</div>
          </div>

          {(pinError || pinErrorCode) && (
            <div className="premium-error-banner pin-error-banner">
              <TriangleAlertIcon />
              <div className="pin-error-copy">
                <div className="premium-error-title">{errorTitle}</div>
                {errorDetail ? <div className="premium-error-detail">{errorDetail}</div> : null}
              </div>
            </div>
          )}

          <PinBoxes
            onSubmit={handleVerify}
            pinError={pinError}
            shake={shake}
            disabled={isLocked}
          />

          {onBack && (
            <button className="premium-btn-link" type="button" onClick={onBack}
              style={{ marginTop: 16 }}>
              ← Return Home
            </button>
          )}
        </div>
      </div>
    </>
  );
}
