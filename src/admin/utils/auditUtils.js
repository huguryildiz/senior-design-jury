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
import { formatDateTime, formatDate } from "../../shared/lib/dateUtils";

// ── Constants ─────────────────────────────────────────────────

export const AUDIT_PAGE_SIZE = 120;

export const CATEGORY_META = {
  auth:     { label: "Auth",     cssClass: "cat-auth",     color: "#3b82f6" },
  access:   { label: "Access",   cssClass: "cat-access",   color: "#8b5cf6" },
  data:     { label: "Data",     cssClass: "cat-data",     color: "#22c55e" },
  config:   { label: "Config",   cssClass: "cat-config",   color: "#f59e0b" },
  security: { label: "Security", cssClass: "cat-security", color: "#ef4444" },
};

export const SEVERITY_META = {
  info:     { label: "Info",     cssClass: "sev-info"     },
  low:      { label: "Low",      cssClass: "sev-low"      },
  medium:   { label: "Medium",   cssClass: "sev-medium"   },
  high:     { label: "High",     cssClass: "sev-high"     },
  critical: { label: "Critical", cssClass: "sev-critical" },
};

const AUDIT_MIN_YEAR = APP_DATE_MIN_YEAR;
const AUDIT_MAX_YEAR = APP_DATE_MAX_YEAR;

// ── Timestamp formatting ───────────────────────────────────────

export const formatAuditTimestamp = (value) => {
  if (!value) return "—";
  return formatDateTime(value);
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
    actorTypes: filters.actorTypes?.length ? filters.actorTypes : null,
    actions: filters.actions?.length ? filters.actions : null,
    categories: filters.categories?.length ? filters.categories : null,
    severities: filters.severities?.length ? filters.severities : null,
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

// Legacy fallback: events where actor_name in details refers to the juror
// (used only when actor_type column is null on pre-migration rows).
const JUROR_ACTIONS = new Set([
  "evaluation.complete",
  "juror.pin_locked",
  "juror.pin_unlocked",
  "juror.edit_mode_closed_on_resubmit",
  "juror.edit_mode_enabled",
  "juror.edit_enabled",
  "pin.reset",
  "data.juror.created",
  "data.juror.updated",
  "data.juror.deleted",
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
  // Prefer new DB columns populated by migration 043+
  if (log.actor_type) {
    const colName = log.actor_name || null;
    if (log.actor_type === "juror") {
      const name = colName || log.details?.actor_name || "Juror";
      return { type: "juror", name, role: "Juror", initials: getInitials(name) };
    }
    if (log.actor_type === "system") {
      return { type: "system", name: "System", role: "Automated", initials: null };
    }
    if (log.actor_type === "anonymous") {
      return { type: "system", name: "Anonymous", role: "Unauthenticated", initials: "?" };
    }
    // admin
    const name = colName || log.profiles?.display_name || "Admin";
    return { type: "admin", name, role: "Organization Admin", initials: getInitials(name) };
  }
  // Legacy fallback for rows without actor_type column
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

// ── Event metadata ─────────────────────────────────────────────
// Single source of truth per audit event.
//   label     — human-readable label for UI lists and exports
//   narrative — (log) => { verb, resource } for sentence rendering
//
// Prefix-matched groups (export.*, notification.*) are handled by
// formatSentence's fallback matchers; no narrative entry needed here.

const EVENT_META = {
  // ── Auth ──────────────────────────────────────────────────────
  "admin.login": {
    // Legacy action — kept so historical rows still render with the right label.
    label: "Admin login",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: d.method ? `signed in via ${d.method}` : "signed in", resource: null };
    },
  },
  "auth.admin.login.success": {
    label: "Admin signed in",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: d.method ? `signed in via ${d.method}` : "signed in", resource: null };
    },
  },
  "auth.admin.login.failure": {
    label: "Failed sign-in attempt",
    narrative: (log) => {
      const d = log.details || {};
      return {
        verb: "failed sign-in attempt",
        resource: d.email ? `for ${d.email}` : null,
      };
    },
  },
  "admin.logout": {
    label: "Admin signed out",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: d.scope === "global" ? "signed out globally" : "signed out", resource: null };
    },
  },
  "auth.admin.password.changed": {
    label: "Admin changed password",
    narrative: () => ({ verb: "changed their password", resource: null }),
  },
  "auth.admin.password.reset.requested": {
    label: "Password reset requested",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "requested password reset", resource: d.email || null };
    },
  },
  "data.juror.edit_mode.force_closed": {
    label: "Juror edit mode force-closed",
    narrative: (log) => {
      const d = log.details || {};
      return {
        verb: "forced edit mode closure for",
        resource: d.juror_name || d.jurorName || null,
      };
    },
  },
  "admin.create": {
    label: "Admin created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created admin", resource: d.adminName || d.adminEmail || null };
    },
  },
  "admin.updated": {
    label: "Admin updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated admin", resource: d.adminName || d.adminEmail || null };
    },
  },

  // ── Evaluation flow (juror-initiated) ─────────────────────────
  "evaluation.complete": {
    label: "Evaluation completed",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "completed an evaluation on", resource: d.periodName || null };
    },
  },
  "data.score.submitted": {
    label: "Score sheet submitted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "submitted scores for", resource: d.project_title || d.projectTitle || null };
    },
  },
  "juror.pin_locked": {
    label: "Juror locked (too many PIN attempts)",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "was locked out (failed PIN attempts) on", resource: d.periodName || null };
    },
  },
  "juror.edit_mode_closed_on_resubmit": {
    label: "Edit mode closed (resubmit)",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "edit window closed on resubmit for", resource: d.periodName || null };
    },
  },

  // ── Juror admin actions ───────────────────────────────────────
  "pin.reset": {
    label: "Juror PIN reset by admin",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "reset PIN for", resource: d.juror_name || null };
    },
  },
  "juror.pin_unlocked": {
    label: "Juror unlocked by admin",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "unlocked", resource: d.juror_name || null };
    },
  },
  "juror.edit_mode_enabled": {
    label: "Edit mode granted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "granted edit mode to", resource: d.juror_name || null };
    },
  },
  "juror.edit_enabled": {
    label: "Edit mode granted", // legacy alias for juror.edit_mode_enabled
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "granted edit mode to", resource: d.juror_name || null };
    },
  },
  "juror.blocked": {
    label: "Juror blocked",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "blocked juror", resource: d.juror_name || null };
    },
  },
  "juror.import": {
    label: "Jurors imported",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "imported jurors", resource: d.count != null ? `${d.count} jurors` : null };
    },
  },
  "juror.create": {
    label: "Juror created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "added juror", resource: d.juror_name || null };
    },
  },

  // ── Tokens & snapshots ────────────────────────────────────────
  "token.generate": {
    label: "QR access code generated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "generated QR access code for", resource: d.periodName || null };
    },
  },
  "token.revoke": {
    label: "QR access code revoked",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "revoked QR access code for", resource: d.periodName || null };
    },
  },
  "security.entry_token.revoked": {
    label: "Entry token revoked",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "revoked entry token for period", resource: d.period_id ? `${d.revoked_count || 1} token(s)` : null };
    },
  },
  "snapshot.freeze": {
    label: "Snapshot frozen",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "froze framework snapshot for", resource: d.periodName || null };
    },
  },

  // ── Application workflow ──────────────────────────────────────
  "application.submitted": {
    label: "Application submitted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "submitted an application", resource: d.applicant_email || d.applicantEmail || null };
    },
  },
  "application.approved": {
    label: "Application approved",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "approved application from", resource: d.applicant_email || d.applicantEmail || null };
    },
  },
  "application.rejected": {
    label: "Application rejected",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "rejected application from", resource: d.applicant_email || d.applicantEmail || null };
    },
  },

  // ── Period management (manual instrumented + trigger-based) ───
  "period.create": {
    label: "Period created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created period", resource: d.periodName || null };
    },
  },
  "period.update": {
    label: "Period updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated period", resource: d.periodName || null };
    },
  },
  "period.lock": {
    label: "Evaluation locked",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "locked evaluation period", resource: d.periodName || null };
    },
  },
  "period.unlock": {
    label: "Evaluation unlocked",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "unlocked evaluation period", resource: d.periodName || null };
    },
  },
  "period.set_current": {
    label: "Active period changed",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "set active period to", resource: d.periodName || null };
    },
  },
  "periods.insert": {
    label: "Period created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created period", resource: d.periodName || null };
    },
  },
  "periods.update": {
    label: "Period updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated period", resource: d.periodName || null };
    },
  },
  "periods.delete": {
    label: "Period deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted period", resource: d.periodName || null };
    },
  },

  // ── Criteria, outcomes & framework ───────────────────────────
  "criteria.save": {
    label: "Criteria & outcomes saved",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "saved criteria configuration for", resource: d.periodName || null };
    },
  },
  "criteria.update": {
    label: "Criteria updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated criteria for", resource: d.periodName || null };
    },
  },
  "outcome.create": {
    label: "Outcome created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created outcome", resource: d.outcomeCode || d.outcome_code || d.outcomeName || null };
    },
  },
  "outcome.update": {
    label: "Outcome updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated outcome", resource: d.outcome_code || d.outcome_label || null };
    },
  },
  "outcome.delete": {
    label: "Outcome deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted outcome", resource: d.outcome_code || d.outcome_label || null };
    },
  },
  "config.outcome.updated": {
    label: "Outcome updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated outcome", resource: d.outcome_code || d.outcome_label || null };
    },
  },
  "config.outcome.deleted": {
    label: "Outcome deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted outcome", resource: d.outcome_code || d.outcome_label || null };
    },
  },
  "frameworks.insert": {
    label: "Framework created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created accreditation framework", resource: d.after?.name || null };
    },
  },
  "frameworks.update": {
    label: "Framework updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated accreditation framework", resource: d.after?.name || null };
    },
  },
  "frameworks.delete": {
    label: "Framework deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted accreditation framework", resource: d.before?.name || null };
    },
  },

  // ── Project management (manual instrumented + trigger-based) ─
  "project.import": {
    label: "Projects imported",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "imported projects", resource: d.count != null ? `${d.count} projects` : null };
    },
  },
  "project.create": {
    label: "Project created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created project", resource: d.title || d.projectTitle || d.after?.title || null };
    },
  },
  "project.update": {
    label: "Project updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated project", resource: d.title || d.projectTitle || d.after?.title || null };
    },
  },
  "project.delete": {
    label: "Project deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted project", resource: d.title || d.projectTitle || d.before?.title || null };
    },
  },
  "projects.insert": {
    label: "Project created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created project", resource: d.title || d.projectTitle || d.after?.title || null };
    },
  },
  "projects.update": {
    label: "Project updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated project", resource: d.title || d.projectTitle || d.after?.title || null };
    },
  },
  "projects.delete": {
    label: "Project deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted project", resource: d.title || d.projectTitle || d.before?.title || null };
    },
  },

  // ── Juror management (trigger-based) ─────────────────────────
  "jurors.insert": {
    label: "Juror created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created juror", resource: d.after?.juror_name || null };
    },
  },
  "jurors.update": {
    label: "Juror updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated juror", resource: d.after?.juror_name || d.before?.juror_name || null };
    },
  },
  "jurors.delete": {
    label: "Juror deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted juror", resource: d.before?.juror_name || null };
    },
  },

  // ── Membership (trigger-based) ────────────────────────────────
  "memberships.insert": {
    label: "Membership created",
    narrative: () => ({ verb: "added member", resource: null }),
  },
  "memberships.update": {
    label: "Membership updated",
    narrative: () => ({ verb: "updated membership", resource: null }),
  },
  "memberships.delete": {
    label: "Membership deleted",
    narrative: () => ({ verb: "removed member", resource: null }),
  },

  // ── Organizations (trigger-based + status change) ─────────────
  "organizations.insert": {
    label: "Organization created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created organization", resource: d.after?.name || null };
    },
  },
  "organizations.update": {
    label: "Organization updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated organization", resource: d.after?.name || d.before?.name || null };
    },
  },
  "organization.status_changed": {
    label: "Organization status changed",
    narrative: (log) => {
      const d = log.details || {};
      const transition = d.previousStatus && d.newStatus ? `${d.previousStatus} → ${d.newStatus}` : null;
      const target = [d.organizationCode || d.orgCode, transition].filter(Boolean).join(" · ");
      return { verb: "changed organization status", resource: target || null };
    },
  },

  // ── Org applications (trigger-based) ─────────────────────────
  "org_applications.insert": {
    label: "Application submitted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "submitted application", resource: d.after?.contact_email || null };
    },
  },
  "org_applications.update": {
    label: "Application status changed",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated application status", resource: d.after?.contact_email || null };
    },
  },
  "org_applications.delete": {
    label: "Application deleted",
    narrative: () => ({ verb: "deleted application", resource: null }),
  },

  // ── Admin invites (trigger-based) ─────────────────────────────
  "admin_invites.insert": {
    label: "Admin invite created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created admin invite", resource: d.after?.email || null };
    },
  },
  "admin_invites.update": {
    label: "Admin invite updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated admin invite", resource: d.after?.email || null };
    },
  },
  "admin_invites.delete": {
    label: "Admin invite deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted admin invite", resource: d.before?.email || null };
    },
  },

  // ── Entry tokens (trigger-based) ──────────────────────────────
  "entry_tokens.insert": {
    label: "QR access code created",
    narrative: () => ({ verb: "created QR access code", resource: null }),
  },
  "entry_tokens.update": {
    label: "QR access code updated",
    narrative: () => ({ verb: "updated QR access code", resource: null }),
  },
  "entry_tokens.delete": {
    label: "QR access code deleted",
    narrative: () => ({ verb: "deleted QR access code", resource: null }),
  },

  // ── Profiles (trigger-based) ──────────────────────────────────
  "profiles.insert": {
    label: "Profile created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created profile", resource: d.after?.display_name || null };
    },
  },
  "profiles.update": {
    label: "Profile updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated profile", resource: d.after?.display_name || null };
    },
  },

  // ── Score management ──────────────────────────────────────────
  "score.update": {
    label: "Score updated",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "updated scores for", resource: d.projectTitle || d.title || null };
    },
  },
  "score_sheets.insert": {
    label: "Score sheet created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created score sheet for", resource: d.after?.project_id ? "project" : null };
    },
  },
  "score_sheets.update": {
    label: "Score sheet updated",
    narrative: () => ({ verb: "updated score sheet for", resource: null }),
  },
  "score_sheets.delete": {
    label: "Score sheet deleted",
    narrative: () => ({ verb: "deleted score sheet", resource: null }),
  },

  // ── Backups ───────────────────────────────────────────────────
  "backup.created": {
    label: "Backup created",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "created a backup", resource: d.fileName || null };
    },
  },
  "backup.deleted": {
    label: "Backup deleted",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "deleted backup", resource: d.fileName || null };
    },
  },
  "backup.downloaded": {
    label: "Backup downloaded",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "downloaded backup", resource: d.fileName || null };
    },
  },

  // ── Exports (label only — narrative handled by prefix matcher) ─
  "export.scores":    { label: "Scores exported" },
  "export.rankings":  { label: "Rankings exported" },
  "export.heatmap":   { label: "Heatmap exported" },
  "export.analytics": { label: "Analytics exported" },
  "export.audit":     { label: "Audit log exported" },
  "export.backup":    { label: "Backup exported" },

  // ── Notifications (label only — narrative handled by prefix matcher) ─
  "notification.application":    { label: "Application notification sent" },
  "notification.admin_invite":   { label: "Admin invite email sent" },
  "notification.entry_token":    { label: "QR access link emailed" },
  "notification.juror_pin":      { label: "Juror PIN emailed" },
  "notification.export_report":  { label: "Report shared via email" },
  "notification.password_reset": { label: "Password reset email sent" },
  "notification.maintenance":    { label: "Maintenance notice sent" },

  // ── Juror-initiated security / data requests ─────────────────
  "security.pin_reset.requested": {
    label: "PIN reset requested",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "requested PIN reset for juror", resource: d.jurorName || null };
    },
  },
  "data.score.edit_requested": {
    label: "Score edit requested",
    narrative: (log) => {
      const d = log.details || {};
      return { verb: "requested score edit for juror", resource: d.jurorName || null };
    },
  },

  // ── System-generated security anomalies ──────────────────────
  "security.anomaly.detected": {
    label: "Anomaly Detected",
    narrative: (log) => ({
      verb: "flagged",
      resource: log.details?.anomaly_type || "anomaly",
    }),
  },
};

// Derived from EVENT_META — stable export shape for consumers
export const ACTION_LABELS = Object.fromEntries(
  Object.entries(EVENT_META).map(([k, v]) => [k, v.label])
);

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
  const d = log.details;

  // Juror actions — show juror name
  if (d.juror_name) return d.juror_name;
  if (d.actor_name && !log.user_id) return d.actor_name;

  // Application actions — show applicant info
  if (d.applicant_name || d.applicant_email) {
    return [d.applicant_name, d.applicant_email].filter(Boolean).join(" · ");
  }

  // Period actions — show period name / org context
  if (d.periodName) {
    return [d.periodName, d.organizationCode].filter(Boolean).join(" · ");
  }

  // Organization status change
  if (d.previousStatus && d.newStatus) {
    const parts = [d.organizationCode, `${d.previousStatus} → ${d.newStatus}`];
    if (d.reason) parts.push(d.reason);
    return parts.filter(Boolean).join(" · ");
  }

  // Notification actions — show recipient
  if (d.recipientEmail) {
    return [d.recipientEmail, d.type].filter(Boolean).join(" · ");
  }
  if (d.recipients && Array.isArray(d.recipients)) {
    return d.recipients.join(", ");
  }

  // Export actions — show format
  if (d.format) {
    const parts = [d.format.toUpperCase()];
    if (d.rowCount != null) parts.push(`${d.rowCount} rows`);
    if (d.jurorCount != null) parts.push(`${d.jurorCount} jurors`);
    if (d.projectCount != null) parts.push(`${d.projectCount} projects`);
    if (d.periodCount != null) parts.push(`${d.periodCount} periods`);
    return parts.join(" · ");
  }

  // Admin management — show admin name/email
  if (d.adminName || d.adminEmail) {
    return [d.adminName, d.adminEmail].filter(Boolean).join(" · ");
  }
  if (d.email) return d.email;

  // Auth — show method
  if (d.method) return d.method;

  // Criteria save
  if (d.criteriaCount != null) {
    return `${d.criteriaCount} criteria · ${d.outcomeMappingCount || 0} mappings`;
  }

  // Backup actions
  if (d.fileName) {
    const parts = [d.fileName];
    if (d.fileSizeBytes != null) {
      const mb = (d.fileSizeBytes / (1024 * 1024)).toFixed(1);
      parts.push(`${mb} MB`);
    }
    return parts.join(" · ");
  }

  // Trigger-based CRUD fallback — show operation · table
  const op = d.operation || "";
  const table = d.table || "";
  if (op || table) return `${op} · ${table}`.replace(/^ · | · $/g, "");

  return "";
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

// ── groupByDay ────────────────────────────────────────────────
function formatDayHeader(d) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const label = formatDate(d);
  if (d.toDateString() === today.toDateString()) return `Today · ${label}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${label}`;
  return label;
}

/**
 * Group a sorted-desc log array into day buckets.
 * @returns {{ key: string, label: string, logs: object[] }[]}
 */
export function groupByDay(logs) {
  const groups = [];
  let current = null;
  for (const log of logs) {
    const d = log.created_at ? new Date(log.created_at) : null;
    const key = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "unknown";
    const label = d ? formatDayHeader(d) : "Unknown date";
    if (!current || current.key !== key) {
      current = { key, label, logs: [] };
      groups.push(current);
    }
    current.logs.push(log);
  }
  return groups;
}

// ── formatSentence ────────────────────────────────────────────
/**
 * Return { verb, resource } for sentence-style event rendering.
 * verb: string, resource: string | null
 */
export function formatSentence(log) {
  const action = log.action || "";

  // Resolve via EVENT_META narrative first
  const meta = EVENT_META[action];
  if (meta?.narrative) return meta.narrative(log);

  // ── Prefix matchers for open-ended event families ─────────────
  const d = log.details || {};
  if (action.startsWith("export.")) {
    const type = action.replace("export.", "");
    return { verb: `exported ${type}`, resource: d.periodName || null };
  }
  if (action.startsWith("notification.")) {
    const type = action.replace("notification.", "");
    return {
      verb: `sent ${type.replace(/_/g, " ")} to`,
      resource: d.recipientEmail || (Array.isArray(d.recipients) ? d.recipients.join(", ") : null),
    };
  }

  // ── Trigger-based CRUD fallback (table.insert/update/delete) ──
  const parts = action.split(".");
  if (parts.length >= 2) {
    const table = parts[0].replace(/_/g, " ");
    const op = { insert: "created", update: "updated", delete: "deleted" }[parts[1]] || parts[1];
    return { verb: `${op} a ${table}`, resource: null };
  }
  return { verb: formatActionLabel(action).toLowerCase(), resource: null };
}

// ── formatDiffChips ───────────────────────────────────────────
/**
 * Return diff entries for update events.
 * @returns {{ key: string, from: string|null, to: string|null }[]}
 */
export function formatDiffChips(log) {
  const d = log.details || {};
  const action = log.action || "";

  // criteria.save with explicit weight changes
  if (action === "criteria.save" && d.changes && typeof d.changes === "object") {
    return Object.entries(d.changes)
      .slice(0, 4)
      .map(([key, val]) => ({
        key,
        from: val?.from != null ? String(val.from) : null,
        to:   val?.to   != null ? String(val.to)   : null,
      }));
  }

  // periods.update with changedFields
  if ((action === "period.update" || action === "periods.update") && Array.isArray(d.changedFields)) {
    return d.changedFields.slice(0, 3).map((field) => ({
      key:  field,
      from: d.oldValues?.[field] != null ? String(d.oldValues[field]) : null,
      to:   d.newValues?.[field] != null ? String(d.newValues[field]) : null,
    }));
  }

  // Trigger-generated diff from migration 045 — {before:{...}, after:{...}}
  if (log.diff && typeof log.diff === "object") {
    const before = log.diff.before || {};
    const after  = log.diff.after  || {};
    const SKIP_KEYS = new Set([
      "created_at", "updated_at", "id", "organization_id",
      "user_id", "period_id", "framework_id",
    ]);
    const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const changed = allKeys.filter(
      (k) => !SKIP_KEYS.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k])
    );
    if (changed.length > 0) {
      return changed.slice(0, 4).map((k) => ({
        key:  k.replace(/_/g, " "),
        from: before[k] != null ? String(before[k]).slice(0, 60) : null,
        to:   after[k]  != null ? String(after[k]).slice(0, 60)  : null,
      }));
    }
  }

  return [];
}

// ── groupBulkEvents ───────────────────────────────────────────
const BULK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BULK_MIN_SIZE  = 3;

/**
 * Collapse runs of N+ events from same actor on same resource_type
 * within a 5-minute window into a single "bulk" item.
 *
 * @returns {{ type: "single", log: object } | { type: "bulk", logs: object[], count: number, representative: object }}[]
 */
export function groupBulkEvents(logs) {
  const result = [];
  let i = 0;
  while (i < logs.length) {
    const log = logs[i];
    const actorId = log.user_id;
    const resType = log.resource_type;
    if (!actorId) { result.push({ type: "single", log }); i++; continue; }
    const ts0 = log.created_at ? Date.parse(log.created_at) : 0;
    let j = i + 1;
    while (j < logs.length) {
      const next = logs[j];
      if (next.user_id !== actorId) break;
      if (next.resource_type !== resType) break;
      const tsJ = next.created_at ? Date.parse(next.created_at) : 0;
      if (Math.abs(ts0 - tsJ) > BULK_WINDOW_MS) break;
      j++;
    }
    const count = j - i;
    if (count >= BULK_MIN_SIZE) {
      result.push({ type: "bulk", logs: logs.slice(i, j), count, representative: log });
    } else {
      for (let k = i; k < j; k++) result.push({ type: "single", log: logs[k] });
    }
    i = j;
  }
  return result;
}

// ── formatEventMeta ───────────────────────────────────────────
/**
 * Build the monospace second line shown below the action sentence in the
 * audit table. Always starts with the raw action code, then appends
 * contextual metadata (IP, bulk count, export format, first diff chip).
 *
 * @param {object} log  - Raw audit_logs row
 * @param {{ bulkCount?: number, bulkSpanMs?: number }} [opts]
 * @returns {string}    - Never null; always at least the action code
 */
export function formatEventMeta(log, opts = {}) {
  const action = String(log?.action || "");
  const d = log?.details || {};
  const { bulkCount, bulkSpanMs } = opts;

  // Bulk group: "action × N · within M min"
  if (bulkCount && bulkCount > 1) {
    const base = `${action} × ${bulkCount}`;
    if (bulkSpanMs) {
      const mins = Math.round(bulkSpanMs / 60_000);
      if (mins > 0) return `${base} · within ${mins} min`;
    }
    return base;
  }

  // Auth failure with count in details
  if (action.includes("login.failure") && d.count && d.count > 1) {
    const base = `${action} × ${d.count}`;
    return d.ip ? `${base} · ${d.ip}` : base;
  }

  // Export events: "action · FORMAT · N rows"
  if (d.format) {
    const parts = [action, d.format.toUpperCase()];
    if (d.rowCount != null) parts.push(`${d.rowCount} rows`);
    return parts.join(" · ");
  }

  // Array-style changes (config events with details.changes as array)
  if (Array.isArray(d.changes) && d.changes.length > 0) {
    const first = d.changes[0];
    if (first.key != null && (first.from != null || first.to != null)) {
      return `${action} · ${first.key} ${first.from}→${first.to}`;
    }
  }

  // Diff-bearing events via formatDiffChips: append first chip as "key from→to"
  const diffs = formatDiffChips(log);
  if (diffs.length > 0) {
    const first = diffs[0];
    const change = first.from != null && first.to != null
      ? `${first.key} ${first.from}→${first.to}`
      : first.key;
    return `${action} · ${change}`;
  }

  // Auth / generic: append IP if present
  if (d.ip) return `${action} · ${d.ip}`;

  return action;
}

// ── detectAnomalies ───────────────────────────────────────────
function _timeAgo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/**
 * Scan logs for anomalies worth surfacing to the admin.
 * Returns the highest-priority anomaly object, or null.
 *
 * Anomaly objects include:
 *   key          — stable rule identifier (e.g. "auth.login_failure.burst")
 *   action       — audit action to write ("security.anomaly.detected")
 *   title        — short banner headline (includes relative time)
 *   desc         — longer description
 *   filterAction — action to filter by when "View events" is clicked
 *   details      — extra context for the DB audit record
 *
 * @returns {{ key: string, action: string, title: string, desc: string, filterAction: string, details: object } | null}
 */
export function detectAnomalies(logs) {
  const oneHourMs = 60 * 60 * 1000;
  const oneDayMs  = 24 * oneHourMs;
  const now = Date.now();

  // Rule 1: Failed admin login burst (≥3 in 24h) — highest priority
  const recentFailures = logs.filter(
    (l) =>
      (l.action === "admin.login.failure" || l.action === "auth.admin.login.failure") &&
      l.created_at &&
      now - Date.parse(l.created_at) < oneDayMs
  );
  if (recentFailures.length >= 3) {
    const latest = recentFailures[0];
    const ip = latest.ip_address || null;
    const timeAgo = _timeAgo(Date.parse(latest.created_at));
    return {
      key: "auth.login_failure.burst",
      action: "security.anomaly.detected",
      title: `Failed login attempts detected · ${timeAgo}`,
      desc: `${recentFailures.length} failed sign-in${recentFailures.length > 1 ? "s" : ""} in the last 24 hours.${ip ? ` Source: ${ip}.` : ""}`,
      filterAction: latest.action,
      details: { anomaly_type: "login_failure_burst", count: recentFailures.length, ip },
    };
  }

  // Rule 2: Organization suspended (any in 24h)
  const recentSuspensions = logs.filter(
    (l) =>
      l.action === "organization.status_changed" &&
      l.details?.newStatus === "suspended" &&
      l.created_at &&
      now - Date.parse(l.created_at) < oneDayMs
  );
  if (recentSuspensions.length > 0) {
    const latest = recentSuspensions[0];
    const timeAgo = _timeAgo(Date.parse(latest.created_at));
    const orgCode = latest.details?.organizationCode || "";
    return {
      key: "org.status.suspended",
      action: "security.anomaly.detected",
      title: `Organization suspended · ${timeAgo}`,
      desc: `${orgCode ? `"${orgCode}" was` : "An organization was"} suspended.${recentSuspensions.length > 1 ? ` ${recentSuspensions.length} suspension events today.` : ""}`,
      filterAction: "organization.status_changed",
      details: { anomaly_type: "org_suspension", count: recentSuspensions.length, orgCode },
    };
  }

  // Rule 3: Entry token revocation burst (≥2 in 1h)
  const recentRevocations = logs.filter(
    (l) =>
      l.action === "security.entry_token.revoked" &&
      l.created_at &&
      now - Date.parse(l.created_at) < oneHourMs
  );
  if (recentRevocations.length >= 2) {
    const latest = recentRevocations[0];
    const timeAgo = _timeAgo(Date.parse(latest.created_at));
    return {
      key: "token.revoke.burst",
      action: "security.anomaly.detected",
      title: `Entry token revocations · ${timeAgo}`,
      desc: `${recentRevocations.length} access tokens revoked in the last hour.`,
      filterAction: "security.entry_token.revoked",
      details: { anomaly_type: "token_revocation_burst", count: recentRevocations.length },
    };
  }

  // Rule 4: PIN reset burst (≥3 in 1h)
  const recentPinResets = logs.filter(
    (l) =>
      l.action === "pin.reset" &&
      l.created_at &&
      now - Date.parse(l.created_at) < oneHourMs
  );
  if (recentPinResets.length >= 3) {
    const latest = recentPinResets[0];
    const timeAgo = _timeAgo(Date.parse(latest.created_at));
    return {
      key: "pin.reset.burst",
      action: "security.anomaly.detected",
      title: `PIN resets detected · ${timeAgo}`,
      desc: `${recentPinResets.length} juror PINs reset in the last hour.`,
      filterAction: "pin.reset",
      details: { anomaly_type: "pin_reset_burst", count: recentPinResets.length },
    };
  }

  // Rule 5: Export burst (≥5 in 1h)
  const recentExports = logs.filter(
    (l) =>
      l.action?.startsWith("export.") &&
      l.created_at &&
      now - Date.parse(l.created_at) < oneHourMs
  );
  if (recentExports.length >= 5) {
    const latest = recentExports[0];
    const timeAgo = _timeAgo(Date.parse(latest.created_at));
    return {
      key: "export.burst",
      action: "security.anomaly.detected",
      title: `Unusual export activity · ${timeAgo}`,
      desc: `${recentExports.length} export events in the last hour.`,
      filterAction: "export.audit",
      details: { anomaly_type: "export_burst", count: recentExports.length },
    };
  }

  // Rule 6: Juror PIN lockout (≥1 in 24h)
  const recentLocks = logs.filter(
    (l) => l.action === "juror.pin_locked" && l.created_at && (now - Date.parse(l.created_at)) < oneDayMs
  );
  if (recentLocks.length === 0) return null;
  const latest = recentLocks[0];
  const name = latest.actor_name || latest.details?.actor_name || "A juror";
  const timeAgo = _timeAgo(Date.parse(latest.created_at));
  return {
    key: "juror.pin_locked",
    action: "security.anomaly.detected",
    title: `Unusual activity detected · ${timeAgo}`,
    desc: `${name} triggered too many failed PIN attempts and was locked.${recentLocks.length > 1 ? ` ${recentLocks.length} lock events today.` : ""}`,
    filterAction: "juror.pin_locked",
    details: { anomaly_type: "pin_lockout", count: recentLocks.length },
  };
}
