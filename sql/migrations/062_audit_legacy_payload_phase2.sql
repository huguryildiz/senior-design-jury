-- sql/migrations/062_audit_legacy_payload_phase2.sql
-- Phase 2 (standardization): bring remaining legacy audit INSERT paths onto
-- _audit_write so category/severity/actor/ip/ua/correlation handling is
-- consistent across RPCs.
--
-- Scope:
--   1) _audit_write actor_name fallback from details (for anon/juror flows)
--   2) rpc_write_auth_failure_event -> _audit_write
--   3) rpc_jury_authenticate first-auth event -> _audit_write
--   4) rpc_jury_finalize_submission events -> _audit_write
--   5) rpc_admin_log_period_lock -> _audit_write + org-admin assertion

-- =============================================================================
-- 1) _audit_write: preserve signature, enrich actor_name fallback
-- =============================================================================
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
-- 2) Anonymous auth failure logging -> _audit_write
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_write_auth_failure_event(
  p_email  TEXT,
  p_method TEXT DEFAULT 'password'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_failure_count INT;
  v_severity      audit_severity;
  v_email         TEXT;
BEGIN
  v_email := NULLIF(trim(COALESCE(p_email, '')), '');
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_email');
  END IF;

  -- Rate limit: count failures for this email in the last 5 minutes.
  SELECT COUNT(*) INTO v_failure_count
  FROM audit_logs
  WHERE action     = 'auth.admin.login.failure'
    AND actor_name = v_email
    AND created_at > NOW() - INTERVAL '5 minutes';

  IF v_failure_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'rate_limited');
  END IF;

  v_severity := CASE
    WHEN v_failure_count >= 4 THEN 'high'
    WHEN v_failure_count >= 2 THEN 'medium'
    ELSE                           'low'
  END::audit_severity;

  PERFORM public._audit_write(
    NULL,
    'auth.admin.login.failure',
    'auth_sessions',
    NULL,
    'auth'::audit_category,
    v_severity,
    jsonb_build_object(
      'actor_name', v_email,
      'email',      v_email,
      'method',     COALESCE(p_method, 'password'),
      'attempt',    v_failure_count + 1
    ),
    NULL::JSONB,
    'anonymous'::audit_actor_type
  );

  RETURN jsonb_build_object('ok', true, 'severity', v_severity::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_write_auth_failure_event(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_write_auth_failure_event(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 3) Jury authenticate first-auth event -> _audit_write
-- =============================================================================
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

  -- Admin reset the PIN -> show it exactly once, then clear.
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
-- 4) Jury finalize submission events -> _audit_write
-- =============================================================================
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
-- 5) Legacy period lock logger -> _audit_write + org assertion
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_log_period_lock(
  p_period_id UUID,
  p_action    TEXT,
  p_ctx       JSONB
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
