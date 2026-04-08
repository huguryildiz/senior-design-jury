-- VERA — PIN lockout tuning
-- Changes: 3 failed attempts (was 3, DB already correct) → still 3
--          Lockout duration: 15 minutes → 5 minutes
--
-- rpc_jury_verify_pin: only the interval needs updating (attempt threshold was already 3)

CREATE OR REPLACE FUNCTION public.rpc_jury_verify_pin(
  p_period_id   UUID,
  p_juror_name  TEXT,
  p_affiliation TEXT,
  p_pin         TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_organization_id UUID;
  v_juror_id        UUID;
  v_auth_row        juror_period_auth%ROWTYPE;
  v_now             TIMESTAMPTZ := now();
  v_failed_count    INT;
  v_locked_until    TIMESTAMPTZ;
  v_session_token   TEXT;
BEGIN
  -- Look up organization from period
  SELECT organization_id INTO v_organization_id
  FROM periods
  WHERE id = p_period_id;

  IF v_organization_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  -- Find juror
  SELECT id INTO v_juror_id
  FROM jurors
  WHERE juror_name = p_juror_name
    AND affiliation  = p_affiliation
    AND organization_id = v_organization_id
  LIMIT 1;

  IF v_juror_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  -- Get auth row
  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = v_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'no_auth_row')::JSON;
  END IF;

  -- Admin block
  IF v_auth_row.is_blocked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'blocked')::JSON;
  END IF;

  -- Active lockout
  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'ok',              false,
      'error_code',      'locked',
      'locked_until',    v_auth_row.locked_until,
      'failed_attempts', v_auth_row.failed_attempts
    )::JSON;
  END IF;

  -- Lock window expired → reset counter
  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until <= v_now THEN
    UPDATE juror_period_auth
    SET failed_attempts = 0, locked_until = NULL, locked_at = NULL
    WHERE juror_id = v_juror_id AND period_id = p_period_id;
    v_auth_row.failed_attempts := 0;
    v_auth_row.locked_until    := NULL;
    v_auth_row.locked_at       := NULL;
  END IF;

  -- Verify PIN via bcrypt
  IF v_auth_row.pin_hash IS NOT NULL
     AND v_auth_row.pin_hash = crypt(p_pin, v_auth_row.pin_hash)
  THEN
    v_session_token := encode(gen_random_bytes(32), 'hex');
    UPDATE juror_period_auth
    SET session_token      = v_session_token,
        session_expires_at = v_now + interval '12 hours',
        failed_attempts    = 0,
        locked_until       = NULL,
        locked_at          = NULL,
        last_seen_at       = v_now
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    RETURN jsonb_build_object(
      'ok',            true,
      'juror_id',      v_juror_id,
      'session_token', v_session_token
    )::JSON;
  END IF;

  -- PIN mismatch — increment failed attempts
  v_failed_count := v_auth_row.failed_attempts + 1;
  v_locked_until := NULL;

  IF v_failed_count >= 3 THEN
    v_locked_until := v_now + interval '5 minutes';
    UPDATE juror_period_auth
    SET failed_attempts = v_failed_count,
        locked_until    = v_locked_until,
        locked_at       = v_now
    WHERE juror_id = v_juror_id AND period_id = p_period_id;
  ELSE
    UPDATE juror_period_auth
    SET failed_attempts = v_failed_count
    WHERE juror_id = v_juror_id AND period_id = p_period_id;
  END IF;

  RETURN jsonb_build_object(
    'ok',              false,
    'error_code',      'invalid_pin',
    'locked_until',    v_locked_until,
    'failed_attempts', v_failed_count
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
