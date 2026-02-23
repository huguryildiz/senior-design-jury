// src/shared/api.js
// ============================================================
// Single source of truth for all Google Apps Script communication.
// No other file should call fetch() directly.
//
// Security model:
//   - Every request includes `secret` (VITE_API_SECRET) so that
//     knowing the GAS URL alone is not enough to read or write data.
//   - Write requests also include a `sessionToken` obtained after
//     PIN verification. The token is scoped to one juror ID and
//     expires in 24 h on the server (hygiene only — the real
//     lifetime is the browser tab session via sessionStorage).
//
// POST uses no-cors (Apps Script does not return CORS headers on
// POST). This means we cannot read POST responses — errors are
// silently swallowed. Use GET (getFromSheet) when you need a reply.
// ============================================================

import { APP_CONFIG, PROJECTS, CRITERIA } from "../config";

const SCRIPT_URL = APP_CONFIG?.scriptUrl;
const API_SECRET = APP_CONFIG?.apiSecret || "";

// ── Juror ID generation ───────────────────────────────────────
// Produces a short, stable, URL-safe identifier from the juror's
// name and department. The same name+dept always yields the same
// ID so the juror can switch devices without losing their data.
//
// Normalisation rules (must mirror GAS normaliseForId):
//   • lower-case
//   • trim & collapse whitespace
//   • strip all non-alphanumeric chars (incl. Turkish diacritics)
//
// djb2 hash then base-36 encoded → ~7 chars, e.g. "a3f9b2e"
export function generateJurorId(name, dept) {
  const str = normaliseForId(name) + "|" + normaliseForId(dept);
  // djb2 hash — fast, sufficient collision resistance for ~100 jurors
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(36); // e.g. "1a2b3c4"
}

function normaliseForId(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    // Normalise Turkish characters to ASCII equivalents
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    // Strip everything that isn't a letter, digit or space
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, ""); // collapse to no spaces for the hash input
}

// ── Fire-and-forget POST ──────────────────────────────────────
// Used for writes: upsert rows, save draft, reset juror, etc.
// Automatically injects `secret` and optionally `sessionToken`.
export async function postToSheet(body, sessionToken = "") {
  if (!SCRIPT_URL) return;
  try {
    await fetch(SCRIPT_URL, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...body,
        secret: API_SECRET,
        ...(sessionToken ? { sessionToken } : {}),
      }),
    });
  } catch (_) {
    // Network errors are expected in no-cors mode — swallow silently.
  }
}

// ── Authenticated GET ─────────────────────────────────────────
// Used for reads and PIN operations that return data.
// Automatically injects `secret`.
// Throws on HTTP error, HTML response, or invalid JSON.
export async function getFromSheet(params) {
  if (!SCRIPT_URL) throw new Error("scriptUrl is not configured in config.js.");
  const qs  = new URLSearchParams({ ...params, secret: API_SECRET }).toString();
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
// Field order matches Sheets columns G–J: technical, design, delivery, teamwork.
export function buildRow(juryName, juryDept, scores, comments, project, status) {
  const jurorId = generateJurorId(juryName, juryDept);
  return {
    juryName,
    juryDept,
    jurorId,
    timestamp:   new Date().toISOString(),
    projectId:   project.id,
    projectName: project.name,
    technical:   scores[project.id]?.technical ?? "",
    design:      scores[project.id]?.design    ?? "",
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
// Returns { status, exists }
export async function checkPin(juryName, juryDept) {
  const jurorId = generateJurorId(juryName, juryDept);
  return getFromSheet({ action: "checkPin", juryName: juryName.trim(), juryDept: juryDept.trim(), jurorId });
}

// Create a new PIN for a first-time juror.
// Returns { status, pin }
export async function createPin(juryName, juryDept) {
  const jurorId = generateJurorId(juryName, juryDept);
  return getFromSheet({ action: "createPin", juryName: juryName.trim(), juryDept: juryDept.trim(), jurorId });
}

// Verify an entered PIN.
// On success the server returns a sessionToken.
// Returns { status, valid, locked, attemptsLeft, sessionToken? }
export async function verifyPin(juryName, juryDept, pin) {
  const jurorId = generateJurorId(juryName, juryDept);
  return getFromSheet({
    action:   "verifyPin",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
    jurorId,
    pin:      String(pin).trim(),
  });
}

// ── Juror data fetchers ───────────────────────────────────────

// Returns the best (latest / highest-status) row per group for a juror.
export async function fetchMyScores(juryName, juryDept) {
  const jurorId = generateJurorId(juryName, juryDept);
  const json = await getFromSheet({
    action:   "myscores",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
    jurorId,
  });
  if (json.status !== "ok") return null;
  return json.rows || [];
}

// Returns how many groups have status = all_submitted for a juror.
export async function verifySubmittedCount(juryName, juryDept) {
  const jurorId = generateJurorId(juryName, juryDept);
  const json = await getFromSheet({
    action:   "verify",
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
    jurorId,
  });
  if (json.status !== "ok") return 0;
  return json.submittedCount || 0;
}
