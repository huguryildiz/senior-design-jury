-- sql/migrations/010_audit_write_rpc.sql
-- Generic audit log write RPC for frontend-instrumented events.
-- Allows the frontend to emit semantic audit events (admin.login,
-- export.scores, period.lock, criteria.save, etc.) without modifying
-- every existing RPC.

CREATE OR REPLACE FUNCTION public.rpc_admin_write_audit_log(
  p_action        TEXT,
  p_resource_type TEXT     DEFAULT NULL,
  p_resource_id   UUID     DEFAULT NULL,
  p_details       JSONB    DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Resolve org from active membership
  SELECT organization_id INTO v_org_id
  FROM memberships
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (v_org_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_write_audit_log(TEXT, TEXT, UUID, JSONB) TO authenticated;
