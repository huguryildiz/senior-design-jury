-- VERA v1 — Periods, Projects, Jurors, Auth, Tokens, Audit
-- Tables: periods, projects, jurors, juror_period_auth, entry_tokens, audit_logs

-- =============================================================================
-- PERIODS
-- =============================================================================
-- Changes from v0:
--   REMOVED: criteria_config JSONB, outcome_config JSONB
--   + poster_date DATE
--   + snapshot_frozen_at TIMESTAMPTZ
--   + updated_at TIMESTAMPTZ

CREATE TABLE periods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework_id        UUID REFERENCES frameworks(id),
  name                TEXT NOT NULL,
  season              TEXT CHECK (season IN ('Fall', 'Spring', 'Summer', 'Registration', 'Submission', 'Qualifying', 'Semi-Finals', 'Finals', 'Evaluation', 'Review', 'Selection', 'Announcement')),
  description         TEXT,
  start_date          DATE,
  end_date            DATE,
  poster_date         DATE,
  is_current          BOOLEAN DEFAULT false,
  is_locked           BOOLEAN DEFAULT false,
  is_visible          BOOLEAN DEFAULT true,
  snapshot_frozen_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_periods_organization_is_current
  ON periods (organization_id, is_current);

-- =============================================================================
-- PROJECTS
-- =============================================================================
-- Changes from v0:
--   members TEXT -> members JSONB DEFAULT '[]'
--   advisor TEXT -> advisor_name TEXT + advisor_affiliation TEXT
--   + project_no INT
--   + updated_at TIMESTAMPTZ
--   + UNIQUE(period_id, project_no) WHERE project_no IS NOT NULL

CREATE TABLE projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id           UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  project_no          INT,
  title               TEXT NOT NULL,
  members             JSONB NOT NULL DEFAULT '[]',
  advisor_name        TEXT,
  advisor_affiliation TEXT,
  description         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (period_id, project_no)
);

CREATE INDEX idx_projects_period_id ON projects (period_id);

-- =============================================================================
-- JURORS
-- =============================================================================
-- Changes from v0:
--   + avatar_color TEXT
--   + updated_at TIMESTAMPTZ

CREATE TABLE jurors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  juror_name       TEXT NOT NULL,
  affiliation      TEXT NOT NULL,
  email            TEXT,
  avatar_color     TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- JUROR_PERIOD_AUTH
-- =============================================================================
-- Changes from v0:
--   pin TEXT -> pin_hash TEXT (bcrypt via pgcrypto)
--   + session_expires_at TIMESTAMPTZ
--   + edit_reason TEXT
--   + edit_expires_at TIMESTAMPTZ
--   + locked_at TIMESTAMPTZ

CREATE TABLE juror_period_auth (
  juror_id            UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  period_id           UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  pin_hash            TEXT,
  session_token       TEXT,
  session_expires_at  TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  is_blocked          BOOLEAN DEFAULT false,
  edit_enabled        BOOLEAN DEFAULT false,
  edit_reason         TEXT,
  edit_expires_at     TIMESTAMPTZ,
  failed_attempts     INT DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  locked_at           TIMESTAMPTZ,
  final_submitted_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (juror_id, period_id)
);

-- =============================================================================
-- ENTRY_TOKENS
-- =============================================================================
-- Changes from v0:
--   + last_used_at TIMESTAMPTZ

CREATE TABLE entry_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id     UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  is_revoked    BOOLEAN DEFAULT false,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- AUDIT_LOGS
-- =============================================================================
-- Unchanged from v0.

CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id),
  user_id          UUID REFERENCES profiles(id),
  action           TEXT NOT NULL,
  resource_type    TEXT,
  resource_id      UUID,
  details          JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_organization_created
  ON audit_logs (organization_id, created_at DESC);

-- =============================================================================
-- ROLE GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON periods           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jurors            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON juror_period_auth TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON entry_tokens      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs        TO authenticated;

GRANT SELECT ON periods           TO anon;
GRANT SELECT ON projects          TO anon;
GRANT SELECT ON jurors            TO anon;
GRANT SELECT ON entry_tokens      TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
