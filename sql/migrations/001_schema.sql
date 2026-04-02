-- VERA: Consolidated schema — 14 tables

-- 1. organizations (was tenants)
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  short_name      TEXT,
  contact_email   TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'limited', 'disabled', 'archived')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. profiles
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name    TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. memberships
CREATE TABLE memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 4. tenant_applications
CREATE TABLE tenant_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  organization_name   TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  applicant_name      TEXT NOT NULL,
  message             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 5. frameworks
CREATE TABLE frameworks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 6. outcomes
CREATE TABLE outcomes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id  UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  label         TEXT NOT NULL,
  description   TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 7. periods (was semesters)
CREATE TABLE periods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  season            TEXT CHECK (season IN ('Fall', 'Spring', 'Summer')),
  description       TEXT,
  start_date        DATE,
  end_date          DATE,
  framework_id      UUID REFERENCES frameworks(id),
  is_current        BOOLEAN DEFAULT false,
  is_locked         BOOLEAN DEFAULT false,
  is_visible        BOOLEAN DEFAULT true,
  outcome_config    JSONB,
  criteria_config   JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 8. projects
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  members     TEXT,
  advisor     TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 9. jurors
CREATE TABLE jurors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  juror_name        TEXT NOT NULL,
  affiliation       TEXT NOT NULL,
  email             TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 10. scores
CREATE TABLE scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  juror_id    UUID NOT NULL REFERENCES jurors(id),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_id   UUID NOT NULL REFERENCES periods(id),
  technical   NUMERIC,
  written     NUMERIC,
  oral        NUMERIC,
  teamwork    NUMERIC,
  comments    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(juror_id, project_id)
);

-- 11. criterion_outcome_mappings
CREATE TABLE criterion_outcome_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outcome_id        UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE,
  criterion_key     TEXT NOT NULL,
  coverage_type     TEXT NOT NULL DEFAULT 'direct' CHECK (coverage_type IN ('direct', 'indirect')),
  weight            NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, outcome_id, criterion_key)
);

-- 12. juror_period_auth (was juror_semester_auth)
CREATE TABLE juror_period_auth (
  juror_id      UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  period_id     UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  pin           TEXT,
  session_token TEXT,
  last_seen_at  TIMESTAMPTZ,
  is_blocked    BOOLEAN DEFAULT false,
  edit_enabled  BOOLEAN DEFAULT false,
  failed_attempts INT DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  final_submitted_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (juror_id, period_id)
);

-- 13. entry_tokens
CREATE TABLE entry_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  is_revoked  BOOLEAN DEFAULT false,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 14. audit_logs
CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id),
  user_id           UUID REFERENCES profiles(id),
  action            TEXT NOT NULL,
  resource_type     TEXT,
  resource_id       UUID,
  details           JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes

CREATE UNIQUE INDEX idx_organizations_name_lower
  ON organizations (lower(name));

CREATE INDEX idx_periods_organization_is_current
  ON periods (organization_id, is_current);

CREATE INDEX idx_projects_period_id
  ON projects (period_id);

CREATE INDEX idx_scores_period_id
  ON scores (period_id);

CREATE INDEX idx_audit_logs_organization_created
  ON audit_logs (organization_id, created_at DESC);


-- =============================================================================
-- Role grants
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
