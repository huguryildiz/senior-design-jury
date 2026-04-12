// src/jury/hooks/useJurorIdentity.js
// ============================================================
// Owns juror identity form state: name, affiliation, email,
// and the auth/identity-step error message.
//
// This hook has no effects and no async behavior. Handlers
// that need to act on these values (handleIdentitySubmit) live
// in the useJuryState orchestrator because they cross multiple
// concern boundaries.
// ============================================================

import { useState } from "react";
import { KEYS } from "@/shared/storage";

export function useJurorIdentity() {
  const [juryName, setJuryName] = useState(() => {
    try { return localStorage.getItem(KEYS.JURY_JUROR_NAME) || ""; } catch { return ""; }
  });
  const [affiliation, setAffiliation] = useState(() => {
    try { return localStorage.getItem(KEYS.JURY_AFFILIATION) || ""; } catch { return ""; }
  });
  const [jurorEmail, setJurorEmail] = useState("");
  const [authError, setAuthError] = useState("");

  return {
    juryName, setJuryName,
    affiliation, setAffiliation,
    jurorEmail, setJurorEmail,
    authError, setAuthError,
  };
}
