-- sql/migrations/007_security_policy_enforcement.sql
-- Security policy enforcement: update JSONB default, rename CC field,
-- add ccOnScoreEdit, patch rpc_jury_verify_pin and rpc_admin_generate_entry_token.

-- 1. Update the default JSONB in security_policy to match the new schema.
--    Existing rows are merged so old keys survive; new keys get defaults.
UPDATE security_policy
SET policy = '{
  "googleOAuth": true,
  "emailPassword": true,
  "rememberMe": true,
  "minPasswordLength": 8,
  "maxLoginAttempts": 5,
  "requireSpecialChars": true,
  "tokenTtl": "24h",
  "pinLockCooldown": "30m",
  "ccOnPinReset": true,
  "ccOnScoreEdit": false
}'::JSONB || policy
WHERE id = 1
  AND policy IS NOT NULL;

-- Rename ccSuperAdminOnPinReset -> ccOnPinReset in existing row (preserve old value).
UPDATE security_policy
SET policy = (policy - 'ccSuperAdminOnPinReset')
          || jsonb_build_object(
               'ccOnPinReset',
               COALESCE(
                 (policy->>'ccSuperAdminOnPinReset')::BOOLEAN,
                 true
               )
             )
WHERE id = 1
  AND policy ? 'ccSuperAdminOnPinReset';

-- Remove allowMultiDevice from existing row (no longer a policy field).
UPDATE security_policy
SET policy = policy - 'allowMultiDevice'
WHERE id = 1
  AND policy ? 'allowMultiDevice';

-- 2. Patch rpc_jury_verify_pin: read maxLoginAttempts + pinLockCooldown from security_policy.
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

-- 2.5. Enforce single-token rule per period (legacy cleanup + unique index):
--      keep only newest non-revoked token per period, then enforce uniqueness.
WITH ranked_tokens AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY period_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM entry_tokens
  WHERE is_revoked = false
)
UPDATE entry_tokens t
SET is_revoked = true
FROM ranked_tokens r
WHERE t.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_entry_tokens_one_unrevoked_per_period
  ON entry_tokens (period_id)
  WHERE is_revoked = false;

-- 3. Patch rpc_admin_generate_entry_token:
--    - read tokenTtl from security_policy
--    - revoke any non-revoked token(s) for the same period on regenerate
CREATE OR REPLACE FUNCTION public.rpc_admin_generate_entry_token(p_period_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_token      TEXT;
  v_token_hash TEXT;
  v_expires_at TIMESTAMPTZ;
  v_org_id     UUID;
  v_ttl_str    TEXT;
  v_ttl        INTERVAL;
BEGIN
  -- Serialize generation per period to avoid parallel active-token races.
  SELECT organization_id INTO v_org_id
  FROM periods
  WHERE id = p_period_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  IF NOT (
    current_user_is_super_admin()
    OR EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid() AND organization_id = v_org_id
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Read tokenTtl from security_policy; fall back to '24h'.
  SELECT COALESCE(policy->>'tokenTtl', '24h')
  INTO v_ttl_str
  FROM security_policy
  WHERE id = 1;

  v_ttl := CASE v_ttl_str
    WHEN '12h' THEN INTERVAL '12 hours'
    WHEN '48h' THEN INTERVAL '48 hours'
    WHEN '7d'  THEN INTERVAL '7 days'
    ELSE            INTERVAL '24 hours'
  END;

  -- Revoke any currently non-revoked token(s) before creating a fresh one.
  UPDATE entry_tokens
  SET is_revoked = true
  WHERE period_id = p_period_id
    AND is_revoked = false;

  v_token      := gen_random_uuid()::TEXT;
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + v_ttl;

  INSERT INTO entry_tokens (period_id, token_hash, token_plain, expires_at)
  VALUES (p_period_id, v_token_hash, v_token, v_expires_at);

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_generate_entry_token(UUID) TO authenticated;
