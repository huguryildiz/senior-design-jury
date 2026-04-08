-- VERA v1 — Security Patch: Hash sensitive token fields
--
-- Replaces raw TEXT storage with SHA-256 hashed equivalents:
--   entry_tokens.token           -> token_hash TEXT
--   juror_period_auth.session_token -> session_token_hash TEXT
--
-- All RPC functions that read/write these fields are updated accordingly.
-- Verification: digest(plain_value, 'sha256') compared against stored hash.
-- bcrypt is NOT used here — tokens are high-entropy, rainbow tables are not viable.

-- =============================================================================
-- entry_tokens: token -> token_hash
-- =============================================================================

ALTER TABLE entry_tokens
  ADD COLUMN token_hash TEXT;

-- Migrate existing rows (if any): hash the existing plain token
UPDATE entry_tokens
  SET token_hash = encode(digest(token, 'sha256'), 'hex')
  WHERE token IS NOT NULL;

-- Make token_hash NOT NULL + UNIQUE, drop old column
ALTER TABLE entry_tokens
  ALTER COLUMN token_hash SET NOT NULL;

CREATE UNIQUE INDEX idx_entry_tokens_token_hash ON entry_tokens (token_hash);

ALTER TABLE entry_tokens
  DROP COLUMN token;

-- =============================================================================
-- juror_period_auth: session_token -> session_token_hash
-- =============================================================================

ALTER TABLE juror_period_auth
  ADD COLUMN session_token_hash TEXT;

-- Migrate existing rows (if any)
UPDATE juror_period_auth
  SET session_token_hash = encode(digest(session_token, 'sha256'), 'hex')
  WHERE session_token IS NOT NULL;

ALTER TABLE juror_period_auth
  DROP COLUMN session_token;

-- =============================================================================
-- Update RPC: rpc_jury_validate_entry_token
-- Lookup now uses digest(p_token, 'sha256') instead of raw token match
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_validate_entry_token(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Update last_used_at
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

-- =============================================================================
-- Update RPC: rpc_jury_verify_pin
-- session_token_hash stored instead of plain session_token
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
SET search_path = public
AS $$
DECLARE
  v_juror_id        UUID;
  v_auth_row        juror_period_auth%ROWTYPE;
  v_session_token   TEXT;
  v_now             TIMESTAMPTZ := now();
  v_max_attempts    INT := 5;
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

  IF v_auth_row.locked_until IS NOT NULL AND v_auth_row.locked_until > v_now THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'pin_locked',
      'locked_until', v_auth_row.locked_until)::JSON;
  END IF;

  -- Verify bcrypt PIN
  IF v_auth_row.pin_hash = crypt(p_pin, v_auth_row.pin_hash) THEN
    -- Generate session token and store as hash
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
    -- Wrong PIN: increment failed_attempts, lock if threshold reached
    UPDATE juror_period_auth
    SET failed_attempts = failed_attempts + 1,
        locked_until    = CASE WHEN failed_attempts + 1 >= v_max_attempts
                               THEN v_now + interval '30 minutes' ELSE NULL END,
        locked_at       = CASE WHEN failed_attempts + 1 >= v_max_attempts
                               THEN v_now ELSE locked_at END
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_pin')::JSON;
  END IF;
END;
$$;

-- =============================================================================
-- Update RPC: rpc_jury_upsert_score — session validation uses hash
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_upsert_score(
  p_period_id   UUID,
  p_project_id  UUID,
  p_juror_id    UUID,
  p_session_token TEXT,
  p_scores      JSONB,
  p_comment     TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Upsert score_sheet
  INSERT INTO score_sheets (period_id, project_id, juror_id, comment, status, started_at, last_activity_at)
  VALUES (p_period_id, p_project_id, p_juror_id, p_comment, 'in_progress', now(), now())
  ON CONFLICT (juror_id, project_id) DO UPDATE
    SET comment          = COALESCE(EXCLUDED.comment, score_sheets.comment),
        last_activity_at = now(),
        updated_at       = now()
  RETURNING id INTO v_score_sheet_id;

  -- Upsert each score item
  FOR v_score_entry IN SELECT * FROM jsonb_array_elements(p_scores)
  LOOP
    SELECT id INTO v_criterion_id
    FROM period_criteria
    WHERE period_id = p_period_id
      AND key = (v_score_entry->>'key');

    IF FOUND THEN
      INSERT INTO score_sheet_items (score_sheet_id, period_criterion_id, score_value)
      VALUES (v_score_sheet_id, v_criterion_id, (v_score_entry->>'value')::NUMERIC)
      ON CONFLICT (score_sheet_id, period_criterion_id) DO UPDATE
        SET score_value = EXCLUDED.score_value,
            updated_at  = now();

      v_total := v_total + (v_score_entry->>'value')::NUMERIC;
    END IF;
  END LOOP;

  -- Update status based on completion
  SELECT COUNT(*) INTO v_criteria_count FROM period_criteria WHERE period_id = p_period_id;
  SELECT COUNT(*) INTO v_item_count     FROM score_sheet_items WHERE score_sheet_id = v_score_sheet_id;

  UPDATE score_sheets
  SET status = CASE WHEN v_item_count >= v_criteria_count THEN 'submitted' ELSE 'in_progress' END,
      updated_at = now()
  WHERE id = v_score_sheet_id;

  UPDATE juror_period_auth
  SET last_seen_at = now()
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'score_sheet_id', v_score_sheet_id,
    'total',         v_total
  )::JSON;
END;
$$;

-- =============================================================================
-- Update RPC: rpc_jury_finalize_submission — session validation uses hash
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_finalize_submission(
  p_period_id     UUID,
  p_juror_id      UUID,
  p_session_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_row     juror_period_auth%ROWTYPE;
  v_session_hash TEXT;
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
      last_seen_at       = now()
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.rpc_jury_validate_entry_token(TEXT)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT)     TO anon, authenticated;
