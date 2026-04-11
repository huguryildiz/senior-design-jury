-- sql/migrations/032_maintenance_audit_and_cron.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. rpc_public_maintenance_status — add `upcoming` + `affected_org_ids` to
--    the response so MaintenanceGate can render pre-maintenance countdown
--    banners and filter by affected org without a second RPC call.
--
-- 2. rpc_admin_set_maintenance — add audit log INSERT
-- 3. rpc_admin_cancel_maintenance — add audit log INSERT
--
-- 4. rpc_public_platform_settings — new public (anon+authenticated) RPC
--    returning {platform_name, support_email} for MaintenancePage footer.
--
-- 5. pg_cron auto-lift job — deactivates maintenance once end_time passes.
--    Apply to BOTH vera-prod and vera-demo in the same step.
-- ─────────────────────────────────────────────────────────────────────────────


-- =============================================================================
-- 1. Extended public status RPC
-- =============================================================================
-- Adds: upcoming (bool), affected_org_ids (uuid[])
-- `upcoming` is true when is_active=true AND mode='scheduled'
-- AND now() < start_time (maintenance is booked but not yet started).
-- MaintenanceGate uses `upcoming` to show the pre-maintenance countdown banner
-- without blocking users.

CREATE OR REPLACE FUNCTION public.rpc_public_maintenance_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row      maintenance_mode%ROWTYPE;
  v_now      TIMESTAMPTZ := now();
  v_live     BOOLEAN;
  v_upcoming BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM maintenance_mode WHERE id = 1;

  -- Determine live state (same logic as 005)
  IF v_row.is_active THEN
    IF v_row.mode = 'scheduled' THEN
      v_live := (v_row.start_time IS NOT NULL AND v_now >= v_row.start_time);
    ELSE
      v_live := true;
    END IF;
  ELSE
    v_live := false;
  END IF;

  -- Auto-expire if end_time has passed (cron will clean up the DB row, but
  -- we should not advertise liveness after the window has closed)
  IF v_live AND v_row.end_time IS NOT NULL AND v_now > v_row.end_time THEN
    v_live := false;
  END IF;

  -- Upcoming: scheduled, not yet started
  v_upcoming := (
    v_row.is_active
    AND v_row.mode = 'scheduled'
    AND v_row.start_time IS NOT NULL
    AND v_now < v_row.start_time
  );

  RETURN jsonb_build_object(
    'is_active',        v_live,
    'upcoming',         v_upcoming,
    'mode',             v_row.mode,
    'start_time',       v_row.start_time,
    'end_time',         v_row.end_time,
    'message',          v_row.message,
    'affected_org_ids', v_row.affected_org_ids
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_maintenance_status() TO anon, authenticated;


-- =============================================================================
-- 2. rpc_admin_set_maintenance — with audit log
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_maintenance(
  p_mode             TEXT,
  p_start_time       TIMESTAMPTZ DEFAULT NULL,
  p_duration_min     INT         DEFAULT NULL,
  p_message          TEXT        DEFAULT NULL,
  p_affected_org_ids UUID[]      DEFAULT NULL,
  p_notify_admins    BOOLEAN     DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_end_time        TIMESTAMPTZ;
  v_effective_start TIMESTAMPTZ;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;
  IF p_mode NOT IN ('scheduled', 'immediate') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  v_effective_start := CASE WHEN p_mode = 'immediate' THEN now() ELSE p_start_time END;

  IF p_duration_min IS NOT NULL AND v_effective_start IS NOT NULL THEN
    v_end_time := v_effective_start + (p_duration_min || ' minutes')::INTERVAL;
  END IF;

  UPDATE maintenance_mode SET
    is_active        = true,
    mode             = p_mode,
    start_time       = v_effective_start,
    end_time         = v_end_time,
    message          = COALESCE(p_message, message),
    affected_org_ids = p_affected_org_ids,
    notify_admins    = p_notify_admins,
    activated_by     = auth.uid(),
    updated_at       = now()
  WHERE id = 1;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    NULL,
    auth.uid(),
    'maintenance.set',
    'maintenance_mode',
    NULL,
    jsonb_build_object(
      'mode',              p_mode,
      'start_time',        v_effective_start,
      'end_time',          v_end_time,
      'duration_min',      p_duration_min,
      'affected_org_ids',  p_affected_org_ids,
      'notify_admins',     p_notify_admins
    )
  );

  RETURN jsonb_build_object(
    'ok',         true,
    'start_time', v_effective_start,
    'end_time',   v_end_time
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN)
  TO authenticated;


-- =============================================================================
-- 3. rpc_admin_cancel_maintenance — with audit log
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_cancel_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  UPDATE maintenance_mode
  SET is_active  = false,
      updated_at = now()
  WHERE id = 1;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    NULL,
    auth.uid(),
    'maintenance.cancelled',
    'maintenance_mode',
    NULL,
    jsonb_build_object('cancelled_at', now())
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_cancel_maintenance() TO authenticated;


-- =============================================================================
-- 4. rpc_public_platform_settings — anon-accessible footer config
-- =============================================================================
-- Returns only the public-safe fields needed by MaintenancePage footer.
-- No auth required (called while users are locked out).

CREATE OR REPLACE FUNCTION public.rpc_public_platform_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row platform_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM platform_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'platform_name', v_row.platform_name,
    'support_email', v_row.support_email
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_platform_settings() TO anon, authenticated;


-- =============================================================================
-- 5. pg_cron auto-lift job
-- =============================================================================
-- Checks every minute: if end_time has passed, set is_active = false.
-- This is the authoritative DB-side cleanup; the gate's polling loop
-- (30 s) picks up the change shortly after.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'maintenance-auto-lift',
  '* * * * *',
  $$
    UPDATE maintenance_mode
       SET is_active  = false,
           updated_at = now()
     WHERE is_active  = true
       AND end_time   IS NOT NULL
       AND end_time    < now();
  $$
);
