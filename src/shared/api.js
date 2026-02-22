// src/shared/api.js
// ============================================================
// Single source of truth for all Google Apps Script communication.
//
// Rule: no other file should call fetch() directly.
//
// POST uses no-cors (Apps Script doesn't return CORS headers on
// POST requests). This means we cannot read the response — errors
// are silently ignored. Use GET (getFromSheet) when you need a
// response.
// ============================================================

import { APP_CONFIG, PROJECTS, CRITERIA } from "../config";

const SCRIPT_URL = APP_CONFIG?.scriptUrl;

// ── Fire-and-forget POST ──────────────────────────────────────
// Used for writes: upsert rows, save draft, reset juror, etc.
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
    // Network errors are expected in no-cors mode; swallow silently.
  }
}

// ── Authenticated GET ─────────────────────────────────────────
// Used for reads and PIN operations that return data.
// Throws on HTTP error, HTML response, or invalid JSON.
export async function getFromSheet(params) {
  if (!SCRIPT_URL) throw new Error("scriptUrl is not configured in config.js.");
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${SCRIPT_URL}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = (await res.text()).trim();
  if (raw.toLowerCase().startsWith("<html")) {
    throw new Error("Received HTML from Apps Script — check your deployment URL.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Apps Script returned invalid JSON.");
  }
}

// ── Row builder ───────────────────────────────────────────────
// Builds a single evaluation row payload.
// Uses ISO 8601 timestamps to avoid locale-parsing fragility.
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
export function calcRowTotal(scores, pid) {
  return CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);
}

// ── Clamp a score value to [0, max] ──────────────────────────
export function clampScore(val, max) {
  if (val === "" || val === null || val === undefined) return "";
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), max);
}

// ── PIN API ───────────────────────────────────────────────────

// Check whether a PIN already exists for this juror.
// Returns { status, exists }.
export async function checkPin(juryName, juryDept) {
  return getFromSheet({
    action:   "checkPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
}

// Create a new PIN for a first-time juror. Server generates and
// stores the PIN; returns { status, pin } so we can show it once.
export async function createPin(juryName, juryDept) {
  return getFromSheet({
    action:   "createPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
}

// Verify an entered PIN.
// Returns { status, valid, locked, attemptsLeft }.
export async function verifyPin(juryName, juryDept, pin) {
  return getFromSheet({
    action:   "verifyPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
    pin:      String(pin).trim(),
  });
}

// ── Juror data fetchers ───────────────────────────────────────

// Returns the best (latest / highest-status) row per group for a juror.
export async function fetchMyScores(juryName, juryDept) {
  const json = await getFromSheet({
    action:   "myscores",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
  if (json.status !== "ok") return null;
  return json.rows || [];
}

// Returns how many groups have status = all_submitted for a juror.
export async function verifySubmittedCount(juryName, juryDept) {
  const json = await getFromSheet({
    action:   "verify",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
  });
  if (json.status !== "ok") return 0;
  return json.submittedCount || 0;
}
