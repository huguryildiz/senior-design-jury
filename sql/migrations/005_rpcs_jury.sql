-- VERA v1 — Jury RPC Functions (jury auth, scoring, results, feedback)
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

