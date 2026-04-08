-- VERA v1 — Frameworks & Criteria
-- Tables: frameworks, framework_outcomes, framework_criteria,
--         framework_criterion_outcome_maps

-- =============================================================================
-- FRAMEWORKS
-- =============================================================================
-- Changes from v0:
--   + version TEXT
--   + default_threshold NUMERIC DEFAULT 70
--   + outcome_code_prefix TEXT DEFAULT 'PO'

CREATE TABLE frameworks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  version              TEXT,
  default_threshold    NUMERIC DEFAULT 70,
  outcome_code_prefix  TEXT DEFAULT 'PO',
  is_default           BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- FRAMEWORK_OUTCOMES
-- =============================================================================
-- Renamed from outcomes (v0).
-- No structural changes.

CREATE TABLE framework_outcomes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(framework_id, code)
);

-- =============================================================================
-- FRAMEWORK_CRITERIA
-- =============================================================================
-- New table in v1 (replaces criteria_config JSONB in periods).

CREATE TABLE framework_criteria (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  label        TEXT NOT NULL,
  short_label  TEXT,
  description  TEXT,
  max_score    NUMERIC NOT NULL,
  weight       NUMERIC NOT NULL,
  color        TEXT,
  rubric_bands JSONB,
  sort_order   INT DEFAULT 0,
  UNIQUE(framework_id, key)
);

-- =============================================================================
-- FRAMEWORK_CRITERION_OUTCOME_MAPS
-- =============================================================================
-- Renamed from criterion_outcome_mappings (v0).
-- Changes from v0:
--   criterion_key TEXT  ->  criterion_id UUID FK (framework_criteria.id)
--   + framework_id for explicit scope
--   + coverage_type DEFAULT 'direct'

CREATE TABLE framework_criterion_outcome_maps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  criterion_id    UUID NOT NULL REFERENCES framework_criteria(id) ON DELETE CASCADE,
  outcome_id      UUID NOT NULL REFERENCES framework_outcomes(id) ON DELETE CASCADE,
  coverage_type   TEXT NOT NULL DEFAULT 'direct'
                  CHECK (coverage_type IN ('direct', 'indirect')),
  weight          NUMERIC,
  UNIQUE(criterion_id, outcome_id)
);

-- =============================================================================
-- ROLE GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON frameworks                       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON framework_outcomes               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON framework_criteria               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON framework_criterion_outcome_maps TO authenticated;

GRANT SELECT ON frameworks                       TO anon;
GRANT SELECT ON framework_outcomes               TO anon;
GRANT SELECT ON framework_criteria               TO anon;
GRANT SELECT ON framework_criterion_outcome_maps TO anon;
