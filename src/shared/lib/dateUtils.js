// src/shared/lib/dateUtils.js
// Global date formatting utilities for VERA

/**
 * Formats a given timestamp to a standardized DateTime string.
 * Example: "Oct 12, 2026, 14:30" (24-hour format)
 */
export function formatDateTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch {
    return ts;
  }
}

/**
 * Formats a given timestamp to a standardized Date string (without time).
 * Example: "Oct 12, 2026"
 */
export function formatDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return ts;
  }
}

/**
 * Formats a given timestamp to a standardized Time string.
 * Example: "14:30" (24-hour format)
 */
export function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch {
    return ts;
  }
}
