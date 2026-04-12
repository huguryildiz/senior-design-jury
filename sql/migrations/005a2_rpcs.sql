
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

