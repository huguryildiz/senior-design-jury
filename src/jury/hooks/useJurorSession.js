// src/jury/hooks/useJurorSession.js
// ============================================================
// Owns PIN verification and session token state.
//
// State:
//   jurorId             — UUID from DB after PIN success
//   jurorSessionToken   — 64-hex session token from rpc_verify_juror_pin
//   issuedPin           — plain PIN shown once to new jurors (pin_plain_once)
//   pinError            — display string for PIN errors
//   pinErrorCode        — machine-readable error code: "locked"|"invalid"|etc.
//   pinAttemptsLeft     — remaining attempts before lockout
//   pinLockedUntil      — ISO string of lockout expiry (empty when not locked)
//
// The handlers that drive PIN submission (handlePinSubmit) live in the
// orchestrator because they call _loadPeriod after a successful verify.
//
// PIN lockout policy is DB-enforced (3 attempts → 5 min). The state here
// is purely display state reflecting what the RPC returns.
// See: docs/refactor/phase-00-baseline.md — PIN Failure and Lockout Policy.
// ============================================================

import { useState } from "react";
import { KEYS } from "@/shared/storage";

const MAX_PIN_ATTEMPTS = 3;

export function useJurorSession() {
  const [jurorId, setJurorId] = useState(() => {
    try { return localStorage.getItem(KEYS.JURY_JUROR_ID) || sessionStorage.getItem(KEYS.JURY_JUROR_ID) || ""; } catch { return ""; }
  });
  const [jurorSessionToken, setJurorSessionToken] = useState(() => {
    try { return localStorage.getItem(KEYS.JURY_SESSION_TOKEN) || sessionStorage.getItem(KEYS.JURY_SESSION_TOKEN) || ""; } catch { return ""; }
  });
  const [issuedPin, setIssuedPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinErrorCode, setPinErrorCode] = useState("");
  const [pinAttemptsLeft, setPinAttemptsLeft] = useState(MAX_PIN_ATTEMPTS);
  const [pinLockedUntil, setPinLockedUntil] = useState("");

  // Resets all PIN error/lockout display state to clean initial values.
  // Called on successful PIN verification and on full flow reset.
  const clearPinErrors = () => {
    setPinError("");
    setPinErrorCode("");
    setPinAttemptsLeft(MAX_PIN_ATTEMPTS);
    setPinLockedUntil("");
  };

  return {
    jurorId, setJurorId,
    jurorSessionToken, setJurorSessionToken,
    issuedPin, setIssuedPin,
    pinError, setPinError,
    pinErrorCode, setPinErrorCode,
    pinAttemptsLeft, setPinAttemptsLeft,
    pinLockedUntil, setPinLockedUntil,
    clearPinErrors,
    MAX_PIN_ATTEMPTS,
  };
}
