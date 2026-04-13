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
    WHERE user_id = auth.uid()
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
  WHERE user_id = auth.uid()
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
