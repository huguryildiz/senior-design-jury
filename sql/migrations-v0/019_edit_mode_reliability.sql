-- 019: Edit mode reliability (time-limited + audit-backed)
--
-- Goals:
-- 1) Admin enable-editing flow is enforced by DB via rpc_juror_toggle_edit_mode_v2.
-- 2) Juror writes after final submission require an active edit window.
-- 3) Final resubmission closes edit window fields.
-- 4) Explicit audit rows are written for edit-mode enable and close-on-resubmit.

-- =============================================================================
-- Admin RPC: rpc_juror_toggle_edit_mode_v2
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode_v2(UUID, UUID, BOOLEAN, TEXT, INT);

CREATE OR REPLACE FUNCTION public.rpc_juror_toggle_edit_mode_v2(
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

  SELECT is_locked INTO v_period_locked
  FROM periods
  WHERE id = p_period_id;

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
      v_org_id,
      auth.uid(),
      'juror.edit_mode_enabled',
      'juror_period_auth',
      p_juror_id,
      jsonb_build_object(
        'period_id',        p_period_id,
        'juror_id',         p_juror_id,
        'reason',           v_reason,
        'duration_minutes', v_minutes,
        'expires_at',       v_expires_at
      )
    );

    RETURN jsonb_build_object('ok', true, 'edit_expires_at', v_expires_at)::JSON;
  END IF;

  UPDATE juror_period_auth
  SET edit_enabled    = false,
      edit_reason     = NULL,
      edit_expires_at = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_toggle_edit_mode_v2(UUID, UUID, BOOLEAN, TEXT, INT) TO authenticated;

-- =============================================================================
-- Jury RPC: rpc_jury_upsert_score (enforce active edit window after final)
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

  -- If juror already finalized, writes are only allowed while an active edit
  -- window exists.
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

-- =============================================================================
-- Jury RPC: rpc_jury_finalize_submission (close edit window + audit)
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
  v_org_id       UUID;
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

  IF (
    COALESCE(v_auth_row.edit_enabled, false)
    OR v_auth_row.edit_reason IS NOT NULL
    OR v_auth_row.edit_expires_at IS NOT NULL
  ) THEN
    SELECT organization_id INTO v_org_id
    FROM jurors
    WHERE id = p_juror_id;

    IF v_org_id IS NOT NULL THEN
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

-- Keep grants explicit in this migration for safety.
GRANT EXECUTE ON FUNCTION public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT) TO anon, authenticated;
