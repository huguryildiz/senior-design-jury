-- sql/migrations/024_admin_sessions_delete_policy.sql
-- Allow authenticated users to delete their own session rows (device revocation).

GRANT DELETE ON admin_user_sessions TO authenticated;

CREATE POLICY "admin_user_sessions_delete_own" ON admin_user_sessions
  FOR DELETE
  USING (user_id = auth.uid());
