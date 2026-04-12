-- 053_audit_no_delete.sql
-- Enforce append-only audit_logs at the RLS level.
-- USING (false) means the policy never allows a match, so DELETE is rejected
-- for every role that goes through PostgREST — including superadmin UI paths.
-- Service role bypasses RLS, which is intentional for operational recovery
-- under explicit DBA intervention with a full audit trail.
CREATE POLICY "no_delete_audit_logs" ON audit_logs
  FOR DELETE USING (false);
