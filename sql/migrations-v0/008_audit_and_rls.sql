-- VERA v1 — Audit Triggers + Row-Level Security
--
-- Trigger functions:
--   trigger_set_updated_at()  applied to: score_sheets, score_sheet_items,
--                             organizations, periods, projects, jurors, juror_period_auth
--   trigger_audit_log()       applied to: organizations, periods, projects, jurors,
--                             score_sheets, memberships, entry_tokens
--
-- RLS policies cover ALL 21 tables:
--   Identity (4):   organizations, profiles, memberships, org_applications
--   Frameworks (4): frameworks, framework_outcomes, framework_criteria,
--                   framework_criterion_outcome_maps
--   Execution (5):  periods, projects, jurors, juror_period_auth, entry_tokens
--   Scoring (5):    score_sheets, score_sheet_items, period_criteria,
--                   period_outcomes, period_criterion_outcome_maps
--   Audit (1):      audit_logs
--
-- current_user_is_super_admin() helper is defined in 002_identity.sql.

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

-- Attach to tables with an updated_at column
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON periods
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON jurors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON juror_period_auth
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON score_sheets
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON score_sheet_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TRIGGER FUNCTION: trigger_audit_log
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id     UUID;
  v_action     TEXT;
  v_resource_id UUID;
BEGIN
  v_action      := TG_TABLE_NAME || '.' || lower(TG_OP);
  v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

  -- Resolve organization_id per table
  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

  ELSIF TG_TABLE_NAME IN ('periods', 'jurors', 'frameworks') THEN
    v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id
                                            ELSE NEW.organization_id END;

  ELSIF TG_TABLE_NAME = 'projects' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = OLD.period_id;
    ELSE
      SELECT p.organization_id INTO v_org_id FROM periods p WHERE p.id = NEW.period_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'score_sheets' THEN
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
  END IF;

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_org_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

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

-- =============================================================================
-- RLS: ORGANIZATIONS
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  current_user_is_super_admin()
);

CREATE POLICY "organizations_update" ON organizations FOR UPDATE
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (
  current_user_is_super_admin()
);

-- =============================================================================
-- RLS: PROFILES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid() OR current_user_is_super_admin()
);

CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- RLS: MEMBERSHIPS
-- =============================================================================

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select" ON memberships FOR SELECT USING (
  user_id = auth.uid() OR current_user_is_super_admin()
);

CREATE POLICY "memberships_insert" ON memberships FOR INSERT WITH CHECK (
  current_user_is_super_admin()
);

CREATE POLICY "memberships_update" ON memberships FOR UPDATE
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

CREATE POLICY "memberships_delete" ON memberships FOR DELETE USING (
  current_user_is_super_admin()
);

-- =============================================================================
-- RLS: ORG_APPLICATIONS
-- =============================================================================

ALTER TABLE org_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_applications_select" ON org_applications FOR SELECT USING (
  current_user_is_super_admin()
  OR contact_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "org_applications_insert" ON org_applications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "org_applications_update" ON org_applications FOR UPDATE
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

-- =============================================================================
-- RLS: FRAMEWORKS
-- =============================================================================

ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frameworks_select" ON frameworks FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR organization_id IS NULL
  OR current_user_is_super_admin()
);

CREATE POLICY "frameworks_insert" ON frameworks FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

CREATE POLICY "frameworks_update" ON frameworks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  );

CREATE POLICY "frameworks_delete" ON frameworks FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

-- =============================================================================
-- RLS: FRAMEWORK_OUTCOMES
-- =============================================================================

ALTER TABLE framework_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "framework_outcomes_select" ON framework_outcomes FOR SELECT USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR organization_id IS NULL
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "framework_outcomes_insert" ON framework_outcomes FOR INSERT WITH CHECK (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "framework_outcomes_update" ON framework_outcomes FOR UPDATE
  USING (
    framework_id IN (
      SELECT id FROM frameworks WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    framework_id IN (
      SELECT id FROM frameworks WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "framework_outcomes_delete" ON framework_outcomes FOR DELETE USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: FRAMEWORK_CRITERIA
-- =============================================================================

ALTER TABLE framework_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "framework_criteria_select" ON framework_criteria FOR SELECT USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR organization_id IS NULL
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "framework_criteria_insert" ON framework_criteria FOR INSERT WITH CHECK (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "framework_criteria_update" ON framework_criteria FOR UPDATE
  USING (
    framework_id IN (
      SELECT id FROM frameworks WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    framework_id IN (
      SELECT id FROM frameworks WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "framework_criteria_delete" ON framework_criteria FOR DELETE USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: FRAMEWORK_CRITERION_OUTCOME_MAPS
-- =============================================================================

ALTER TABLE framework_criterion_outcome_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "framework_criterion_outcome_maps_select" ON framework_criterion_outcome_maps FOR SELECT USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR organization_id IS NULL
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "framework_criterion_outcome_maps_insert" ON framework_criterion_outcome_maps FOR INSERT WITH CHECK (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "framework_criterion_outcome_maps_update" ON framework_criterion_outcome_maps FOR UPDATE
  USING (
    framework_id IN (
      SELECT id FROM frameworks WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    framework_id IN (
      SELECT id FROM frameworks WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "framework_criterion_outcome_maps_delete" ON framework_criterion_outcome_maps FOR DELETE USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: PERIODS
-- =============================================================================

ALTER TABLE periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periods_select" ON periods FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

CREATE POLICY "periods_insert" ON periods FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

CREATE POLICY "periods_update" ON periods FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  );

CREATE POLICY "periods_delete" ON periods FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

-- =============================================================================
-- RLS: PROJECTS
-- =============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: JURORS
-- =============================================================================

ALTER TABLE jurors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jurors_select" ON jurors FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

CREATE POLICY "jurors_insert" ON jurors FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

CREATE POLICY "jurors_update" ON jurors FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  );

CREATE POLICY "jurors_delete" ON jurors FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

-- =============================================================================
-- RLS: JUROR_PERIOD_AUTH
-- =============================================================================

ALTER TABLE juror_period_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "juror_period_auth_select" ON juror_period_auth FOR SELECT USING (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "juror_period_auth_insert" ON juror_period_auth FOR INSERT WITH CHECK (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "juror_period_auth_update" ON juror_period_auth FOR UPDATE
  USING (
    juror_id IN (
      SELECT id FROM jurors WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    juror_id IN (
      SELECT id FROM jurors WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "juror_period_auth_delete" ON juror_period_auth FOR DELETE USING (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: ENTRY_TOKENS
-- =============================================================================

ALTER TABLE entry_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entry_tokens_select" ON entry_tokens FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "entry_tokens_insert" ON entry_tokens FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "entry_tokens_update" ON entry_tokens FOR UPDATE
  USING (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "entry_tokens_delete" ON entry_tokens FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: SCORE_SHEETS  (new in v1)
-- =============================================================================

ALTER TABLE score_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_sheets_select" ON score_sheets FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "score_sheets_insert" ON score_sheets FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "score_sheets_update" ON score_sheets FOR UPDATE
  USING (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "score_sheets_delete" ON score_sheets FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: SCORE_SHEET_ITEMS  (new in v1)
-- =============================================================================

ALTER TABLE score_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_sheet_items_select" ON score_sheet_items FOR SELECT USING (
  score_sheet_id IN (
    SELECT id FROM score_sheets WHERE period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
);

CREATE POLICY "score_sheet_items_insert" ON score_sheet_items FOR INSERT WITH CHECK (
  score_sheet_id IN (
    SELECT id FROM score_sheets WHERE period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
);

CREATE POLICY "score_sheet_items_update" ON score_sheet_items FOR UPDATE
  USING (
    score_sheet_id IN (
      SELECT id FROM score_sheets WHERE period_id IN (
        SELECT id FROM periods WHERE (
          organization_id IN (
            SELECT organization_id FROM memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
          OR current_user_is_super_admin()
        )
      )
    )
  )
  WITH CHECK (
    score_sheet_id IN (
      SELECT id FROM score_sheets WHERE period_id IN (
        SELECT id FROM periods WHERE (
          organization_id IN (
            SELECT organization_id FROM memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
          OR current_user_is_super_admin()
        )
      )
    )
  );

CREATE POLICY "score_sheet_items_delete" ON score_sheet_items FOR DELETE USING (
  score_sheet_id IN (
    SELECT id FROM score_sheets WHERE period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
);

-- =============================================================================
-- RLS: PERIOD_CRITERIA  (new in v1)
-- =============================================================================

ALTER TABLE period_criteria ENABLE ROW LEVEL SECURITY;

-- Public read: anon jurors can read criteria for any visible period.
-- Mirrors the periods_select_public_visible pattern.
CREATE POLICY "period_criteria_select_public" ON period_criteria FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_visible = true)
);

CREATE POLICY "period_criteria_select" ON period_criteria FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "period_criteria_insert" ON period_criteria FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "period_criteria_update" ON period_criteria FOR UPDATE
  USING (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "period_criteria_delete" ON period_criteria FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: PERIOD_OUTCOMES  (new in v1)
-- =============================================================================

ALTER TABLE period_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_outcomes_select" ON period_outcomes FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "period_outcomes_insert" ON period_outcomes FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "period_outcomes_update" ON period_outcomes FOR UPDATE
  USING (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "period_outcomes_delete" ON period_outcomes FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: PERIOD_CRITERION_OUTCOME_MAPS  (new in v1)
-- =============================================================================

ALTER TABLE period_criterion_outcome_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_criterion_outcome_maps_select" ON period_criterion_outcome_maps FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "period_criterion_outcome_maps_insert" ON period_criterion_outcome_maps FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

CREATE POLICY "period_criterion_outcome_maps_update" ON period_criterion_outcome_maps FOR UPDATE
  USING (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM periods WHERE (
        organization_id IN (
          SELECT organization_id FROM memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
        OR current_user_is_super_admin()
      )
    )
  );

CREATE POLICY "period_criterion_outcome_maps_delete" ON period_criterion_outcome_maps FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR current_user_is_super_admin()
    )
  )
);

-- =============================================================================
-- RLS: AUDIT_LOGS
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: org_admins see their org's logs; super_admin sees all
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

-- INSERT/UPDATE/DELETE: only via triggers and service role; no direct user writes

-- =============================================================================
-- GRANTS: trigger functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.trigger_set_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_audit_log()      TO authenticated;
