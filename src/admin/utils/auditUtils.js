// src/admin/utils/auditUtils.js
// ============================================================
// Pure utility functions for audit log query construction,
// date parsing, timestamp formatting, and student name
// normalization. No React imports. No Supabase imports.
// Safe to use in tests without mocking.
// ============================================================

import {
  APP_DATE_MIN_YEAR,
  APP_DATE_MAX_YEAR,
  isValidDateParts,
} from "../../shared/dateBounds";

// ── Constants ─────────────────────────────────────────────────

export const AUDIT_PAGE_SIZE = 120;

const AUDIT_MIN_YEAR = APP_DATE_MIN_YEAR;
const AUDIT_MAX_YEAR = APP_DATE_MAX_YEAR;

// ── Timestamp formatting ───────────────────────────────────────

export const formatAuditTimestamp = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  const day = String(dt.getDate()).padStart(2, "0");
  const month = dt.toLocaleString("en-GB", { month: "short" });
  const year = dt.getFullYear();
  const hours = String(dt.getHours()).padStart(2, "0");
  const minutes = String(dt.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

// ── Date / time validation helpers ────────────────────────────

const isValidTimeParts = (hh, mi, ss) => {
  if (hh < 0 || hh > 23) return false;
  if (mi < 0 || mi > 59) return false;
  if (ss < 0 || ss > 59) return false;
  return true;
};

const isValidAuditYear = (year) => year >= AUDIT_MIN_YEAR && year <= AUDIT_MAX_YEAR;

// ── Month name lookup (used by parseSearchDateParts) ──────────

const monthLookup = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const normalizeSearchYear = (yearToken) => {
  if (!yearToken) return null;
  const raw = String(yearToken);
  if (!/^\d{2,4}$/.test(raw)) return null;
  if (raw.length === 2) return 2000 + Number(raw);
  return Number(raw);
};

// ── parseSearchDateParts ───────────────────────────────────────
// Parses a free-text search query into { day, month, year } parts.
// Accepts: "jan 2025", "15 jan 2025", "15.01.2025", "2025-01-15".
// Returns null if the input is not a recognizable date pattern.

export const parseSearchDateParts = (value) => {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return null;

  // "jan" or "jan 25" or "jan 2025"
  let match = query.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*(\d{2,4})?$/i);
  if (match) {
    const month = monthLookup[match[1].toLowerCase()];
    const year = normalizeSearchYear(match[2]);
    if (!month) return null;
    return { day: null, month, year };
  }

  // "15 jan" or "15 jan 2025"
  match = query.match(/^(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*(\d{2,4})?$/i);
  if (match) {
    const day = Number(match[1]);
    const month = monthLookup[match[2].toLowerCase()];
    const year = normalizeSearchYear(match[3]);
    if (!month || day < 1 || day > 31) return null;
    if (year && !isValidDateParts(year, month, day)) return null;
    return { day, month, year };
  }

  // "dd.mm" or "dd.mm.yyyy" (also accepts / and -)
  match = query.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = normalizeSearchYear(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (year && !isValidDateParts(year, month, day)) return null;
    return { day, month, year };
  }

  // "yyyy-mm-dd" or "yyyy.mm.dd" or "yyyy/mm/dd"
  match = query.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return { day, month, year };
  }

  return null;
};

// ── parseAuditDateString ───────────────────────────────────────
// Parses an audit filter date string into { ms, isDateOnly }.
// Accepts ISO datetime "YYYY-MM-DDThh:mm[:ss]" or date-only "YYYY-MM-DD".
// Returns null for invalid or out-of-bounds input.

export const parseAuditDateString = (value) => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [datePart, timePart] = value.split("T");
    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    const [hh, mi, ss = "0"] = timePart.split(":").map(Number);
    if (!isValidAuditYear(yyyy)) return null;
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    if (!isValidTimeParts(hh, mi, ss)) return null;
    return { ms: new Date(yyyy, mm - 1, dd, hh, mi, ss).getTime(), isDateOnly: false };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-").map(Number);
    if (!isValidAuditYear(yyyy)) return null;
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    return { ms: new Date(yyyy, mm - 1, dd).getTime(), isDateOnly: true };
  }

  return null;
};

// ── getAuditDateRangeError ─────────────────────────────────────
// Returns an error message string if the filter date range is invalid,
// or "" if valid.

export const getAuditDateRangeError = (filters) => {
  const start = filters?.startDate || "";
  const end = filters?.endDate || "";
  const parsedStart = start ? parseAuditDateString(start) : null;
  const parsedEnd = end ? parseAuditDateString(end) : null;
  if ((start && !parsedStart) || (end && !parsedEnd)) {
    return "Invalid date format. Use YYYY-MM-DDThh:mm.";
  }
  if (parsedStart && parsedEnd && parsedStart.ms > parsedEnd.ms) {
    return "The 'From' date/time cannot be later than the 'To' date/time.";
  }
  return "";
};

// ── buildAuditParams ───────────────────────────────────────────
// Converts UI filter state into the RPC parameter object for
// rpc_admin_list_audit_logs.

export const buildAuditParams = (filters, limit, cursor, searchText) => {
  let startAt = null;
  let endAt = null;

  if (filters.startDate) {
    const parsed = parseAuditDateString(filters.startDate);
    if (parsed) {
      startAt = new Date(parsed.ms);
    }
  }
  if (filters.endDate) {
    const parsed = parseAuditDateString(filters.endDate);
    if (parsed) {
      const endMs = parsed.ms + (parsed.isDateOnly ? (24 * 60 * 60 * 1000 - 1) : 0);
      endAt = new Date(endMs);
    }
  }

  const search = String(searchText || "").trim();
  const searchDate = parseSearchDateParts(search);

  return {
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    actorTypes: null,
    actions: null,
    limit: limit || AUDIT_PAGE_SIZE,
    beforeAt: cursor?.beforeAt || null,
    beforeId: cursor?.beforeId || null,
    search: search ? search : null,
    searchDay: searchDate?.day || null,
    searchMonth: searchDate?.month || null,
    searchYear: searchDate?.year || null,
  };
};

// ── Actor resolution ──────────────────────────────────────────

const JUROR_ACTIONS = new Set([
  "evaluation.complete",
  "juror.pin_locked",
  "juror.edit_mode_closed_on_resubmit",
  "score.update",
]);

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Categorise an audit log row and extract human-readable actor info.
 *
 * @param {object} log - Raw audit_logs row (with optional profiles join)
 * @returns {{ type: 'admin'|'juror'|'system', name: string, role: string, initials: string|null }}
 */
export function getActorInfo(log) {
  if (log.user_id) {
    const name = log.profiles?.display_name || "Admin";
    return { type: "admin", name, role: "Organization Admin", initials: getInitials(name) };
  }
  if (JUROR_ACTIONS.has(log.action) && log.details?.actor_name) {
    const name = log.details.actor_name;
    return { type: "juror", name, role: "Juror", initials: getInitials(name) };
  }
  return { type: "system", name: "System", role: "Automated", initials: null };
}

// ── Action labels ─────────────────────────────────────────────

export const ACTION_LABELS = {
  // Explicit RPC actions
  "evaluation.complete": "Evaluation completed",
  "pin.reset": "PIN reset",
  "token.generate": "Token generated",
  "token.revoke": "Token revoked",
  "snapshot.freeze": "Snapshot frozen",
  "juror.pin_locked": "Account locked (failed attempts)",
  "juror.pin_unlocked": "Account unlocked",
  "juror.edit_mode_enabled": "Edit mode granted",
  "juror.edit_mode_closed_on_resubmit": "Edit mode closed (resubmit)",
  "juror.blocked": "Juror blocked",
  "admin.login": "Admin login",
  "admin.create": "Admin created",
  "application.approved": "Application approved",
  "application.rejected": "Application rejected",
  "period.create": "Period created",
  "period.lock": "Period locked",
  "period.update": "Period updated",
  "criteria.update": "Criteria updated",
  "export.scores": "Scores exported",
  "juror.import": "Jurors imported",
  "juror.create": "Juror created",
  "juror.edit_enabled": "Edit mode granted",
  "project.import": "Projects imported",
  "project.create": "Project created",
  "project.update": "Project updated",
  "project.delete": "Project deleted",
  "score.update": "Score updated",
  // Trigger-based CRUD actions
  "score_sheets.insert": "Score sheet created",
  "score_sheets.update": "Score sheet updated",
  "score_sheets.delete": "Score sheet deleted",
  "projects.insert": "Project created",
  "projects.update": "Project updated",
  "projects.delete": "Project deleted",
  "jurors.insert": "Juror created",
  "jurors.update": "Juror updated",
  "jurors.delete": "Juror deleted",
  "periods.insert": "Period created",
  "periods.update": "Period updated",
  "periods.delete": "Period deleted",
  "entry_tokens.insert": "Entry token created",
  "entry_tokens.update": "Entry token updated",
  "entry_tokens.delete": "Entry token deleted",
  "memberships.insert": "Membership created",
  "memberships.update": "Membership updated",
  "memberships.delete": "Membership deleted",
  "organizations.insert": "Organization created",
  "organizations.update": "Organization updated",
};

/**
 * Return a human-readable label for an audit action.
 * Falls back to a best-effort title-case transformation.
 */
export function formatActionLabel(action) {
  if (!action) return "—";
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Fallback: convert "some_table.insert" → "Some table inserted"
  const parts = action.split(".");
  if (parts.length >= 2) {
    const table = parts[0].replace(/_/g, " ");
    const op = { insert: "created", update: "updated", delete: "deleted" }[parts[1]] || parts[1];
    return `${table.charAt(0).toUpperCase() + table.slice(1)} ${op}`;
  }
  return action;
}

/**
 * Build a detail string for the action context (e.g. affected juror name).
 */
export function formatActionDetail(log) {
  if (!log.details) return "";
  // For admin actions on jurors, show juror name
  if (log.details.juror_name) return log.details.juror_name;
  // For trigger-based CRUD, show operation · table
  const op = log.details.operation || "";
  const table = log.details.table || "";
  return `${op} · ${table}`.replace(/^ · | · $/g, "");
}

// ── normalizeStudentNames ──────────────────────────────────────
// Normalizes a free-text student name list (pasted from spreadsheet,
// Word, or typed) into a consistent semicolon-separated string.

export const normalizeStudentNames = (value) => {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, ";")
    .replace(/[,/|&]+/g, ";")
    .replace(/\s+-\s+/g, ";")
    .replace(/;+/g, ";")
    .split(";")
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((name, idx, arr) => arr.indexOf(name) === idx)
    .join("; ");
};
