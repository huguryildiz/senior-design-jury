// src/jury/hooks/useJurorIdentity.js
// ============================================================
// Owns juror identity form state: name, department, and the
// auth/identity-step error message.
//
// This hook has no effects and no async behavior. Handlers
// that need to act on these values (handleIdentitySubmit) live
// in the useJuryState orchestrator because they cross multiple
// concern boundaries.
// ============================================================

import { useState } from "react";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export function useJurorIdentity() {
  const [juryName, setJuryName] = useState(DEMO_MODE ? "Demo Juror" : "");
  const [juryDept, setJuryDept] = useState(DEMO_MODE ? "TEDU EE" : "");
  const [authError, setAuthError] = useState("");

  return {
    juryName, setJuryName,
    juryDept, setJuryDept,
    authError, setAuthError,
  };
}
