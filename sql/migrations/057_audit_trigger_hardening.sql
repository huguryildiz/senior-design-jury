-- sql/migrations/057_audit_trigger_hardening.sql
-- Two fixes in one migration:
--   1. actor_type: write 'admin' when auth.uid() IS NOT NULL (was always 'system')
--   2. security_policy: add ELSIF branch + attach trigger
--
-- security_policy.id is INT (single-row table), so resource_id is set to NULL
-- to avoid UUID type mismatch.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Recreate trigger_audit_log() with both fixes
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Attach trigger to security_policy table
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_log_trigger ON security_policy;

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON security_policy
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
