-- sql/migrations/009_audit_actor_enrichment.sql
-- Enrich audit log details JSONB with actor_name for juror-initiated events
-- and juror_name for admin actions that affect a specific juror.
-- All functions use CREATE OR REPLACE — safe to apply on any environment.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. rpc_jury_finalize_submission: add actor_name to evaluation.complete
--    and juror.edit_mode_closed_on_resubmit audit entries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_jury_finalize_submission(
  p_period_id     UUID,
  p_juror_id      UUID,
  p_session_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_row     juror_period_auth%ROWTYPE;
  v_session_hash TEXT;
  v_org_id       UUID;
  v_juror_name   TEXT;
BEGIN
  v_session_hash := encode(digest(p_session_token, 'sha256'), 'hex');

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_not_found')::JSON;
  END IF;

  IF v_auth_row.session_token_hash IS NULL OR v_auth_row.session_token_hash != v_session_hash THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_session')::JSON;
  END IF;

  IF v_auth_row.is_blocked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_blocked')::JSON;
  END IF;

  UPDATE juror_period_auth
  SET final_submitted_at = now(),
      last_seen_at       = now(),
      edit_enabled       = false,
      edit_reason        = NULL,
      edit_expires_at    = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  -- Fetch org + juror name for audit logs (single lookup)
  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;

  IF v_org_id IS NOT NULL THEN
    -- Always emit evaluation.complete
    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
    VALUES (
      v_org_id,
      auth.uid(),
      'evaluation.complete',
      'juror_period_auth',
      p_juror_id,
      jsonb_build_object(
        'period_id',   p_period_id,
        'juror_id',    p_juror_id,
        'actor_name',  v_juror_name
      )
    );

    -- Also emit edit-mode close if an edit window was active at the time
    IF (
      COALESCE(v_auth_row.edit_enabled, false)
      OR v_auth_row.edit_reason IS NOT NULL
      OR v_auth_row.edit_expires_at IS NOT NULL
    ) THEN
      INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
      VALUES (
        v_org_id,
        auth.uid(),
        'juror.edit_mode_closed_on_resubmit',
        'juror_period_auth',
        p_juror_id,
        jsonb_build_object(
          'period_id',             p_period_id,
          'juror_id',              p_juror_id,
          'actor_name',            v_juror_name,
          'previous_edit_enabled', v_auth_row.edit_enabled,
          'previous_edit_reason',  v_auth_row.edit_reason,
          'previous_expires_at',   v_auth_row.edit_expires_at,
          'closed_at',             now(),
          'close_source',          'jury_resubmit'
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. rpc_jury_verify_pin: add actor_name to juror.pin_locked audit entry
--    p_juror_name is already a function parameter
-- ─────────────────────────────────────────────────────────────────────────────
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
  v_max_attempts    INT;
  v_lock_cooldown   TEXT;
  v_lock_duration   INTERVAL;
  v_new_failed      INT;
  v_org_id          UUID;
BEGIN
  -- Read lockout policy from security_policy; fall back to 5 attempts + 30 minutes.
  SELECT
    COALESCE(
      CASE WHEN (policy->>'maxLoginAttempts') ~ '^[0-9]+$'
           THEN (policy->>'maxLoginAttempts')::INT END,
      5
    ),
    COALESCE(policy->>'pinLockCooldown', '30m')
  INTO v_max_attempts, v_lock_cooldown
  FROM security_policy
  WHERE id = 1;

  IF NOT FOUND THEN
    v_max_attempts := 5;
    v_lock_cooldown := '30m';
  END IF;

  IF v_max_attempts < 1 THEN
    v_max_attempts := 5;
  END IF;

  v_lock_duration := CASE lower(v_lock_cooldown)
    WHEN '5m'  THEN INTERVAL '5 minutes'
    WHEN '10m' THEN INTERVAL '10 minutes'
    WHEN '15m' THEN INTERVAL '15 minutes'
    WHEN '60m' THEN INTERVAL '60 minutes'
    ELSE            INTERVAL '30 minutes'
  END;

  SELECT id INTO v_juror_id
  FROM jurors
  WHERE lower(trim(juror_name)) = lower(trim(p_juror_name))
    AND lower(trim(affiliation)) = lower(trim(p_affiliation));

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'juror_not_found',
      'max_attempts', v_max_attempts
    )::JSON;
  END IF;

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = v_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'auth_not_found',
      'max_attempts', v_max_attempts
    )::JSON;
  END IF;

  IF v_auth_row.is_blocked THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'juror_blocked',
      'max_attempts', v_max_attempts
    )::JSON;
  END IF;

  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'pin_locked',
      'locked_until', v_auth_row.locked_until,
      'max_attempts', v_max_attempts
    )::JSON;
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
      'ok',            true,
      'juror_id',      v_juror_id,
      'session_token', v_session_token,
      'max_attempts',  v_max_attempts
    )::JSON;
  ELSE
    v_new_failed := v_auth_row.failed_attempts + 1;

    UPDATE juror_period_auth
    SET failed_attempts = v_new_failed,
        locked_until    = CASE WHEN v_new_failed >= v_max_attempts
                               THEN v_now + v_lock_duration ELSE NULL END,
        locked_at       = CASE WHEN v_new_failed >= v_max_attempts
                               THEN v_now ELSE locked_at END
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    IF v_new_failed >= v_max_attempts THEN
      -- Emit audit log for lockout; juror_verify_pin runs as anon so user_id is NULL
      SELECT organization_id INTO v_org_id FROM jurors WHERE id = v_juror_id;
      IF v_org_id IS NOT NULL THEN
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
        VALUES (
          v_org_id,
          NULL,
          'juror.pin_locked',
          'juror_period_auth',
          v_juror_id,
          jsonb_build_object(
            'period_id',       p_period_id,
            'juror_id',        v_juror_id,
            'actor_name',      p_juror_name,
            'failed_attempts', v_new_failed,
            'locked_until',    v_now + v_lock_duration
          )
        );
      END IF;

      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'pin_locked',
        'failed_attempts', v_new_failed,
        'locked_until', v_now + v_lock_duration,
        'max_attempts', v_max_attempts
      )::JSON;
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'invalid_pin',
      'failed_attempts', v_new_failed,
      'max_attempts', v_max_attempts
    )::JSON;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. rpc_juror_reset_pin: add juror_name to details for action context
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_juror_reset_pin(
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
  v_pin        TEXT;
  v_pin_hash   TEXT;
  v_juror_name TEXT;
BEGIN
  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors
  WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  v_pin      := lpad(floor(random() * 10000)::TEXT, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'));

  UPDATE juror_period_auth
  SET pin_hash           = v_pin_hash,
      pin_pending_reveal = v_pin,
      failed_attempts    = 0,
      locked_until       = NULL,
      locked_at          = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'pin.reset',
    'juror_period_auth',
    p_juror_id,
    jsonb_build_object('period_id', p_period_id, 'juror_id', p_juror_id, 'juror_name', v_juror_name)
  );

  RETURN jsonb_build_object(
    'ok',             true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_reset_pin(UUID, UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. rpc_juror_unlock_pin: add juror_name to details for action context
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_juror_unlock_pin(
  p_period_id UUID,
  p_juror_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id     UUID;
  v_is_admin   BOOLEAN;
  v_juror_name TEXT;
BEGIN
  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  UPDATE juror_period_auth
  SET failed_attempts = 0, locked_until = NULL, locked_at = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'juror.pin_unlocked',
    'juror_period_auth',
    p_juror_id,
    jsonb_build_object('period_id', p_period_id, 'juror_id', p_juror_id, 'juror_name', v_juror_name)
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_unlock_pin(UUID, UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. rpc_juror_toggle_edit_mode_v2: add juror_name to details for action context
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_juror_toggle_edit_mode_v2(
  p_juror_id         UUID,
  p_period_id        UUID,
  p_enable           BOOLEAN,
  p_reason           TEXT     DEFAULT NULL,
  p_duration_minutes INT      DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id       UUID;
  v_is_admin     BOOLEAN;
  v_auth_row     juror_period_auth%ROWTYPE;
  v_reason       TEXT;
  v_minutes      INT;
  v_expires_at   TIMESTAMPTZ;
  v_juror_name   TEXT;
BEGIN
  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_not_found')::JSON;
  END IF;

  IF p_enable THEN
    v_reason := COALESCE(NULLIF(trim(p_reason), ''), 'Admin-granted edit window');

    IF v_auth_row.is_blocked THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'juror_blocked')::JSON;
    END IF;

    v_minutes := COALESCE(p_duration_minutes, 30);
    IF v_minutes < 1 OR v_minutes > 2880 THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_duration')::JSON;
    END IF;

    IF v_auth_row.final_submitted_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'final_submission_required')::JSON;
    END IF;

    v_expires_at := now() + make_interval(mins => v_minutes);

    UPDATE juror_period_auth
    SET edit_enabled    = true,
        edit_reason     = v_reason,
        edit_expires_at = v_expires_at
    WHERE juror_id = p_juror_id AND period_id = p_period_id;

    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
    VALUES (
      v_org_id, auth.uid(), 'juror.edit_mode_enabled', 'juror_period_auth', p_juror_id,
      jsonb_build_object(
        'period_id', p_period_id, 'juror_id', p_juror_id, 'juror_name', v_juror_name,
        'reason', v_reason, 'duration_minutes', v_minutes, 'expires_at', v_expires_at
      )
    );

    RETURN jsonb_build_object('ok', true, 'edit_expires_at', v_expires_at)::JSON;
  END IF;

  UPDATE juror_period_auth
  SET edit_enabled = false, edit_reason = NULL, edit_expires_at = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_toggle_edit_mode_v2(UUID, UUID, BOOLEAN, TEXT, INT) TO authenticated;
