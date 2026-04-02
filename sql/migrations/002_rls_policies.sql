-- VERA: Row Level Security policies for all tables

-- =============================================================================
-- ORGANIZATIONS TABLE
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant admin sees own org, super admin sees all
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- INSERT: super admin only
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- UPDATE: super admin only
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- DELETE: super admin only
CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own profile
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
);

-- INSERT: users can create their own profile
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
);

-- UPDATE: users can update their own profile
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
) WITH CHECK (
  id = auth.uid()
);

-- =============================================================================
-- MEMBERSHIPS TABLE
-- =============================================================================

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Security definer helper: avoids infinite recursion when memberships policies
-- reference the memberships table itself.
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  );
$$;

-- SELECT: users see their own memberships; super admin sees all
CREATE POLICY "memberships_select" ON memberships FOR SELECT USING (
  user_id = auth.uid() OR current_user_is_super_admin()
);

-- INSERT: super admin only
CREATE POLICY "memberships_insert" ON memberships FOR INSERT WITH CHECK (
  current_user_is_super_admin()
);

-- UPDATE: super admin only
CREATE POLICY "memberships_update" ON memberships FOR UPDATE USING (
  current_user_is_super_admin()
) WITH CHECK (
  current_user_is_super_admin()
);

-- DELETE: super admin only
CREATE POLICY "memberships_delete" ON memberships FOR DELETE USING (
  current_user_is_super_admin()
);

-- =============================================================================
-- TENANT_APPLICATIONS TABLE
-- =============================================================================

ALTER TABLE tenant_applications ENABLE ROW LEVEL SECURITY;

-- SELECT: super admin sees all; authenticated users see applications matching their email
CREATE POLICY "tenant_applications_select" ON tenant_applications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
  OR contact_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- INSERT: authenticated users can create applications
CREATE POLICY "tenant_applications_insert" ON tenant_applications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE: super admin only
CREATE POLICY "tenant_applications_update" ON tenant_applications FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- =============================================================================
-- FRAMEWORKS TABLE
-- =============================================================================

ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;

-- SELECT: users see org-scoped frameworks or built-in frameworks (organization_id IS NULL)
CREATE POLICY "frameworks_select" ON frameworks FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR organization_id IS NULL
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- INSERT: org admins for their org, super admin for all
CREATE POLICY "frameworks_insert" ON frameworks FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- UPDATE: org admins for their org, super admin for all
CREATE POLICY "frameworks_update" ON frameworks FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- DELETE: org admins for their org, super admin for all
CREATE POLICY "frameworks_delete" ON frameworks FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- =============================================================================
-- OUTCOMES TABLE
-- =============================================================================

ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- SELECT: through framework org-scoping
CREATE POLICY "outcomes_select" ON outcomes FOR SELECT USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- INSERT: through framework org-scoping
CREATE POLICY "outcomes_insert" ON outcomes FOR INSERT WITH CHECK (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- UPDATE: through framework org-scoping
CREATE POLICY "outcomes_update" ON outcomes FOR UPDATE USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
) WITH CHECK (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- DELETE: through framework org-scoping
CREATE POLICY "outcomes_delete" ON outcomes FOR DELETE USING (
  framework_id IN (
    SELECT id FROM frameworks WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- =============================================================================
-- PERIODS TABLE
-- =============================================================================

ALTER TABLE periods ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped access
CREATE POLICY "periods_select" ON periods FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- INSERT: org admins for their org, super admin for all
CREATE POLICY "periods_insert" ON periods FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- UPDATE: org admins for their org, super admin for all
CREATE POLICY "periods_update" ON periods FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- DELETE: org admins for their org, super admin for all
CREATE POLICY "periods_delete" ON periods FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped via period_id -> periods -> organization_id
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- INSERT: org-scoped via period_id
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- UPDATE: org-scoped via period_id
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
) WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- DELETE: org-scoped via period_id
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- =============================================================================
-- JURORS TABLE
-- =============================================================================

ALTER TABLE jurors ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped access
CREATE POLICY "jurors_select" ON jurors FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- INSERT: org admins for their org, super admin for all
CREATE POLICY "jurors_insert" ON jurors FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- UPDATE: org admins for their org, super admin for all
CREATE POLICY "jurors_update" ON jurors FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- DELETE: org admins for their org, super admin for all
CREATE POLICY "jurors_delete" ON jurors FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- =============================================================================
-- SCORES TABLE
-- =============================================================================

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped via period_id -> periods -> organization_id
CREATE POLICY "scores_select" ON scores FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- INSERT: allowed for jury RPCs (SECURITY DEFINER), also org-scoped for direct INSERT
CREATE POLICY "scores_insert" ON scores FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- UPDATE: org-scoped via period_id
CREATE POLICY "scores_update" ON scores FOR UPDATE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
) WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- DELETE: org-scoped via period_id
CREATE POLICY "scores_delete" ON scores FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- =============================================================================
-- CRITERION_OUTCOME_MAPPINGS TABLE
-- =============================================================================

ALTER TABLE criterion_outcome_mappings ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped access
CREATE POLICY "criterion_outcome_mappings_select" ON criterion_outcome_mappings FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- INSERT: org admins for their org, super admin for all
CREATE POLICY "criterion_outcome_mappings_insert" ON criterion_outcome_mappings FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- UPDATE: org admins for their org, super admin for all
CREATE POLICY "criterion_outcome_mappings_update" ON criterion_outcome_mappings FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- DELETE: org admins for their org, super admin for all
CREATE POLICY "criterion_outcome_mappings_delete" ON criterion_outcome_mappings FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- =============================================================================
-- JUROR_PERIOD_AUTH TABLE
-- =============================================================================

ALTER TABLE juror_period_auth ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped via juror_id -> jurors -> organization_id
CREATE POLICY "juror_period_auth_select" ON juror_period_auth FOR SELECT USING (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- INSERT: allowed for jury RPCs (SECURITY DEFINER), also org-scoped for direct INSERT
CREATE POLICY "juror_period_auth_insert" ON juror_period_auth FOR INSERT WITH CHECK (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- UPDATE: org-scoped via juror_id
CREATE POLICY "juror_period_auth_update" ON juror_period_auth FOR UPDATE USING (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
) WITH CHECK (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- DELETE: org-scoped via juror_id
CREATE POLICY "juror_period_auth_delete" ON juror_period_auth FOR DELETE USING (
  juror_id IN (
    SELECT id FROM jurors WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- =============================================================================
-- ENTRY_TOKENS TABLE
-- =============================================================================

ALTER TABLE entry_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped via period_id -> periods -> organization_id
CREATE POLICY "entry_tokens_select" ON entry_tokens FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- INSERT: org admins for their org, super admin for all
CREATE POLICY "entry_tokens_insert" ON entry_tokens FOR INSERT WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- UPDATE: org admins for their org, super admin for all
CREATE POLICY "entry_tokens_update" ON entry_tokens FOR UPDATE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
) WITH CHECK (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- DELETE: org admins for their org, super admin for all
CREATE POLICY "entry_tokens_delete" ON entry_tokens FOR DELETE USING (
  period_id IN (
    SELECT id FROM periods WHERE (
      organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
      )
    )
  )
);

-- =============================================================================
-- AUDIT_LOGS TABLE
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped access
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND organization_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid() AND organization_id IS NULL
  )
);

-- INSERT: only via triggers and service role, no direct user INSERT
-- Audit logs are immutable after creation; no UPDATE or DELETE policies
