-- VERA v1 — All RPC Functions
-- Depends on: 002 (tables), 003 (helpers), 004 (RLS)
--
-- All crypto functions use SET search_path = public, extensions
-- where pgcrypto (crypt, gen_salt, digest, gen_random_bytes) is needed.

-- ═══════════════════════════════════════════════════════════════════════════════
-- A) JURY AUTH & TOKEN
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_jury_authenticate
-- =============================================================================
-- Find-or-create juror → check lockout → reveal pending PIN → issue new PIN.
-- Emits data.juror.auth.created on first juror_period_auth row creation.

CREATE OR REPLACE FUNCTION public.rpc_jury_authenticate(
  p_period_id     UUID,
  p_juror_name    TEXT,
  p_affiliation   TEXT,
  p_force_reissue BOOLEAN DEFAULT false,
  p_email         TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_organization_id UUID;
  v_juror_id        UUID;
  v_pin             TEXT;
  v_pin_hash        TEXT;
  v_needs_pin       BOOLEAN;
  v_auth_row        juror_period_auth%ROWTYPE;
  v_now             TIMESTAMPTZ := now();
  v_clean_email     TEXT;
  v_inserted        INT := 0;
BEGIN
  v_clean_email := NULLIF(TRIM(BOTH FROM COALESCE(p_email, '')), '');

  SELECT organization_id INTO v_organization_id
  FROM periods
  WHERE id = p_period_id;

  IF v_organization_id IS NULL THEN
    RETURN jsonb_build_object('error', 'period_not_found')::JSON;
  END IF;

  SELECT id INTO v_juror_id
  FROM jurors
  WHERE juror_name = p_juror_name
    AND affiliation  = p_affiliation
    AND organization_id = v_organization_id
  LIMIT 1;

  IF v_juror_id IS NULL THEN
    INSERT INTO jurors (organization_id, juror_name, affiliation, email)
    VALUES (v_organization_id, p_juror_name, p_affiliation, v_clean_email)
    RETURNING id INTO v_juror_id;
  ELSE
    IF v_clean_email IS NOT NULL THEN
      UPDATE jurors SET email = v_clean_email WHERE id = v_juror_id;
    END IF;
  END IF;

  INSERT INTO juror_period_auth (juror_id, period_id, failed_attempts)
  VALUES (v_juror_id, p_period_id, 0)
  ON CONFLICT (juror_id, period_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- First time this juror authenticates for this period.
  IF v_inserted = 1 THEN
    PERFORM public._audit_write(
      v_organization_id,
      'data.juror.auth.created',
      'juror_period_auth',
      v_juror_id,
      'data'::audit_category,
      'info'::audit_severity,
      jsonb_build_object(
        'actor_name',  p_juror_name,
        'juror_name',  p_juror_name,
        'juror_id',    v_juror_id,
        'period_id',   p_period_id,
        'affiliation', p_affiliation
      ),
      NULL::JSONB,
      'juror'::audit_actor_type
    );
  END IF;

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = v_juror_id AND period_id = p_period_id;

  -- Check lockout
  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'juror_id',        v_juror_id,
      'juror_name',      p_juror_name,
      'affiliation',     p_affiliation,
      'needs_pin',       false,
      'pin_plain_once',  NULL,
      'locked_until',    v_auth_row.locked_until,
      'failed_attempts', v_auth_row.failed_attempts
    )::JSON;
  END IF;

  -- Admin reset the PIN → show it exactly once, then clear.
  IF v_auth_row.pin_pending_reveal IS NOT NULL THEN
    v_pin := v_auth_row.pin_pending_reveal;
    UPDATE juror_period_auth
    SET pin_pending_reveal = NULL
    WHERE juror_id = v_juror_id AND period_id = p_period_id;
    RETURN jsonb_build_object(
      'juror_id',        v_juror_id,
      'juror_name',      p_juror_name,
      'affiliation',     p_affiliation,
      'needs_pin',       false,
      'pin_plain_once',  v_pin,
      'locked_until',    NULL,
      'failed_attempts', 0
    )::JSON;
  END IF;

  -- Generate PIN if missing or force_reissue=true.
  v_needs_pin := false;
  IF p_force_reissue OR v_auth_row.pin_hash IS NULL THEN
    v_pin      := lpad(floor(random() * 10000)::TEXT, 4, '0');
    v_pin_hash := crypt(v_pin, gen_salt('bf'));
    UPDATE juror_period_auth
    SET pin_hash = v_pin_hash
    WHERE juror_id = v_juror_id AND period_id = p_period_id;
    v_needs_pin := true;
  END IF;

  RETURN jsonb_build_object(
    'juror_id',        v_juror_id,
    'juror_name',      p_juror_name,
    'affiliation',     p_affiliation,
    'needs_pin',       NOT v_needs_pin,
    'pin_plain_once',  CASE WHEN v_needs_pin THEN v_pin ELSE NULL END,
    'locked_until',    NULL,
    'failed_attempts', 0
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_jury_verify_pin
-- =============================================================================

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
      CASE WHEN (policy->>'maxPinAttempts') ~ '^[0-9]+$'
           THEN (policy->>'maxPinAttempts')::INT END,
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
      -- Emit audit log for lockout; rpc_jury_verify_pin runs as anon so user_id is NULL
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

-- =============================================================================
-- rpc_jury_validate_entry_token
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_validate_entry_token(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_row   entry_tokens%ROWTYPE;
  v_period      periods%ROWTYPE;
  v_token_hash  TEXT;
BEGIN
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_token_row
  FROM entry_tokens
  WHERE token_hash = v_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_not_found')::JSON;
  END IF;

  IF v_token_row.is_revoked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_revoked')::JSON;
  END IF;

  IF v_token_row.expires_at IS NOT NULL AND v_token_row.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_expired')::JSON;
  END IF;

  SELECT * INTO v_period FROM periods WHERE id = v_token_row.period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  UPDATE entry_tokens
    SET last_used_at = now()
    WHERE id = v_token_row.id;

  RETURN jsonb_build_object(
    'ok',           true,
    'token_id',     v_token_row.id,
    'period_id',    v_period.id,
    'period_name',  v_period.name,
    'is_locked',    v_period.is_locked,
    'is_current',   v_period.is_current
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_validate_entry_token(TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_jury_validate_entry_reference (short Access History reference ID)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_validate_entry_reference(
  p_reference TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ref_norm    TEXT;
  v_match_count INT;
  v_token_row   entry_tokens%ROWTYPE;
  v_period      periods%ROWTYPE;
BEGIN
  v_ref_norm := upper(substr(regexp_replace(coalesce(p_reference, ''), '[^A-Za-z0-9]', '', 'g'), 1, 8));

  IF length(v_ref_norm) != 8 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_reference')::JSON;
  END IF;

  SELECT count(*)
  INTO v_match_count
  FROM entry_tokens t
  WHERE upper(substr(regexp_replace(coalesce(t.token_plain, t.token_hash, t.id::text), '[^A-Za-z0-9]', '', 'g'), 1, 8)) = v_ref_norm;

  IF v_match_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'reference_not_found')::JSON;
  END IF;

  IF v_match_count > 1 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'ambiguous_reference')::JSON;
  END IF;

  SELECT *
  INTO v_token_row
  FROM entry_tokens t
  WHERE upper(substr(regexp_replace(coalesce(t.token_plain, t.token_hash, t.id::text), '[^A-Za-z0-9]', '', 'g'), 1, 8)) = v_ref_norm
  LIMIT 1;

  IF v_token_row.is_revoked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_revoked')::JSON;
  END IF;

  IF v_token_row.expires_at IS NOT NULL AND v_token_row.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_expired')::JSON;
  END IF;

  SELECT * INTO v_period FROM periods WHERE id = v_token_row.period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  UPDATE entry_tokens
    SET last_used_at = now()
    WHERE id = v_token_row.id;

  RETURN jsonb_build_object(
    'ok',           true,
    'token_id',     v_token_row.id,
    'period_id',    v_period.id,
    'period_name',  v_period.name,
    'is_locked',    v_period.is_locked,
    'is_current',   v_period.is_current
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_validate_entry_reference(TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- B) JURY SCORING
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_jury_upsert_score
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_upsert_score(
  p_period_id     UUID,
  p_project_id    UUID,
  p_juror_id      UUID,
  p_session_token TEXT,
  p_scores        JSONB,
  p_comment       TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_row         juror_period_auth%ROWTYPE;
  v_period           periods%ROWTYPE;
  v_score_sheet_id   UUID;
  v_score_entry      JSONB;
  v_criterion_id     UUID;
  v_criteria_count   INT;
  v_item_count       INT;
  v_total            NUMERIC := 0;
  v_session_hash     TEXT;
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

  IF v_auth_row.session_expires_at IS NOT NULL AND v_auth_row.session_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_expired')::JSON;
  END IF;

  IF v_auth_row.is_blocked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_blocked')::JSON;
  END IF;

  SELECT * INTO v_period FROM periods WHERE id = p_period_id;

  IF v_period.is_locked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_locked')::JSON;
  END IF;

  -- Edit window enforcement after final submission
  IF v_auth_row.final_submitted_at IS NOT NULL THEN
    IF NOT COALESCE(v_auth_row.edit_enabled, false) THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'final_submit_required')::JSON;
    END IF;

    IF v_auth_row.edit_expires_at IS NULL OR v_auth_row.edit_expires_at <= now() THEN
      UPDATE juror_period_auth
      SET edit_enabled    = false,
          edit_reason     = NULL,
          edit_expires_at = NULL
      WHERE juror_id = p_juror_id
        AND period_id = p_period_id
        AND (
          edit_enabled IS DISTINCT FROM false
          OR edit_reason IS NOT NULL
          OR edit_expires_at IS NOT NULL
        );
