-- VERA v1 — Helper Functions, Trigger Functions, Trigger Attachments
-- Depends on: 002_tables.sql (all tables must exist)

-- =============================================================================
-- HELPER: current_user_is_super_admin()
-- =============================================================================
-- Used in RLS policies. SECURITY DEFINER avoids infinite recursion
-- when memberships policies reference themselves.

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = (SELECT auth.uid())
      AND organization_id IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;

-- =============================================================================
-- HELPER: current_user_admin_org_ids()
-- =============================================================================
-- Returns org IDs where current user is an active org_admin.
-- SECURITY DEFINER avoids infinite recursion in memberships RLS policies.

CREATE OR REPLACE FUNCTION public.current_user_admin_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM memberships
  WHERE user_id = (SELECT auth.uid())
    AND status = 'active'
    AND role = 'org_admin'
    AND organization_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_admin_org_ids() TO authenticated;

-- =============================================================================
-- HELPER: _assert_super_admin()
-- =============================================================================
-- Raises 'unauthorized' if caller is not a super admin.
-- Used by rpc_admin_list_organizations and other admin RPCs.

CREATE OR REPLACE FUNCTION public._assert_super_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public._assert_super_admin() TO authenticated;

-- =============================================================================
-- TRIGGER FUNCTION: trigger_set_updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_set_updated_at() TO authenticated;

-- Attach to tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON periods
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON jurors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON juror_period_auth
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON score_sheets
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON score_sheet_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_maintenance_mode BEFORE UPDATE ON maintenance_mode
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_security_policy BEFORE UPDATE ON security_policy
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TRIGGER FUNCTION: trigger_audit_log
-- =============================================================================
-- Final state: category='data', severity by table+op, actor_type='system',
-- full before/after diff (score_sheets excluded to avoid row bloat).
-- Absorbed from: 014_audit_trigger_expansion, 015_audit_trigger_phase3,
--                045_audit_trigger_diff

CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id      UUID;
  v_action      TEXT;
  v_resource_id UUID;
  v_severity    audit_severity;
  v_diff        JSONB;
  v_actor_name  TEXT;
BEGIN
  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  -- ── Resource ID — NULL for tables with non-UUID pk ────────────────────
  IF TG_TABLE_NAME = 'security_policy' THEN
    v_resource_id := NULL;
  ELSE
    v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  END IF;

  -- ── Resolve actor display name from profiles if session uid available ──
  IF auth.uid() IS NOT NULL THEN
    SELECT display_name INTO v_actor_name
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  -- ── Severity by table + operation ──────────────────────────────────────
  v_severity := CASE
    WHEN TG_OP = 'DELETE' AND TG_TABLE_NAME IN ('memberships')       THEN 'high'
    WHEN TG_OP = 'DELETE' AND TG_TABLE_NAME IN (
      'jurors','projects','frameworks','entry_tokens','admin_invites'
    )                                                                  THEN 'medium'
    WHEN TG_TABLE_NAME = 'security_policy'                            THEN 'high'
    WHEN TG_OP = 'DELETE'                                             THEN 'low'
    ELSE 'info'
  END::audit_severity;

  -- ── Diff (before/after) — skip score_sheets to avoid row bloat ────────
  IF TG_TABLE_NAME <> 'score_sheets' THEN
    v_diff := CASE
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after',  to_jsonb(NEW))
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('before', to_jsonb(OLD))
    END;
  ELSE
    v_diff := NULL;
  END IF;

  -- ── Organization resolution ─────────────────────────────────────────
  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

  ELSIF TG_TABLE_NAME IN ('periods', 'jurors', 'frameworks') THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id
                                            ELSE NEW.organization_id END;

  ELSIF TG_TABLE_NAME IN ('projects', 'score_sheets') THEN
    IF TG_OP = 'DELETE' THEN
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = OLD.period_id;
    ELSE
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = NEW.period_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'memberships' THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id
                                            ELSE NEW.organization_id END;

  ELSIF TG_TABLE_NAME = 'entry_tokens' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = OLD.period_id;
    ELSE
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = NEW.period_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'org_applications' THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id
                                            ELSE NEW.organization_id END;

  ELSIF TG_TABLE_NAME = 'framework_outcomes' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT f.organization_id INTO v_org_id FROM frameworks f WHERE f.id = OLD.framework_id;
    ELSE
      SELECT f.organization_id INTO v_org_id FROM frameworks f WHERE f.id = NEW.framework_id;
    END IF;

  ELSIF TG_TABLE_NAME IN ('period_criteria', 'period_criterion_outcome_maps') THEN
    IF TG_OP = 'DELETE' THEN
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = OLD.period_id;
    ELSE
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = NEW.period_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'admin_invites' THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.org_id ELSE NEW.org_id END;

  ELSIF TG_TABLE_NAME = 'unlock_requests' THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id
                                            ELSE NEW.organization_id END;

  ELSIF TG_TABLE_NAME IN ('profiles', 'security_policy') THEN
    v_org_id := NULL;

  END IF;

  INSERT INTO audit_logs (
    organization_id, user_id,
    action, resource_type, resource_id,
    category, severity, actor_type, actor_name,
    details, diff
  ) VALUES (
    v_org_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    CASE WHEN TG_TABLE_NAME = 'security_policy' THEN 'config' ELSE 'data' END::audit_category,
    v_severity,
    CASE WHEN auth.uid() IS NOT NULL THEN 'admin' ELSE 'system' END::audit_actor_type,
    v_actor_name,
    jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME),
    v_diff
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_audit_log() TO authenticated;

-- Attach audit trigger to key tables
CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON periods
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON jurors
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON score_sheets
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON entry_tokens
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Additional tables added in 014_audit_trigger_expansion + 015_audit_trigger_phase3
CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON framework_outcomes
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON period_criteria
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON period_criterion_outcome_maps
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON frameworks
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- security_policy: single-row config table, category='config', severity='high'
-- resource_id set to NULL (INT pk, not UUID); absorbed from 057_audit_trigger_hardening
DROP TRIGGER IF EXISTS audit_log_trigger ON security_policy;
CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON security_policy
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON unlock_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- =============================================================================
-- PERIOD-LOCK ENFORCEMENT
-- =============================================================================
-- Periods lock via the deliberate `rpc_admin_publish_period` action. The UI
-- exposes a Publish button once a period satisfies the readiness check; the
-- RPC sets is_locked = true and activated_at = now() in one transaction. QR
-- entry tokens can only be generated after publishing (gated inside
-- rpc_admin_generate_entry_token).
--
-- Before the lifecycle redesign, a trigger set is_locked on the first entry
-- token INSERT. That trigger has been removed — lock is no longer a side
-- effect of QR generation.
--
-- When periods.is_locked = true (set by rpc_admin_publish_period), the
-- period's structural content must not change: criteria, outcomes,
-- criterion-outcome maps, project data, or period metadata fields
-- (name/dates/framework/etc.). Juror metadata for jurors assigned to a
-- locked period is also frozen.
--
-- Exceptions (intentionally mutable while locked):
--   * juror_period_auth rows (PIN, session, edit-mode runtime state)
--   * scores / score_feedback (the whole point of a locked period)
--   * entry_tokens INSERT (QR generation remains allowed after publish)
--   * jurors INSERT (new juror registration stays allowed — rpc_jury_authenticate)
--   * periods.is_locked / is_current / activated_at / snapshot_frozen_at /
--     closed_at updates (orchestration + unlock + close flow must still work)

-- Central helper — callable from RPCs for clean early-exit, and from
-- table triggers as the shared check.
CREATE OR REPLACE FUNCTION public._assert_period_unlocked(p_period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  IF p_period_id IS NULL THEN
    RETURN;
  END IF;
  SELECT is_locked INTO v_locked FROM periods WHERE id = p_period_id;
  IF COALESCE(v_locked, false) THEN
    RAISE EXCEPTION 'period_locked' USING
      ERRCODE = 'check_violation',
      HINT    = 'Period is locked. Request unlock via rpc_admin_request_unlock.';
  END IF;
END;
$$;

-- ── projects: block all INSERT/UPDATE/DELETE when period is locked ─────────
CREATE OR REPLACE FUNCTION public.trigger_block_projects_on_locked_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public._assert_period_unlocked(OLD.period_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public._assert_period_unlocked(OLD.period_id);
    IF NEW.period_id IS DISTINCT FROM OLD.period_id THEN
      PERFORM public._assert_period_unlocked(NEW.period_id);
    END IF;
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public._assert_period_unlocked(NEW.period_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER block_projects_on_locked_period
  BEFORE INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_block_projects_on_locked_period();

-- ── jurors: block UPDATE/DELETE if juror is assigned to any locked period ──
-- INSERT is intentionally unguarded so rpc_jury_authenticate can register
-- new jurors during a locked period.
CREATE OR REPLACE FUNCTION public.trigger_block_jurors_on_locked_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_juror_id UUID;
  v_has_lock BOOLEAN;
BEGIN
  v_juror_id := COALESCE(OLD.id, NEW.id);
  SELECT EXISTS(
    SELECT 1 FROM juror_period_auth jpa
    JOIN periods p ON p.id = jpa.period_id
    WHERE jpa.juror_id = v_juror_id AND p.is_locked = true
  ) INTO v_has_lock;
  IF v_has_lock THEN
    RAISE EXCEPTION 'period_locked' USING
      ERRCODE = 'check_violation',
      HINT    = 'Juror is assigned to a locked period.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER block_jurors_on_locked_period
  BEFORE UPDATE OR DELETE ON jurors
  FOR EACH ROW EXECUTE FUNCTION trigger_block_jurors_on_locked_period();

-- ── periods: block UPDATE of protected columns + DELETE while locked ───────
-- Allowed changes even while locked:
--   is_locked (unlock flow), is_current (orchestration),
--   activated_at, snapshot_frozen_at, updated_at.
-- Blocked: name, season, description, start_date, end_date, framework_id,
-- is_visible, organization_id.
CREATE OR REPLACE FUNCTION public.trigger_block_periods_on_locked_mutate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins may delete or structurally modify locked periods.
  IF current_user_is_super_admin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.is_locked, false) THEN
      RAISE EXCEPTION 'period_locked' USING
        ERRCODE = 'check_violation',
        HINT    = 'Cannot delete a locked period.';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF NOT COALESCE(OLD.is_locked, false) THEN
    RETURN NEW;
  END IF;

  IF  NEW.name            IS DISTINCT FROM OLD.name            OR
      NEW.season          IS DISTINCT FROM OLD.season          OR
      NEW.description     IS DISTINCT FROM OLD.description     OR
      NEW.start_date      IS DISTINCT FROM OLD.start_date      OR
      NEW.end_date        IS DISTINCT FROM OLD.end_date        OR
      NEW.framework_id    IS DISTINCT FROM OLD.framework_id    OR
      NEW.is_visible      IS DISTINCT FROM OLD.is_visible      OR
      NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'period_locked' USING
      ERRCODE = 'check_violation',
      HINT    = 'Period is locked. Only is_locked/is_current/activated_at may change.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER block_periods_on_locked_mutate
  BEFORE UPDATE OR DELETE ON periods
  FOR EACH ROW EXECUTE FUNCTION trigger_block_periods_on_locked_mutate();

-- ── period_criteria / period_outcomes / period_criterion_outcome_maps ──────
-- Belt-and-suspenders: RPC guards also exist, but direct writes are blocked
-- at the table level regardless of caller.
CREATE OR REPLACE FUNCTION public.trigger_block_period_child_on_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_period_id := OLD.period_id;
    PERFORM public._assert_period_unlocked(v_period_id);
    RETURN OLD;
  ELSE
    v_period_id := NEW.period_id;
    PERFORM public._assert_period_unlocked(v_period_id);
    IF TG_OP = 'UPDATE' AND NEW.period_id IS DISTINCT FROM OLD.period_id THEN
      PERFORM public._assert_period_unlocked(OLD.period_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER block_period_criteria_on_locked
  BEFORE INSERT OR UPDATE OR DELETE ON period_criteria
  FOR EACH ROW EXECUTE FUNCTION trigger_block_period_child_on_locked();

CREATE TRIGGER block_period_outcomes_on_locked
  BEFORE INSERT OR UPDATE OR DELETE ON period_outcomes
  FOR EACH ROW EXECUTE FUNCTION trigger_block_period_child_on_locked();

CREATE TRIGGER block_pcom_on_locked
  BEFORE INSERT OR UPDATE OR DELETE ON period_criterion_outcome_maps
  FOR EACH ROW EXECUTE FUNCTION trigger_block_period_child_on_locked();
