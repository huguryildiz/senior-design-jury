// src/shared/api/fieldMapping.js
// ============================================================
// Single source of truth for criteria field name mapping at
// the API boundary.
//
// UI / config.js ids : technical | design   | delivery | teamwork
// DB column names    : technical | written  | oral     | teamwork
//
// Applied ONLY here and in the api/ modules that call these
// helpers. Never used in UI components, hooks, or test files.
//
// If the DB column names ever change, or if structured criterion
// ids are introduced, update only this file.
// ============================================================

/**
 * Map DB score columns to config.js criterion ids.
 *
 * Input row must have: row.technical, row.written, row.oral, row.teamwork
 * Used by: listProjects, adminGetScores normalizer.
 *
 * @param {{ technical: any, written: any, oral: any, teamwork: any }} row
 * @returns {{ technical: number|null, design: number|null, delivery: number|null, teamwork: number|null }}
 */
export function dbScoresToUi(row) {
  return {
    technical: row.technical ?? null,
    design:    row.written   ?? null,  // written  → design
    delivery:  row.oral      ?? null,  // oral     → delivery
    teamwork:  row.teamwork  ?? null,
  };
}

/**
 * Map config.js criterion ids to DB RPC parameter names.
 *
 * Input scores must have: scores.technical, scores.design, scores.delivery, scores.teamwork
 * Used by: upsertScore.
 *
 * @param {{ technical: any, design: any, delivery: any, teamwork: any }} scores
 * @returns {{ p_technical: number|null, p_written: number|null, p_oral: number|null, p_teamwork: number|null }}
 */
export function uiScoresToDbParams(scores) {
  return {
    p_technical: scores.technical ?? null,
    p_written:   scores.design    ?? null,  // design   → written
    p_oral:      scores.delivery  ?? null,  // delivery → oral
    p_teamwork:  scores.teamwork  ?? null,
  };
}

/**
 * Map DB aggregate average columns to config.js criterion ids.
 *
 * Input row must have: row.avg_technical, row.avg_written, row.avg_oral, row.avg_teamwork
 * Applies Number() conversion (DB aggregates return numeric strings).
 * Used by: adminProjectSummary normalizer.
 *
 * @param {{ avg_technical: any, avg_written: any, avg_oral: any, avg_teamwork: any }} row
 * @returns {{ technical: number|null, design: number|null, delivery: number|null, teamwork: number|null }}
 */
export function dbAvgScoresToUi(row) {
  return {
    technical: row.avg_technical == null ? null : Number(row.avg_technical),
    design:    row.avg_written   == null ? null : Number(row.avg_written),  // avg_written → design
    delivery:  row.avg_oral      == null ? null : Number(row.avg_oral),     // avg_oral    → delivery
    teamwork:  row.avg_teamwork  == null ? null : Number(row.avg_teamwork),
  };
}
