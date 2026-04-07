// src/jury/hooks/useJurorIdentity.js
// ============================================================
// Owns juror identity form state: name, affiliation, and the
// auth/identity-step error message.
//
// This hook has no effects and no async behavior. Handlers
// that need to act on these values (handleIdentitySubmit) live
// in the useJuryState orchestrator because they cross multiple
// concern boundaries.
// ============================================================

import { useState } from "react";

export function useJurorIdentity() {
  const [juryName, setJuryName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [authError, setAuthError] = useState("");

  return {
    juryName, setJuryName,
    affiliation, setAffiliation,
    authError, setAuthError,
  };
}
