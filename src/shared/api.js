// src/shared/api.js
// ============================================================
// Single source of truth for all GAS communication.
//
// generateId(name, dept)
//   Deterministic 8-hex-char jurorId via djb2 hash.
//   Same name+dept → same ID on every device/session.
//
// Token model:
//   createPin / verifyPin → server returns token.
//   Token stored in sessionStorage, injected automatically.
//   All write endpoints + token-gated reads require a valid token.
//
// apiSecret:
//   Shared secret read from VITE_API_SECRET env var.
//   Sent as ?secret=X on public PIN endpoints (checkPin,
//   createPin, verifyPin) so the GAS URL alone isn't enough
//   to call the API.
// ============================================================

import { APP_CONFIG, PROJECTS, CRITERIA } from "../config";

const SCRIPT_URL = APP_CONFIG?.scriptUrl;
const API_SECRET = APP_CONFIG?.apiSecret || "";

// ── Deterministic juror ID ────────────────────────────────────
// djb2 hash of norm(name) + "__" + norm(dept), returns 8 hex chars.
export function generateId(name, dept) {
  const input = name.trim().toLowerCase() + "__" + dept.trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // keep 32-bit unsigned
  }
  return hash.toString(16).padStart(8, "0");
}

// ── Token storage ─────────────────────────────────────────────
const TOKEN_KEY = "ee492_jury_token";

export function storeToken(token) {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch (_) {}
}

export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
}

export function clearToken() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
}

// ── Fire-and-forget POST ──────────────────────────────────────
export async function postToSheet(body) {
  if (!SCRIPT_URL) return;
  const token = getToken();
  try {
    await fetch(SCRIPT_URL, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...body, token }),
    });
  } catch (_) {}
}

// ── Authenticated GET ─────────────────────────────────────────
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

// ── Token-gated GET ───────────────────────────────────────────
export async function getFromSheetAuth(params) {
  return getFromSheet({ ...params, token: getToken() });
}

// ── Row builder ───────────────────────────────────────────────
// Column order sent to GAS must match the sheet layout:
//   technical, design (written), delivery (oral), teamwork
export function buildRow(juryName, juryDept, jurorId, scores, comments, project, status) {
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

export function calcRowTotal(scores, pid) {
  return CRITERIA.reduce((s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0), 0);
}

export function clampScore(val, max) {
  if (val === "" || val === null || val === undefined) return "";
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), max);
}

// ── PIN API ───────────────────────────────────────────────────

export async function checkPin(jurorId) {
  return getFromSheet({ action: "checkPin", jurorId, secret: API_SECRET });
}

export async function createPin(jurorId, juryName, juryDept) {
  return getFromSheet({
    action: "createPin",
    jurorId,
    juryName: juryName.trim(),
    juryDept: juryDept.trim(),
    secret:   API_SECRET,
  });
}

export async function verifyPin(jurorId, pin) {
  return getFromSheet({
    action:  "verifyPin",
    jurorId,
    pin:     String(pin).trim(),
    secret:  API_SECRET,
  });
}

// ── Juror data fetchers (token-gated) ─────────────────────────

export async function fetchMyScores() {
  const json = await getFromSheetAuth({ action: "myscores" });
  if (json.status !== "ok") return null;
  return json.rows || [];
}

export async function verifySubmittedCount() {
  const json = await getFromSheetAuth({ action: "verify" });
  if (json.status !== "ok") return 0;
  return json.submittedCount || 0;
}
