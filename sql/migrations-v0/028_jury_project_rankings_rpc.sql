-- Migration 028: rpc_jury_project_rankings
-- Returns average total score per project for a period.
-- Requires a valid, non-expired juror session token for the period.
-- SECURITY DEFINER so anon jurors can read aggregate scores across all jurors.

CREATE OR REPLACE FUNCTION public.rpc_jury_project_rankings(
  p_period_id    UUID,
  p_session_token TEXT
)
RETURNS TABLE (
  project_id  UUID,
  avg_score   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the session token is valid and not expired or blocked
  -- session_token_hash stores SHA-256 of the plain token (migration 009)
  IF NOT EXISTS (
    SELECT 1 FROM juror_period_auth
    WHERE period_id          = p_period_id
      AND session_token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex')
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
