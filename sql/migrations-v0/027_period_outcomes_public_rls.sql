-- 027_period_outcomes_public_rls.sql
-- ============================================================
-- Public RLS policies for period_outcomes and
-- period_criterion_outcome_maps (jury anon read access).
--
-- Problem: The jury flow calls listPeriodCriteria() which queries
-- period_criterion_outcome_maps with a PostgREST embed on
-- period_outcomes to assemble mudek[] arrays per criterion.
-- Both tables had only org-membership SELECT policies, so anon
-- jurors got empty results — crit.mudek was always [] and the
-- "Mapped Outcomes" section never rendered in RubricSheet.
--
-- Fix: Add public SELECT policies for both tables scoped to
-- periods where is_visible = true, matching the existing pattern
-- in 014_jury_public_rls.sql (period_criteria_select_public,
-- projects_select_public_by_period).
-- ============================================================

-- Grant anon SELECT on both tables so PostgREST can query them
-- without a table-privilege error (RLS still enforces row-level).
GRANT SELECT ON period_outcomes TO anon;
GRANT SELECT ON period_criterion_outcome_maps TO anon;

-- Public SELECT for period_outcomes (jury flow reads outcome descriptions).
DROP POLICY IF EXISTS "period_outcomes_select_public" ON period_outcomes;
CREATE POLICY "period_outcomes_select_public" ON period_outcomes
FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_visible = true)
);

-- Public SELECT for period_criterion_outcome_maps (jury flow reads mudek mappings).
DROP POLICY IF EXISTS "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps;
CREATE POLICY "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps
FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_visible = true)
);
