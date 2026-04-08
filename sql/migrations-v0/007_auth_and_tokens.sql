-- VERA v1 — Jury Auth RPCs + Entry Token RPCs + Admin Utility RPCs
-- Tables (already created in 004_periods_and_execution.sql):
--   juror_period_auth, entry_tokens
--
-- RPCs:
--   rpc_jury_authenticate          — find/create juror, issue bcrypt PIN
--   rpc_jury_verify_pin            — bcrypt PIN check, session token + expiry
--   rpc_jury_validate_entry_token  — token validation + last_used_at update
--   rpc_jury_upsert_score          — normalize JSONB scores → score_sheets/items
--   rpc_jury_finalize_submission   — mark final_submitted_at
--   rpc_juror_reset_pin            — admin: generate + hash new PIN
--   rpc_juror_toggle_edit_mode     — admin: open/close edit window
--   rpc_juror_unlock_pin           — admin: clear lockout
--   rpc_entry_token_generate       — admin: create entry token
--   rpc_entry_token_revoke         — admin: revoke entry token
--   rpc_admin_approve_application  — super_admin: approve org application

-- =============================================================================
-- 1. rpc_jury_authenticate
-- =============================================================================
-- Creates or retrieves a juror by (name + affiliation + org).
-- Generates a bcrypt PIN if needed; returns plain PIN exactly once.

DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.rpc_jury_authenticate(
  p_period_id     UUID,
  p_juror_name    TEXT,
  p_affiliation   TEXT,
  p_force_reissue BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_organization_id UUID;
  v_juror_id        UUID;
  v_pin             TEXT;
  v_pin_hash        TEXT;
  v_needs_pin       BOOLEAN;
  v_auth_row        juror_period_auth%ROWTYPE;
  v_now             TIMESTAMPTZ := now();
BEGIN
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
    INSERT INTO jurors (organization_id, juror_name, affiliation)
    VALUES (v_organization_id, p_juror_name, p_affiliation)
    RETURNING id INTO v_juror_id;
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
    'needs_pin',       v_needs_pin,
    'pin_plain_once',  CASE WHEN v_needs_pin THEN v_pin ELSE NULL END,
    'locked_until',    NULL,
    'failed_attempts', 0
  )::JSON;
END;
$$;

-- =============================================================================
-- 2. rpc_jury_verify_pin
-- =============================================================================
-- Verifies PIN via bcrypt, issues session token + sets session_expires_at.
-- Tracks failed attempts; 3 failures → 15-min lockout (sets locked_at).

DROP FUNCTION IF EXISTS public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT);

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
    v_locked_until := v_now + interval '15 minutes';
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

-- =============================================================================
-- 3. rpc_jury_validate_entry_token
-- =============================================================================
-- Validates entry token (revocation + 24h TTL).
-- Updates last_used_at on success.

DROP FUNCTION IF EXISTS public.rpc_jury_validate_entry_token(TEXT);

CREATE OR REPLACE FUNCTION public.rpc_jury_validate_entry_token(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_token_row   entry_tokens%ROWTYPE;
  v_period_id   UUID;
  v_period_name TEXT;
  v_now         TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_token_row
  FROM entry_tokens
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_not_found')::JSON;
  END IF;

  IF v_token_row.is_revoked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_revoked')::JSON;
  END IF;

  -- 24h implicit TTL
  IF v_token_row.created_at < v_now - interval '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_expired')::JSON;
  END IF;

  -- Explicit expiry
  IF v_token_row.expires_at IS NOT NULL AND v_token_row.expires_at < v_now THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_expired')::JSON;
  END IF;

  -- Get period info
  SELECT id, name INTO v_period_id, v_period_name
  FROM periods
  WHERE id = v_token_row.period_id;

  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  -- Record access time
  UPDATE entry_tokens
  SET last_used_at = v_now
  WHERE id = v_token_row.id;

  RETURN jsonb_build_object(
    'ok',          true,
    'period_id',   v_period_id,
    'period_name', v_period_name
  )::JSON;
END;
$$;

-- =============================================================================
-- 4. rpc_jury_upsert_score
-- =============================================================================
-- Upserts scores for a (juror, project) pair using the normalized model.
-- p_scores: JSONB array — [{key: "technical", value: 28}, ...]
-- Writes to score_sheets + score_sheet_items; scores_compat VIEW handles admin reads.

DROP FUNCTION IF EXISTS public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT);

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
SET search_path = public, auth
AS $$
DECLARE
  v_auth_row         juror_period_auth%ROWTYPE;
  v_period_locked    BOOLEAN;
  v_sheet_id         UUID;
  v_criterion_id     UUID;
  v_criteria_count   INT;
  v_item_count       INT;
  v_total            NUMERIC;
  v_status           TEXT;
  v_score_entry      JSONB;
  v_now              TIMESTAMPTZ := now();
BEGIN
  -- Validate session
  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_not_found')::JSON;
  END IF;

  IF v_auth_row.session_token IS DISTINCT FROM p_session_token THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_session')::JSON;
  END IF;

  -- Check session expiry
  IF v_auth_row.session_expires_at IS NOT NULL
     AND v_auth_row.session_expires_at < v_now
  THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_expired')::JSON;
  END IF;

  -- Check period lock
  SELECT is_locked INTO v_period_locked
  FROM periods
  WHERE id = p_period_id;

  IF v_period_locked THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_locked')::JSON;
  END IF;

  -- UPSERT score_sheet
  INSERT INTO score_sheets (period_id, project_id, juror_id, comment, started_at, last_activity_at)
  VALUES (p_period_id, p_project_id, p_juror_id, p_comment, v_now, v_now)
  ON CONFLICT (juror_id, project_id) DO UPDATE
    SET comment          = COALESCE(EXCLUDED.comment, score_sheets.comment),
        last_activity_at = v_now
  RETURNING id INTO v_sheet_id;

  -- UPSERT each score item
  FOR v_score_entry IN SELECT * FROM jsonb_array_elements(p_scores)
  LOOP
    -- Look up period_criterion by (period_id, key)
    SELECT id INTO v_criterion_id
    FROM period_criteria
    WHERE period_id = p_period_id
      AND key = (v_score_entry->>'key')
    LIMIT 1;

    IF v_criterion_id IS NOT NULL THEN
      INSERT INTO score_sheet_items (score_sheet_id, period_criterion_id, score_value)
      VALUES (v_sheet_id, v_criterion_id, (v_score_entry->>'value')::NUMERIC)
      ON CONFLICT (score_sheet_id, period_criterion_id) DO UPDATE
        SET score_value = EXCLUDED.score_value,
            updated_at  = v_now;
    END IF;
  END LOOP;

  -- Derive sheet status from completion ratio
  SELECT COUNT(*) INTO v_criteria_count
  FROM period_criteria
  WHERE period_id = p_period_id;

  SELECT COUNT(*) INTO v_item_count
  FROM score_sheet_items
  WHERE score_sheet_id = v_sheet_id
    AND score_value IS NOT NULL;

  IF v_criteria_count > 0 AND v_item_count >= v_criteria_count THEN
    v_status := 'submitted';
  ELSIF v_item_count > 0 THEN
    v_status := 'in_progress';
  ELSE
    v_status := 'draft';
  END IF;

  UPDATE score_sheets
  SET status           = v_status,
      last_activity_at = v_now
  WHERE id = v_sheet_id;

  -- Update last_seen_at on auth row
  UPDATE juror_period_auth
  SET last_seen_at = v_now
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  -- Calculate total for this sheet
  SELECT COALESCE(SUM(score_value), 0) INTO v_total
  FROM score_sheet_items
  WHERE score_sheet_id = v_sheet_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'score_sheet_id', v_sheet_id,
    'total',         v_total
  )::JSON;
END;
$$;

-- =============================================================================
-- 5. rpc_jury_finalize_submission
-- =============================================================================
-- Marks the juror's session as finalized (final_submitted_at).

DROP FUNCTION IF EXISTS public.rpc_jury_finalize_submission(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.rpc_jury_finalize_submission(
  p_period_id     UUID,
  p_juror_id      UUID,
  p_session_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_row juror_period_auth%ROWTYPE;
BEGIN
  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_not_found')::JSON;
  END IF;

  IF v_auth_row.session_token IS DISTINCT FROM p_session_token THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_session')::JSON;
  END IF;

  UPDATE juror_period_auth
  SET final_submitted_at = now()
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

-- =============================================================================
-- 6. rpc_juror_reset_pin
-- =============================================================================
-- Admin: generates a new bcrypt PIN for a juror in a period.
-- Caller must be org_admin of the juror's org or super_admin.

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
  SET pin_hash        = v_pin_hash,
      failed_attempts = 0,
      locked_until    = NULL,
      locked_at       = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

-- =============================================================================
-- 7. rpc_juror_toggle_edit_mode
-- =============================================================================
-- Admin: opens or closes a juror's edit window for a period.

DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT);

CREATE OR REPLACE FUNCTION public.rpc_juror_toggle_edit_mode(
  p_period_id      UUID,
  p_juror_id       UUID,
  p_enabled        BOOLEAN,
  p_reason         TEXT    DEFAULT NULL,
  p_duration_hours INT     DEFAULT 2
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id   UUID;
  v_is_admin BOOLEAN;
BEGIN
  SELECT organization_id INTO v_org_id
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

  IF p_enabled THEN
    UPDATE juror_period_auth
    SET edit_enabled    = true,
        edit_reason     = p_reason,
        edit_expires_at = now() + (p_duration_hours || ' hours')::INTERVAL
    WHERE juror_id = p_juror_id AND period_id = p_period_id;
  ELSE
    UPDATE juror_period_auth
    SET edit_enabled    = false,
        edit_reason     = NULL,
        edit_expires_at = NULL
    WHERE juror_id = p_juror_id AND period_id = p_period_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

-- =============================================================================
-- 8. rpc_juror_unlock_pin
-- =============================================================================
-- Admin: clears the PIN lockout for a juror in a period.

DROP FUNCTION IF EXISTS public.rpc_juror_unlock_pin(UUID, UUID);

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
  v_org_id   UUID;
  v_is_admin BOOLEAN;
BEGIN
  SELECT organization_id INTO v_org_id
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

  UPDATE juror_period_auth
  SET failed_attempts = 0,
      locked_until    = NULL,
      locked_at       = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

-- =============================================================================
-- 9. rpc_entry_token_generate
-- =============================================================================
-- Admin: creates a new entry token for a period.

DROP FUNCTION IF EXISTS public.rpc_entry_token_generate(UUID);

CREATE OR REPLACE FUNCTION public.rpc_entry_token_generate(
  p_period_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id   UUID;
  v_is_admin BOOLEAN;
  v_token    TEXT;
  v_token_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM periods
  WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO entry_tokens (period_id, token)
  VALUES (p_period_id, v_token)
  RETURNING id INTO v_token_id;

  RETURN jsonb_build_object(
    'ok',       true,
    'token_id', v_token_id,
    'token',    v_token
  )::JSON;
END;
$$;

-- =============================================================================
-- 10. rpc_entry_token_revoke
-- =============================================================================
-- Admin: revokes an entry token by its ID.

DROP FUNCTION IF EXISTS public.rpc_entry_token_revoke(UUID);

CREATE OR REPLACE FUNCTION public.rpc_entry_token_revoke(
  p_token_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_period_id UUID;
  v_org_id    UUID;
  v_is_admin  BOOLEAN;
BEGIN
  SELECT t.period_id, p.organization_id
  INTO v_period_id, v_org_id
  FROM entry_tokens t
  JOIN periods p ON p.id = t.period_id
  WHERE t.id = p_token_id;

  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  UPDATE entry_tokens
  SET is_revoked = true
  WHERE id = p_token_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

-- =============================================================================
-- 11. rpc_admin_approve_application
-- =============================================================================
-- Super-admin: approves a pending org application (status only; user creation
-- is handled by the approve-admin-application Edge Function).

DROP FUNCTION IF EXISTS public.rpc_admin_approve_application(UUID);

CREATE OR REPLACE FUNCTION public.rpc_admin_approve_application(
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app_row org_applications%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_app_row
  FROM org_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'application_not_found')::JSON;
  END IF;

  IF v_app_row.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_status')::JSON;
  END IF;

  UPDATE org_applications
  SET status      = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'application_id', p_application_id
  )::JSON;
END;
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Jury RPCs: anon + authenticated (called without a logged-in session)
GRANT EXECUTE ON FUNCTION public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_validate_entry_token(TEXT)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT)         TO anon, authenticated;

-- Admin RPCs: authenticated only
GRANT EXECUTE ON FUNCTION public.rpc_juror_reset_pin(UUID, UUID)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_juror_unlock_pin(UUID, UUID)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_entry_token_generate(UUID)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_entry_token_revoke(UUID)                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_approve_application(UUID)                      TO authenticated;
