// src/shared/api.js
// ============================================================
// Centralised API helpers for Google Apps Script communication.
// Both App.jsx and JuryForm previously had their own copies of
// postToSheet — this module is the single source of truth.
// ============================================================

import { APP_CONFIG } from "../config";

const SCRIPT_URL = APP_CONFIG?.scriptUrl;

// ── Fire-and-forget POST ──────────────────────────────────────
// Uses no-cors because Apps Script doesn't return CORS headers
// on POST. Response cannot be read — errors are silently ignored.
// For actions where you need a response, use getFromSheet().
export async function postToSheet(body) {
  if (!SCRIPT_URL) return;
  try {
    await fetch(SCRIPT_URL, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  } catch (_) {
    // Network errors are expected in no-cors mode; ignore silently
  }
}

// ── Authenticated GET (used by AdminPanel export) ─────────────
// Returns parsed JSON or throws on error.
export async function getFromSheet(params) {
  if (!SCRIPT_URL) throw new Error("scriptUrl not configured.");
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${SCRIPT_URL}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = (await res.text()).trim();
  if (raw.toLowerCase().includes("<html")) {
    throw new Error("Received HTML — check Apps Script deployment.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Apps Script returned invalid JSON.");
  }
}

// ── Build a single evaluation row payload ────────────────────
// Centralised here so the row shape is consistent everywhere.
// Uses ISO 8601 timestamp to avoid locale-parsing fragility.
export function buildRow(juryName, juryDept, scores, comments, project, status) {
  return {
    juryName,
    juryDept,
    timestamp:   new Date().toISOString(),
    projectId:   project.id,
    projectName: project.name,
    design:      scores[project.id]?.design    ?? "",
    technical:   scores[project.id]?.technical ?? "",
    delivery:    scores[project.id]?.delivery  ?? "",
    teamwork:    scores[project.id]?.teamwork  ?? "",
    total:       calcRowTotal(scores, project.id),
    comments:    comments[project.id] || "",
    status,
  };
}

// ── Criterion total for a single project ─────────────────────
import { CRITERIA } from "../config";
export function calcRowTotal(scores, pid) {
  return CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);
}

// ── PIN helpers (jury identity security) ─────────────────────

// Check whether a PIN already exists for this juror
export async function checkPin(juryName, juryDept) {
  const json = await getFromSheet({
    action:   "checkPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
  return json; // { status, exists }
}

// Create a new PIN — server generates and returns the 4-digit code
export async function createPin(juryName, juryDept) {
  // createPin needs a response, but Apps Script POST returns no-cors.
  // Workaround: we use GET with a secret action param for this call.
  const json = await getFromSheet({
    action:   "createPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
  return json; // { status, pin }
}

// Verify a PIN — returns { status, valid, locked, attemptsLeft }
export async function verifyPin(juryName, juryDept, pin) {
  const json = await getFromSheet({
    action:   "verifyPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
    pin:      String(pin).trim(),
  });
  return json;
}

// Fetch submitted scores for a juror
export async function fetchMyScores(juryName, juryDept) {
  const json = await getFromSheet({
    action:   "myscores",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
  if (json.status !== "ok") return null;
  return json.rows || [];
}

// Verify how many groups have been all_submitted for a juror
export async function verifySubmittedCount(juryName, juryDept) {
  const json = await getFromSheet({
    action:   "verify",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
  if (json.status !== "ok") return 0;
  return json.submittedCount || 0;
}
