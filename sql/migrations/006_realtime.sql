-- VERA v1 — Supabase Realtime Publication
-- Adds selected tables to the realtime publication.
-- Only tables that need live updates are included to minimize WAL overhead.
-- RLS still applies to all realtime subscriptions.

ALTER PUBLICATION supabase_realtime ADD TABLE
  score_sheets,
  score_sheet_items,
  juror_period_auth,
  projects,
  periods,
  jurors,
  audit_logs;
