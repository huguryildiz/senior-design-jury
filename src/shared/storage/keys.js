// src/shared/storage/keys.js
// ============================================================
// Single source of truth for all client storage keys.
// ============================================================

export const KEYS = {
  // ── Jury flow ──────────────────────────────────────────────
  JURY_ACCESS: "jury_access_period",
  JURY_ACCESS_GRANT: "jury_access_grant",
  JURY_JUROR_ID: "jury.juror_id",
  JURY_PERIOD_ID: "jury.period_id",
  JURY_JUROR_NAME: "jury.juror_name",
  JURY_AFFILIATION: "jury.affiliation",
  JURY_SESSION_TOKEN: "jury.session_token",
  JURY_PERIOD_NAME: "jury.period_name",
  JURY_CURRENT: "jury.current",
  JURY_RAW_TOKEN_PREFIX: "jury_raw_token_",

  // ── Admin panel ────────────────────────────────────────────
  ADMIN_UI_STATE: "jury_admin_ui_state_v1",
  ADMIN_ACTIVE_ORGANIZATION: "admin.active_organization_id",
  ADMIN_REMEMBER_ME: "admin.remember_me",
  ADMIN_REMEMBERED_EMAIL: "admin.remembered_email",
  ADMIN_DEVICE_ID: "admin.device_id",

  // ── Shared / UI ────────────────────────────────────────────
  THEME: "vera-theme",
  HEALTH_HISTORY: "vera_health_history",
};
