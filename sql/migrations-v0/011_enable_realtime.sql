-- Migration: 011_enable_realtime.sql
-- Adds the 7 tables consumed by Supabase Realtime subscriptions in the app
-- to the supabase_realtime publication.
--
-- Consumers:
--   useAdminRealtime  → score_sheets, score_sheet_items, juror_period_auth,
--                       projects, periods, jurors
--   usePageRealtime   → audit_logs  (AuditLogPage, INSERT only)
--
-- All other tables are intentionally excluded to minimise WAL overhead.
-- RLS still applies — clients only receive rows they are authorised to read.

ALTER PUBLICATION supabase_realtime ADD TABLE
  score_sheets,
  score_sheet_items,
  juror_period_auth,
  projects,
  periods,
  jurors,
  audit_logs;
