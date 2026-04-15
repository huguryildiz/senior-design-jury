-- VERA v1 — Admin RPC Functions (admin jury mgmt, org, period, config, audit helpers)
-- Depends on: 002 (tables), 003 (helpers), 004 (RLS), 005_rpcs_jury
--
-- All crypto functions use SET search_path = public, extensions
-- where pgcrypto (crypt, gen_salt, digest, gen_random_bytes) is needed.

-- ═══════════════════════════════════════════════════════════════════════════════
-- D) ADMIN JURY MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_juror_reset_pin (FINAL: 032 body + 033 search_path)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_juror_reset_pin(
  p_period_id UUID,
  p_juror_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_org_id   UUID;
  v_is_admin BOOLEAN;
  v_pin      TEXT;
  v_pin_hash TEXT;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM jurors
  WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  v_pin      := lpad(floor(random() * 10000)::TEXT, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'));

  UPDATE juror_period_auth
  SET pin_hash           = v_pin_hash,
      pin_pending_reveal = v_pin,
      failed_attempts    = 0,
      locked_until       = NULL,
      locked_at          = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  RETURN jsonb_build_object(
    'ok',             true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_reset_pin(UUID, UUID) TO authenticated;

-- =============================================================================
-- rpc_juror_toggle_edit_mode
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_juror_toggle_edit_mode(
  p_period_id         UUID,
  p_juror_id          UUID,
  p_enabled           BOOLEAN,
  p_reason            TEXT DEFAULT NULL,
  p_duration_minutes  INT  DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id        UUID;
  v_is_admin      BOOLEAN;
  v_auth_row      juror_period_auth%ROWTYPE;
  v_reason        TEXT;
  v_minutes       INT;
  v_expires_at    TIMESTAMPTZ;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM jurors WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_auth_row
  FROM juror_period_auth
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  IF p_enabled THEN
    v_reason := btrim(COALESCE(p_reason, ''));
    IF char_length(v_reason) < 5 THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'reason_too_short')::JSON;
    END IF;

    v_minutes := COALESCE(p_duration_minutes, 30);
    IF v_minutes < 1 OR v_minutes > 2880 THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_duration')::JSON;
    END IF;

    IF v_auth_row.final_submitted_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'final_submission_required')::JSON;
    END IF;

    v_expires_at := now() + make_interval(mins => v_minutes);

    UPDATE juror_period_auth
    SET edit_enabled    = true,
        edit_reason     = v_reason,
        edit_expires_at = v_expires_at
    WHERE juror_id = p_juror_id AND period_id = p_period_id;

    INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
    VALUES (
      v_org_id, auth.uid(), 'juror.edit_mode_enabled', 'juror_period_auth', p_juror_id,
      jsonb_build_object(
        'period_id', p_period_id, 'juror_id', p_juror_id,
        'reason', v_reason, 'duration_minutes', v_minutes, 'expires_at', v_expires_at
      )
    );

    RETURN jsonb_build_object('ok', true, 'edit_expires_at', v_expires_at)::JSON;
  END IF;

  UPDATE juror_period_auth
  SET edit_enabled = false, edit_reason = NULL, edit_expires_at = NULL
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT) TO authenticated;

-- =============================================================================
-- rpc_juror_unlock_pin
-- =============================================================================
-- Extends unlock so that clearing a lockout simultaneously generates a fresh
-- 4-digit PIN, writes pin_hash + pin_pending_reveal, and returns pin_plain_once
-- so the admin modal can show it once.

CREATE OR REPLACE FUNCTION public.rpc_juror_unlock_pin(
  p_period_id UUID,
  p_juror_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_org_id     UUID;
  v_is_admin   BOOLEAN;
  v_juror_name TEXT;
  v_pin        TEXT;
  v_pin_hash   TEXT;
BEGIN
  -- Fetch juror org + name
  SELECT organization_id, juror_name
  INTO v_org_id, v_juror_name
  FROM jurors
  WHERE id = p_juror_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'juror_not_found')::JSON;
  END IF;

  -- Verify caller is admin for this org (or super-admin)
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  -- Generate a new 4-digit PIN
  v_pin      := lpad(floor(random() * 10000)::TEXT, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'));

  -- Clear lockout + write new PIN atomically
  UPDATE juror_period_auth
  SET failed_attempts    = 0,
      is_blocked         = false,
      locked_until       = NULL,
      locked_at          = NULL,
      pin_hash           = v_pin_hash,
      pin_pending_reveal = v_pin
  WHERE juror_id = p_juror_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'auth_row_not_found')::JSON;
  END IF;

  -- Single combined audit event
  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'juror.pin_unlocked_and_reset',
    'juror_period_auth',
    p_juror_id,
    jsonb_build_object(
      'period_id',  p_period_id,
      'juror_id',   p_juror_id,
      'juror_name', v_juror_name
    )
  );

  RETURN jsonb_build_object(
    'ok',             true,
    'pin_plain_once', v_pin
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_juror_unlock_pin(UUID, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- D2) ORG ADMIN HELPERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- _assert_org_admin
-- =============================================================================
-- Raises 'unauthorized' if caller is not an org admin for p_org_id (or super-admin).

CREATE OR REPLACE FUNCTION _assert_org_admin(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = p_org_id OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION _assert_org_admin(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_find_user_by_email
-- =============================================================================
-- Used by the invite-org-admin Edge Function to check if a Supabase Auth user
-- already exists for the given email address.

CREATE OR REPLACE FUNCTION rpc_admin_find_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email_confirmed_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public AS $$
  SELECT u.id, u.email_confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

-- Restrict to service_role only — anon/authenticated must not call this
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- E) ADMIN ORG & TOKEN
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_admin_approve_application
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

-- =============================================================================
-- rpc_admin_reject_application
-- =============================================================================

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
-- rpc_admin_list_organizations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_list_organizations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(
    json_agg(
      jsonb_build_object(
        'id',                 o.id,
        'code',               o.code,
        'name',               o.name,
        'institution',        o.institution,
        'contact_email',      o.contact_email,
        'status',             o.status,
        'settings',           o.settings,
        'created_at',         o.created_at,
        'updated_at',         o.updated_at,
        'active_period_name', p_curr.name,
        'juror_count',        j_cnt.juror_count,
        'project_count',      pr_cnt.project_count,
        'memberships',        m_agg.data,
        'org_applications',   a_agg.data
      ) ORDER BY o.name
    ),
    '[]'::json
  )
  INTO v_result
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT name
    FROM periods
    WHERE organization_id = o.id AND is_current = true
    LIMIT 1
  ) p_curr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS juror_count
    FROM jurors j
    WHERE j.organization_id = o.id
  ) j_cnt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS project_count
    FROM periods cp
    JOIN projects pr ON pr.period_id = cp.id
    WHERE cp.organization_id = o.id AND cp.is_current = true
  ) pr_cnt ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              m.id,
          'user_id',         m.user_id,
          'organization_id', m.organization_id,
          'role',            m.role,
          'created_at',      m.created_at,
          'profiles', jsonb_build_object(
            'id',           p.id,
            'display_name', p.display_name,
            'email',        u.email
          )
        )
      ),
      '[]'::json
    ) AS data
    FROM memberships m
    LEFT JOIN profiles p ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = o.id
  ) m_agg ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              a.id,
          'organization_id', a.organization_id,
          'applicant_name',  a.applicant_name,
          'contact_email',   a.contact_email,
          'status',          a.status,
          'created_at',      a.created_at
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
-- rpc_admin_create_org_and_membership  (self-serve signup: creates org + active membership atomically)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_create_org_and_membership(
  p_name        TEXT,
  p_org_name    TEXT,
  p_institution TEXT DEFAULT '',
  p_department  TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id  UUID;
  v_code    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'not_authenticated')::JSON;
  END IF;

  IF p_org_name IS NULL OR trim(p_org_name) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'org_name_required')::JSON;
  END IF;

  -- Generate a unique short code from org name prefix + random hex suffix
  v_code := upper(regexp_replace(left(p_org_name, 4), '[^A-Z0-9]', '', 'g'))
            || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  -- Ensure profile row exists (Google OAuth trigger may not have run yet)
  INSERT INTO public.profiles(id) VALUES (v_user_id) ON CONFLICT (id) DO NOTHING;

  -- Create organization
  INSERT INTO public.organizations(code, name, institution, status)
  VALUES (v_code, trim(p_org_name), trim(COALESCE(p_institution, '')), 'active')
  RETURNING id INTO v_org_id;

  -- Create active org_admin membership
  INSERT INTO public.memberships(user_id, organization_id, role, status)
  VALUES (v_user_id, v_org_id, 'org_admin', 'active');

  -- Audit
  PERFORM public._audit_write(
    v_org_id,
    'organization.created',
    'organizations',
    v_org_id,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object('org_name', p_org_name, 'created_by', v_user_id, 'flow', 'self_serve'),
    jsonb_build_object('before', null, 'after', jsonb_build_object('status', 'active', 'role', 'org_admin'))
  );

  RETURN jsonb_build_object('ok', true, 'organization_id', v_org_id)::JSON;
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error_code', 'org_name_taken')::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_create_org_and_membership(TEXT, TEXT, TEXT, TEXT) TO authenticated;

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
  SET is_revoked = true, revoked_at = now()
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

-- =============================================================================
-- rpc_admin_revoke_entry_token
-- =============================================================================
-- Revokes all active (non-revoked) entry tokens for a period by period_id.
-- Returns JSON: { active_juror_count, revoked_count }
-- Called by: src/shared/api/admin/tokens.js revokeEntryToken()

CREATE OR REPLACE FUNCTION public.rpc_admin_revoke_entry_token(p_period_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id           UUID;
  v_is_admin         BOOLEAN;
  v_revoked_count    INT;
  v_active_jurors    INT;
BEGIN
  SELECT p.organization_id INTO v_org_id
  FROM periods p
  WHERE p.id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  -- Count active juror sessions before revoking
  SELECT COUNT(*) INTO v_active_jurors
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash IS NOT NULL
    AND final_submitted_at IS NULL
    AND (session_expires_at IS NULL OR session_expires_at > now());

  -- Revoke all active tokens for this period
  UPDATE entry_tokens
  SET is_revoked = true, revoked_at = now()
  WHERE period_id = p_period_id
    AND is_revoked = false;

  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'token.revoke',
    'entry_tokens',
    p_period_id,
    jsonb_build_object(
      'period_id',        p_period_id,
      'revoked_count',    v_revoked_count,
      'active_jurors',    v_active_jurors
    )
  );

  RETURN jsonb_build_object(
    'ok',                true,
    'active_juror_count', v_active_jurors,
    'revoked_count',      v_revoked_count
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_request_unlock
-- =============================================================================
-- Org admin asks super admin to unlock a period that already has scores.
-- Creates a pending unlock_requests row; super admin resolves via
-- rpc_super_admin_resolve_unlock. Idempotent per period (unique partial index
-- enforces one pending request per period at a time).

CREATE OR REPLACE FUNCTION public.rpc_admin_request_unlock(
  p_period_id UUID,
  p_reason    TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id       UUID;
  v_period_name  TEXT;
  v_is_locked    BOOLEAN;
  v_is_admin     BOOLEAN;
  v_has_scores   BOOLEAN;
  v_request_id   UUID;
  v_reason       TEXT;
BEGIN
  v_reason := btrim(COALESCE(p_reason, ''));
  IF char_length(v_reason) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'reason_too_short')::JSON;
  END IF;

  SELECT organization_id, name, is_locked
    INTO v_org_id, v_period_name, v_is_locked
  FROM periods
  WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found')::JSON;
  END IF;

  IF NOT COALESCE(v_is_locked, false) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_locked')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = v_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM score_sheets ss
    JOIN projects pr ON pr.id = ss.project_id
    WHERE pr.period_id = p_period_id
  ) INTO v_has_scores;

  IF NOT v_has_scores THEN
    -- No scores yet: client should call rpc_admin_set_period_lock(_, false) directly.
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_has_no_scores')::JSON;
  END IF;

  BEGIN
    INSERT INTO unlock_requests (period_id, organization_id, requested_by, reason)
    VALUES (p_period_id, v_org_id, auth.uid(), v_reason)
    RETURNING id INTO v_request_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'pending_request_exists')::JSON;
  END;

  PERFORM public._audit_write(
    v_org_id,
    'unlock_request.create',
    'unlock_requests',
    v_request_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'period_id',   p_period_id,
      'period_name', v_period_name,
      'reason',      v_reason
    )
  );

  RETURN jsonb_build_object(
    'ok',         true,
    'request_id', v_request_id
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_request_unlock(UUID, TEXT) TO authenticated;

-- =============================================================================
-- rpc_super_admin_resolve_unlock
-- =============================================================================
-- Super admin approves/rejects a pending unlock_requests row.
-- approved → period.is_locked = false + audit severity=high
-- rejected → status update only + audit severity=medium

CREATE OR REPLACE FUNCTION public.rpc_super_admin_resolve_unlock(
  p_request_id UUID,
  p_decision   TEXT,
  p_note       TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_request      unlock_requests%ROWTYPE;
  v_period_name  TEXT;
  v_severity     audit_severity;
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_decision')::JSON;
  END IF;

  SELECT * INTO v_request
  FROM unlock_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'request_not_found')::JSON;
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'request_not_pending')::JSON;
  END IF;

  SELECT name INTO v_period_name FROM periods WHERE id = v_request.period_id;

  UPDATE unlock_requests
  SET status      = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = NULLIF(btrim(COALESCE(p_note, '')), '')
  WHERE id = p_request_id;

  IF p_decision = 'approved' THEN
    UPDATE periods SET is_locked = false WHERE id = v_request.period_id;
    v_severity := 'high'::audit_severity;
  ELSE
    v_severity := 'medium'::audit_severity;
  END IF;

  PERFORM public._audit_write(
    v_request.organization_id,
    'unlock_request.resolve',
    'unlock_requests',
    p_request_id,
    'config'::audit_category,
    v_severity,
    jsonb_build_object(
      'period_id',   v_request.period_id,
      'period_name', v_period_name,
      'decision',    p_decision,
      'review_note', NULLIF(btrim(COALESCE(p_note, '')), ''),
      'requested_by', v_request.requested_by
    )
  );

  RETURN jsonb_build_object(
    'ok',           true,
    'request_id',   p_request_id,
    'decision',     p_decision,
    'period_id',    v_request.period_id,
    'organization_id', v_request.organization_id,
    'requested_by', v_request.requested_by
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_super_admin_resolve_unlock(UUID, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- rpc_admin_list_unlock_requests
-- =============================================================================
-- Lists unlock requests visible to caller (RLS applies: org admin sees own org,
-- super admin sees all). Filter by status. Joins period + requester + reviewer
-- display names. Default: pending only.

CREATE OR REPLACE FUNCTION public.rpc_admin_list_unlock_requests(
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'created_at' DESC), '[]'::jsonb)::JSON
  FROM (
    SELECT jsonb_build_object(
      'id',               ur.id,
      'period_id',        ur.period_id,
      'period_name',      p.name,
      'organization_id',  ur.organization_id,
      'organization_name', o.name,
      'requested_by',     ur.requested_by,
      'requester_name',   rp.display_name,
      'reason',           ur.reason,
      'status',           ur.status,
      'reviewed_by',      ur.reviewed_by,
      'reviewer_name',    vp.display_name,
      'reviewed_at',      ur.reviewed_at,
      'review_note',      ur.review_note,
      'created_at',       ur.created_at
    ) AS row
    FROM unlock_requests ur
    JOIN periods       p  ON p.id = ur.period_id
    JOIN organizations o  ON o.id = ur.organization_id
    LEFT JOIN profiles rp ON rp.id = ur.requested_by
    LEFT JOIN profiles vp ON vp.id = ur.reviewed_by
    WHERE (
      public.current_user_is_super_admin()
      OR ur.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
    )
    AND (p_status IS NULL OR p_status = 'all' OR ur.status = p_status)
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_list_unlock_requests(TEXT) TO authenticated;

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

-- Drop old single-argument signature so the new (UUID, BOOLEAN) overload is
-- unambiguous for PostgREST callers that omit p_force.
DROP FUNCTION IF EXISTS public.rpc_period_freeze_snapshot(UUID);

CREATE OR REPLACE FUNCTION public.rpc_period_freeze_snapshot(
  p_period_id UUID,
  p_force     BOOLEAN DEFAULT false
)
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

  -- Force re-seed: clear existing snapshot so the new framework's data is copied fresh.
  -- Used when a framework is reassigned to a period that already has a snapshot.
  IF p_force THEN
    DELETE FROM period_criterion_outcome_maps WHERE period_id = p_period_id;
    DELETE FROM period_outcomes                 WHERE period_id = p_period_id;
    DELETE FROM period_criteria                 WHERE period_id = p_period_id;
    UPDATE periods SET snapshot_frozen_at = NULL WHERE id = p_period_id;
    v_period.snapshot_frozen_at := NULL;
  END IF;

  -- Already frozen and has data — skip
  IF v_period.snapshot_frozen_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_criteria_count FROM period_criteria WHERE period_id = p_period_id;
    SELECT COUNT(*) INTO v_outcomes_count FROM period_outcomes WHERE period_id = p_period_id;
    IF v_outcomes_count > 0 THEN
      RETURN json_build_object('ok', true, 'already_frozen', true, 'criteria_count', v_criteria_count, 'outcomes_count', v_outcomes_count);
    END IF;
    -- Frozen but empty (template was empty when frozen) — reset and re-seed
    UPDATE periods SET snapshot_frozen_at = NULL WHERE id = p_period_id;
    v_period.snapshot_frozen_at := NULL;
  END IF;

  INSERT INTO period_criteria (
    period_id, source_criterion_id, key, label,
    description, max_score, weight, color, rubric_bands, sort_order
  )
  SELECT p_period_id, fc.id, fc.key, fc.label,
    fc.description, fc.max_score, fc.weight, fc.color, fc.rubric_bands, fc.sort_order
  FROM framework_criteria fc
  WHERE fc.framework_id = v_period.framework_id
  ON CONFLICT (period_id, key) DO NOTHING;

  GET DIAGNOSTICS v_criteria_count = ROW_COUNT;

  INSERT INTO period_outcomes (
    period_id, source_outcome_id, code, label, description, sort_order
  )
  SELECT p_period_id, fo.id, fo.code, fo.label, fo.description, fo.sort_order
  FROM framework_outcomes fo
  WHERE fo.framework_id = v_period.framework_id
  ON CONFLICT (period_id, code) DO NOTHING;

  GET DIAGNOSTICS v_outcomes_count = ROW_COUNT;

  INSERT INTO period_criterion_outcome_maps (
    period_id, period_criterion_id, period_outcome_id, coverage_type, weight
  )
  SELECT p_period_id, pc.id, po.id, fcom.coverage_type, fcom.weight
  FROM framework_criterion_outcome_maps fcom
  JOIN period_criteria pc ON pc.source_criterion_id = fcom.criterion_id AND pc.period_id = p_period_id
  JOIN period_outcomes po ON po.source_outcome_id = fcom.outcome_id AND po.period_id = p_period_id
  WHERE fcom.framework_id = v_period.framework_id
  ON CONFLICT DO NOTHING;

  UPDATE periods SET snapshot_frozen_at = now() WHERE id = p_period_id;

  RETURN json_build_object('ok', true, 'already_frozen', false, 'criteria_count', v_criteria_count, 'outcomes_count', v_outcomes_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_period_freeze_snapshot(UUID, BOOLEAN) TO authenticated;

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

-- =============================================================================
-- rpc_admin_write_audit_event
-- =============================================================================
-- Server enforces category + severity + actor_type; client cannot override.
-- IP/UA extracted from PostgREST headers with event-field fallback.

CREATE OR REPLACE FUNCTION public.rpc_admin_write_audit_event(
  p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id        UUID;
  v_action        TEXT;
  v_category      audit_category;
  v_severity      audit_severity;
  v_actor_type    audit_actor_type;
  v_resource_type TEXT;
  v_resource_id   UUID;
  v_details       JSONB;
  v_diff          JSONB;
  v_ip            INET;
  v_ua            TEXT;
  v_session_id    UUID;
  v_corr_id       UUID;
  v_actor_name    TEXT;
  v_req_headers   JSON;
  v_ip_raw        TEXT;
BEGIN
  -- Caller must be an authenticated admin
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthenticated');
  END IF;

  v_action        := p_event->>'action';
  v_resource_type := p_event->>'resourceType';
  v_details       := COALESCE((p_event->'details')::JSONB, '{}'::JSONB);
  v_diff          := (p_event->'diff')::JSONB;

  -- Resolve org from details or explicit field
  v_org_id := CASE
    WHEN p_event->>'organizationId' IS NOT NULL
      THEN (p_event->>'organizationId')::UUID
    WHEN v_details->>'organizationId' IS NOT NULL
      THEN (v_details->>'organizationId')::UUID
    ELSE NULL
  END;

  -- Verify caller belongs to that org (or is super-admin)
  IF v_org_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND (organization_id = v_org_id OR organization_id IS NULL)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized');
    END IF;
  END IF;

  IF p_event->>'resourceId' IS NOT NULL THEN
    v_resource_id := (p_event->>'resourceId')::UUID;
  END IF;

  -- ── IP / UA extraction ───────────────────────────────────────────────────
  BEGIN
    v_req_headers := current_setting('request.headers', true)::JSON;
  EXCEPTION WHEN OTHERS THEN
    v_req_headers := NULL;
  END;

  v_ua := COALESCE(
    NULLIF(p_event->>'ua', ''),
    NULLIF(v_req_headers->>'user-agent', '')
  );

  IF p_event->>'ip' IS NOT NULL AND p_event->>'ip' <> '' THEN
    BEGIN
      v_ip := (p_event->>'ip')::INET;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  IF v_ip IS NULL AND v_req_headers IS NOT NULL THEN
    v_ip_raw := NULLIF(trim(split_part(v_req_headers->>'x-forwarded-for', ',', 1)), '');
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
  -- ─────────────────────────────────────────────────────────────────────────

  v_session_id := (p_event->>'sessionId')::UUID;
  v_corr_id    := (p_event->>'correlationId')::UUID;
  v_actor_name := COALESCE(v_details->>'actor_name', v_details->>'adminName');

  -- ── Category ─────────────────────────────────────────────────────────────
  v_category := CASE
    WHEN v_action IN (
      'admin.login', 'admin.logout', 'admin.session_expired',
      'auth.admin.login.success', 'auth.admin.login.failure',
      'auth.admin.password.changed', 'auth.admin.password.reset.requested'
    ) THEN 'auth'

    WHEN v_action IN (
      'admin.create', 'admin.updated', 'admin.role_granted', 'admin.role_revoked'
    ) THEN 'access'

    WHEN v_action IN (
      'period.create', 'period.update', 'period.delete',
      'period.set_current', 'period.lock', 'period.unlock',
      'periods.insert', 'periods.update', 'periods.delete',
      'criteria.save', 'criteria.update',
      'outcome.create', 'outcome.update', 'outcome.delete',
      'outcome.created', 'outcome.updated', 'outcome.deleted',
      'organization.status_changed',
      'framework.create', 'framework.update', 'framework.delete',
      'config.outcome.updated', 'config.outcome.deleted'
    ) THEN 'config'

    WHEN v_action LIKE 'export.%'
      OR v_action LIKE 'notification.%'
      OR v_action LIKE 'backup.%'
      OR v_action LIKE 'token.%'
      OR v_action LIKE 'security.%'
    THEN 'security'

    ELSE 'data'
  END::audit_category;

  -- ── Severity ─────────────────────────────────────────────────────────────
  v_severity := CASE
    WHEN v_action IN (
      'period.lock', 'period.unlock',
      'organization.status_changed',
      'backup.deleted',
      'security.entry_token.revoked',
      'security.anomaly.detected'
    ) THEN 'high'

    WHEN v_action IN (
      'admin.create',
      'pin.reset',
      'juror.pin_unlocked', 'juror.edit_mode_enabled',
      'period.set_current',
      'snapshot.freeze',
      'application.approved', 'application.rejected',
      'token.revoke',
      'export.audit',
      'backup.downloaded',
      'criteria.save', 'criteria.update',
      'outcome.create', 'outcome.update', 'outcome.delete',
      'outcome.created', 'outcome.updated', 'outcome.deleted',
      'config.outcome.updated',
      'auth.admin.password.changed',
      'data.juror.edit_mode.force_closed'
    ) THEN 'medium'

    WHEN v_action IN (
      'admin.updated',
      'juror.edit_mode_closed_on_resubmit',
      'token.generate',
      'export.scores', 'export.rankings', 'export.heatmap',
      'export.analytics', 'export.backup',
      'backup.created',
      'config.outcome.deleted',
      'auth.admin.password.reset.requested',
      'notification.entry_token', 'notification.juror_pin',
      'notification.export_report', 'notification.admin_invite',
      'notification.application'
    ) THEN 'low'

    ELSE 'info'
  END::audit_severity;

  -- ── Actor type ───────────────────────────────────────────────────────────
  v_actor_type := CASE
    WHEN v_action IN (
      'evaluation.complete', 'score.update', 'data.score.submitted'
    ) THEN 'juror'

    WHEN v_action IN (
      'snapshot.freeze',
      'juror.pin_locked', 'data.juror.pin.locked',
      'juror.edit_mode_closed_on_resubmit', 'data.juror.edit_mode.closed',
      'security.anomaly.detected'
    ) THEN 'system'

    ELSE 'admin'
  END::audit_actor_type;
  -- ─────────────────────────────────────────────────────────────────────────

  INSERT INTO audit_logs (
    organization_id, user_id, action, resource_type, resource_id,
    category, severity, actor_type, actor_name,
    ip_address, user_agent, session_id, correlation_id,
    details, diff
  ) VALUES (
    v_org_id, auth.uid(), v_action, v_resource_type, v_resource_id,
    v_category, v_severity, v_actor_type, v_actor_name,
    v_ip, v_ua, v_session_id, v_corr_id,
    v_details, v_diff
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_write_audit_event(JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_log_period_lock
-- =============================================================================
-- Called by admin panel when locking/unlocking an evaluation period.
-- Validates action, asserts org-admin, delegates to _audit_write (category='config').

CREATE OR REPLACE FUNCTION public.rpc_admin_log_period_lock(
  p_period_id UUID,
  p_action    TEXT,   -- 'period.lock' | 'period.unlock'
  p_ctx       JSONB   -- {ip, ua, session_id}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_period_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthenticated');
  END IF;

  SELECT organization_id, name INTO v_org_id, v_period_name
  FROM periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'period_not_found');
  END IF;

  IF p_action NOT IN ('period.lock', 'period.unlock') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_action');
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  PERFORM public._audit_write(
    v_org_id,
    p_action,
    'periods',
    p_period_id,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'period_id',  p_period_id,
      'legacy_ctx', COALESCE(p_ctx, '{}'::jsonb)
    ),
    NULL::JSONB,
    'admin'::audit_actor_type
  );

  RETURN jsonb_build_object('ok', true, 'periodName', v_period_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_log_period_lock(UUID, TEXT, JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- I) PUBLIC AUTH HELPERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_check_email_available
-- Public RPC callable by anon. Uses SECURITY DEFINER to access auth.users.
-- Returns { available: bool, reason?: 'email_already_registered' | 'application_already_pending' }
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_check_email_available(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email      TEXT;
  v_in_auth    BOOLEAN;
  v_in_pending BOOLEAN;
BEGIN
  v_email := lower(trim(p_email));

  IF v_email = '' OR v_email IS NULL THEN
    RETURN jsonb_build_object('available', false, 'reason', 'email_required');
  END IF;

  -- Check auth.users (SECURITY DEFINER allows access to auth schema)
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE lower(email) = v_email
  ) INTO v_in_auth;

  IF v_in_auth THEN
    RETURN jsonb_build_object('available', false, 'reason', 'email_already_registered');
  END IF;

  -- Check for a pending application with the same email
  SELECT EXISTS(
    SELECT 1 FROM org_applications
    WHERE lower(trim(contact_email)) = v_email
      AND status = 'pending'
  ) INTO v_in_pending;

  IF v_in_pending THEN
    RETURN jsonb_build_object('available', false, 'reason', 'application_already_pending');
  END IF;

  RETURN jsonb_build_object('available', true);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_check_email_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_check_email_available(TEXT) TO authenticated;

-- =============================================================================
-- rpc_public_auth_flags
-- =============================================================================
-- Returns only the three public-facing auth toggles from security_policy.
-- Callable by anon (login screen uses this to hide disabled auth methods).

CREATE OR REPLACE FUNCTION public.rpc_public_auth_flags()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy JSONB;
BEGIN
  SELECT policy INTO v_policy FROM security_policy WHERE id = 1;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'googleOAuth',   true,
      'emailPassword', true,
      'rememberMe',    true
    );
  END IF;
  RETURN json_build_object(
    'googleOAuth',   COALESCE((v_policy->>'googleOAuth')::BOOLEAN,   true),
    'emailPassword', COALESCE((v_policy->>'emailPassword')::BOOLEAN, true),
    'rememberMe',    COALESCE((v_policy->>'rememberMe')::BOOLEAN,    true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_auth_flags() TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- J) JOIN REQUEST FLOW
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- rpc_public_search_organizations
-- =============================================================================
-- Anon-accessible search for the registration org-discovery dropdown.
-- Returns only non-sensitive data: name, institution, member count.

CREATE OR REPLACE FUNCTION public.rpc_public_search_organizations(p_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results JSON;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::JSON)
  INTO v_results
  FROM (
    SELECT
      o.id,
      o.name,
      o.institution,
      (SELECT count(*) FROM memberships m
       WHERE m.organization_id = o.id AND m.status = 'active') AS member_count
    FROM organizations o
    WHERE o.status = 'active'
      AND (
        LOWER(o.name) LIKE LOWER(trim(p_query)) || '%'
        OR LOWER(COALESCE(o.institution, '')) LIKE '%' || LOWER(trim(p_query)) || '%'
      )
    ORDER BY o.name
    LIMIT 20
  ) r;

  RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_search_organizations(TEXT) TO anon, authenticated;

-- =============================================================================
-- rpc_request_to_join_org
-- =============================================================================
-- Authenticated user requests to join an existing organization.
-- Creates a membership row with status='requested'.

CREATE OR REPLACE FUNCTION public.rpc_request_to_join_org(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_org_name   TEXT;
  v_existing   TEXT;
  v_membership UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'not_authenticated')::JSON;
  END IF;

  -- Verify organization exists and is active
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_org_id AND status = 'active';

  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'org_not_found')::JSON;
  END IF;

  -- Check for existing membership (any status)
  SELECT status INTO v_existing
  FROM memberships WHERE user_id = v_user_id AND organization_id = p_org_id;

  IF v_existing = 'active' OR v_existing = 'invited' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'already_member')::JSON;
  END IF;
  IF v_existing = 'requested' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'already_requested')::JSON;
  END IF;

  -- Ensure profile row exists (Google OAuth safety)
  INSERT INTO profiles(id) VALUES (v_user_id) ON CONFLICT (id) DO NOTHING;

  -- Create requested membership
  INSERT INTO memberships (user_id, organization_id, role, status)
  VALUES (v_user_id, p_org_id, 'org_admin', 'requested')
  RETURNING id INTO v_membership;

  -- Audit
  PERFORM public._audit_write(
    p_org_id,
    'membership.join_requested',
    'memberships',
    v_membership,
    'access'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object('org_name', v_org_name, 'requester_id', v_user_id)
  );

  RETURN jsonb_build_object('ok', true, 'membership_id', v_membership)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_request_to_join_org(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_approve_join_request
-- =============================================================================
-- Org admin promotes a 'requested' membership to 'active'.

CREATE OR REPLACE FUNCTION public.rpc_admin_approve_join_request(p_membership_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id     UUID;
  v_user_id    UUID;
  v_org_name   TEXT;
  v_user_email TEXT;
BEGIN
  -- Find the requested membership
  SELECT organization_id, user_id INTO v_org_id, v_user_id
  FROM memberships
  WHERE id = p_membership_id AND status = 'requested';

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'request_not_found')::JSON;
  END IF;

  -- Verify caller is org admin
  PERFORM public._assert_org_admin(v_org_id);

  -- Promote to active
  UPDATE memberships SET status = 'active' WHERE id = p_membership_id;

  -- Gather context for audit
  SELECT name INTO v_org_name FROM organizations WHERE id = v_org_id;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  PERFORM public._audit_write(
    v_org_id,
    'membership.join_approved',
    'memberships',
    p_membership_id,
    'access'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'org_name', v_org_name,
      'approved_user_id', v_user_id,
      'approved_user_email', v_user_email,
      'approved_by', auth.uid()
    ),
    jsonb_build_object('before', jsonb_build_object('status', 'requested'), 'after', jsonb_build_object('status', 'active'))
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_approve_join_request(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_reject_join_request
-- =============================================================================
-- Org admin rejects and deletes a 'requested' membership.

CREATE OR REPLACE FUNCTION public.rpc_admin_reject_join_request(p_membership_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id     UUID;
  v_user_id    UUID;
  v_org_name   TEXT;
  v_user_email TEXT;
BEGIN
  -- Find the requested membership
  SELECT organization_id, user_id INTO v_org_id, v_user_id
  FROM memberships
  WHERE id = p_membership_id AND status = 'requested';

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'request_not_found')::JSON;
  END IF;

  -- Verify caller is org admin
  PERFORM public._assert_org_admin(v_org_id);

  -- Gather context for audit before deletion
  SELECT name INTO v_org_name FROM organizations WHERE id = v_org_id;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Delete the requested membership
  DELETE FROM memberships WHERE id = p_membership_id;

  PERFORM public._audit_write(
    v_org_id,
    'membership.join_rejected',
    'memberships',
    p_membership_id,
    'access'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'org_name', v_org_name,
      'rejected_user_id', v_user_id,
      'rejected_user_email', v_user_email,
      'rejected_by', auth.uid()
    )
  );

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_reject_join_request(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_clone_framework
-- Deep-clones a framework (rows, outcomes, criteria, maps) into a new
-- org-owned copy. Used by OutcomesPage and period setup.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_clone_framework(
  p_framework_id UUID,
  p_new_name     TEXT,
  p_org_id       UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_is_admin    BOOLEAN;
  v_new_fw_id   UUID;
  v_outcome_map JSONB := '{}';
  v_crit_map    JSONB := '{}';
  r             RECORD;
  v_new_id      UUID;
BEGIN
  -- Auth: caller must be admin (or super-admin) of p_org_id
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = p_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Validate source framework exists and is accessible to this org
  IF NOT EXISTS(
    SELECT 1 FROM frameworks
    WHERE id = p_framework_id
      AND (organization_id IS NULL OR organization_id = p_org_id)
  ) THEN
    RAISE EXCEPTION 'source_framework_not_found';
  END IF;

  -- 1. Clone the frameworks row
  INSERT INTO frameworks (
    organization_id, name, description, default_threshold
  )
  SELECT
    p_org_id, p_new_name, description, default_threshold
  FROM frameworks
  WHERE id = p_framework_id
  RETURNING id INTO v_new_fw_id;

  -- 2. Clone framework_outcomes, track old→new UUID mapping
  FOR r IN
    SELECT * FROM framework_outcomes
    WHERE framework_id = p_framework_id
    ORDER BY sort_order
  LOOP
    INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order)
    VALUES (v_new_fw_id, r.code, r.label, r.description, r.sort_order)
    RETURNING id INTO v_new_id;

    v_outcome_map := v_outcome_map || jsonb_build_object(r.id::TEXT, v_new_id::TEXT);
  END LOOP;

  -- 3. Clone framework_criteria, track old→new UUID mapping
  FOR r IN
    SELECT * FROM framework_criteria
    WHERE framework_id = p_framework_id
    ORDER BY sort_order
  LOOP
    INSERT INTO framework_criteria (
      framework_id, key, label, description,
      max_score, weight, color, rubric_bands, sort_order
    )
    VALUES (
      v_new_fw_id, r.key, r.label, r.description,
      r.max_score, r.weight, r.color, r.rubric_bands, r.sort_order
    )
    RETURNING id INTO v_new_id;

    v_crit_map := v_crit_map || jsonb_build_object(r.id::TEXT, v_new_id::TEXT);
  END LOOP;

  -- 4. Clone framework_criterion_outcome_maps with remapped IDs
  FOR r IN
    SELECT * FROM framework_criterion_outcome_maps
    WHERE framework_id = p_framework_id
  LOOP
    -- Skip orphaned maps (shouldn't exist, but guard against it)
    CONTINUE WHEN (v_crit_map ->> r.criterion_id::TEXT) IS NULL;
    CONTINUE WHEN (v_outcome_map ->> r.outcome_id::TEXT) IS NULL;

    INSERT INTO framework_criterion_outcome_maps (
      framework_id, criterion_id, outcome_id, coverage_type, weight
    )
    VALUES (
      v_new_fw_id,
      (v_crit_map ->> r.criterion_id::TEXT)::UUID,
      (v_outcome_map ->> r.outcome_id::TEXT)::UUID,
      r.coverage_type,
      r.weight
    );
  END LOOP;

  RETURN v_new_fw_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_clone_framework(UUID, TEXT, UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- rpc_admin_duplicate_period
-- Clones an existing period's configuration into a brand-new period:
--   • new periods row ("<name> (copy)", same season/description, dates NULL,
--     is_current=false, is_locked=false, is_visible=true, criteria_name copied)
--   • if source has a framework, clones it ("<framework_name> (copy)") and
--     attaches to the new period
--   • freezes the snapshot so period_criteria / period_outcomes /
--     period_criterion_outcome_maps are populated immediately
-- Does NOT copy runtime data (projects, jurors, scores, tokens, audit).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_period(
  p_source_period_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_src            periods%ROWTYPE;
  v_new_period_id  UUID;
  v_new_name       TEXT;
  v_new_fw_name    TEXT;
  v_new_fw_id      UUID;
  v_src_fw_name    TEXT;
BEGIN
  SELECT * INTO v_src FROM periods WHERE id = p_source_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_src.organization_id);

  v_new_name := v_src.name || ' (copy)';

  -- Clone framework first (if any), so new period owns an independent config
  -- and edits to its criteria/outcomes don't leak back to the source.
  IF v_src.framework_id IS NOT NULL THEN
    SELECT name INTO v_src_fw_name FROM frameworks WHERE id = v_src.framework_id;
    v_new_fw_name := COALESCE(v_src_fw_name, 'Framework') || ' (copy)';
    v_new_fw_id := public.rpc_admin_clone_framework(
      v_src.framework_id,
      v_new_fw_name,
      v_src.organization_id
    );
  END IF;

  INSERT INTO periods (
    organization_id, framework_id, name, season, description,
    start_date, end_date, is_current, is_locked, is_visible, criteria_name
  ) VALUES (
    v_src.organization_id,
    v_new_fw_id,
    v_new_name,
    v_src.season,
    v_src.description,
    NULL,
    NULL,
    false,
    false,
    true,
    v_src.criteria_name
  )
  RETURNING id INTO v_new_period_id;

  -- Freeze the snapshot so period_criteria / period_outcomes / maps are
  -- populated right away. Non-fatal if it fails (no framework case).
  IF v_new_fw_id IS NOT NULL THEN
    PERFORM public.rpc_period_freeze_snapshot(v_new_period_id, false);
  END IF;

  RETURN v_new_period_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_duplicate_period(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- rpc_admin_set_period_criteria_name
-- Sets criteria_name on a period to record that criteria setup has been
-- initiated (e.g. "Custom Criteria" for blank start, or a framework name).
-- Passing NULL clears the name (resets to unconfigured state).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_set_period_criteria_name(
  p_period_id UUID,
  p_name      TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;
  PERFORM public._assert_org_admin(v_org_id);
  UPDATE periods
  SET criteria_name = p_name,
      updated_at    = now()
  WHERE id = p_period_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_period_criteria_name(UUID, TEXT) TO authenticated;

