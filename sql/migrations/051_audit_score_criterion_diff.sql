-- sql/migrations/051_audit_score_criterion_diff.sql
-- Per-criterion diff on data.score.submitted events.
--
-- Modifies rpc_jury_finalize_submission so each data.score.submitted audit row
-- carries:
--   * details.scores  — current {key: value} map (snapshot for future diffs)
--   * diff.before     — previous submission's values for keys that changed
--   * diff.after      — current values for keys that changed
--
-- History is read from audit_logs itself (the append-only table is the
-- source of truth — no new history table). Edit-mode re-submissions surface
-- exactly what changed, which is the single most important forensic signal
-- for scoring integrity.

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
    -- Always emit evaluation.complete
    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
    VALUES (
      v_org_id,
      auth.uid(),
      'evaluation.complete',
      'juror_period_auth',
      p_juror_id,
      jsonb_build_object(
        'period_id',   p_period_id,
        'juror_id',    p_juror_id,
        'actor_name',  v_juror_name,
        'periodName',  v_period_name
      )
    );

    -- Also emit edit-mode close if an edit window was active at the time
    IF (
      COALESCE(v_auth_row.edit_enabled, false)
      OR v_auth_row.edit_reason IS NOT NULL
      OR v_auth_row.edit_expires_at IS NOT NULL
    ) THEN
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
          'actor_name',            v_juror_name,
          'periodName',            v_period_name,
          'previous_edit_enabled', v_auth_row.edit_enabled,
          'previous_edit_reason',  v_auth_row.edit_reason,
          'previous_expires_at',   v_auth_row.edit_expires_at,
          'closed_at',             now(),
          'close_source',          'jury_resubmit'
        )
      );
    END IF;

    -- Emit data.score.submitted for each project the juror has a score sheet for
    FOR v_project_rec IN
      SELECT p.id AS project_id, p.title AS project_title
      FROM score_sheets ss
      JOIN projects p ON p.id = ss.project_id
      WHERE ss.juror_id = p_juror_id AND ss.period_id = p_period_id
    LOOP
      -- 1. Collect CURRENT scores as {criterion_key: value}
      SELECT COALESCE(jsonb_object_agg(pc.key, ssi.score_value), '{}'::JSONB)
      INTO v_current_scores
      FROM score_sheet_items ssi
      JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
      JOIN score_sheets ss    ON ss.id = ssi.score_sheet_id
      WHERE ss.project_id = v_project_rec.project_id
        AND ss.juror_id   = p_juror_id
        AND ss.period_id  = p_period_id;

      -- 2. Read PREVIOUS submission's scores map from audit_logs
      SELECT al.details -> 'scores'
      INTO v_previous_scores
      FROM audit_logs al
      WHERE al.action = 'data.score.submitted'
        AND al.resource_id = v_project_rec.project_id
        AND (al.details ->> 'juror_id')::UUID = p_juror_id
      ORDER BY al.created_at DESC
      LIMIT 1;

      -- 3. Compute per-criterion diff
      IF v_previous_scores IS NULL THEN
        v_diff := jsonb_build_object('after', v_current_scores);
      ELSE
        -- Keep only keys where the value changed (union of current + previous keys)
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

      INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id,
        category, severity, actor_type, actor_name, details, diff
      ) VALUES (
        v_org_id,
        auth.uid(),
        'data.score.submitted',
        'score_sheets',
        v_project_rec.project_id,
        'data'::audit_category,
        'info'::audit_severity,
        'juror'::audit_actor_type,
        v_juror_name,
        jsonb_build_object(
          'juror_name',    v_juror_name,
          'juror_id',      p_juror_id,
          'project_title', v_project_rec.project_title,
          'period_name',   v_period_name,
          'period_id',     p_period_id,
          'scores',        v_current_scores
        ),
        v_diff
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT) TO anon, authenticated;
