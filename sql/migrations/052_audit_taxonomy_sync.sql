-- sql/migrations/052_audit_taxonomy_sync.sql
-- Sync rpc_admin_write_audit_event CASE statements with the full action
-- taxonomy introduced across migrations 043–051.
--
-- Fixes:
--   • auth.admin.* actions were falling to ELSE → category='data'
--   • outcome.created/updated/deleted (new past-tense from M050) not in config
--   • period.lock/unlock/set_current/create/update not in config category
--   • auth.admin.password.changed severity was 'info' (should be medium)
--   • data.juror.edit_mode.force_closed severity was 'info' (should be medium)
--   • data.score.submitted actor_type was 'admin' (should be juror)
--   • data.juror.pin.locked actor_type was 'admin' (should be system)
--
-- Idempotent: CREATE OR REPLACE, no destructive changes.

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
    -- Auth events (legacy + new taxonomy)
    WHEN v_action IN (
      'admin.login', 'admin.logout', 'admin.session_expired',
      'auth.admin.login.success', 'auth.admin.login.failure',
      'auth.admin.password.changed', 'auth.admin.password.reset.requested'
    ) THEN 'auth'

    -- Access control
    WHEN v_action IN (
      'admin.create', 'admin.updated', 'admin.role_granted', 'admin.role_revoked'
    ) THEN 'access'

    -- Configuration changes (period lifecycle + criteria + outcomes + org + framework)
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

    -- Security / operational (LIKE patterns catch sub-namespaces)
    WHEN v_action LIKE 'export.%'
      OR v_action LIKE 'notification.%'
      OR v_action LIKE 'backup.%'
      OR v_action LIKE 'token.%'
      OR v_action LIKE 'security.%'
    THEN 'security'

    -- Data (evaluation, scoring, juror actions, projects, etc.)
    ELSE 'data'
  END::audit_category;

  -- ── Severity ─────────────────────────────────────────────────────────────
  v_severity := CASE
    WHEN v_action IN (
      'period.lock', 'period.unlock',
      'organization.status_changed',
      'backup.deleted',
      'security.entry_token.revoked'
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
      'juror.edit_mode_closed_on_resubmit', 'data.juror.edit_mode.closed'
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
