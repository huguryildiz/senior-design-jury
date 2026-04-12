-- 063_unlock_pin_with_reset.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Extends rpc_juror_unlock_pin so that unlocking a juror's PIN lockout
-- simultaneously generates a fresh 4-digit PIN.
--
-- Changes vs. previous version (009_audit_actor_enrichment.sql):
--   • Generates a new PIN (lpad(random()*10000, 4, '0'))
--   • Hashes it and writes pin_hash + pin_pending_reveal
--   • Returns pin_plain_once so the admin modal can show it once
--   • Emits audit action 'juror.pin_unlocked_and_reset' (replaces 'juror.pin_unlocked')
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_juror_unlock_pin(
  p_period_id UUID,
  p_juror_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_org_id     UUID;
  v_is_admin   BOOLEAN;
  v_juror_name TEXT;
  v_pin        TEXT;
  v_pin_hash   TEXT;
BEGIN
  -- Fetch juror org + name
  SELECT organization_id, juror_name
  INTO v_org_id, v_juror_name
  FROM jurors
  WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  -- Verify caller is admin for this org (or super-admin)
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  -- Generate a new 4-digit PIN
  v_pin      := lpad(floor(random() * 10000)::TEXT, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'));

  -- Clear lockout + write new PIN atomically
  UPDATE juror_period_auth
  SET
    failed_attempts    = 0,
    is_blocked         = false,
    locked_until       = NULL,
    locked_at          = NULL,
    pin_hash           = v_pin_hash,
    pin_pending_reveal = v_pin
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  -- Single combined audit event
  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'juror.pin_unlocked_and_reset',
    'juror_period_auth',
    p_juror_id,
    jsonb_build_object(
      'period_id',  p_period_id,
      'juror_id',   p_juror_id,
      'juror_name', v_juror_name
    )
  );

  RETURN jsonb_build_object(
    'ok',             true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_unlock_pin(UUID, UUID) TO authenticated;
