// src/shared/storage/juryStorage.js
// ============================================================
// Typed helpers for jury access grant and jury session keys.
// ============================================================

import { KEYS } from "./keys";

/** Read jury access grant (checks sessionStorage first, then localStorage). */
export function getJuryAccess() {
  try {
    return sessionStorage.getItem(KEYS.JURY_ACCESS) || localStorage.getItem(KEYS.JURY_ACCESS) || null;
  } catch { return null; }
}

/** Read full jury access grant payload (period_id, period_name, ...). */
export function getJuryAccessGrant() {
  try {
    const raw = sessionStorage.getItem(KEYS.JURY_ACCESS_GRANT)
      || localStorage.getItem(KEYS.JURY_ACCESS_GRANT)
      || "";
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist full jury access grant payload to both storages. */
export function setJuryAccessGrant(grant) {
  try {
    if (!grant || typeof grant !== "object" || !grant.period_id) return;
    const raw = JSON.stringify(grant);
    sessionStorage.setItem(KEYS.JURY_ACCESS_GRANT, raw);
    localStorage.setItem(KEYS.JURY_ACCESS_GRANT, raw);
  } catch {}
}

/** Write jury access grant to both sessionStorage and localStorage. */
export function setJuryAccess(periodId, grant = null) {
  try {
    sessionStorage.setItem(KEYS.JURY_ACCESS, periodId);
    localStorage.setItem(KEYS.JURY_ACCESS, periodId);
    if (grant && typeof grant === "object") {
      setJuryAccessGrant(grant);
    }
  } catch {}
}

/** Clear jury access grant from both storages. */
export function clearJuryAccess() {
  try {
    sessionStorage.removeItem(KEYS.JURY_ACCESS);
    localStorage.removeItem(KEYS.JURY_ACCESS);
    sessionStorage.removeItem(KEYS.JURY_ACCESS_GRANT);
    localStorage.removeItem(KEYS.JURY_ACCESS_GRANT);
  } catch {}
}

/**
 * Save jury session snapshot to localStorage for persistence across browser restarts
 * (phone lock → reopen browser → continue from same step).
 * Only called in production mode (not demo).
 */
export function saveJurySession({ jurorSessionToken, jurorId, periodId, periodName, juryName, affiliation, current }) {
  try {
    localStorage.setItem(KEYS.JURY_SESSION_TOKEN, jurorSessionToken || "");
    localStorage.setItem(KEYS.JURY_JUROR_ID,      jurorId            || "");
    localStorage.setItem(KEYS.JURY_PERIOD_ID,     periodId           || "");
    localStorage.setItem(KEYS.JURY_PERIOD_NAME,   periodName         || "");
    localStorage.setItem(KEYS.JURY_JUROR_NAME,    juryName           || "");
    localStorage.setItem(KEYS.JURY_AFFILIATION,   affiliation        || "");
    localStorage.setItem(KEYS.JURY_CURRENT,       String(current ?? 0));
  } catch {}
}

/** Read jury session snapshot from localStorage. Returns null if no valid session. */
export function getJurySession() {
  try {
    const token = localStorage.getItem(KEYS.JURY_SESSION_TOKEN) || "";
    const jurorId = localStorage.getItem(KEYS.JURY_JUROR_ID) || "";
    const periodId = localStorage.getItem(KEYS.JURY_PERIOD_ID) || "";
    if (!token || !jurorId || !periodId) return null;
    return {
      jurorSessionToken: token,
      jurorId,
      periodId,
      periodName:  localStorage.getItem(KEYS.JURY_PERIOD_NAME)  || "",
      juryName:    localStorage.getItem(KEYS.JURY_JUROR_NAME)   || "",
      affiliation: localStorage.getItem(KEYS.JURY_AFFILIATION)  || "",
      current:     parseInt(localStorage.getItem(KEYS.JURY_CURRENT) || "0", 10) || 0,
    };
  } catch { return null; }
}

/** Clear all jury session data from localStorage (and legacy sessionStorage keys). */
export function clearJurySession() {
  try {
    localStorage.removeItem(KEYS.JURY_SESSION_TOKEN);
    localStorage.removeItem(KEYS.JURY_JUROR_ID);
    localStorage.removeItem(KEYS.JURY_PERIOD_ID);
    localStorage.removeItem(KEYS.JURY_PERIOD_NAME);
    localStorage.removeItem(KEYS.JURY_JUROR_NAME);
    localStorage.removeItem(KEYS.JURY_AFFILIATION);
    localStorage.removeItem(KEYS.JURY_CURRENT);
    // Clear legacy sessionStorage keys in case they exist from an older session.
    sessionStorage.removeItem(KEYS.JURY_SESSION_TOKEN);
    sessionStorage.removeItem(KEYS.JURY_JUROR_ID);
    sessionStorage.removeItem(KEYS.JURY_PERIOD_ID);
    sessionStorage.removeItem(KEYS.JURY_PERIOD_NAME);
    sessionStorage.removeItem(KEYS.JURY_JUROR_NAME);
    sessionStorage.removeItem(KEYS.JURY_AFFILIATION);
    sessionStorage.removeItem(KEYS.JURY_CURRENT);
  } catch {}
}
