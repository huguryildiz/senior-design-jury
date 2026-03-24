// src/shared/storage/pageStorage.js
// ============================================================
// Typed helpers for the top-level page key (tedu_portal_page).
// ============================================================

import { KEYS } from "./keys";

/** Read saved page from localStorage. Returns null on failure. */
export function getPage() {
  try { return localStorage.getItem(KEYS.PAGE); } catch { return null; }
}

/** Write page to localStorage. Silently ignores failures. */
export function setPage(page) {
  try { localStorage.setItem(KEYS.PAGE, page); } catch {}
}
