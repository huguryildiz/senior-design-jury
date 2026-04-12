    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object('criteriaCount', v_count),
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN COALESCE(v_inserted, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_save_period_criteria(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_create_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_create_framework_outcome(
  p_framework_id UUID,
  p_code         TEXT,
  p_label        TEXT,
  p_description  TEXT DEFAULT NULL,
  p_sort_order   INT  DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id  UUID;
  v_row     JSONB;
  v_new_id  UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM frameworks WHERE id = p_framework_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'framework_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order)
  VALUES (p_framework_id, p_code, p_label, p_description, p_sort_order)
  RETURNING id, to_jsonb(framework_outcomes.*) INTO v_new_id, v_row;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.created',
    'framework_outcomes',
    v_new_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object('outcome_code', p_code, 'outcome_label', p_label, 'framework_id', p_framework_id),
    jsonb_build_object('after', v_row)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_create_framework_outcome(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;

-- =============================================================================
-- rpc_admin_update_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_framework_outcome(
  p_outcome_id UUID,
  p_patch      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
  v_after  JSONB;
BEGIN
  SELECT f.organization_id, to_jsonb(fo.*)
    INTO v_org_id, v_before
  FROM framework_outcomes fo
  JOIN frameworks f ON f.id = fo.framework_id
  WHERE fo.id = p_outcome_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'outcome_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE framework_outcomes
  SET code        = COALESCE(p_patch->>'code', code),
      label       = COALESCE(p_patch->>'label', label),
      description = COALESCE(p_patch->>'description', description),
      sort_order  = COALESCE((p_patch->>'sort_order')::INT, sort_order)
  WHERE id = p_outcome_id
  RETURNING to_jsonb(framework_outcomes.*) INTO v_after;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.updated',
    'framework_outcomes',
    p_outcome_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'outcome_code', v_after->>'code',
      'outcome_label', v_after->>'label'
    ),
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN v_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_framework_outcome(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_delete_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_framework_outcome(
  p_outcome_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
BEGIN
  SELECT f.organization_id, to_jsonb(fo.*)
    INTO v_org_id, v_before
  FROM framework_outcomes fo
  JOIN frameworks f ON f.id = fo.framework_id
  WHERE fo.id = p_outcome_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'outcome_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  DELETE FROM framework_outcomes WHERE id = p_outcome_id;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.deleted',
    'framework_outcomes',
    p_outcome_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'outcome_code', v_before->>'code',
      'outcome_label', v_before->>'label'
    ),
    jsonb_build_object('before', v_before)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_framework_outcome(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_update_organization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_organization(
  p_org_id  UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev_status TEXT;
  v_prev_name   TEXT;
  v_prev_code   TEXT;
  v_row         JSONB;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id_required';
  END IF;

  PERFORM public._assert_org_admin(p_org_id);

  SELECT status, name, code
    INTO v_prev_status, v_prev_name, v_prev_code
  FROM organizations WHERE id = p_org_id;

  IF v_prev_status IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  UPDATE organizations
  SET name          = COALESCE(p_updates->>'name', name),
      code          = COALESCE(p_updates->>'code', code),
      institution   = CASE
                        WHEN p_updates ? 'institution' THEN p_updates->>'institution'
                        ELSE institution
                      END,
      contact_email = CASE
                        WHEN p_updates ? 'contact_email' THEN p_updates->>'contact_email'
                        ELSE contact_email
                      END,
      status        = COALESCE(p_updates->>'status', status)
  WHERE id = p_org_id
  RETURNING to_jsonb(organizations.*) INTO v_row;

  -- Audit: status change gets a dedicated high-severity event with diff
  IF p_updates ? 'status' AND (p_updates->>'status') IS DISTINCT FROM v_prev_status THEN
    PERFORM public._audit_write(
      p_org_id,
      'organization.status_changed',
      'organizations',
      p_org_id,
      'config'::audit_category,
      'high'::audit_severity,
      jsonb_build_object(
        'previousStatus', v_prev_status,
        'newStatus', v_row->>'status',
        'organizationCode', v_row->>'code',
        'reason', p_updates->>'reason'
      ),
      jsonb_build_object(
        'before', jsonb_build_object('status', v_prev_status),
        'after',  jsonb_build_object('status', v_row->>'status')
      )
    );
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_organization(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_update_member_profile
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_member_profile(
  p_user_id         UUID,
  p_display_name    TEXT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_new_name TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id_required';
  END IF;

  PERFORM public._assert_org_admin(p_organization_id);

  v_new_name := NULLIF(trim(COALESCE(p_display_name, '')), '');

  UPDATE profiles
  SET display_name = v_new_name
  WHERE id = p_user_id;

  PERFORM public._audit_write(
    p_organization_id,
    'admin.updated',
    'memberships',
    p_user_id,
    'access'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'adminName', v_new_name,
      'organizationId', p_organization_id
    )
  );

  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id, 'display_name', v_new_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_member_profile(UUID, TEXT, UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_revoke_entry_token
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_revoke_entry_token(
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id           UUID;
  v_revoked_count    INT;
  v_first_revoked_id UUID;
  v_active_count     INT;
  v_now              TIMESTAMPTZ := now();
BEGIN
  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  WITH revoked AS (
    UPDATE entry_tokens
    SET is_revoked = true
    WHERE period_id = p_period_id
      AND is_revoked = false
    RETURNING id
  )
  SELECT COUNT(*), MIN(id) INTO v_revoked_count, v_first_revoked_id FROM revoked;

  -- Count active sessions for this period (session_expires_at in the future or null)
  SELECT COUNT(*) INTO v_active_count
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash IS NOT NULL
    AND (session_expires_at IS NULL OR session_expires_at > v_now);

  IF v_revoked_count > 0 THEN
    PERFORM public._audit_write(
      v_org_id,
      'security.entry_token.revoked',
      'entry_tokens',
      v_first_revoked_id,
      'security'::audit_category,
      'high'::audit_severity,
      jsonb_build_object(
        'period_id', p_period_id,
        'revoked_count', v_revoked_count,
        'active_juror_count', v_active_count
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'revoked_count', v_revoked_count,
    'active_juror_count', v_active_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_force_close_juror_edit_mode
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_force_close_juror_edit_mode(
  p_juror_id  UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_juror_name  TEXT;
  v_period_name TEXT;
BEGIN
  IF p_juror_id IS NULL OR p_period_id IS NULL THEN
    RAISE EXCEPTION 'juror_id_and_period_id_required';
  END IF;

  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'juror_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  SELECT name INTO v_period_name FROM periods WHERE id = p_period_id;

  UPDATE juror_period_auth
  SET edit_enabled       = false,
      session_token_hash = NULL,
      edit_reason        = NULL,
      edit_expires_at    = NULL
  WHERE juror_id = p_juror_id
    AND period_id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    'data.juror.edit_mode.force_closed',
    'juror_period_auth',
    p_juror_id,
    'data'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'juror_name', v_juror_name,
      'juror_id', p_juror_id,
      'period_id', p_period_id,
      'period_name', v_period_name,
      'close_source', 'admin_force',
      'closed_at', now()
    )
  );

  RETURN jsonb_build_object('ok', true, 'juror_id', p_juror_id, 'period_id', p_period_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_force_close_juror_edit_mode(UUID, UUID) TO authenticated;

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
