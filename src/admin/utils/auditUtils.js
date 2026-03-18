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
    .join("; ");
};
