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

      RETURN jsonb_build_object('ok', false, 'error_code', 'edit_window_expired')::JSON;
    END IF;
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
    'ok',             true,
    'score_sheet_id', v_score_sheet_id,
    'total',          v_total
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_jury_finalize_submission
-- =============================================================================
-- Closes edit window, emits evaluation.complete + per-project score events.
-- Adds optional p_correlation_id to thread all events from one submission.

CREATE OR REPLACE FUNCTION public.rpc_jury_finalize_submission(
  p_period_id       UUID,
  p_juror_id        UUID,
  p_session_token   TEXT,
  p_correlation_id  UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_row        juror_period_auth%ROWTYPE;
  v_session_hash    TEXT;
  v_org_id          UUID;
  v_juror_name      TEXT;
  v_period_name     TEXT;
  v_project_rec     RECORD;
  v_current_scores  JSONB;
  v_previous_scores JSONB;
  v_diff            JSONB;
  v_before          JSONB;
  v_after           JSONB;
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

  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;

  SELECT name INTO v_period_name
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NOT NULL THEN
    PERFORM public._audit_write(
      v_org_id,
      'evaluation.complete',
      'juror_period_auth',
      p_juror_id,
      'data'::audit_category,
      'info'::audit_severity,
      jsonb_build_object(
        'actor_name',  v_juror_name,
        'juror_name',  v_juror_name,
        'period_id',   p_period_id,
        'juror_id',    p_juror_id,
        'periodName',  v_period_name
      ),
      NULL::JSONB,
      'juror'::audit_actor_type,
      p_correlation_id
    );

    IF (
      COALESCE(v_auth_row.edit_enabled, false)
      OR v_auth_row.edit_reason IS NOT NULL
      OR v_auth_row.edit_expires_at IS NOT NULL
    ) THEN
      PERFORM public._audit_write(
        v_org_id,
        'juror.edit_mode_closed_on_resubmit',
        'juror_period_auth',
        p_juror_id,
        'data'::audit_category,
        'medium'::audit_severity,
        jsonb_build_object(
          'actor_name',            v_juror_name,
          'juror_name',            v_juror_name,
          'period_id',             p_period_id,
          'juror_id',              p_juror_id,
          'periodName',            v_period_name,
          'previous_edit_enabled', v_auth_row.edit_enabled,
          'previous_edit_reason',  v_auth_row.edit_reason,
          'previous_expires_at',   v_auth_row.edit_expires_at,
          'closed_at',             now(),
          'close_source',          'jury_resubmit'
        ),
        NULL::JSONB,
        'system'::audit_actor_type,
        p_correlation_id
      );
    END IF;

    FOR v_project_rec IN
      SELECT p.id AS project_id, p.title AS project_title
      FROM score_sheets ss
      JOIN projects p ON p.id = ss.project_id
      WHERE ss.juror_id = p_juror_id AND ss.period_id = p_period_id
    LOOP
      SELECT COALESCE(jsonb_object_agg(pc.key, ssi.score_value), '{}'::JSONB)
      INTO v_current_scores
      FROM score_sheet_items ssi
      JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
      JOIN score_sheets ss    ON ss.id = ssi.score_sheet_id
      WHERE ss.project_id = v_project_rec.project_id
        AND ss.juror_id   = p_juror_id
        AND ss.period_id  = p_period_id;

      SELECT al.details -> 'scores'
      INTO v_previous_scores
      FROM audit_logs al
      WHERE al.action = 'data.score.submitted'
        AND al.resource_id = v_project_rec.project_id
        AND (al.details ->> 'juror_id')::UUID = p_juror_id
      ORDER BY al.created_at DESC
      LIMIT 1;

      IF v_previous_scores IS NULL THEN
        v_diff := jsonb_build_object('after', v_current_scores);
      ELSE
        WITH changed_keys AS (
          SELECT k
          FROM (
            SELECT jsonb_object_keys(v_current_scores) AS k
            UNION
            SELECT jsonb_object_keys(v_previous_scores) AS k
          ) u
          WHERE (v_previous_scores -> k) IS DISTINCT FROM (v_current_scores -> k)
        )
        SELECT
          COALESCE(jsonb_object_agg(ck.k, v_previous_scores -> ck.k), '{}'::JSONB),
          COALESCE(jsonb_object_agg(ck.k, v_current_scores  -> ck.k), '{}'::JSONB)
        INTO v_before, v_after
        FROM changed_keys ck;

        v_diff := jsonb_build_object('before', v_before, 'after', v_after);
      END IF;

      PERFORM public._audit_write(
        v_org_id,
        'data.score.submitted',
        'score_sheets',
        v_project_rec.project_id,
        'data'::audit_category,
        'info'::audit_severity,
        jsonb_build_object(
          'actor_name',    v_juror_name,
          'juror_name',    v_juror_name,
          'juror_id',      p_juror_id,
          'project_title', v_project_rec.project_title,
          'period_name',   v_period_name,
          'period_id',     p_period_id,
          'scores',        v_current_scores
        ),
        v_diff,
        'juror'::audit_actor_type,
        p_correlation_id
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT, UUID) TO anon, authenticated;

-- =============================================================================
-- rpc_jury_get_scores
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_get_scores(
  p_period_id     UUID,
  p_juror_id      UUID,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_row     juror_period_auth%ROWTYPE;
  v_session_hash TEXT;
  v_result       JSONB;
BEGIN
  v_session_hash := encode(digest(p_session_token, 'sha256'), 'hex');

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_not_found');
  END IF;

  IF v_auth_row.session_token_hash IS NULL OR v_auth_row.session_token_hash != v_session_hash THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_session');
  END IF;

  IF v_auth_row.session_expires_at IS NOT NULL
     AND v_auth_row.session_expires_at < now()
  THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_expired');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'sheets', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',         ss.id,
            'project_id', ss.project_id,
            'comment',    ss.comment,
            'updated_at', ss.last_activity_at,
            'items', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'score_value', ssi.score_value,
                    'key',        pc.key
                  )
                )
                FROM score_sheet_items ssi
                JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
                WHERE ssi.score_sheet_id = ss.id
              ),
              '[]'::JSONB
            )
          )
        )
        FROM score_sheets ss
        WHERE ss.juror_id = p_juror_id
          AND ss.period_id = p_period_id
      ),
      '[]'::JSONB
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_get_scores(UUID, UUID, TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- C) JURY RESULTS & FEEDBACK
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_jury_project_rankings
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_jury_project_rankings(
  p_period_id     UUID,
  p_session_token TEXT
)
RETURNS TABLE (
  project_id  UUID,
  avg_score   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM juror_period_auth
    WHERE period_id          = p_period_id
      AND session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
      AND is_blocked         = FALSE
      AND (session_expires_at IS NULL OR session_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    ss.project_id,
    ROUND(AVG(sheet_totals.total)::NUMERIC, 2) AS avg_score
  FROM score_sheets ss
  JOIN (
    SELECT
      ssi.score_sheet_id,
      COALESCE(SUM(ssi.score_value), 0) AS total
    FROM score_sheet_items ssi
    GROUP BY ssi.score_sheet_id
  ) sheet_totals ON sheet_totals.score_sheet_id = ss.id
  WHERE ss.period_id = p_period_id
  GROUP BY ss.project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_project_rankings(UUID, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_get_period_impact
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_period_impact(
  p_period_id     UUID,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_juror_id UUID;
BEGIN
  SELECT juror_id INTO v_juror_id
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    AND (is_blocked IS NULL OR is_blocked = FALSE);

  IF v_juror_id IS NULL THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;

  RETURN jsonb_build_object(
    'total_projects', (
      SELECT COUNT(*)::INT FROM projects WHERE period_id = p_period_id
    ),
    'projects', (
      SELECT COALESCE(jsonb_agg(r ORDER BY r.avg_total DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          p.id, p.title, p.project_no,
          COUNT(ss.id)::INT AS juror_count,
          ROUND(AVG(ss.total_score)::NUMERIC, 2) AS avg_total
        FROM projects p
        LEFT JOIN (
          SELECT ss2.id, ss2.project_id,
            COALESCE(SUM(ssi.score_value), 0)::NUMERIC AS total_score
          FROM score_sheets ss2
          JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss2.id
          WHERE ss2.period_id = p_period_id
          GROUP BY ss2.id
        ) ss ON ss.project_id = p.id
        WHERE p.period_id = p_period_id
        GROUP BY p.id, p.title, p.project_no
      ) r
    ),
    'juror_scores', (
      SELECT COALESCE(jsonb_agg(js), '[]'::jsonb)
      FROM (
        SELECT ss.juror_id, ss.project_id,
          COALESCE(SUM(ssi.score_value), 0)::NUMERIC AS total
        FROM score_sheets ss
        JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
        WHERE ss.period_id = p_period_id
        GROUP BY ss.juror_id, ss.project_id
      ) js
    ),
    'jurors', (
      SELECT COALESCE(jsonb_agg(ja ORDER BY ja.last_seen_at DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          jpa.juror_id, j.juror_name, jpa.last_seen_at, jpa.final_submitted_at,
          (SELECT COUNT(DISTINCT ss.project_id)::INT FROM score_sheets ss
           WHERE ss.juror_id = jpa.juror_id AND ss.period_id = p_period_id
          ) AS completed_projects
        FROM juror_period_auth jpa
        JOIN jurors j ON j.id = jpa.juror_id
        WHERE jpa.period_id = p_period_id
      ) ja
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_period_impact(UUID, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_submit_jury_feedback
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_submit_jury_feedback(
  p_period_id     UUID,
  p_session_token TEXT,
  p_rating        SMALLINT,
  p_comment       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_juror_id UUID;
BEGIN
  SELECT juror_id INTO v_juror_id
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    AND (is_blocked IS NULL OR is_blocked = FALSE);

  IF v_juror_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'invalid_session');
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'invalid_rating');
  END IF;

  INSERT INTO jury_feedback (period_id, juror_id, rating, comment)
  VALUES (p_period_id, v_juror_id, p_rating, NULLIF(TRIM(p_comment), ''))
  ON CONFLICT (period_id, juror_id)
  DO UPDATE SET
    rating     = EXCLUDED.rating,
    comment    = EXCLUDED.comment,
    created_at = now();

  RETURN jsonb_build_object('ok', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_submit_jury_feedback(UUID, TEXT, SMALLINT, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_get_public_feedback
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_public_feedback()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'avg_rating',    COALESCE(ROUND(AVG(jf.rating)::NUMERIC, 1), 0),
    'total_count',   COUNT(*)::INT,
    'testimonials', COALESCE(
      (SELECT jsonb_agg(t ORDER BY t.created_at DESC)
       FROM (
         SELECT jf2.rating, jf2.comment, j.juror_name, j.affiliation, jf2.created_at
         FROM jury_feedback jf2
         JOIN jurors j ON j.id = jf2.juror_id
         WHERE jf2.is_public = TRUE
           AND jf2.comment IS NOT NULL
           AND jf2.rating >= 4
         ORDER BY jf2.created_at DESC
         LIMIT 10
       ) t
      ),
      '[]'::jsonb
    )
  )
  FROM jury_feedback jf;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_public_feedback() TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- D) ADMIN JURY MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_juror_reset_pin (FINAL: 032 body + 033 search_path)
-- =============================================================================

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
  v_org_id   UUID;
  v_is_admin BOOLEAN;
  v_pin      TEXT;
  v_pin_hash TEXT;
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

  RETURN jsonb_build_object(
    'ok',             true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_reset_pin(UUID, UUID) TO authenticated;

-- =============================================================================
-- rpc_juror_toggle_edit_mode
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_juror_toggle_edit_mode(
  p_period_id         UUID,
  p_juror_id          UUID,
  p_enabled           BOOLEAN,
  p_reason            TEXT DEFAULT NULL,
  p_duration_minutes  INT  DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id        UUID;
  v_is_admin      BOOLEAN;
  v_period_locked BOOLEAN;
  v_auth_row      juror_period_auth%ROWTYPE;
  v_reason        TEXT;
  v_minutes       INT;
  v_expires_at    TIMESTAMPTZ;
BEGIN
  SELECT organization_id INTO v_org_id
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

  SELECT is_locked INTO v_period_locked FROM periods WHERE id = p_period_id;

  IF COALESCE(v_period_locked, false) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_locked')::JSON;
  END IF;

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  IF p_enabled THEN
    v_reason := btrim(COALESCE(p_reason, ''));
    IF char_length(v_reason) < 5 THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'reason_too_short')::JSON;
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
        'period_id', p_period_id, 'juror_id', p_juror_id,
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

GRANT EXECUTE ON FUNCTION public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT) TO authenticated;

-- =============================================================================
-- rpc_juror_unlock_pin
-- =============================================================================
-- Extends unlock so that clearing a lockout simultaneously generates a fresh
-- 4-digit PIN, writes pin_hash + pin_pending_reveal, and returns pin_plain_once
-- so the admin modal can show it once.

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
  SET failed_attempts    = 0,
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- D2) ORG ADMIN HELPERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- _assert_org_admin
-- =============================================================================
-- Raises 'unauthorized' if caller is not an org admin for p_org_id (or super-admin).

CREATE OR REPLACE FUNCTION _assert_org_admin(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = p_org_id OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION _assert_org_admin(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_find_user_by_email
-- =============================================================================
-- Used by the invite-org-admin Edge Function to check if a Supabase Auth user
-- already exists for the given email address.

CREATE OR REPLACE FUNCTION rpc_admin_find_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email_confirmed_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public AS $$
  SELECT u.id, u.email_confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

-- Restrict to service_role only — anon/authenticated must not call this
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- E) ADMIN ORG & TOKEN
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_admin_approve_application
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_approve_application(
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app_row  org_applications%ROWTYPE;
  v_user_id  UUID;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_app_row FROM org_applications WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'application_not_found')::JSON;
  END IF;

  IF v_app_row.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_status')::JSON;
  END IF;

  UPDATE org_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(v_app_row.contact_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id)
    VALUES (v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO memberships (user_id, organization_id, role, status)
    VALUES (v_user_id, v_app_row.organization_id, 'org_admin', 'active')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET status = 'active';
  END IF;

  PERFORM public._audit_write(
    v_app_row.organization_id,
    'application.approved',
    'org_applications',
    p_application_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'applicant_email', v_app_row.contact_email,
      'applicant_name', v_app_row.applicant_name,
      'membership_created', v_user_id IS NOT NULL
    ),
    jsonb_build_object(
      'before', jsonb_build_object('status', 'pending'),
      'after',  jsonb_build_object('status', 'approved')
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'membership_created', v_user_id IS NOT NULL
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_approve_application(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_reject_application
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_reject_application(
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

  SELECT * INTO v_app_row FROM org_applications WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'application_not_found')::JSON;
  END IF;

  IF v_app_row.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_status')::JSON;
  END IF;

  UPDATE org_applications
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  PERFORM public._audit_write(
    v_app_row.organization_id,
    'application.rejected',
    'org_applications',
    p_application_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'applicant_email', v_app_row.contact_email,
      'applicant_name', v_app_row.applicant_name
    ),
    jsonb_build_object(
      'before', jsonb_build_object('status', 'pending'),
      'after',  jsonb_build_object('status', 'rejected')
    )
  );

  RETURN jsonb_build_object('ok', true, 'application_id', p_application_id)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_reject_application(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_list_organizations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_list_organizations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(
    json_agg(
      jsonb_build_object(
        'id',                 o.id,
        'code',               o.code,
        'name',               o.name,
        'institution',        o.institution,
        'contact_email',      o.contact_email,
        'status',             o.status,
        'settings',           o.settings,
        'created_at',         o.created_at,
        'updated_at',         o.updated_at,
        'active_period_name', p_curr.name,
        'juror_count',        j_cnt.juror_count,
        'project_count',      pr_cnt.project_count,
        'memberships',        m_agg.data,
        'org_applications',   a_agg.data
      ) ORDER BY o.name
    ),
    '[]'::json
  )
  INTO v_result
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT name
    FROM periods
    WHERE organization_id = o.id AND is_current = true
    LIMIT 1
  ) p_curr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS juror_count
    FROM jurors j
    WHERE j.organization_id = o.id
  ) j_cnt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS project_count
    FROM periods cp
    JOIN projects pr ON pr.period_id = cp.id
    WHERE cp.organization_id = o.id AND cp.is_current = true
  ) pr_cnt ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              m.id,
          'user_id',         m.user_id,
          'organization_id', m.organization_id,
          'role',            m.role,
          'created_at',      m.created_at,
          'profiles', jsonb_build_object(
            'id',           p.id,
            'display_name', p.display_name,
            'email',        u.email
          )
        )
      ),
      '[]'::json
    ) AS data
    FROM memberships m
    LEFT JOIN profiles p ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = o.id
  ) m_agg ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              a.id,
          'organization_id', a.organization_id,
          'applicant_name',  a.applicant_name,
          'contact_email',   a.contact_email,
          'status',          a.status,
          'created_at',      a.created_at
        )
      ),
      '[]'::json
    ) AS data
    FROM org_applications a
    WHERE a.organization_id = o.id
  ) a_agg ON true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_list_organizations() TO authenticated;

-- =============================================================================
-- rpc_admin_generate_entry_token
-- =============================================================================
-- Uses security_policy->>'qrTtl' (12h/24h/48h/7d) to determine token TTL.
-- Serializes generation per period with FOR UPDATE to avoid parallel races.
-- Revokes any currently active token(s) before inserting the new one.

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

  -- Read qrTtl from security_policy; fall back to '24h'.
  SELECT COALESCE(policy->>'qrTtl', '24h')
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

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'token.generate',
    'entry_tokens',
    p_period_id,
    jsonb_build_object('period_id', p_period_id, 'expires_at', v_expires_at, 'ttl', v_ttl_str)
  );

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_generate_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_entry_token_revoke
-- =============================================================================

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

  UPDATE entry_tokens SET is_revoked = true WHERE id = p_token_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_entry_token_revoke(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- F) PUBLIC STATS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_landing_stats
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_landing_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'organizations', (SELECT count(*) FROM organizations),
    'evaluations',   (SELECT count(*) FROM scores_compat),
    'jurors',        (SELECT count(DISTINCT juror_id) FROM scores_compat),
    'projects',      (SELECT count(DISTINCT project_id) FROM scores_compat),
    'institutions',  (SELECT json_agg(DISTINCT institution ORDER BY institution)
                       FROM organizations
                       WHERE status = 'active')
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_landing_stats() TO anon, authenticated;

-- rpc_platform_metrics moved to 008_platform.sql

-- ═══════════════════════════════════════════════════════════════════════════════
-- G) PERIOD MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_period_freeze_snapshot
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_period_freeze_snapshot(p_period_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period          periods%ROWTYPE;
  v_criteria_count  INT;
  v_outcomes_count  INT;
BEGIN
  SELECT * INTO v_period FROM periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'period_not_found');
  END IF;

  IF v_period.framework_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'period_has_no_framework');
  END IF;

  IF v_period.snapshot_frozen_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_criteria_count FROM period_criteria WHERE period_id = p_period_id;
    SELECT COUNT(*) INTO v_outcomes_count FROM period_outcomes WHERE period_id = p_period_id;
    RETURN json_build_object('ok', true, 'already_frozen', true, 'criteria_count', v_criteria_count, 'outcomes_count', v_outcomes_count);
  END IF;

  INSERT INTO period_criteria (
    period_id, source_criterion_id, key, label, short_label,
    description, max_score, weight, color, rubric_bands, sort_order
  )
  SELECT p_period_id, fc.id, fc.key, fc.label, fc.short_label,
    fc.description, fc.max_score, fc.weight, fc.color, fc.rubric_bands, fc.sort_order
  FROM framework_criteria fc
  WHERE fc.framework_id = v_period.framework_id;

  GET DIAGNOSTICS v_criteria_count = ROW_COUNT;

  INSERT INTO period_outcomes (
    period_id, source_outcome_id, code, label, description, sort_order
  )
  SELECT p_period_id, fo.id, fo.code, fo.label, fo.description, fo.sort_order
  FROM framework_outcomes fo
  WHERE fo.framework_id = v_period.framework_id;

  GET DIAGNOSTICS v_outcomes_count = ROW_COUNT;

  INSERT INTO period_criterion_outcome_maps (
    period_id, period_criterion_id, period_outcome_id, coverage_type, weight
  )
  SELECT p_period_id, pc.id, po.id, fcom.coverage_type, fcom.weight
  FROM framework_criterion_outcome_maps fcom
  JOIN period_criteria pc ON pc.source_criterion_id = fcom.criterion_id AND pc.period_id = p_period_id
  JOIN period_outcomes po ON po.source_outcome_id = fcom.outcome_id AND po.period_id = p_period_id
  WHERE fcom.framework_id = v_period.framework_id;

  UPDATE periods SET snapshot_frozen_at = now() WHERE id = p_period_id;

  RETURN json_build_object('ok', true, 'already_frozen', false, 'criteria_count', v_criteria_count, 'outcomes_count', v_outcomes_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_period_freeze_snapshot(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- H) SYSTEM CONFIG
-- rpc_public_maintenance_status, rpc_admin_set_maintenance,
-- rpc_admin_cancel_maintenance moved to 008_platform.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_admin_get_maintenance
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row maintenance_mode%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  SELECT * INTO v_row FROM maintenance_mode WHERE id = 1;
  RETURN jsonb_build_object(
    'is_active', v_row.is_active, 'mode', v_row.mode,
    'start_time', v_row.start_time, 'end_time', v_row.end_time,
    'message', v_row.message, 'affected_org_ids', v_row.affected_org_ids,
    'notify_admins', v_row.notify_admins, 'updated_at', v_row.updated_at
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_maintenance() TO authenticated;

-- =============================================================================
-- Security Policy RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_security_policy()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row security_policy%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  SELECT * INTO v_row FROM security_policy WHERE id = 1;
  RETURN (v_row.policy || jsonb_build_object('updated_at', v_row.updated_at))::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_security_policy() TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_security_policy(p_policy JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  UPDATE security_policy
  SET policy = policy || p_policy, updated_by = auth.uid(), updated_at = now()
  WHERE id = 1;
  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_security_policy(JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- H2) AUDIT WRITE HELPERS + PREMIUM ATOMIC RPCs
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- _audit_write
-- =============================================================================
-- Extracts IP/UA from PostgREST GUC headers, resolves actor_name from profiles
-- (with fallback to details fields for anon/juror flows), and inserts an audit row.

CREATE OR REPLACE FUNCTION public._audit_write(
  p_org_id          UUID,
  p_action          TEXT,
  p_resource_type   TEXT,
  p_resource_id     UUID,
  p_category        audit_category,
  p_severity        audit_severity,
  p_details         JSONB,
  p_diff            JSONB                DEFAULT NULL,
  p_actor_type      audit_actor_type     DEFAULT 'admin'::audit_actor_type,
  p_correlation_id  UUID                 DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_name         TEXT;
  v_actor_name_profile TEXT;
  v_ip                 INET;
  v_ua                 TEXT;
  v_req_headers        JSON;
  v_ip_raw             TEXT;
BEGIN
  -- For anon/juror flows, allow actor_name from details fallback.
  v_actor_name := NULLIF(
    trim(
      COALESCE(
        p_details->>'actor_name',
        p_details->>'juror_name',
        p_details->>'email',
        p_details->>'applicant_email',
        ''
      )
    ),
    ''
  );

  -- Prefer profile display_name when authenticated.
  IF auth.uid() IS NOT NULL THEN
    SELECT display_name INTO v_actor_name_profile
    FROM profiles
    WHERE id = auth.uid();
    v_actor_name := COALESCE(NULLIF(trim(v_actor_name_profile), ''), v_actor_name);
  END IF;

  -- PostgREST request headers (missing or non-JSON GUC must not abort caller).
  BEGIN
    v_req_headers := current_setting('request.headers', true)::JSON;
  EXCEPTION WHEN OTHERS THEN
    v_req_headers := NULL;
  END;

  IF v_req_headers IS NOT NULL THEN
    v_ua := NULLIF(v_req_headers->>'user-agent', '');
    v_ip_raw := NULLIF(trim(split_part(COALESCE(v_req_headers->>'x-forwarded-for', ''), ',', 1)), '');
    IF v_ip_raw IS NULL THEN
      v_ip_raw := NULLIF(trim(COALESCE(v_req_headers->>'x-real-ip', '')), '');
    END IF;
    IF v_ip_raw IS NOT NULL THEN
      BEGIN
        v_ip := v_ip_raw::INET;
      EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
      END;
    END IF;
  END IF;

  INSERT INTO audit_logs (
    organization_id, user_id, action, resource_type, resource_id,
    category, severity, actor_type, actor_name,
    ip_address, user_agent, details, diff, correlation_id
  ) VALUES (
    p_org_id, auth.uid(), p_action, p_resource_type, p_resource_id,
    p_category, p_severity, p_actor_type, v_actor_name,
    v_ip, v_ua, p_details, p_diff, p_correlation_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._audit_write(
  UUID, TEXT, TEXT, UUID, audit_category, audit_severity, JSONB, JSONB, audit_actor_type, UUID
) TO authenticated;

-- =============================================================================
-- rpc_admin_write_audit_event
-- =============================================================================
-- Server enforces category + severity + actor_type; client cannot override.
-- IP/UA extracted from PostgREST headers with event-field fallback.

CREATE OR REPLACE FUNCTION public.rpc_admin_write_audit_event(
  p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id        UUID;
  v_action        TEXT;
  v_category      audit_category;
  v_severity      audit_severity;
  v_actor_type    audit_actor_type;
  v_resource_type TEXT;
  v_resource_id   UUID;
  v_details       JSONB;
  v_diff          JSONB;
  v_ip            INET;
  v_ua            TEXT;
  v_session_id    UUID;
  v_corr_id       UUID;
  v_actor_name    TEXT;
  v_req_headers   JSON;
  v_ip_raw        TEXT;
BEGIN
  -- Caller must be an authenticated admin
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthenticated');
  END IF;

  v_action        := p_event->>'action';
  v_resource_type := p_event->>'resourceType';
  v_details       := COALESCE((p_event->'details')::JSONB, '{}'::JSONB);
  v_diff          := (p_event->'diff')::JSONB;

  -- Resolve org from details or explicit field
  v_org_id := CASE
    WHEN p_event->>'organizationId' IS NOT NULL
      THEN (p_event->>'organizationId')::UUID
    WHEN v_details->>'organizationId' IS NOT NULL
      THEN (v_details->>'organizationId')::UUID
    ELSE NULL
  END;

  -- Verify caller belongs to that org (or is super-admin)
  IF v_org_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND (organization_id = v_org_id OR organization_id IS NULL)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized');
    END IF;
  END IF;

  IF p_event->>'resourceId' IS NOT NULL THEN
    v_resource_id := (p_event->>'resourceId')::UUID;
  END IF;

  -- ── IP / UA extraction ───────────────────────────────────────────────────
  BEGIN
    v_req_headers := current_setting('request.headers', true)::JSON;
  EXCEPTION WHEN OTHERS THEN
    v_req_headers := NULL;
  END;

  v_ua := COALESCE(
    NULLIF(p_event->>'ua', ''),
    NULLIF(v_req_headers->>'user-agent', '')
  );

  IF p_event->>'ip' IS NOT NULL AND p_event->>'ip' <> '' THEN
    BEGIN
      v_ip := (p_event->>'ip')::INET;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  IF v_ip IS NULL AND v_req_headers IS NOT NULL THEN
    v_ip_raw := NULLIF(trim(split_part(v_req_headers->>'x-forwarded-for', ',', 1)), '');
    IF v_ip_raw IS NULL THEN
      v_ip_raw := NULLIF(trim(COALESCE(v_req_headers->>'x-real-ip', '')), '');
    END IF;
    IF v_ip_raw IS NOT NULL THEN
      BEGIN
        v_ip := v_ip_raw::INET;
      EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
      END;
    END IF;
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  v_session_id := (p_event->>'sessionId')::UUID;
  v_corr_id    := (p_event->>'correlationId')::UUID;
  v_actor_name := COALESCE(v_details->>'actor_name', v_details->>'adminName');

  -- ── Category ─────────────────────────────────────────────────────────────
  v_category := CASE
    WHEN v_action IN (
      'admin.login', 'admin.logout', 'admin.session_expired',
      'auth.admin.login.success', 'auth.admin.login.failure',
      'auth.admin.password.changed', 'auth.admin.password.reset.requested'
    ) THEN 'auth'

    WHEN v_action IN (
      'admin.create', 'admin.updated', 'admin.role_granted', 'admin.role_revoked'
    ) THEN 'access'

    WHEN v_action IN (
      'period.create', 'period.update', 'period.delete',
      'period.set_current', 'period.lock', 'period.unlock',
      'periods.insert', 'periods.update', 'periods.delete',
      'criteria.save', 'criteria.update',
      'outcome.create', 'outcome.update', 'outcome.delete',
      'outcome.created', 'outcome.updated', 'outcome.deleted',
      'organization.status_changed',
      'framework.create', 'framework.update', 'framework.delete',
      'config.outcome.updated', 'config.outcome.deleted'
    ) THEN 'config'

    WHEN v_action LIKE 'export.%'
      OR v_action LIKE 'notification.%'
      OR v_action LIKE 'backup.%'
      OR v_action LIKE 'token.%'
      OR v_action LIKE 'security.%'
    THEN 'security'

    ELSE 'data'
  END::audit_category;

  -- ── Severity ─────────────────────────────────────────────────────────────
  v_severity := CASE
    WHEN v_action IN (
      'period.lock', 'period.unlock',
      'organization.status_changed',
      'backup.deleted',
      'security.entry_token.revoked',
      'security.anomaly.detected'
    ) THEN 'high'

    WHEN v_action IN (
      'admin.create',
      'pin.reset',
      'juror.pin_unlocked', 'juror.edit_mode_enabled',
      'period.set_current',
      'snapshot.freeze',
      'application.approved', 'application.rejected',
      'token.revoke',
      'export.audit',
      'backup.downloaded',
      'criteria.save', 'criteria.update',
      'outcome.create', 'outcome.update', 'outcome.delete',
      'outcome.created', 'outcome.updated', 'outcome.deleted',
      'config.outcome.updated',
      'auth.admin.password.changed',
      'data.juror.edit_mode.force_closed'
    ) THEN 'medium'

    WHEN v_action IN (
      'admin.updated',
      'juror.edit_mode_closed_on_resubmit',
      'token.generate',
      'export.scores', 'export.rankings', 'export.heatmap',
      'export.analytics', 'export.backup',
      'backup.created',
      'config.outcome.deleted',
      'auth.admin.password.reset.requested',
      'notification.entry_token', 'notification.juror_pin',
      'notification.export_report', 'notification.admin_invite',
      'notification.application'
    ) THEN 'low'

    ELSE 'info'
  END::audit_severity;

  -- ── Actor type ───────────────────────────────────────────────────────────
  v_actor_type := CASE
    WHEN v_action IN (
      'evaluation.complete', 'score.update', 'data.score.submitted'
    ) THEN 'juror'

    WHEN v_action IN (
      'snapshot.freeze',
      'juror.pin_locked', 'data.juror.pin.locked',
      'juror.edit_mode_closed_on_resubmit', 'data.juror.edit_mode.closed',
      'security.anomaly.detected'
    ) THEN 'system'

    ELSE 'admin'
  END::audit_actor_type;
  -- ─────────────────────────────────────────────────────────────────────────

  INSERT INTO audit_logs (
    organization_id, user_id, action, resource_type, resource_id,
    category, severity, actor_type, actor_name,
    ip_address, user_agent, session_id, correlation_id,
    details, diff
  ) VALUES (
    v_org_id, auth.uid(), v_action, v_resource_type, v_resource_id,
    v_category, v_severity, v_actor_type, v_actor_name,
    v_ip, v_ua, v_session_id, v_corr_id,
    v_details, v_diff
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_write_audit_event(JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_log_period_lock
-- =============================================================================
-- Called by admin panel when locking/unlocking an evaluation period.
-- Validates action, asserts org-admin, delegates to _audit_write (category='config').

CREATE OR REPLACE FUNCTION public.rpc_admin_log_period_lock(
  p_period_id UUID,
  p_action    TEXT,   -- 'period.lock' | 'period.unlock'
  p_ctx       JSONB   -- {ip, ua, session_id}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_period_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthenticated');
  END IF;

  SELECT organization_id, name INTO v_org_id, v_period_name
  FROM periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found');
  END IF;

  IF p_action NOT IN ('period.lock', 'period.unlock') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_action');
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  PERFORM public._audit_write(
    v_org_id,
    p_action,
    'periods',
    p_period_id,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'period_id',  p_period_id,
      'legacy_ctx', COALESCE(p_ctx, '{}'::jsonb)
    ),
    NULL::JSONB,
    'admin'::audit_actor_type
  );

  RETURN jsonb_build_object('ok', true, 'periodName', v_period_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_log_period_lock(UUID, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_set_current_period
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_current_period(
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id       UUID;
  v_period_name  TEXT;
  v_activated_at TIMESTAMPTZ;
  v_row          JSONB;
BEGIN
  SELECT organization_id, name, activated_at
    INTO v_org_id, v_period_name, v_activated_at
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  -- Unset all current flags for this org
  UPDATE periods
  SET is_current = false
  WHERE organization_id = v_org_id AND is_current = true;

  -- Set target as current; stamp activated_at on first activation
  UPDATE periods
  SET is_current = true,
      activated_at = COALESCE(activated_at, now())
  WHERE id = p_period_id
  RETURNING to_jsonb(periods.*) INTO v_row;

  PERFORM public._audit_write(
    v_org_id,
    'period.set_current',
    'periods',
    p_period_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'activated_at', COALESCE(v_activated_at, now())
    )
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_current_period(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_set_period_lock
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_period_lock(
  p_period_id UUID,
  p_locked    BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_period_name TEXT;
  v_prev_locked BOOLEAN;
BEGIN
  SELECT organization_id, name, is_locked
    INTO v_org_id, v_period_name, v_prev_locked
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE periods
  SET is_locked = COALESCE(p_locked, false)
  WHERE id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    CASE WHEN p_locked THEN 'period.lock' ELSE 'period.unlock' END,
    'periods',
    p_period_id,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'period_id', p_period_id,
      'previous_locked', v_prev_locked,
      'new_locked', COALESCE(p_locked, false)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'period_id', p_period_id,
    'is_locked', COALESCE(p_locked, false),
    'periodName', v_period_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_period_lock(UUID, BOOLEAN) TO authenticated;

-- =============================================================================
-- rpc_admin_save_period_criteria
-- =============================================================================
-- p_criteria is a JSONB array where each element has:
--   { key, label, shortLabel, color, max, blurb, outcomes: [code,...], rubric: [...] }

CREATE OR REPLACE FUNCTION public.rpc_admin_save_period_criteria(
  p_period_id UUID,
  p_criteria  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id    UUID;
  v_total_max NUMERIC := 0;
  v_before    JSONB := '{}'::JSONB;
  v_after     JSONB := '{}'::JSONB;
  v_count     INT := 0;
  v_inserted  JSONB;
  v_elem      JSONB;
  v_key       TEXT;
  v_max       NUMERIC;
  v_crit_id   UUID;
  v_outcome_id UUID;
  v_code      TEXT;
BEGIN
  IF p_period_id IS NULL THEN
    RAISE EXCEPTION 'period_id_required';
  END IF;
  IF jsonb_typeof(p_criteria) <> 'array' THEN
    RAISE EXCEPTION 'criteria_must_be_array';
  END IF;

  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  -- Before snapshot: {key}_max_score map
  SELECT COALESCE(
    jsonb_object_agg(pc.key || '_max_score', pc.max_score),
    '{}'::JSONB
  )
  INTO v_before
  FROM period_criteria pc
  WHERE pc.period_id = p_period_id;

  -- Total max for weight calculation
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_criteria) LOOP
    v_total_max := v_total_max + COALESCE((v_elem->>'max')::NUMERIC, 0);
  END LOOP;

  -- Delete existing maps (FK before criteria delete)
  DELETE FROM period_criterion_outcome_maps WHERE period_id = p_period_id;
  DELETE FROM period_criteria WHERE period_id = p_period_id;

  -- Insert new criteria
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_criteria) LOOP
    v_key := v_elem->>'key';
    v_max := COALESCE((v_elem->>'max')::NUMERIC, 0);

    INSERT INTO period_criteria (
      period_id, key, label, short_label, description,
      max_score, weight, color, rubric_bands, sort_order
    ) VALUES (
      p_period_id,
      v_key,
      v_elem->>'label',
      COALESCE(v_elem->>'shortLabel', v_elem->>'label'),
      v_elem->>'blurb',
      v_max,
      CASE WHEN v_total_max > 0 THEN (v_max / v_total_max) * 100 ELSE 0 END,
      v_elem->>'color',
      CASE WHEN jsonb_typeof(v_elem->'rubric') = 'array' THEN v_elem->'rubric' ELSE NULL END,
      v_count
    )
    RETURNING id INTO v_crit_id;

    v_after := v_after || jsonb_build_object(v_key || '_max_score', v_max);
    v_count := v_count + 1;

    -- Insert outcome maps for this criterion
    IF jsonb_typeof(v_elem->'outcomes') = 'array' THEN
      FOR v_code IN SELECT value::TEXT FROM jsonb_array_elements_text(v_elem->'outcomes') LOOP
        SELECT id INTO v_outcome_id
        FROM period_outcomes
        WHERE period_id = p_period_id AND code = v_code
        LIMIT 1;

        IF v_outcome_id IS NOT NULL THEN
          INSERT INTO period_criterion_outcome_maps (
            period_id, period_criterion_id, period_outcome_id
          ) VALUES (
            p_period_id, v_crit_id, v_outcome_id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Collect the inserted rows for the return value
  SELECT jsonb_agg(to_jsonb(pc.*) ORDER BY pc.sort_order)
  INTO v_inserted
  FROM period_criteria pc
  WHERE pc.period_id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    'criteria.save',
    'periods',
    p_period_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object('criteriaCount', v_count),
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN COALESCE(v_inserted, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_save_period_criteria(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_create_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_create_framework_outcome(
  p_framework_id UUID,
  p_code         TEXT,
  p_label        TEXT,
  p_description  TEXT DEFAULT NULL,
  p_sort_order   INT  DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id  UUID;
  v_row     JSONB;
  v_new_id  UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM frameworks WHERE id = p_framework_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'framework_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order)
  VALUES (p_framework_id, p_code, p_label, p_description, p_sort_order)
  RETURNING id, to_jsonb(framework_outcomes.*) INTO v_new_id, v_row;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.created',
    'framework_outcomes',
    v_new_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object('outcome_code', p_code, 'outcome_label', p_label, 'framework_id', p_framework_id),
    jsonb_build_object('after', v_row)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_create_framework_outcome(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;

-- =============================================================================
-- rpc_admin_update_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_framework_outcome(
  p_outcome_id UUID,
  p_patch      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
  v_after  JSONB;
BEGIN
  SELECT f.organization_id, to_jsonb(fo.*)
    INTO v_org_id, v_before
  FROM framework_outcomes fo
  JOIN frameworks f ON f.id = fo.framework_id
  WHERE fo.id = p_outcome_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'outcome_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE framework_outcomes
  SET code        = COALESCE(p_patch->>'code', code),
      label       = COALESCE(p_patch->>'label', label),
      description = COALESCE(p_patch->>'description', description),
      sort_order  = COALESCE((p_patch->>'sort_order')::INT, sort_order)
  WHERE id = p_outcome_id
  RETURNING to_jsonb(framework_outcomes.*) INTO v_after;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.updated',
    'framework_outcomes',
    p_outcome_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'outcome_code', v_after->>'code',
      'outcome_label', v_after->>'label'
    ),
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN v_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_framework_outcome(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_delete_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_framework_outcome(
  p_outcome_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
BEGIN
  SELECT f.organization_id, to_jsonb(fo.*)
    INTO v_org_id, v_before
  FROM framework_outcomes fo
  JOIN frameworks f ON f.id = fo.framework_id
  WHERE fo.id = p_outcome_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'outcome_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  DELETE FROM framework_outcomes WHERE id = p_outcome_id;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.deleted',
    'framework_outcomes',
    p_outcome_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'outcome_code', v_before->>'code',
      'outcome_label', v_before->>'label'
    ),
    jsonb_build_object('before', v_before)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_framework_outcome(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_update_organization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_organization(
  p_org_id  UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev_status TEXT;
  v_prev_name   TEXT;
  v_prev_code   TEXT;
  v_row         JSONB;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id_required';
  END IF;

  PERFORM public._assert_org_admin(p_org_id);

  SELECT status, name, code
    INTO v_prev_status, v_prev_name, v_prev_code
  FROM organizations WHERE id = p_org_id;

  IF v_prev_status IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  UPDATE organizations
  SET name          = COALESCE(p_updates->>'name', name),
      code          = COALESCE(p_updates->>'code', code),
      institution   = CASE
                        WHEN p_updates ? 'institution' THEN p_updates->>'institution'
                        ELSE institution
                      END,
      contact_email = CASE
                        WHEN p_updates ? 'contact_email' THEN p_updates->>'contact_email'
                        ELSE contact_email
                      END,
      status        = COALESCE(p_updates->>'status', status)
  WHERE id = p_org_id
  RETURNING to_jsonb(organizations.*) INTO v_row;

  -- Audit: status change gets a dedicated high-severity event with diff
  IF p_updates ? 'status' AND (p_updates->>'status') IS DISTINCT FROM v_prev_status THEN
    PERFORM public._audit_write(
      p_org_id,
      'organization.status_changed',
      'organizations',
      p_org_id,
      'config'::audit_category,
      'high'::audit_severity,
      jsonb_build_object(
        'previousStatus', v_prev_status,
        'newStatus', v_row->>'status',
        'organizationCode', v_row->>'code',
        'reason', p_updates->>'reason'
      ),
      jsonb_build_object(
        'before', jsonb_build_object('status', v_prev_status),
        'after',  jsonb_build_object('status', v_row->>'status')
      )
    );
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_organization(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_update_member_profile
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_member_profile(
  p_user_id         UUID,
  p_display_name    TEXT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_new_name TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id_required';
  END IF;

  PERFORM public._assert_org_admin(p_organization_id);

  v_new_name := NULLIF(trim(COALESCE(p_display_name, '')), '');

  UPDATE profiles
  SET display_name = v_new_name
  WHERE id = p_user_id;

  PERFORM public._audit_write(
    p_organization_id,
    'admin.updated',
    'memberships',
    p_user_id,
    'access'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'adminName', v_new_name,
      'organizationId', p_organization_id
    )
  );

  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id, 'display_name', v_new_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_member_profile(UUID, TEXT, UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_revoke_entry_token
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_revoke_entry_token(
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id           UUID;
  v_revoked_count    INT;
  v_first_revoked_id UUID;
  v_active_count     INT;
  v_now              TIMESTAMPTZ := now();
BEGIN
  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  WITH revoked AS (
    UPDATE entry_tokens
    SET is_revoked = true
    WHERE period_id = p_period_id
      AND is_revoked = false
    RETURNING id
  )
  SELECT COUNT(*), MIN(id) INTO v_revoked_count, v_first_revoked_id FROM revoked;

  -- Count active sessions for this period (session_expires_at in the future or null)
  SELECT COUNT(*) INTO v_active_count
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash IS NOT NULL
    AND (session_expires_at IS NULL OR session_expires_at > v_now);

  IF v_revoked_count > 0 THEN
    PERFORM public._audit_write(
      v_org_id,
      'security.entry_token.revoked',
      'entry_tokens',
      v_first_revoked_id,
      'security'::audit_category,
      'high'::audit_severity,
      jsonb_build_object(
        'period_id', p_period_id,
        'revoked_count', v_revoked_count,
        'active_juror_count', v_active_count
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'revoked_count', v_revoked_count,
    'active_juror_count', v_active_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_force_close_juror_edit_mode
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_force_close_juror_edit_mode(
  p_juror_id  UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_juror_name  TEXT;
  v_period_name TEXT;
BEGIN
  IF p_juror_id IS NULL OR p_period_id IS NULL THEN
    RAISE EXCEPTION 'juror_id_and_period_id_required';
  END IF;

  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'juror_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  SELECT name INTO v_period_name FROM periods WHERE id = p_period_id;

  UPDATE juror_period_auth
  SET edit_enabled       = false,
      session_token_hash = NULL,
      edit_reason        = NULL,
      edit_expires_at    = NULL
  WHERE juror_id = p_juror_id
    AND period_id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    'data.juror.edit_mode.force_closed',
    'juror_period_auth',
    p_juror_id,
    'data'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'juror_name', v_juror_name,
      'juror_id', p_juror_id,
      'period_id', p_period_id,
      'period_name', v_period_name,
      'close_source', 'admin_force',
      'closed_at', now()
    )
  );

  RETURN jsonb_build_object('ok', true, 'juror_id', p_juror_id, 'period_id', p_period_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_force_close_juror_edit_mode(UUID, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- I) PUBLIC AUTH HELPERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_check_email_available
-- Public RPC callable by anon. Uses SECURITY DEFINER to access auth.users.
-- Returns { available: bool, reason?: 'email_already_registered' | 'application_already_pending' }
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_check_email_available(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email      TEXT;
  v_in_auth    BOOLEAN;
  v_in_pending BOOLEAN;
BEGIN
  v_email := lower(trim(p_email));

  IF v_email = '' OR v_email IS NULL THEN
    RETURN jsonb_build_object('available', false, 'reason', 'email_required');
  END IF;

  -- Check auth.users (SECURITY DEFINER allows access to auth schema)
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE lower(email) = v_email
  ) INTO v_in_auth;

  IF v_in_auth THEN
    RETURN jsonb_build_object('available', false, 'reason', 'email_already_registered');
  END IF;

  -- Check for a pending application with the same email
  SELECT EXISTS(
    SELECT 1 FROM org_applications
    WHERE lower(trim(contact_email)) = v_email
      AND status = 'pending'
  ) INTO v_in_pending;

  IF v_in_pending THEN
    RETURN jsonb_build_object('available', false, 'reason', 'application_already_pending');
  END IF;

  RETURN jsonb_build_object('available', true);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_check_email_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_check_email_available(TEXT) TO authenticated;

-- =============================================================================
-- rpc_public_auth_flags
-- =============================================================================
-- Returns only the three public-facing auth toggles from security_policy.
-- Callable by anon (login screen uses this to hide disabled auth methods).

CREATE OR REPLACE FUNCTION public.rpc_public_auth_flags()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy JSONB;
BEGIN
  SELECT policy INTO v_policy FROM security_policy WHERE id = 1;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'googleOAuth',   true,
      'emailPassword', true,
      'rememberMe',    true
    );
  END IF;
  RETURN json_build_object(
    'googleOAuth',   COALESCE((v_policy->>'googleOAuth')::BOOLEAN,   true),
    'emailPassword', COALESCE((v_policy->>'emailPassword')::BOOLEAN, true),
    'rememberMe',    COALESCE((v_policy->>'rememberMe')::BOOLEAN,    true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_auth_flags() TO anon, authenticated;
