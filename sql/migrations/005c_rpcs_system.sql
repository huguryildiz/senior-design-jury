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

-- =============================================================================
-- rpc_admin_set_current_period
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_current_period(
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id       UUID;
  v_period_name  TEXT;
  v_activated_at TIMESTAMPTZ;
  v_row          JSONB;
BEGIN
  SELECT organization_id, name, activated_at
    INTO v_org_id, v_period_name, v_activated_at
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  -- Unset all current flags for this org
  UPDATE periods
  SET is_current = false
  WHERE organization_id = v_org_id AND is_current = true;

  -- Set target as current; stamp activated_at on first activation
  UPDATE periods
  SET is_current = true,
      activated_at = COALESCE(activated_at, now())
  WHERE id = p_period_id
  RETURNING to_jsonb(periods.*) INTO v_row;

  PERFORM public._audit_write(
    v_org_id,
    'period.set_current',
    'periods',
    p_period_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'activated_at', COALESCE(v_activated_at, now())
    )
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_current_period(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_set_period_lock
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_period_lock(
  p_period_id UUID,
  p_locked    BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_period_name TEXT;
  v_prev_locked BOOLEAN;
BEGIN
  SELECT organization_id, name, is_locked
    INTO v_org_id, v_period_name, v_prev_locked
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE periods
  SET is_locked = COALESCE(p_locked, false)
  WHERE id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    CASE WHEN p_locked THEN 'period.lock' ELSE 'period.unlock' END,
    'periods',
    p_period_id,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'period_id', p_period_id,
      'previous_locked', v_prev_locked,
      'new_locked', COALESCE(p_locked, false)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'period_id', p_period_id,
    'is_locked', COALESCE(p_locked, false),
    'periodName', v_period_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_period_lock(UUID, BOOLEAN) TO authenticated;

-- =============================================================================
-- rpc_admin_save_period_criteria
-- =============================================================================
-- p_criteria is a JSONB array where each element has:
--   { key, label, shortLabel, color, max, blurb, outcomes: [code,...], rubric: [...] }

CREATE OR REPLACE FUNCTION public.rpc_admin_save_period_criteria(
  p_period_id UUID,
  p_criteria  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id    UUID;
  v_total_max NUMERIC := 0;
  v_before    JSONB := '{}'::JSONB;
  v_after     JSONB := '{}'::JSONB;
  v_count     INT := 0;
  v_inserted  JSONB;
  v_elem      JSONB;
  v_key       TEXT;
  v_max       NUMERIC;
  v_crit_id   UUID;
  v_outcome_id UUID;
  v_code      TEXT;
BEGIN
  IF p_period_id IS NULL THEN
    RAISE EXCEPTION 'period_id_required';
  END IF;
  IF jsonb_typeof(p_criteria) <> 'array' THEN
    RAISE EXCEPTION 'criteria_must_be_array';
  END IF;

  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  -- Before snapshot: {key}_max_score map
  SELECT COALESCE(
    jsonb_object_agg(pc.key || '_max_score', pc.max_score),
    '{}'::JSONB
  )
  INTO v_before
  FROM period_criteria pc
  WHERE pc.period_id = p_period_id;

  -- Total max for weight calculation
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_criteria) LOOP
    v_total_max := v_total_max + COALESCE((v_elem->>'max')::NUMERIC, 0);
  END LOOP;

  -- Delete existing maps (FK before criteria delete)
  DELETE FROM period_criterion_outcome_maps WHERE period_id = p_period_id;
  DELETE FROM period_criteria WHERE period_id = p_period_id;

  -- Insert new criteria
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_criteria) LOOP
    v_key := v_elem->>'key';
    v_max := COALESCE((v_elem->>'max')::NUMERIC, 0);

    INSERT INTO period_criteria (
      period_id, key, label, short_label, description,
      max_score, weight, color, rubric_bands, sort_order
    ) VALUES (
      p_period_id,
      v_key,
      v_elem->>'label',
      COALESCE(v_elem->>'shortLabel', v_elem->>'label'),
      v_elem->>'blurb',
      v_max,
      CASE WHEN v_total_max > 0 THEN (v_max / v_total_max) * 100 ELSE 0 END,
      v_elem->>'color',
      CASE WHEN jsonb_typeof(v_elem->'rubric') = 'array' THEN v_elem->'rubric' ELSE NULL END,
      v_count
    )
    RETURNING id INTO v_crit_id;

    v_after := v_after || jsonb_build_object(v_key || '_max_score', v_max);
    v_count := v_count + 1;

    -- Insert outcome maps for this criterion
    IF jsonb_typeof(v_elem->'outcomes') = 'array' THEN
      FOR v_code IN SELECT value::TEXT FROM jsonb_array_elements_text(v_elem->'outcomes') LOOP
        SELECT id INTO v_outcome_id
        FROM period_outcomes
        WHERE period_id = p_period_id AND code = v_code
        LIMIT 1;

        IF v_outcome_id IS NOT NULL THEN
          INSERT INTO period_criterion_outcome_maps (
            period_id, period_criterion_id, period_outcome_id
          ) VALUES (
            p_period_id, v_crit_id, v_outcome_id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Collect the inserted rows for the return value
  SELECT jsonb_agg(to_jsonb(pc.*) ORDER BY pc.sort_order)
  INTO v_inserted
  FROM period_criteria pc
  WHERE pc.period_id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    'criteria.save',
    'periods',
    p_period_id,
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
