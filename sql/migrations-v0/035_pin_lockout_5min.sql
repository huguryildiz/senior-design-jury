-- 035: PIN lockout tuning — 3 attempts / 5 minutes
--
-- Production currently runs 029_fix_verify_pin which uses:
--   v_max_attempts = 5, interval '30 minutes'
--
-- This patch lowers the threshold to 3 attempts and shortens
-- the lockout window to 5 minutes. Also adds auto-reset of
-- failed_attempts when an expired lock is encountered.

CREATE OR REPLACE FUNCTION public.rpc_jury_verify_pin(
  p_period_id   UUID,
  p_juror_name  TEXT,
  p_affiliation TEXT,
  p_pin         TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_juror_id        UUID;
  v_auth_row        juror_period_auth%ROWTYPE;
  v_session_token   TEXT;
  v_now             TIMESTAMPTZ := now();
  v_max_attempts    INT := 3;
  v_new_failed      INT;
BEGIN
  -- Resolve juror
  SELECT id INTO v_juror_id
  FROM jurors
  WHERE lower(trim(juror_name)) = lower(trim(p_juror_name))
    AND lower(trim(affiliation)) = lower(trim(p_affiliation));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = v_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_not_found')::JSON;
  END IF;

  IF v_auth_row.is_blocked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_blocked')::JSON;
  END IF;

  -- Active lockout — still within the window
  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until > v_now THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'pin_locked',
      'locked_until', v_auth_row.locked_until,
      'failed_attempts', v_auth_row.failed_attempts)::JSON;
  END IF;

  -- Expired lockout — auto-reset counter so juror gets fresh attempts
  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until <= v_now THEN
    UPDATE juror_period_auth
    SET failed_attempts = 0, locked_until = NULL, locked_at = NULL
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    v_auth_row.failed_attempts := 0;
    v_auth_row.locked_until    := NULL;
    v_auth_row.locked_at       := NULL;
  END IF;

  -- Verify bcrypt PIN
  IF v_auth_row.pin_hash = crypt(p_pin, v_auth_row.pin_hash) THEN
    v_session_token := encode(gen_random_bytes(32), 'hex');

    UPDATE juror_period_auth
    SET session_token_hash = encode(digest(v_session_token, 'sha256'), 'hex'),
        session_expires_at = v_now + interval '12 hours',
        failed_attempts    = 0,
        locked_until       = NULL,
        locked_at          = NULL,
        last_seen_at       = v_now
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    RETURN jsonb_build_object(
      'ok',           true,
      'juror_id',     v_juror_id,
      'session_token', v_session_token
    )::JSON;
  ELSE
    v_new_failed := v_auth_row.failed_attempts + 1;

    UPDATE juror_period_auth
    SET failed_attempts = v_new_failed,
        locked_until    = CASE WHEN v_new_failed >= v_max_attempts
                               THEN v_now + interval '5 minutes' ELSE NULL END,
        locked_at       = CASE WHEN v_new_failed >= v_max_attempts
                               THEN v_now ELSE locked_at END
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    IF v_new_failed >= v_max_attempts THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'pin_locked',
        'failed_attempts', v_new_failed,
        'locked_until', v_now + interval '5 minutes'
      )::JSON;
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'invalid_pin',
      'failed_attempts', v_new_failed
    )::JSON;
  END IF;
END;
$$;
