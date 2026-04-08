-- Migration: 010_landing_stats.sql
-- Public RPC returning aggregate stats for the landing page.
-- Callable by anon key — no auth required.
--
-- RPC: rpc_landing_stats

CREATE OR REPLACE FUNCTION rpc_landing_stats()
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

GRANT EXECUTE ON FUNCTION rpc_landing_stats() TO anon, authenticated;
