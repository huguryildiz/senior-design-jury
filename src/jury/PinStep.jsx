// src/jury/PinStep.jsx
// PIN authentication screen. Phase 7 restyle.

import { useState, useRef, useEffect, useId } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, TriangleAlert, Lock, Info } from "lucide-react";

// ── 4-box PIN input ─────────────────────────────────────────
function PinBoxes({ onSubmit, pinError, shake, disabled }) {
  const PIN_LEN = 4;
  const [digits, setDigits] = useState(Array.from({ length: PIN_LEN }, () => ""));
  const [showPin, setShowPin] = useState(false);
  const inputId = useId();
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (pinError) {
      setDigits(Array.from({ length: PIN_LEN }, () => ""));
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    }
  }, [pinError]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(i, val) {
    if (disabled) return;
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < PIN_LEN - 1) inputRefs[i + 1].current?.focus();
  }

  function handleKeyDown(i, e) {
    if (disabled) return;
    if (e.key === "Backspace") {
      if (digits[i] === "" && i > 0) { const next = [...digits]; next[i - 1] = ""; setDigits(next); inputRefs[i - 1].current?.focus(); }
      else { const next = [...digits]; next[i] = ""; setDigits(next); }
    }
    if (e.key === "ArrowLeft" && i > 0) inputRefs[i - 1].current?.focus();
    if (e.key === "ArrowRight" && i < PIN_LEN - 1) inputRefs[i + 1].current?.focus();
    if (e.key === "Enter") { const pin = digits.join(""); if (pin.length === PIN_LEN) onSubmit(pin); }
  }

  function handlePaste(e) {
    e.preventDefault();
    if (disabled) return;
    const text = e.clipboardData?.getData("text") || "";
    const stripped = text.replace(/\D/g, "").slice(0, PIN_LEN);
    if (!stripped) return;
    const next = Array.from({ length: PIN_LEN }, (_, i) => stripped[i] || "");
    setDigits(next);
    inputRefs[Math.min(stripped.length, PIN_LEN - 1)].current?.focus();
  }

  const isComplete = digits.every((d) => d !== "");

  return (
    <div className={`pin-input-group space-y-4${shake ? " pin-input-group--shake" : ""}`}>
      <div className="flex justify-center gap-3" role="group" aria-label="4-digit PIN">
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
            className={`pin-box flex size-14 items-center justify-center rounded-lg border-2 text-center text-2xl font-bold tabular-nums font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              pinError ? "border-destructive bg-destructive/5" : "border-border bg-muted"
            }`}
            disabled={disabled}
          />
        ))}
      </div>
      <Button className="w-full" onClick={() => { if (!disabled && isComplete) onSubmit(digits.join("")); }} disabled={disabled || !isComplete}>
        Verify PIN &rarr;
      </Button>
      <button
        type="button"
        className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowPin((v) => !v)}
        aria-pressed={showPin}
        tabIndex={-1}
      >
        {showPin ? "Hide" : "Show"} PIN
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export default function PinStep({ pinError, pinErrorCode, pinAttemptsLeft, pinLockedUntil, onPinSubmit, onBack }) {
  const [shake, setShake] = useState(false);
  const authActiveRef = useRef(false);
  const isLocked = pinErrorCode === "locked";
  const attemptsLeft = typeof pinAttemptsLeft === "number" ? Math.max(0, pinAttemptsLeft) : null;
  const errorTitle =
    pinErrorCode === "session_expired" ? "Oturum sona erdi"
      : pinErrorCode === "locked" ? "Too many login attempts"
        : pinErrorCode === "network" ? "Connection error"
          : pinErrorCode === "not_found" ? "Juror not found"
            : pinErrorCode === "no_pin" ? "PIN required"
              : "Incorrect PIN";
  const lockedUntilText = (() => {
    if (!pinLockedUntil) return "";
    const d = new Date(pinLockedUntil);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();
  const errorDetail =
    pinErrorCode === "locked" && lockedUntilText ? `You cannot login until ${lockedUntilText}`
      : pinErrorCode === "invalid" && attemptsLeft !== null && attemptsLeft > 0 ? `Please try again. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
        : pinError;

  useEffect(() => {
    if (!pinError) return;
    setShake(false);
    const raf = requestAnimationFrame(() => setShake(true));
    const t = setTimeout(() => setShake(false), 260);
    try { if (navigator?.vibrate) navigator.vibrate([60, 40, 60]); } catch {}
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [pinError]);

  const handleVerify = async (pin) => {
    if (authActiveRef.current) return;
    authActiveRef.current = true;
    try { await Promise.resolve(onPinSubmit(pin)); } catch {}
    authActiveRef.current = false;
  };

  if (isLocked) {
    return (
      <div className="premium-screen flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Lock className="size-6" />
              </div>
              <h1 className="text-xl font-semibold">Too many login attempts</h1>
              <p className="text-sm text-muted-foreground">This session has been temporarily locked for security reasons.</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>{lockedUntilText ? `You can try again after ${lockedUntilText}, or contact the administrator to reset your PIN.` : "Please try again later."}</span>
            </div>
            {onBack && (
              <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={onBack}>
                &larr; Return Home
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="premium-screen flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound className="size-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Enter your access PIN</h1>
            <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to continue.</p>
          </div>

          {(pinError || pinErrorCode) && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-medium">{errorTitle}</div>
                {errorDetail && <div className="mt-0.5 opacity-80">{errorDetail}</div>}
              </div>
            </div>
          )}

          <PinBoxes onSubmit={handleVerify} pinError={pinError} shake={shake} disabled={isLocked} />

          {onBack && (
            <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={onBack}>
              &larr; Return Home
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
