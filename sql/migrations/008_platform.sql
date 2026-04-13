-- VERA v1 — Platform: Settings, Maintenance, Metrics, Backups
-- Depends on: 006_rpcs_admin.sql (_assert_org_admin, current_user_is_super_admin,
--             rpc_admin_get_maintenance), 002_tables.sql (audit_logs table)

-- =============================================================================
-- EXTENSIONS (pg_cron for scheduled jobs, pg_net for HTTP callbacks)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ═══════════════════════════════════════════════════════════════════════════════
-- A) PLATFORM SETTINGS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Single-row config table (id = 1 always). Mirrors the maintenance_mode /
-- security_policy singleton pattern.

CREATE TABLE IF NOT EXISTS platform_settings (
  id                     INT         PRIMARY KEY DEFAULT 1,
  platform_name          TEXT        NOT NULL DEFAULT 'VERA Evaluation Platform',
  support_email          TEXT        NOT NULL DEFAULT 'support@vera-eval.app',
  auto_approve_new_orgs  BOOLEAN     NOT NULL DEFAULT false,
  backup_cron_expr       TEXT        NOT NULL DEFAULT '0 2 * * *',
  updated_by             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_single_row     CHECK (id = 1),
  CONSTRAINT platform_settings_name_not_empty CHECK (length(trim(platform_name)) > 0),
  CONSTRAINT platform_settings_name_max_len   CHECK (length(platform_name) <= 100),
  CONSTRAINT platform_settings_email_format
    CHECK (support_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Super admins may read the row directly (debugging convenience).
-- All writes go through SECURITY DEFINER RPCs; no write policy needed.
DROP POLICY IF EXISTS platform_settings_super_admin_read ON platform_settings;
CREATE POLICY platform_settings_super_admin_read
  ON platform_settings
  FOR SELECT
  TO authenticated
  USING (current_user_is_super_admin());

-- =============================================================================
-- rpc_admin_get_platform_settings — super-admin read
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_platform_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row platform_settings%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  SELECT * INTO v_row FROM platform_settings WHERE id = 1;

  RETURN jsonb_build_object(
    'platform_name',         v_row.platform_name,
    'support_email',         v_row.support_email,
    'auto_approve_new_orgs', v_row.auto_approve_new_orgs,
    'backup_cron_expr',      v_row.backup_cron_expr,
    'updated_at',            v_row.updated_at,
    'updated_by',            v_row.updated_by
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_platform_settings() TO authenticated;

-- =============================================================================
-- rpc_admin_set_platform_settings
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
      'platform_name',         v_after.platform_name,
      'support_email',         v_after.support_email,
      'auto_approve_new_orgs', v_after.auto_approve_new_orgs
    ),
    jsonb_build_object(
      'before', jsonb_build_object(
        'platform_name',         v_before.platform_name,
        'support_email',         v_before.support_email,
        'auto_approve_new_orgs', v_before.auto_approve_new_orgs
      ),
      'after', jsonb_build_object(
        'platform_name',         v_after.platform_name,
        'support_email',         v_after.support_email,
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
-- rpc_public_platform_settings — anon-safe footer config
-- =============================================================================
-- Returns only public-safe fields needed by MaintenancePage footer.
-- No auth required (called while users are locked out of the UI).

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- B) MAINTENANCE MODE RPCs (FINAL STATE — upgrades 006_rpcs_admin.sql versions)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Enhanced versions of maintenance RPCs. The basic signatures were defined in
-- 006_rpcs_admin.sql; this file upgrades them to their final state:
--   • rpc_public_maintenance_status: adds `upcoming` flag + `affected_org_ids`
--   • rpc_admin_set_maintenance: adds audit log INSERT
--   • rpc_admin_cancel_maintenance: adds audit log INSERT
-- rpc_admin_get_maintenance is unchanged (kept in 006_rpcs_admin.sql).

-- =============================================================================
-- rpc_public_maintenance_status
-- =============================================================================

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

  -- Determine live state
  IF v_row.is_active THEN
    IF v_row.mode = 'scheduled' THEN
      v_live := (v_row.start_time IS NOT NULL AND v_now >= v_row.start_time);
    ELSE
      v_live := true;
    END IF;
  ELSE
    v_live := false;
  END IF;

  -- Auto-expire if end_time has passed (cron cleans up the DB row,
  -- but we must not advertise liveness after the window closes)
  IF v_live AND v_row.end_time IS NOT NULL AND v_now > v_row.end_time THEN
    v_live := false;
  END IF;

  -- Upcoming: scheduled and not yet started (show countdown banner)
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
-- rpc_admin_set_maintenance
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
      'mode',             p_mode,
      'start_time',       v_effective_start,
      'end_time',         v_end_time,
      'duration_min',     p_duration_min,
      'affected_org_ids', p_affected_org_ids,
      'notify_admins',    p_notify_admins
    ),
    jsonb_build_object(
      'before', jsonb_build_object(
        'is_active',        v_before.is_active,
        'mode',             v_before.mode,
        'start_time',       v_before.start_time,
        'end_time',         v_before.end_time,
        'message',          v_before.message,
        'affected_org_ids', v_before.affected_org_ids,
        'notify_admins',    v_before.notify_admins
      ),
      'after', jsonb_build_object(
        'is_active',        v_after.is_active,
        'mode',             v_after.mode,
        'start_time',       v_after.start_time,
        'end_time',         v_after.end_time,
        'message',          v_after.message,
        'affected_org_ids', v_after.affected_org_ids,
        'notify_admins',    v_after.notify_admins
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

-- =============================================================================
-- rpc_admin_cancel_maintenance
-- =============================================================================

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
        'is_active',  v_before.is_active,
        'mode',       v_before.mode,
        'start_time', v_before.start_time,
        'end_time',   v_before.end_time
      ),
      'after', jsonb_build_object(
        'is_active',  v_after.is_active,
        'mode',       v_after.mode,
        'start_time', v_after.start_time,
        'end_time',   v_after.end_time
      )
    )
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_cancel_maintenance() TO authenticated;

-- =============================================================================
-- pg_cron: maintenance auto-lift
-- =============================================================================
-- Checks every minute: if end_time has passed, set is_active = false.
-- The gate's polling loop (30 s) picks up the change shortly after.

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- C) PLATFORM METRICS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_platform_metrics — DB-level system health metrics
-- =============================================================================
-- Called exclusively by the platform-metrics Edge Function (service_role).
-- Returns: db size, active connections, audit events (24h), org/juror counts.

CREATE OR REPLACE FUNCTION public.rpc_platform_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_size_bytes      BIGINT;
  v_db_size_pretty     TEXT;
  v_active_connections BIGINT;
  v_audit_24h          BIGINT;
  v_total_orgs         BIGINT;
  v_total_jurors       BIGINT;
BEGIN
  SELECT pg_database_size(current_database()) INTO v_db_size_bytes;
  SELECT pg_size_pretty(v_db_size_bytes)        INTO v_db_size_pretty;

  SELECT count(*) INTO v_active_connections
  FROM pg_stat_activity
  WHERE state = 'active';

  SELECT count(*) INTO v_audit_24h
  FROM audit_logs
  WHERE created_at > now() - INTERVAL '24 hours';

  SELECT count(*) INTO v_total_orgs  FROM organizations;
  SELECT count(*) INTO v_total_jurors FROM jurors;

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

-- Service role only — Edge Function uses service role client; no public grant.
REVOKE ALL ON FUNCTION public.rpc_platform_metrics() FROM PUBLIC, authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- D) PLATFORM BACKUPS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_backups (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  origin              TEXT        NOT NULL CHECK (origin IN ('manual', 'auto', 'snapshot')),
  format              TEXT        NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'xlsx')),
  storage_path        TEXT        NOT NULL,
  size_bytes          BIGINT      NOT NULL DEFAULT 0,
  row_counts          JSONB       NOT NULL DEFAULT '{}'::JSONB,
  period_ids          UUID[]      NOT NULL DEFAULT ARRAY[]::UUID[],
  created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ,
  download_count      INT         NOT NULL DEFAULT 0,
  last_downloaded_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_backups_org_created
  ON public.platform_backups (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_backups_storage_path
  ON public.platform_backups (storage_path);

ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;

-- Org admins can SELECT their org's backups.
-- INSERT / UPDATE / DELETE go through SECURITY DEFINER RPCs only.
CREATE POLICY "platform_backups_select_org_admin"
  ON public.platform_backups FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- E) BACKUPS STORAGE BUCKET + RLS (FINAL STATE: 037 — super-admin fix)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Files are organized as: backups/<organization_id>/<backup_id>.<format>
-- File size limit: 50 MB. Formats: JSON or XLSX.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop any pre-existing versions of these policies before creating the final ones.
DROP POLICY IF EXISTS "backups_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "backups_insert_own_org" ON storage.objects;
DROP POLICY IF EXISTS "backups_delete_own_org" ON storage.objects;

-- SELECT: super-admin OR org member whose org matches the first path segment
CREATE POLICY "backups_select_own_org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backups'
    AND (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid() AND organization_id IS NULL
      )
      OR (
        cardinality(storage.foldername(name)) > 0
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
      )
    )
  );

-- INSERT: same check
CREATE POLICY "backups_insert_own_org"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backups'
    AND (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid() AND organization_id IS NULL
      )
      OR (
        cardinality(storage.foldername(name)) > 0
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
      )
    )
  );

-- DELETE: same check
CREATE POLICY "backups_delete_own_org"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backups'
    AND (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid() AND organization_id IS NULL
      )
      OR (
        cardinality(storage.foldername(name)) > 0
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- F) AUDIT WRITE PREREQUISITE
-- ═══════════════════════════════════════════════════════════════════════════════
-- rpc_admin_write_audit_log is needed by backup RPCs below.
-- 009_audit.sql runs after this file and will CREATE OR REPLACE this function
-- as part of the authoritative audit module (no conflict — final state is the same).

CREATE OR REPLACE FUNCTION public.rpc_admin_write_audit_log(
  p_action          TEXT,
  p_resource_type   TEXT     DEFAULT NULL,
  p_resource_id     UUID     DEFAULT NULL,
  p_details         JSONB    DEFAULT '{}',
  p_organization_id UUID     DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF p_organization_id IS NOT NULL THEN
    v_org_id := p_organization_id;
  ELSE
    SELECT organization_id INTO v_org_id
    FROM memberships
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (v_org_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_write_audit_log(TEXT, TEXT, UUID, JSONB, UUID)
  TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- G) BACKUP RPCs (FINAL STATE: 040 — _assert_org_admin fix)
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_backup_list — list backups for an organization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_backup_list(
  p_organization_id UUID
)
RETURNS TABLE (
  id                  UUID,
  organization_id     UUID,
  origin              TEXT,
  format              TEXT,
  storage_path        TEXT,
  size_bytes          BIGINT,
  row_counts          JSONB,
  period_ids          UUID[],
  created_by          UUID,
  created_by_name     TEXT,
  created_at          TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  download_count      INT,
  last_downloaded_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_org_admin(p_organization_id);

  RETURN QUERY
  SELECT
    b.id,
    b.organization_id,
    b.origin,
    b.format,
    b.storage_path,
    b.size_bytes,
    b.row_counts,
    b.period_ids,
    b.created_by,
    COALESCE(p.display_name, 'System') AS created_by_name,
    b.created_at,
    b.expires_at,
    b.download_count,
    b.last_downloaded_at
  FROM public.platform_backups b
  LEFT JOIN public.profiles p ON p.id = b.created_by
  WHERE b.organization_id = p_organization_id
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_list(UUID) TO authenticated;

-- =============================================================================
-- rpc_backup_register — register a new backup row after Storage upload
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_backup_register(
  p_organization_id UUID,
  p_storage_path    TEXT,
  p_size_bytes      BIGINT,
  p_format          TEXT,
  p_row_counts      JSONB,
  p_period_ids      UUID[],
  p_origin          TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id             UUID;
  v_retention_days INT := 90;
  v_expires_at     TIMESTAMPTZ;
BEGIN
  PERFORM public._assert_org_admin(p_organization_id);

  IF p_origin NOT IN ('manual', 'auto', 'snapshot') THEN
    RAISE EXCEPTION 'invalid origin: %', p_origin;
  END IF;

  IF p_format NOT IN ('json', 'xlsx') THEN
    RAISE EXCEPTION 'invalid format: %', p_format;
  END IF;

  -- Snapshot backups are pinned (never expire)
  IF p_origin = 'snapshot' THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (v_retention_days || ' days')::INTERVAL;
  END IF;

  INSERT INTO public.platform_backups (
    organization_id, origin, format, storage_path, size_bytes,
    row_counts, period_ids, created_by, expires_at
  )
  VALUES (
    p_organization_id, p_origin, p_format, p_storage_path, p_size_bytes,
    p_row_counts, p_period_ids, auth.uid(), v_expires_at
  )
  RETURNING id INTO v_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.created',
    'platform_backups',
    v_id,
    jsonb_build_object(
      'origin',      p_origin,
      'format',      p_format,
      'size_bytes',  p_size_bytes,
      'row_counts',  p_row_counts
    ),
    p_organization_id
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_register(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[], TEXT)
  TO authenticated;

-- =============================================================================
-- rpc_backup_delete — delete a backup row
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_backup_delete(
  p_backup_id UUID
)
RETURNS TABLE (storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
  v_path   TEXT;
  v_origin TEXT;
BEGIN
  SELECT b.organization_id, b.storage_path, b.origin
    INTO v_org_id, v_path, v_origin
    FROM public.platform_backups b
    WHERE b.id = p_backup_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'backup not found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  IF v_origin = 'snapshot' THEN
    RAISE EXCEPTION 'snapshot backups are pinned and cannot be deleted';
  END IF;

  DELETE FROM public.platform_backups WHERE id = p_backup_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.deleted',
    'platform_backups',
    p_backup_id,
    jsonb_build_object('storage_path', v_path, 'origin', v_origin),
    v_org_id
  );

  RETURN QUERY SELECT v_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_delete(UUID) TO authenticated;

-- =============================================================================
-- rpc_backup_record_download — increment download counter
--
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_backup_record_download(
  p_backup_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.platform_backups WHERE id = p_backup_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'backup not found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE public.platform_backups
    SET download_count     = download_count + 1,
        last_downloaded_at = now()
    WHERE id = p_backup_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.downloaded',
    'platform_backups',
    p_backup_id,
    '{}'::JSONB,
    v_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_record_download(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- H) BACKUP SCHEDULE SETTINGS (from 039)
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_admin_get_backup_schedule — get the current backup cron expression
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_backup_schedule()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  RETURN (
    SELECT jsonb_build_object('cron_expr', backup_cron_expr)
    FROM platform_settings
    WHERE id = 1
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_backup_schedule() TO authenticated;

-- =============================================================================
-- rpc_admin_set_backup_schedule
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
      'new_cron_expr',      v_new_expr,
      'job_name',           'auto-backup-daily'
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- I) CRON JOB: AUTO BACKUP DAILY (from 038)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Triggers the auto-backup Edge Function for all active organizations at 02:00
-- UTC. Prerequisites (Supabase sets these automatically on hosted projects):
--   current_setting('app.settings.supabase_url')      → project URL
--   current_setting('app.settings.service_role_key')  → service role JWT

SELECT cron.unschedule('auto-backup-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-backup-daily'
);

SELECT cron.schedule(
  'auto-backup-daily',
  '0 2 * * *',  -- 02:00 UTC every day (overridden by rpc_admin_set_backup_schedule)
  $$
  SELECT
    net.http_post(
      url     := current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-backup',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body    := '{}'::JSONB
    ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GLOBAL FRAMEWORK TEMPLATES (organization_id IS NULL → read-only for all orgs)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_mudek UUID := '3ae7e475-dd51-45e7-a79a-1c159fbf6abc';
  v_abet  UUID := '253751a6-09dd-47d7-93b4-7064456e553c';
BEGIN

  -- ── MÜDEK 2024 ──────────────────────────────────────────────────────────────
  INSERT INTO frameworks (id, organization_id, name, description, version)
  VALUES (
    v_mudek, NULL,
    'MÜDEK 2024',
    'MÜDEK mühendislik akreditasyon çerçevesi — 18 program çıktısı (PO 1.1–11)',
    '2024'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM framework_outcomes WHERE framework_id = v_mudek LIMIT 1) THEN
    INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order) VALUES
      (v_mudek, 'PO 1.1',  'Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konularda bilgi.',                                                                                                  'Bilgi ve Uygulama Becerisi', 1),
      (v_mudek, 'PO 1.2',  'Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konulardaki bilgileri, karmaşık mühendislik problemlerinin çözümünde kullanabilme becerisi.',                      'Bilgi ve Uygulama Becerisi', 2),
      (v_mudek, 'PO 2',    'Karmaşık mühendislik problemlerini, temel bilim, matematik ve mühendislik bilgilerini kullanarak ve ele alınan problemle ilgili BM Sürdürülebilir Kalkınma Amaçlarını gözeterek tanımlama, formüle etme ve analiz becerisi.', 'Problem Analizi',            3),
      (v_mudek, 'PO 3.1',  'Karmaşık mühendislik problemlerine yaratıcı çözümler tasarlama becerisi.',                                                                                                                                                    'Tasarım ve Geliştirme',      4),
      (v_mudek, 'PO 3.2',  'Karmaşık sistemleri, süreçleri, cihazları veya ürünleri gerçekçi kısıtları ve koşulları gözeterek, mevcut ve gelecekteki gereksinimleri karşılayacak biçimde tasarlama becerisi.',                                           'Tasarım ve Geliştirme',      5),
      (v_mudek, 'PO 4',    'Uygun teknikleri, kaynakları ve modern mühendislik ve bilişim araçlarını, sınırlamalarının da farkında olarak seçme ve kullanma becerisi.',                                                                                   'Modern Araç Kullanımı',      6),
      (v_mudek, 'PO 5',    'Karmaşık mühendislik problemlerinin incelenmesi için literatür araştırması, deney tasarlama, deney yapma, veri toplama, sonuçları analiz etme ve yorumlama dahil, araştırma yöntemlerini kullanma becerisi.',                  'Araştırma',                  7),
      (v_mudek, 'PO 6.1',  'Mühendislik uygulamalarının BM Sürdürülebilir Kalkınma Amaçları kapsamında, topluma, sağlık ve güvenliğe, ekonomiye, sürdürülebilirlik ve çevreye etkileri hakkında bilgi.',                                                 'Mühendislik ve Toplum',      8),
      (v_mudek, 'PO 6.2',  'Mühendislik çözümlerinin hukuksal sonuçları konusunda farkındalık.',                                                                                                                                                          'Mühendislik ve Toplum',      9),
      (v_mudek, 'PO 7.1',  'Mühendislik meslek ilkelerine uygun davranma, etik sorumluluk hakkında bilgi.',                                                                                                                                               'Etik ve Çeşitlilik',         10),
      (v_mudek, 'PO 7.2',  'Hiçbir konuda ayrımcılık yapmadan, tarafsız davranma ve çeşitliliği kapsayıcı olma konularında farkındalık.',                                                                                                                'Etik ve Çeşitlilik',         11),
      (v_mudek, 'PO 8.1',  'Bireysel olarak disiplin içi takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi.',                                                                                   'Takım Çalışması',            12),
      (v_mudek, 'PO 8.2',  'Bireysel olarak çok disiplinli takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi.',                                                                                 'Takım Çalışması',            13),
      (v_mudek, 'PO 9.1',  'Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda sözlü etkin iletişim kurma becerisi.',                                                                                    'İletişim',                   14),
      (v_mudek, 'PO 9.2',  'Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda yazılı etkin iletişim kurma becerisi.',                                                                                   'İletişim',                   15),
      (v_mudek, 'PO 10.1', 'Proje yönetimi ve ekonomik yapılabilirlik analizi gibi iş hayatındaki uygulamalar hakkında bilgi.',                                                                                                                            'İş Hayatı ve Girişimcilik',  16),
      (v_mudek, 'PO 10.2', 'Girişimcilik ve yenilikçilik hakkında farkındalık.',                                                                                                                                                                          'İş Hayatı ve Girişimcilik',  17),
      (v_mudek, 'PO 11',   'Bağımsız ve sürekli öğrenebilme, yeni ve gelişmekte olan teknolojilere uyum sağlayabilme ve teknolojik değişimlerle ilgili sorgulayıcı düşünebilmeyi kapsayan yaşam boyu öğrenme becerisi.',                                  'Yaşam Boyu Öğrenme',         18);
  END IF;

  -- ── ABET 2024 ────────────────────────────────────────────────────────────────
  INSERT INTO frameworks (id, organization_id, name, description, version)
  VALUES (
    v_abet, NULL,
    'ABET 2024',
    'ABET EAC Student Outcomes — SO 1 through SO 7 (2026-2027 Criteria)',
    '2024'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM framework_outcomes WHERE framework_id = v_abet LIMIT 1) THEN
    INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order) VALUES
      (v_abet, 'SO 1', 'an ability to identify, formulate, and solve complex engineering problems by applying principles of engineering, science, and mathematics.',                                                                                                                       'Complex Problem Solving',          1),
      (v_abet, 'SO 2', 'an ability to apply engineering design to produce solutions that meet specified needs with consideration of public health, safety, and welfare, as well as global, cultural, social, environmental, and economic factors.',                                        'Engineering Design',               2),
      (v_abet, 'SO 3', 'an ability to communicate effectively with a range of audiences.',                                                                                                                                                                                               'Effective Communication',          3),
      (v_abet, 'SO 4', 'an ability to recognize ethical and professional responsibilities in engineering situations and make informed judgments, which must consider the impact of engineering solutions in global, economic, environmental, and societal contexts.',                      'Ethics & Professional Responsibility', 4),
      (v_abet, 'SO 5', 'an ability to function effectively on a team whose members together provide leadership, create a collaborative environment, establish goals, plan tasks, and meet objectives.',                                                                                   'Teamwork & Leadership',            5),
      (v_abet, 'SO 6', 'an ability to develop and conduct appropriate experimentation, analyze and interpret data, and use engineering judgment to draw conclusions.',                                                                                                                    'Experimentation & Analysis',       6),
      (v_abet, 'SO 7', 'an ability to acquire and apply new knowledge as needed, using appropriate learning strategies.',                                                                                                                                                                'Lifelong Learning',                7);
  END IF;

END;
$$;
