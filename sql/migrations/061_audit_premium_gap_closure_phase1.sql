-- 060_audit_premium_gap_closure_phase1.sql
-- Phase 1 hardening for premium audit coverage:
--   1) config.platform_settings.updated
--   2) config.backup_schedule.updated
--   3) access.admin.session.revoked (new RPC + direct DELETE path removal)
--   4) application.approved / application.rejected moved to _audit_write standard
--   5) maintenance.set / maintenance.cancelled moved to _audit_write standard
--
-- All critical actions are fail-closed: if audit insert fails, primary action
-- fails in the same transaction.

-- =============================================================================
-- 1) Platform settings update audit (global config)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_set_platform_settings(
  p_platform_name          TEXT,
  p_support_email          TEXT,
  p_auto_approve_new_orgs  BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_before platform_settings%ROWTYPE;
  v_after  platform_settings%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  IF p_platform_name IS NULL OR length(trim(p_platform_name)) = 0 THEN
    RAISE EXCEPTION 'platform_name required';
  END IF;

  IF length(p_platform_name) > 100 THEN
    RAISE EXCEPTION 'platform_name too long (max 100)';
  END IF;

  IF p_support_email IS NULL
     OR p_support_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'support_email invalid';
  END IF;

  SELECT * INTO v_before
  FROM platform_settings
  WHERE id = 1;

  UPDATE platform_settings
  SET platform_name         = trim(p_platform_name),
      support_email         = trim(p_support_email),
      auto_approve_new_orgs = p_auto_approve_new_orgs,
      updated_by            = auth.uid(),
      updated_at            = now()
  WHERE id = 1
  RETURNING * INTO v_after;

  PERFORM public._audit_write(
    NULL,
    'config.platform_settings.updated',
    'platform_settings',
    NULL,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'platform_name', v_after.platform_name,
      'support_email', v_after.support_email,
      'auto_approve_new_orgs', v_after.auto_approve_new_orgs
    ),
    jsonb_build_object(
      'before', jsonb_build_object(
        'platform_name', v_before.platform_name,
        'support_email', v_before.support_email,
        'auto_approve_new_orgs', v_before.auto_approve_new_orgs
      ),
      'after', jsonb_build_object(
        'platform_name', v_after.platform_name,
        'support_email', v_after.support_email,
        'auto_approve_new_orgs', v_after.auto_approve_new_orgs
      )
    )
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_platform_settings(TEXT, TEXT, BOOLEAN)
  TO authenticated;

-- =============================================================================
-- 2) Backup schedule update audit (global config)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_set_backup_schedule(p_cron_expr TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, cron
AS $$
DECLARE
  v_prev_expr TEXT;
  v_new_expr  TEXT;
  v_job_sql   TEXT;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  IF array_length(regexp_split_to_array(trim(p_cron_expr), '\s+'), 1) != 5 THEN
    RAISE EXCEPTION 'Invalid cron expression: expected 5 fields';
  END IF;

  SELECT backup_cron_expr INTO v_prev_expr
  FROM platform_settings
  WHERE id = 1;

  v_new_expr := trim(p_cron_expr);

  UPDATE platform_settings
  SET backup_cron_expr = v_new_expr,
      updated_at       = now(),
      updated_by       = auth.uid()
  WHERE id = 1;

  v_job_sql :=
    'SELECT net.http_post('
    || 'url := current_setting(''app.settings.supabase_url'', true) || ''/functions/v1/auto-backup'','
    || 'headers := jsonb_build_object('
    || '''Content-Type'', ''application/json'','
    || '''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)'
    || '),'
    || 'body := ''{}''::jsonb'
    || ') AS request_id';

  PERFORM cron.unschedule('auto-backup-daily');
  PERFORM cron.schedule('auto-backup-daily', v_new_expr, v_job_sql);

  PERFORM public._audit_write(
    NULL,
    'config.backup_schedule.updated',
    'platform_settings',
    NULL,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'previous_cron_expr', v_prev_expr,
      'new_cron_expr', v_new_expr,
      'job_name', 'auto-backup-daily'
    ),
    jsonb_build_object(
      'before', jsonb_build_object('backup_cron_expr', v_prev_expr),
      'after',  jsonb_build_object('backup_cron_expr', v_new_expr)
    )
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_backup_schedule(TEXT) TO authenticated;

-- =============================================================================
-- 3) Session revoke audit + remove direct delete path
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_revoke_admin_session(
  p_session_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row    admin_user_sessions%ROWTYPE;
  v_org_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthenticated')::JSON;
  END IF;

  SELECT * INTO v_row
  FROM admin_user_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'session_not_found')::JSON;
  END IF;

  IF v_row.user_id IS DISTINCT FROM auth.uid() AND NOT current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT m.organization_id INTO v_org_id
  FROM memberships m
  WHERE m.user_id = v_row.user_id
    AND m.organization_id IS NOT NULL
  ORDER BY m.created_at DESC
  LIMIT 1;

  DELETE FROM admin_user_sessions
  WHERE id = p_session_id;

  PERFORM public._audit_write(
    v_org_id,
    'access.admin.session.revoked',
    'admin_user_sessions',
    p_session_id,
    'access'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'revoked_user_id', v_row.user_id,
      'device_id', v_row.device_id,
      'browser', v_row.browser,
      'os', v_row.os,
      'ip_address', v_row.ip_address,
      'country_code', v_row.country_code,
      'auth_method', v_row.auth_method,
      'last_activity_at', v_row.last_activity_at,
      'revoked_at', now()
    )
  );

  RETURN jsonb_build_object('ok', true, 'id', p_session_id)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_admin_session(UUID) TO authenticated;

REVOKE DELETE ON admin_user_sessions FROM authenticated;
DROP POLICY IF EXISTS "admin_user_sessions_delete_own" ON admin_user_sessions;

-- =============================================================================
-- 4) Application review RPCs upgraded to _audit_write
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_approve_application(
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app_row  org_applications%ROWTYPE;
  v_user_id  UUID;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_app_row FROM org_applications WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'application_not_found')::JSON;
  END IF;

  IF v_app_row.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_status')::JSON;
  END IF;

  UPDATE org_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(v_app_row.contact_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id)
    VALUES (v_user_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO memberships (user_id, organization_id, role, status)
    VALUES (v_user_id, v_app_row.organization_id, 'org_admin', 'active')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET status = 'active';
  END IF;

  PERFORM public._audit_write(
    v_app_row.organization_id,
    'application.approved',
    'org_applications',
    p_application_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'applicant_email', v_app_row.contact_email,
      'applicant_name', v_app_row.applicant_name,
      'membership_created', v_user_id IS NOT NULL
    ),
    jsonb_build_object(
      'before', jsonb_build_object('status', 'pending'),
      'after',  jsonb_build_object('status', 'approved')
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'membership_created', v_user_id IS NOT NULL
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_approve_application(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_reject_application(
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app_row org_applications%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_app_row FROM org_applications WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'application_not_found')::JSON;
  END IF;

  IF v_app_row.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_status')::JSON;
  END IF;

  UPDATE org_applications
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  PERFORM public._audit_write(
    v_app_row.organization_id,
    'application.rejected',
    'org_applications',
    p_application_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'applicant_email', v_app_row.contact_email,
      'applicant_name', v_app_row.applicant_name
    ),
    jsonb_build_object(
      'before', jsonb_build_object('status', 'pending'),
      'after',  jsonb_build_object('status', 'rejected')
    )
  );

  RETURN jsonb_build_object('ok', true, 'application_id', p_application_id)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_reject_application(UUID) TO authenticated;

-- =============================================================================
-- 5) Maintenance RPCs upgraded to _audit_write
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
  v_before          maintenance_mode%ROWTYPE;
  v_after           maintenance_mode%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;
  IF p_mode NOT IN ('scheduled', 'immediate') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  SELECT * INTO v_before
  FROM maintenance_mode
  WHERE id = 1;

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
  WHERE id = 1
  RETURNING * INTO v_after;

  PERFORM public._audit_write(
    NULL,
    'maintenance.set',
    'maintenance_mode',
    NULL,
    'security'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'mode', p_mode,
      'start_time', v_effective_start,
      'end_time', v_end_time,
      'duration_min', p_duration_min,
      'affected_org_ids', p_affected_org_ids,
      'notify_admins', p_notify_admins
    ),
    jsonb_build_object(
      'before', jsonb_build_object(
        'is_active', v_before.is_active,
        'mode', v_before.mode,
        'start_time', v_before.start_time,
        'end_time', v_before.end_time,
        'message', v_before.message,
        'affected_org_ids', v_before.affected_org_ids,
        'notify_admins', v_before.notify_admins
      ),
      'after', jsonb_build_object(
        'is_active', v_after.is_active,
        'mode', v_after.mode,
        'start_time', v_after.start_time,
        'end_time', v_after.end_time,
        'message', v_after.message,
        'affected_org_ids', v_after.affected_org_ids,
        'notify_admins', v_after.notify_admins
      )
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

CREATE OR REPLACE FUNCTION public.rpc_admin_cancel_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_before maintenance_mode%ROWTYPE;
  v_after  maintenance_mode%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  SELECT * INTO v_before
  FROM maintenance_mode
  WHERE id = 1;

  UPDATE maintenance_mode
  SET is_active  = false,
      updated_at = now()
  WHERE id = 1
  RETURNING * INTO v_after;

  PERFORM public._audit_write(
    NULL,
    'maintenance.cancelled',
    'maintenance_mode',
    NULL,
    'security'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object('cancelled_at', now()),
    jsonb_build_object(
      'before', jsonb_build_object(
        'is_active', v_before.is_active,
        'mode', v_before.mode,
        'start_time', v_before.start_time,
        'end_time', v_before.end_time
      ),
      'after', jsonb_build_object(
        'is_active', v_after.is_active,
        'mode', v_after.mode,
        'start_time', v_after.start_time,
        'end_time', v_after.end_time
      )
    )
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_cancel_maintenance() TO authenticated;
