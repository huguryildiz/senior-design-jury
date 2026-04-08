-- VERA v1 — All RPC Functions (FINAL versions)
-- Depends on: 002 (tables), 003 (helpers), 004 (RLS)
--
-- All crypto functions use SET search_path = public, extensions
-- where pgcrypto (crypt, gen_salt, digest, gen_random_bytes) is needed.
--
-- Sources: each RPC header notes which migration provided the FINAL version.

-- ═══════════════════════════════════════════════════════════════════════════════
-- A) JURY AUTH & TOKEN
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_jury_authenticate (FINAL: 032 — 5 params, email, pin_pending_reveal)
-- =============================================================================
-- Find-or-create juror → check lockout → reveal pending PIN → issue new PIN.

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

  -- Admin reset the PIN → show it exactly once, then clear
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

-- =============================================================================
-- rpc_jury_verify_pin (FINAL: 029_fix — 5 attempts, 30min lockout, SHA-256)
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
  v_max_attempts    INT := 5;
  v_new_failed      INT;
BEGIN
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
      'session_token', v_session_token
    )::JSON;
  ELSE
    v_new_failed := v_auth_row.failed_attempts + 1;

    UPDATE juror_period_auth
    SET failed_attempts = v_new_failed,
        locked_until    = CASE WHEN v_new_failed >= v_max_attempts
                               THEN v_now + interval '30 minutes' ELSE NULL END,
        locked_at       = CASE WHEN v_new_failed >= v_max_attempts
                               THEN v_now ELSE locked_at END
    WHERE juror_id = v_juror_id AND period_id = p_period_id;

    IF v_new_failed >= v_max_attempts THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'pin_locked',
        'failed_attempts', v_new_failed,
        'locked_until', v_now + interval '30 minutes'
      )::JSON;
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'invalid_pin',
      'failed_attempts', v_new_failed
    )::JSON;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_jury_validate_entry_token (FINAL: 009 — SHA-256 hash lookup)
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- B) JURY SCORING
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_jury_upsert_score (FINAL: 019 — edit window enforcement + extensions)
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
-- rpc_jury_finalize_submission (FINAL: 019 — close edit window + audit)
-- =============================================================================

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

  -- Audit: if edit window was open, log the close-on-resubmit
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

GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_jury_get_scores (FINAL: 034 — session token auth, RLS bypass)
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
-- rpc_jury_project_rankings (FINAL: 028)
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
-- rpc_get_period_impact (FINAL: 021 — aggregate scoring data for jury)
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
-- rpc_submit_jury_feedback (FINAL: 023)
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
-- rpc_get_public_feedback (FINAL: 023)
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
-- rpc_juror_toggle_edit_mode_v2 (FINAL: 019 — minute-based, audit)
-- =============================================================================

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

GRANT EXECUTE ON FUNCTION public.rpc_juror_toggle_edit_mode_v2(UUID, UUID, BOOLEAN, TEXT, INT) TO authenticated;

-- =============================================================================
-- rpc_juror_unlock_pin (FINAL: 007)
-- =============================================================================

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
  SELECT organization_id INTO v_org_id FROM jurors WHERE id = p_juror_id;

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

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_unlock_pin(UUID, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- E) ADMIN ORG & TOKEN
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_admin_approve_application (FINAL: 007)
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
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object('ok', true, 'application_id', p_application_id)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_approve_application(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_list_organizations (FINAL: 013/030 — subtitle, _assert_super_admin)
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
        'id',               o.id,
        'code',             o.code,
        'name',             o.name,
        'subtitle',         o.subtitle,
        'contact_email',    o.contact_email,
        'status',           o.status,
        'settings',         o.settings,
        'created_at',       o.created_at,
        'updated_at',       o.updated_at,
        'memberships',      m_agg.data,
        'org_applications', a_agg.data
      ) ORDER BY o.name
    ),
    '[]'::json
  )
  INTO v_result
  FROM organizations o
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
-- rpc_admin_generate_entry_token (FINAL: 026 — server-side token gen)
-- =============================================================================

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
BEGIN
  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
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

  v_token      := gen_random_uuid()::TEXT;
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + INTERVAL '24 hours';

  INSERT INTO entry_tokens (period_id, token_hash, token_plain, expires_at)
  VALUES (p_period_id, v_token_hash, v_token, v_expires_at);

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_generate_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_entry_token_revoke (FINAL: 007 — backward compat)
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
-- rpc_landing_stats (FINAL: 030 — uses subtitle)
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
    'institutions',  (SELECT json_agg(DISTINCT subtitle ORDER BY subtitle)
                       FROM organizations
                       WHERE status = 'active')
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_landing_stats() TO anon, authenticated;

-- =============================================================================
-- rpc_platform_metrics (FINAL: 015 — service role only)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_size_bytes      bigint;
  v_db_size_pretty     text;
  v_active_connections bigint;
  v_audit_24h          bigint;
  v_total_orgs         bigint;
  v_total_jurors       bigint;
BEGIN
  SELECT pg_database_size(current_database()) INTO v_db_size_bytes;
  SELECT pg_size_pretty(v_db_size_bytes) INTO v_db_size_pretty;
  SELECT count(*) INTO v_active_connections FROM pg_stat_activity WHERE state = 'active';
  SELECT count(*) INTO v_audit_24h FROM audit_logs WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO v_total_orgs FROM organizations;
  SELECT count(*) INTO v_total_jurors FROM jurors;

  RETURN jsonb_build_object(
    'db_size_bytes',       v_db_size_bytes,
    'db_size_pretty',      v_db_size_pretty,
    'active_connections',  v_active_connections,
    'audit_requests_24h',  v_audit_24h,
    'total_organizations', v_total_orgs,
    'total_jurors',        v_total_jurors
  );
END;
$$;

-- Service role only — no public/authenticated/anon grant
REVOKE ALL ON FUNCTION public.rpc_platform_metrics() FROM PUBLIC, authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- G) PERIOD MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_period_freeze_snapshot (FINAL: 005)
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
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Maintenance Mode RPCs (FINAL: 016)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_public_maintenance_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row  maintenance_mode%ROWTYPE;
  v_now  TIMESTAMPTZ := now();
  v_live BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM maintenance_mode WHERE id = 1;

  IF v_row.is_active THEN
    IF v_row.mode = 'scheduled' THEN
      v_live := (v_row.start_time IS NOT NULL AND v_now >= v_row.start_time);
    ELSE
      v_live := true;
    END IF;
  ELSE
    v_live := false;
  END IF;

  IF v_live AND v_row.end_time IS NOT NULL AND v_now > v_row.end_time THEN
    v_live := false;
  END IF;

  RETURN jsonb_build_object(
    'is_active', v_live, 'mode', v_row.mode,
    'start_time', v_row.start_time, 'end_time', v_row.end_time, 'message', v_row.message
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_maintenance_status() TO anon, authenticated;

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

CREATE OR REPLACE FUNCTION public.rpc_admin_set_maintenance(
  p_mode TEXT, p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_duration_min INT DEFAULT NULL, p_message TEXT DEFAULT NULL,
  p_affected_org_ids UUID[] DEFAULT NULL, p_notify_admins BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
  v_effective_start TIMESTAMPTZ;
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  IF p_mode NOT IN ('scheduled', 'immediate') THEN RAISE EXCEPTION 'invalid mode: %', p_mode; END IF;

  v_effective_start := CASE WHEN p_mode = 'immediate' THEN now() ELSE p_start_time END;
  IF p_duration_min IS NOT NULL AND v_effective_start IS NOT NULL THEN
    v_end_time := v_effective_start + (p_duration_min || ' minutes')::INTERVAL;
  END IF;

  UPDATE maintenance_mode SET
    is_active = true, mode = p_mode, start_time = v_effective_start,
    end_time = v_end_time, message = COALESCE(p_message, message),
    affected_org_ids = p_affected_org_ids, notify_admins = p_notify_admins,
    activated_by = auth.uid(), updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true, 'start_time', v_effective_start, 'end_time', v_end_time)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_cancel_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  UPDATE maintenance_mode SET is_active = false, updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_cancel_maintenance() TO authenticated;

-- =============================================================================
-- Security Policy RPCs (FINAL: 017)
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
