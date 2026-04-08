-- 032_pin_pending_reveal.sql
-- When an admin resets a juror's PIN, store the plain PIN temporarily so the
-- juror sees it on their next authenticate call (pin_reveal step), instead of
-- being silently sent to pin entry with an unknown PIN.
--
-- Changes:
--   1. juror_period_auth: add pin_pending_reveal TEXT (nullable, cleared on read)
--   2. rpc_juror_reset_pin: write plain PIN to pin_pending_reveal
--   3. rpc_jury_authenticate: if pin_pending_reveal IS NOT NULL, return as
--      pin_plain_once and clear it — frontend already routes to pin_reveal step

-- =============================================================================
-- 1. Add column
-- =============================================================================

ALTER TABLE public.juror_period_auth
  ADD COLUMN IF NOT EXISTS pin_pending_reveal TEXT DEFAULT NULL;

-- =============================================================================
-- 2. rpc_juror_reset_pin — store plain PIN in pin_pending_reveal
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_juror_reset_pin(UUID, UUID);

CREATE OR REPLACE FUNCTION public.rpc_juror_reset_pin(
  p_period_id UUID,
  p_juror_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id   UUID;
  v_is_admin BOOLEAN;
  v_pin      TEXT;
  v_pin_hash TEXT;
BEGIN
  -- Resolve org from juror
  SELECT organization_id INTO v_org_id
  FROM jurors
  WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  -- Auth check: org_admin of this org, or super_admin (org IS NULL)
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  -- Generate and hash new PIN
  v_pin      := lpad(floor(random() * 10000)::TEXT, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'));

  UPDATE juror_period_auth
  SET pin_hash           = v_pin_hash,
      pin_pending_reveal = v_pin,   -- juror sees this on next authenticate
      failed_attempts    = 0,
      locked_until       = NULL,
      locked_at          = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  RETURN jsonb_build_object(
    'ok',             true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_reset_pin(UUID, UUID) TO authenticated;

-- =============================================================================
-- 3. rpc_jury_authenticate — return pending reveal as pin_plain_once, then clear
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN, TEXT);

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
BEGIN
  -- Trim / normalize email
  v_clean_email := NULLIF(TRIM(BOTH FROM COALESCE(p_email, '')), '');

  -- Look up organization from period
  SELECT organization_id INTO v_organization_id
  FROM periods
  WHERE id = p_period_id;

  IF v_organization_id IS NULL THEN
    RETURN jsonb_build_object('error', 'period_not_found')::JSON;
  END IF;

  -- Find or create juror
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
    -- Update email if provided (always use latest value)
    IF v_clean_email IS NOT NULL THEN
      UPDATE jurors SET email = v_clean_email WHERE id = v_juror_id;
    END IF;
  END IF;

  -- Create auth row if it doesn't exist yet; never overwrite on conflict
  INSERT INTO juror_period_auth (juror_id, period_id, failed_attempts)
  VALUES (v_juror_id, p_period_id, 0)
  ON CONFLICT (juror_id, period_id) DO NOTHING;

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

  -- Admin reset the PIN → show it to the juror exactly once, then clear
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

  -- Generate PIN if missing or force_reissue=true
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
