-- 055_audit_anomaly_cron.sql
-- Schedule audit-anomaly-sweep Edge Function hourly via pg_cron + pg_net.
--
-- NOTE: The function URL is project-specific. This file shows the vera-prod
-- version. vera-demo uses the same structure with its own project URL.
-- The X-Cron-Secret value must match the AUDIT_SWEEP_SECRET env var set on
-- the audit-anomaly-sweep Edge Function.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotent: remove if already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-anomaly-sweep-hourly') THEN
    PERFORM cron.unschedule('audit-anomaly-sweep-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'audit-anomaly-sweep-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/audit-anomaly-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<AUDIT_SWEEP_SECRET>'
    ),
    body := '{}'::jsonb
  )
  $$
);
