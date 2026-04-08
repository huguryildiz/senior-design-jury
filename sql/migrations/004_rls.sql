-- VERA v1 — Row-Level Security Policies
-- Consolidated from: 008, 012, 013, 014, 027
-- Depends on: 003_helpers_and_triggers.sql (current_user_is_super_admin)
--
-- Key fixes included:
--   012: profiles_select includes super_admin read
--   013: org_applications_select uses auth.jwt()->>'email' (not auth.users)
--   014: admin SELECT policies guarded with auth.uid() IS NOT NULL
--        + public SELECT policies for jury anon flow
--   027: period_outcomes + maps public SELECT for jury outcome visibility

-- =============================================================================
-- ORGANIZATIONS
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
-- PROFILES (fix from 012: super_admin can read all)
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
-- MEMBERSHIPS
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
-- ORG_APPLICATIONS (fix from 013: auth.jwt()->>'email' not auth.users)
-- =============================================================================

ALTER TABLE org_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_applications_select" ON org_applications FOR SELECT USING (
  current_user_is_super_admin()
  OR contact_email = (auth.jwt() ->> 'email')
);

CREATE POLICY "org_applications_insert" ON org_applications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "org_applications_update" ON org_applications FOR UPDATE
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

-- =============================================================================
-- FRAMEWORKS
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
-- FRAMEWORK_OUTCOMES
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
  framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "framework_outcomes_update" ON framework_outcomes FOR UPDATE
  USING (framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "framework_outcomes_delete" ON framework_outcomes FOR DELETE USING (
  framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- FRAMEWORK_CRITERIA
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
  framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "framework_criteria_update" ON framework_criteria FOR UPDATE
  USING (framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "framework_criteria_delete" ON framework_criteria FOR DELETE USING (
  framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- FRAMEWORK_CRITERION_OUTCOME_MAPS
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
  framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "framework_criterion_outcome_maps_update" ON framework_criterion_outcome_maps FOR UPDATE
  USING (framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "framework_criterion_outcome_maps_delete" ON framework_criterion_outcome_maps FOR DELETE USING (
  framework_id IN (SELECT id FROM frameworks WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- PERIODS (fix from 014: guarded admin + public visible)
-- =============================================================================

ALTER TABLE periods ENABLE ROW LEVEL SECURITY;

-- Admin: guarded with auth.uid() IS NOT NULL to avoid anon memberships sub-query
CREATE POLICY "periods_select" ON periods FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  )
);

-- Public: jury anon flow reads visible periods
CREATE POLICY "periods_select_public_visible" ON periods
  FOR SELECT USING (is_visible = true);

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
-- PROJECTS (fix from 014: guarded admin + public by period)
-- =============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  auth.uid() IS NOT NULL AND
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

-- Public: jury anon flow reads projects of visible periods
CREATE POLICY "projects_select_public_by_period" ON projects
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_visible = true)
  );

CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- JURORS
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
-- JUROR_PERIOD_AUTH (fix from 014: guarded admin + public read)
-- =============================================================================

ALTER TABLE juror_period_auth ENABLE ROW LEVEL SECURITY;

-- Admin: guarded with auth.uid() IS NOT NULL
CREATE POLICY "juror_period_auth_select" ON juror_period_auth FOR SELECT USING (
  auth.uid() IS NOT NULL AND
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

-- Public: jury flow reads edit state via PostgREST
CREATE POLICY "juror_period_auth_select_public" ON juror_period_auth
  FOR SELECT USING (true);

CREATE POLICY "juror_period_auth_insert" ON juror_period_auth FOR INSERT WITH CHECK (
  juror_id IN (SELECT id FROM jurors WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "juror_period_auth_update" ON juror_period_auth FOR UPDATE
  USING (juror_id IN (SELECT id FROM jurors WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (juror_id IN (SELECT id FROM jurors WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "juror_period_auth_delete" ON juror_period_auth FOR DELETE USING (
  juror_id IN (SELECT id FROM jurors WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- ENTRY_TOKENS
-- =============================================================================

ALTER TABLE entry_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entry_tokens_select" ON entry_tokens FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "entry_tokens_insert" ON entry_tokens FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "entry_tokens_update" ON entry_tokens FOR UPDATE
  USING (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "entry_tokens_delete" ON entry_tokens FOR DELETE USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- SCORE_SHEETS
-- =============================================================================

ALTER TABLE score_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_sheets_select" ON score_sheets FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "score_sheets_insert" ON score_sheets FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "score_sheets_update" ON score_sheets FOR UPDATE
  USING (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "score_sheets_delete" ON score_sheets FOR DELETE USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- SCORE_SHEET_ITEMS
-- =============================================================================

ALTER TABLE score_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_sheet_items_select" ON score_sheet_items FOR SELECT USING (
  score_sheet_id IN (SELECT id FROM score_sheets WHERE period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
      OR current_user_is_super_admin()
    )
  ))
);

CREATE POLICY "score_sheet_items_insert" ON score_sheet_items FOR INSERT WITH CHECK (
  score_sheet_id IN (SELECT id FROM score_sheets WHERE period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
      OR current_user_is_super_admin()
    )
  ))
);

CREATE POLICY "score_sheet_items_update" ON score_sheet_items FOR UPDATE
  USING (score_sheet_id IN (SELECT id FROM score_sheets WHERE period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
      OR current_user_is_super_admin()
    )
  )))
  WITH CHECK (score_sheet_id IN (SELECT id FROM score_sheets WHERE period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
      OR current_user_is_super_admin()
    )
  )));

CREATE POLICY "score_sheet_items_delete" ON score_sheet_items FOR DELETE USING (
  score_sheet_id IN (SELECT id FROM score_sheets WHERE period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
      OR current_user_is_super_admin()
    )
  ))
);

-- =============================================================================
-- PERIOD_CRITERIA (public read for jury anon flow)
-- =============================================================================

ALTER TABLE period_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_criteria_select_public" ON period_criteria FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_visible = true)
);

CREATE POLICY "period_criteria_select" ON period_criteria FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "period_criteria_insert" ON period_criteria FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "period_criteria_update" ON period_criteria FOR UPDATE
  USING (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "period_criteria_delete" ON period_criteria FOR DELETE USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- PERIOD_OUTCOMES (fix from 027: public read for jury anon)
-- =============================================================================

ALTER TABLE period_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_outcomes_select" ON period_outcomes FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- Public: jury anon flow reads outcome descriptions
CREATE POLICY "period_outcomes_select_public" ON period_outcomes
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_visible = true)
  );

CREATE POLICY "period_outcomes_insert" ON period_outcomes FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "period_outcomes_update" ON period_outcomes FOR UPDATE
  USING (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "period_outcomes_delete" ON period_outcomes FOR DELETE USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- PERIOD_CRITERION_OUTCOME_MAPS (fix from 027: public read for jury anon)
-- =============================================================================

ALTER TABLE period_criterion_outcome_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_criterion_outcome_maps_select" ON period_criterion_outcome_maps FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- Public: jury anon flow reads mudek mappings
CREATE POLICY "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_visible = true)
  );

CREATE POLICY "period_criterion_outcome_maps_insert" ON period_criterion_outcome_maps FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

CREATE POLICY "period_criterion_outcome_maps_update" ON period_criterion_outcome_maps FOR UPDATE
  USING (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )))
  WITH CHECK (period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  )));

CREATE POLICY "period_criterion_outcome_maps_delete" ON period_criterion_outcome_maps FOR DELETE USING (
  period_id IN (SELECT id FROM periods WHERE (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL)
    OR current_user_is_super_admin()
  ))
);

-- =============================================================================
-- AUDIT_LOGS (read-only via RLS; writes only via triggers)
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR current_user_is_super_admin()
);

-- =============================================================================
-- MAINTENANCE_MODE (super_admin write, public read)
-- =============================================================================

ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_mode_super_admin_all" ON maintenance_mode
  FOR ALL
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

CREATE POLICY "maintenance_mode_public_read" ON maintenance_mode
  FOR SELECT USING (true);

-- =============================================================================
-- SECURITY_POLICY (super_admin only)
-- =============================================================================

ALTER TABLE security_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_policy_super_admin_all" ON security_policy
  FOR ALL
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

-- =============================================================================
-- JURY_FEEDBACK (all access via SECURITY DEFINER RPCs)
-- =============================================================================

ALTER TABLE jury_feedback ENABLE ROW LEVEL SECURITY;
