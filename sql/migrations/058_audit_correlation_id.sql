-- sql/migrations/058_audit_correlation_id.sql
-- Populate correlation_id on audit rows so related events can be linked.
--
-- Background: the correlation_id UUID column was added in migration 043 and the
-- generic rpc_admin_write_audit_event accepts it, but the _audit_write internal
-- helper (migration 050) never included it in its signature or INSERT. As a
-- result, every domain RPC (set_current_period, set_period_lock, save_period_criteria,
-- outcome CRUD, etc.) always wrote NULL for correlation_id.
--
-- This migration:
--   1. Recreates _audit_write with p_correlation_id UUID DEFAULT NULL so all
--      existing callers keep working unchanged (default = NULL).
--   2. Recreates rpc_jury_finalize_submission with p_correlation_id UUID DEFAULT NULL.
--      The JS call site generates a UUID per submission so all three correlated events
--      (evaluation.complete, data.score.submitted × N, juror.edit_mode_closed_on_resubmit)
--      share one correlation_id, making it trivial to reconstruct a full submission.
--
-- All callers of _audit_write from migration 050 continue to work with no changes.
-- The GRANT signature must be updated to match the new parameter list.

-- =============================================================================
-- 1. _audit_write — add p_correlation_id
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
  v_actor_name  TEXT;
  v_ip          INET;
  v_ua          TEXT;
  v_req_headers JSON;
  v_ip_raw      TEXT;
BEGIN
  -- Actor display name from profiles
  IF auth.uid() IS NOT NULL THEN
    SELECT display_name INTO v_actor_name
    FROM profiles
    WHERE id = auth.uid();
  END IF;

  -- PostgREST request headers (missing or non-JSON GUC must not abort caller)
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

-- Revoke old 9-argument GRANT and add new 10-argument one
REVOKE EXECUTE ON FUNCTION public._audit_write(
  UUID, TEXT, TEXT, UUID, audit_category, audit_severity, JSONB, JSONB, audit_actor_type
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public._audit_write(
  UUID, TEXT, TEXT, UUID, audit_category, audit_severity, JSONB, JSONB, audit_actor_type, UUID
) TO authenticated;

-- =============================================================================
-- 2. rpc_jury_finalize_submission — add p_correlation_id
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
    -- Always emit evaluation.complete
    INSERT INTO audit_logs (
      organization_id, user_id, action, resource_type, resource_id,
      details, correlation_id
    ) VALUES (
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
      ),
      p_correlation_id
    );

    -- Also emit edit-mode close if an edit window was active at the time
    IF (
      COALESCE(v_auth_row.edit_enabled, false)
      OR v_auth_row.edit_reason IS NOT NULL
      OR v_auth_row.edit_expires_at IS NOT NULL
    ) THEN
      INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id,
        details, correlation_id
      ) VALUES (
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
        ),
        p_correlation_id
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
        category, severity, actor_type, actor_name,
        details, diff, correlation_id
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
        v_diff,
        p_correlation_id
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT, UUID) TO anon, authenticated;
