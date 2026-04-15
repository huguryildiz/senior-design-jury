// src/shared/storage/adminStorage.js
// ============================================================
// Typed helpers for admin UI persistence and raw entry tokens.
// ============================================================

import { KEYS } from "./keys";

// Re-export persist.js helpers (they use KEYS.ADMIN_UI_STATE internally).
// The existing persist.js already handles try/catch and JSON serialization.
export { readSection, writeSection } from "@/admin/utils/persist";

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

// ── Criteria draft scratch (per-period, sessionStorage) ──
//
// Payload shape:
//   { items: [...], pendingCriteriaName?: string|null, pendingClearAll?: boolean }
// Legacy payload (bare array) is tolerated on read for backward compat.

/** Read unsaved criteria draft for a period (sessionStorage only). */
export function getCriteriaScratch(periodId) {
  if (!periodId) return null;
  try {
    const raw = sessionStorage.getItem(KEYS.CRITERIA_SCRATCH_PREFIX + periodId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { items: parsed };
    return parsed;
  } catch { return null; }
}

/** Persist unsaved criteria draft for a period (sessionStorage only). */
export function setCriteriaScratch(periodId, draft) {
  if (!periodId) return;
  try {
    const payload = Array.isArray(draft) ? { items: draft } : draft;
    sessionStorage.setItem(KEYS.CRITERIA_SCRATCH_PREFIX + periodId, JSON.stringify(payload));
  } catch {}
}

/** Remove criteria draft scratch for a period. */
export function clearCriteriaScratch(periodId) {
  if (!periodId) return;
  try {
    sessionStorage.removeItem(KEYS.CRITERIA_SCRATCH_PREFIX + periodId);
  } catch {}
}

// ── Outcomes draft scratch (per-period, sessionStorage) ──
//
// Payload shape:
//   { outcomes: [...], mappings: [...],
//     pendingFrameworkName?: string, pendingUnassign?: boolean }

/** Read unsaved outcomes draft for a period (sessionStorage only). */
export function getOutcomesScratch(periodId) {
  if (!periodId) return null;
  try {
    const raw = sessionStorage.getItem(KEYS.OUTCOMES_SCRATCH_PREFIX + periodId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Persist unsaved outcomes draft for a period (sessionStorage only). */
export function setOutcomesScratch(periodId, draft) {
  if (!periodId) return;
  try {
    sessionStorage.setItem(KEYS.OUTCOMES_SCRATCH_PREFIX + periodId, JSON.stringify(draft));
  } catch {}
}

/** Remove outcomes draft scratch for a period. */
export function clearOutcomesScratch(periodId) {
  if (!periodId) return;
  try {
    sessionStorage.removeItem(KEYS.OUTCOMES_SCRATCH_PREFIX + periodId);
  } catch {}
}

// ── Active organization persistence ──────────────────────

/** Read persisted active organization ID. */
export function getActiveOrganizationId() {
  try {
    return localStorage.getItem(KEYS.ADMIN_ACTIVE_ORGANIZATION) || null;
  } catch { return null; }
}

/** Persist active organization ID. */
export function setActiveOrganizationId(organizationId) {
  try {
    if (organizationId) {
      localStorage.setItem(KEYS.ADMIN_ACTIVE_ORGANIZATION, organizationId);
    } else {
      localStorage.removeItem(KEYS.ADMIN_ACTIVE_ORGANIZATION);
    }
  } catch {}
}
