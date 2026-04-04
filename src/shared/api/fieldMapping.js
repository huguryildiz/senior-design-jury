// src/shared/api/fieldMapping.js
// Score field mapping between DB columns and UI display names.
//
// DB columns: technical, written, oral, teamwork (individual NUMERIC)
// UI names:   technical, design, delivery, teamwork
//
// "written" in DB = "design" in UI
// "oral" in DB = "delivery" in UI

/**
 * Maps DB score row to UI field names.
 * DB: written, oral → UI: design, delivery
 */
export function dbScoresToUi(row) {
  return {
    technical: row.technical ?? null,
    design: row.written ?? null,
    delivery: row.oral ?? null,
    teamwork: row.teamwork ?? null,
  };
}

/**
 * Maps UI field names back to DB columns for writes.
 * UI: design, delivery → DB: written, oral
 */
export function uiScoresToDb(scores) {
  return {
    technical: scores.technical ?? null,
    written: scores.design ?? null,
    oral: scores.delivery ?? null,
    teamwork: scores.teamwork ?? null,
  };
}

/**
 * Maps DB average scores to UI (same mapping as dbScoresToUi).
 */
export function dbAvgScoresToUi(row) {
  return {
    technical: row.technical != null ? Number(row.technical) : null,
    design: row.written != null ? Number(row.written) : null,
    delivery: row.oral != null ? Number(row.oral) : null,
    teamwork: row.teamwork != null ? Number(row.teamwork) : null,
  };
}

/**
 * Normalizes JSONB member array or string to a semicolon-separated string.
 */
export function formatMembers(m) {
  if (!m) return "";
  if (typeof m === "string") {
    // Re-format comma-separated strings to semicolons
    return m.split(/[,;]/).map((s) => s.trim()).filter(Boolean).join("; ");
  }
  if (Array.isArray(m)) {
    return m.map((entry) => (entry?.name || entry || "").toString().trim()).filter(Boolean).join("; ");
  }
  return String(m);
}

