-- 034: Add rpc_jury_get_scores — SECURITY DEFINER RPC for juror score reads.
--
-- Why:
-- score_sheets and score_sheet_items have RLS enabled but only have authenticated
-- (auth.uid()) policies. Jurors use the anon role (no Supabase Auth session), so
-- direct PostgREST queries on score_sheets silently return zero rows. This caused
-- listProjects() to think every juror is a fresh start, hiding prior scores and
-- showing "Ready to Begin" instead of "Welcome Back".
--
-- Fix:
-- Add a SECURITY DEFINER function that verifies the juror's session token (same
-- mechanism as rpc_jury_upsert_score) then returns that juror's score data for
-- the given period, bypassing RLS. listProjects() in juryApi.js is updated to
-- call this RPC instead of the direct PostgREST query when jurorId is provided.

DROP FUNCTION IF EXISTS public.rpc_jury_get_scores(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.rpc_jury_get_scores(
  p_period_id     UUID,
  p_juror_id      UUID,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_row     juror_period_auth%ROWTYPE;
  v_session_hash TEXT;
  v_result       JSONB;
BEGIN
  -- Hash the incoming plaintext token (SHA-256, same as rpc_jury_upsert_score)
  v_session_hash := encode(digest(p_session_token, 'sha256'), 'hex');

  -- Validate session token
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

  -- Fetch score sheets with items and criterion keys for this juror + period
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

GRANT EXECUTE ON FUNCTION public.rpc_jury_get_scores(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_jury_get_scores(UUID, UUID, TEXT) TO authenticated;
