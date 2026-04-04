-- 014_jury_public_rls.sql
-- ============================================================
-- Public RLS policies for jury flow (anon/unauthenticated access)
--
-- Problem: The jury flow uses PostgREST table queries (projects, periods)
-- without Supabase Auth. The existing RLS policies sub-query `memberships`
-- which anon has no SELECT privilege on, causing 401 errors.
--
-- Fix:
--   1. Grant anon SELECT on memberships (RLS still protects rows —
--      anon gets empty results since auth.uid() is NULL)
--   2. Guard existing policies with auth.uid() IS NOT NULL so PostgreSQL
--      doesn't evaluate the memberships sub-query for anon users
--   3. Add public SELECT policies for jury-facing tables scoped to
--      visible periods
-- ============================================================

-- Step 1: Allow anon to execute sub-queries on memberships without
-- hitting a table-privilege error. RLS on memberships ensures anon
-- sees zero rows (all policies require auth.uid()).
GRANT SELECT ON memberships TO anon;

-- Step 2: Guard admin-facing SELECT policies so the memberships
-- sub-query is only evaluated for authenticated users.
-- PostgreSQL does NOT guarantee short-circuit evaluation of AND,
-- but the guard prevents row-level hits when combined with the
-- table-level grant above.

DROP POLICY IF EXISTS "periods_select" ON periods;
CREATE POLICY "periods_select" ON periods FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
    OR current_user_is_super_admin()
  )
);

DROP POLICY IF EXISTS "projects_select" ON projects;
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

-- Step 3: Public SELECT policies for jury flow.
-- periods_select_public_visible already exists (added in 008 or manually).
-- Add it here idempotently in case it's missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'periods' AND policyname = 'periods_select_public_visible'
  ) THEN
    CREATE POLICY "periods_select_public_visible" ON periods
    FOR SELECT USING (is_visible = true);
  END IF;
END
$$;

-- Allow anon to read projects belonging to visible periods (jury flow).
DROP POLICY IF EXISTS "projects_select_public_by_period" ON projects;
CREATE POLICY "projects_select_public_by_period" ON projects
FOR SELECT USING (
  period_id IN (
    SELECT id FROM periods WHERE is_visible = true
  )
);

-- Step 4: juror_period_auth — jury flow reads edit state via PostgREST.
GRANT SELECT ON juror_period_auth TO anon;

DROP POLICY IF EXISTS "juror_period_auth_select" ON juror_period_auth;
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

DROP POLICY IF EXISTS "juror_period_auth_select_public" ON juror_period_auth;
CREATE POLICY "juror_period_auth_select_public" ON juror_period_auth
FOR SELECT USING (true);
