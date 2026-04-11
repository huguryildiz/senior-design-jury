-- sql/migrations/033_platform_metrics_rpc.sql
-- ============================================================
-- RPC: rpc_platform_metrics
-- Returns live DB-level metrics for the System Health drawer.
-- Called exclusively by the platform-metrics Edge Function
-- (which uses service role, bypassing RLS).
--
-- Metrics returned:
--   db_size_bytes        — raw pg_database_size()
--   db_size_pretty       — human-readable (e.g. "84 MB")
--   active_connections   — pg_stat_activity rows with state='active'
--   audit_requests_24h   — audit_logs rows created in last 24h
--   total_organizations  — count of organizations
--   total_jurors         — count of jurors
-- ============================================================

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
  SELECT pg_database_size(current_database())
    INTO v_db_size_bytes;

  SELECT pg_size_pretty(v_db_size_bytes)
    INTO v_db_size_pretty;

  SELECT count(*)
    INTO v_active_connections
    FROM pg_stat_activity
   WHERE state = 'active';

  SELECT count(*)
    INTO v_audit_24h
    FROM audit_logs
   WHERE created_at > now() - interval '24 hours';

  SELECT count(*)
    INTO v_total_orgs
    FROM organizations;

  SELECT count(*)
    INTO v_total_jurors
    FROM jurors;

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

-- Only service role should call this directly; no authenticated grant needed
-- (Edge Function uses service role client)
REVOKE ALL ON FUNCTION public.rpc_platform_metrics() FROM PUBLIC, authenticated, anon;
