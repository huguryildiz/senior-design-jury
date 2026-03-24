// src/admin/persist.js
// ============================================================
// Lightweight localStorage persistence for admin UI state.
// All I/O is wrapped in try/catch — never throws.
//
// Storage key : jury_admin_ui_state_v1
// Shape       : { tab: {…}, evaluations: {…}, details: {…}, jurors: {…}, grid: {…} }
// ============================================================

import { KEYS } from "../shared/storage/keys";

function load() {
  try {
    const raw = localStorage.getItem(KEYS.ADMIN_UI_STATE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Read a named section. Returns {} if missing or malformed. */
export function readSection(section) {
  try {
    const obj = load();
    const s = obj[section];
    return s && typeof s === "object" && !Array.isArray(s) ? s : {};
  } catch {
    return {};
  }
}

/** Merge-write a named section. Silently ignores write failures. */
export function writeSection(section, data) {
  try {
    const obj = load();
    localStorage.setItem(KEYS.ADMIN_UI_STATE, JSON.stringify({ ...obj, [section]: data }));
  } catch {}
}
