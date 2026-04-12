        )
      ),
      '[]'::json
    ) AS data
    FROM org_applications a
    WHERE a.organization_id = o.id
  ) a_agg ON true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_list_organizations() TO authenticated;

-- =============================================================================
-- rpc_admin_generate_entry_token
-- =============================================================================
-- Uses security_policy->>'qrTtl' (12h/24h/48h/7d) to determine token TTL.
-- Serializes generation per period with FOR UPDATE to avoid parallel races.
-- Revokes any currently active token(s) before inserting the new one.

CREATE OR REPLACE FUNCTION public.rpc_admin_generate_entry_token(p_period_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_token      TEXT;
  v_token_hash TEXT;
  v_expires_at TIMESTAMPTZ;
  v_org_id     UUID;
  v_ttl_str    TEXT;
  v_ttl        INTERVAL;
BEGIN
  -- Serialize generation per period to avoid parallel active-token races.
  SELECT organization_id INTO v_org_id
  FROM periods
  WHERE id = p_period_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  IF NOT (
    current_user_is_super_admin()
    OR EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid() AND organization_id = v_org_id
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Read qrTtl from security_policy; fall back to '24h'.
  SELECT COALESCE(policy->>'qrTtl', '24h')
  INTO v_ttl_str
  FROM security_policy
  WHERE id = 1;

  v_ttl := CASE v_ttl_str
    WHEN '12h' THEN INTERVAL '12 hours'
    WHEN '48h' THEN INTERVAL '48 hours'
    WHEN '7d'  THEN INTERVAL '7 days'
    ELSE            INTERVAL '24 hours'
  END;

  -- Revoke any currently non-revoked token(s) before creating a fresh one.
  UPDATE entry_tokens
  SET is_revoked = true
  WHERE period_id = p_period_id
    AND is_revoked = false;

  v_token      := gen_random_uuid()::TEXT;
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + v_ttl;

  INSERT INTO entry_tokens (period_id, token_hash, token_plain, expires_at)
  VALUES (p_period_id, v_token_hash, v_token, v_expires_at);

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'token.generate',
    'entry_tokens',
    p_period_id,
    jsonb_build_object('period_id', p_period_id, 'expires_at', v_expires_at, 'ttl', v_ttl_str)
  );

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_generate_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_entry_token_revoke
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_entry_token_revoke(
  p_token_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_period_id UUID;
  v_org_id    UUID;
  v_is_admin  BOOLEAN;
BEGIN
  SELECT t.period_id, p.organization_id
  INTO v_period_id, v_org_id
  FROM entry_tokens t
  JOIN periods p ON p.id = t.period_id
  WHERE t.id = p_token_id;

  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'token_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  UPDATE entry_tokens SET is_revoked = true WHERE id = p_token_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_entry_token_revoke(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- F) PUBLIC STATS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_landing_stats
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_landing_stats()
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
    'institutions',  (SELECT json_agg(DISTINCT institution ORDER BY institution)
                       FROM organizations
                       WHERE status = 'active')
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_landing_stats() TO anon, authenticated;

-- =============================================================================
-- rpc_platform_metrics
-- =============================================================================

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
  SELECT pg_database_size(current_database()) INTO v_db_size_bytes;
  SELECT pg_size_pretty(v_db_size_bytes) INTO v_db_size_pretty;
  SELECT count(*) INTO v_active_connections FROM pg_stat_activity WHERE state = 'active';
  SELECT count(*) INTO v_audit_24h FROM audit_logs WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO v_total_orgs FROM organizations;
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

-- Service role only — no public/authenticated/anon grant
REVOKE ALL ON FUNCTION public.rpc_platform_metrics() FROM PUBLIC, authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- G) PERIOD MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_period_freeze_snapshot
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_period_freeze_snapshot(p_period_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period          periods%ROWTYPE;
  v_criteria_count  INT;
  v_outcomes_count  INT;
BEGIN
  SELECT * INTO v_period FROM periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'period_not_found');
  END IF;

  IF v_period.framework_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'period_has_no_framework');
  END IF;

  IF v_period.snapshot_frozen_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_criteria_count FROM period_criteria WHERE period_id = p_period_id;
    SELECT COUNT(*) INTO v_outcomes_count FROM period_outcomes WHERE period_id = p_period_id;
    RETURN json_build_object('ok', true, 'already_frozen', true, 'criteria_count', v_criteria_count, 'outcomes_count', v_outcomes_count);
  END IF;

  INSERT INTO period_criteria (
    period_id, source_criterion_id, key, label, short_label,
    description, max_score, weight, color, rubric_bands, sort_order
  )
  SELECT p_period_id, fc.id, fc.key, fc.label, fc.short_label,
    fc.description, fc.max_score, fc.weight, fc.color, fc.rubric_bands, fc.sort_order
  FROM framework_criteria fc
  WHERE fc.framework_id = v_period.framework_id;

  GET DIAGNOSTICS v_criteria_count = ROW_COUNT;

  INSERT INTO period_outcomes (
    period_id, source_outcome_id, code, label, description, sort_order
  )
  SELECT p_period_id, fo.id, fo.code, fo.label, fo.description, fo.sort_order
  FROM framework_outcomes fo
  WHERE fo.framework_id = v_period.framework_id;

  GET DIAGNOSTICS v_outcomes_count = ROW_COUNT;

  INSERT INTO period_criterion_outcome_maps (
    period_id, period_criterion_id, period_outcome_id, coverage_type, weight
  )
  SELECT p_period_id, pc.id, po.id, fcom.coverage_type, fcom.weight
  FROM framework_criterion_outcome_maps fcom
  JOIN period_criteria pc ON pc.source_criterion_id = fcom.criterion_id AND pc.period_id = p_period_id
  JOIN period_outcomes po ON po.source_outcome_id = fcom.outcome_id AND po.period_id = p_period_id
  WHERE fcom.framework_id = v_period.framework_id;

  UPDATE periods SET snapshot_frozen_at = now() WHERE id = p_period_id;

  RETURN json_build_object('ok', true, 'already_frozen', false, 'criteria_count', v_criteria_count, 'outcomes_count', v_outcomes_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_period_freeze_snapshot(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- H) SYSTEM CONFIG
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Maintenance Mode RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_public_maintenance_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row  maintenance_mode%ROWTYPE;
  v_now  TIMESTAMPTZ := now();
  v_live BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM maintenance_mode WHERE id = 1;

  IF v_row.is_active THEN
    IF v_row.mode = 'scheduled' THEN
      v_live := (v_row.start_time IS NOT NULL AND v_now >= v_row.start_time);
    ELSE
      v_live := true;
    END IF;
  ELSE
    v_live := false;
  END IF;

  IF v_live AND v_row.end_time IS NOT NULL AND v_now > v_row.end_time THEN
    v_live := false;
  END IF;

  RETURN jsonb_build_object(
    'is_active', v_live, 'mode', v_row.mode,
    'start_time', v_row.start_time, 'end_time', v_row.end_time, 'message', v_row.message
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_maintenance_status() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_get_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row maintenance_mode%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  SELECT * INTO v_row FROM maintenance_mode WHERE id = 1;
  RETURN jsonb_build_object(
    'is_active', v_row.is_active, 'mode', v_row.mode,
    'start_time', v_row.start_time, 'end_time', v_row.end_time,
    'message', v_row.message, 'affected_org_ids', v_row.affected_org_ids,
    'notify_admins', v_row.notify_admins, 'updated_at', v_row.updated_at
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_maintenance() TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_maintenance(
  p_mode TEXT, p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_duration_min INT DEFAULT NULL, p_message TEXT DEFAULT NULL,
  p_affected_org_ids UUID[] DEFAULT NULL, p_notify_admins BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
  v_effective_start TIMESTAMPTZ;
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  IF p_mode NOT IN ('scheduled', 'immediate') THEN RAISE EXCEPTION 'invalid mode: %', p_mode; END IF;

  v_effective_start := CASE WHEN p_mode = 'immediate' THEN now() ELSE p_start_time END;
  IF p_duration_min IS NOT NULL AND v_effective_start IS NOT NULL THEN
    v_end_time := v_effective_start + (p_duration_min || ' minutes')::INTERVAL;
  END IF;

  UPDATE maintenance_mode SET
    is_active = true, mode = p_mode, start_time = v_effective_start,
    end_time = v_end_time, message = COALESCE(p_message, message),
    affected_org_ids = p_affected_org_ids, notify_admins = p_notify_admins,
    activated_by = auth.uid(), updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true, 'start_time', v_effective_start, 'end_time', v_end_time)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_cancel_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  UPDATE maintenance_mode SET is_active = false, updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_cancel_maintenance() TO authenticated;

-- =============================================================================
-- Security Policy RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_security_policy()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row security_policy%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  SELECT * INTO v_row FROM security_policy WHERE id = 1;
  RETURN (v_row.policy || jsonb_build_object('updated_at', v_row.updated_at))::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_security_policy() TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_security_policy(p_policy JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN RAISE EXCEPTION 'super_admin required'; END IF;
  UPDATE security_policy
  SET policy = policy || p_policy, updated_by = auth.uid(), updated_at = now()
  WHERE id = 1;
  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_security_policy(JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- H2) AUDIT WRITE HELPERS + PREMIUM ATOMIC RPCs
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- _audit_write
-- =============================================================================
-- Extracts IP/UA from PostgREST GUC headers, resolves actor_name from profiles
-- (with fallback to details fields for anon/juror flows), and inserts an audit row.

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
  v_actor_name         TEXT;
  v_actor_name_profile TEXT;
  v_ip                 INET;
  v_ua                 TEXT;
  v_req_headers        JSON;
  v_ip_raw             TEXT;
BEGIN
  -- For anon/juror flows, allow actor_name from details fallback.
  v_actor_name := NULLIF(
    trim(
      COALESCE(
        p_details->>'actor_name',
        p_details->>'juror_name',
        p_details->>'email',
        p_details->>'applicant_email',
        ''
      )
    ),
    ''
  );

  -- Prefer profile display_name when authenticated.
  IF auth.uid() IS NOT NULL THEN
    SELECT display_name INTO v_actor_name_profile
    FROM profiles
    WHERE id = auth.uid();
    v_actor_name := COALESCE(NULLIF(trim(v_actor_name_profile), ''), v_actor_name);
  END IF;

  -- PostgREST request headers (missing or non-JSON GUC must not abort caller).
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

GRANT EXECUTE ON FUNCTION public._audit_write(
  UUID, TEXT, TEXT, UUID, audit_category, audit_severity, JSONB, JSONB, audit_actor_type, UUID
) TO authenticated;

