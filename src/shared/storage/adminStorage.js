// src/shared/storage/adminStorage.js
// ============================================================
// Typed helpers for admin UI persistence and raw entry tokens.
// ============================================================

import { KEYS } from "./keys";

// Re-export persist.js helpers (they use KEYS.ADMIN_UI_STATE internally).
// The existing persist.js already handles try/catch and JSON serialization.
export { readSection, writeSection } from "../../admin/persist";

/** Get raw token storage key for a semester. */
export function tokenKey(semesterId) {
  return KEYS.JURY_RAW_TOKEN_PREFIX + semesterId;
}

/** Read raw token for a semester (checks sessionStorage first). */
export function getRawToken(semesterId) {
  const key = tokenKey(semesterId);
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || null;
  } catch { return null; }
}

/** Store raw token in both sessionStorage and localStorage. */
export function setRawToken(semesterId, token) {
  const key = tokenKey(semesterId);
  try {
    sessionStorage.setItem(key, token);
    localStorage.setItem(key, token);
  } catch {}
}

/** Remove raw token from both storages. */
export function clearRawToken(semesterId) {
  const key = tokenKey(semesterId);
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {}
}
