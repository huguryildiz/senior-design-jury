-- sql/migrations/059_audit_chain_verify_internal.sql
-- rpc_admin_verify_audit_chain requires auth.uid() != NULL (migration 054).
-- audit-anomaly-sweep calls it via service role → auth.uid() = NULL →
-- RAISE EXCEPTION 'Not authenticated' → sweep catches chainErr, logs it,
-- but reports chain_ok=true (false positive: tamper detection silently broken).
--
-- Fix:
--   1. Extract verification logic into _audit_verify_chain_internal() — no auth
--      check, SECURITY DEFINER, granted to service_role only.
--   2. rpc_admin_verify_audit_chain delegates to the helper after auth check
--      (no change for UI callers).
--   3. audit-anomaly-sweep calls _audit_verify_chain_internal directly.

-- =============================================================================
-- 1. _audit_verify_chain_internal — auth-free verification helper
-- =============================================================================

CREATE OR REPLACE FUNCTION public._audit_verify_chain_internal(
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broken      JSONB := '[]'::JSONB;
  v_prev_hash   TEXT  := 'GENESIS';
  v_row         RECORD;
  v_expected    TEXT;
  v_chain_input TEXT;
BEGIN
  FOR v_row IN
    SELECT id, action, organization_id, created_at, row_hash
    FROM audit_logs
    WHERE organization_id IS NOT DISTINCT FROM p_org_id
      AND row_hash IS NOT NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    v_chain_input :=
      v_row.id::text                                       ||
      v_row.action                                         ||
      COALESCE(v_row.organization_id::text, '')            ||
      v_row.created_at::text                               ||
      v_prev_hash;

    v_expected := encode(sha256(v_chain_input::bytea), 'hex');

    IF v_row.row_hash IS DISTINCT FROM v_expected THEN
      v_broken := v_broken || jsonb_build_array(
        jsonb_build_object(
          'id',         v_row.id,
          'created_at', v_row.created_at,
          'action',     v_row.action,
          'stored',     v_row.row_hash,
          'expected',   v_expected
        )
      );
    END IF;

    v_prev_hash := v_row.row_hash;
  END LOOP;

  RETURN v_broken;
END;
$$;

-- service_role only — UI must go through rpc_admin_verify_audit_chain
GRANT EXECUTE ON FUNCTION public._audit_verify_chain_internal(UUID) TO service_role;

-- =============================================================================
-- 2. rpc_admin_verify_audit_chain — thin auth wrapper around the helper
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_verify_audit_chain(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_uid
      AND (
        (role = 'super_admin' AND organization_id IS NULL)
        OR (role = 'org_admin' AND organization_id = p_org_id)
      )
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN _audit_verify_chain_internal(p_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_verify_audit_chain(UUID) TO authenticated;
