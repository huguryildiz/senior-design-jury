-- Migration 021: SECURITY DEFINER RPC for jury impact data
-- Allows a juror with a valid session token to read aggregate scoring data
-- (project rankings, juror activity, KPIs) without being blocked by RLS.
-- The jury session token (hex, stored in juror_period_auth.session_token) is
-- used to authenticate — no Supabase Auth JWT required.

CREATE OR REPLACE FUNCTION rpc_get_period_impact(
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
  -- Validate session token (stored as SHA-256 hex hash)
  SELECT juror_id INTO v_juror_id
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    AND (is_blocked IS NULL OR is_blocked = FALSE);

  IF v_juror_id IS NULL THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;

  RETURN jsonb_build_object(
    -- Total project count for the period
    'total_projects', (
      SELECT COUNT(*)::INT
      FROM projects
      WHERE period_id = p_period_id
    ),

    -- Project rankings: per-project average of juror totals
    'projects', (
      SELECT COALESCE(jsonb_agg(r ORDER BY r.avg_total DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          p.id,
          p.title,
          p.project_no,
          COUNT(ss.id)::INT                        AS juror_count,
          ROUND(AVG(ss.total_score)::NUMERIC, 2)   AS avg_total
        FROM projects p
        LEFT JOIN (
          SELECT
            ss2.id,
            ss2.project_id,
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

    -- Per-juror scores (one row per juror per project, for before/after math)
    'juror_scores', (
      SELECT COALESCE(jsonb_agg(js), '[]'::jsonb)
      FROM (
        SELECT
          ss.juror_id,
          ss.project_id,
          COALESCE(SUM(ssi.score_value), 0)::NUMERIC AS total
        FROM score_sheets ss
        JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
        WHERE ss.period_id = p_period_id
        GROUP BY ss.juror_id, ss.project_id
      ) js
    ),

    -- Juror activity (names, counts, timestamps)
    'jurors', (
      SELECT COALESCE(jsonb_agg(ja ORDER BY ja.last_seen_at DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          jpa.juror_id,
          j.juror_name,
          jpa.last_seen_at,
          jpa.final_submitted_at,
          (
            SELECT COUNT(DISTINCT ss.project_id)::INT
            FROM score_sheets ss
            WHERE ss.juror_id = jpa.juror_id
              AND ss.period_id = p_period_id
          ) AS completed_projects
        FROM juror_period_auth jpa
        JOIN jurors j ON j.id = jpa.juror_id
        WHERE jpa.period_id = p_period_id
      ) ja
    )
  );
END;
$$;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION rpc_get_period_impact(UUID, TEXT) TO anon, authenticated;
