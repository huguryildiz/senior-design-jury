-- VERA v1 — All Tables, View, Indexes, Grants
-- 22 tables + scores_compat view, in FK dependency order.
-- Single-row config tables (maintenance_mode, security_policy) seeded inline.

-- =============================================================================
-- 1. ORGANIZATIONS
-- =============================================================================

CREATE TABLE organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  institution       TEXT,
  contact_email     TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  settings          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_organizations_name_lower ON organizations (lower(name));

-- =============================================================================
-- 2. PROFILES
-- =============================================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. MEMBERSHIPS
-- =============================================================================

CREATE TABLE memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'org_admin'
                   CHECK (role IN ('org_admin', 'super_admin')),
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'invited', 'requested')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- organization_id is the second column of the UNIQUE composite, so lookups
-- filtering only by organization_id (common in tenant RLS checks) need a
-- standalone index to avoid full scans.
CREATE INDEX idx_memberships_organization_id ON memberships(organization_id);

-- =============================================================================
-- 4. ORG_APPLICATIONS
-- =============================================================================

CREATE TABLE org_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  applicant_name   TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by      UUID REFERENCES profiles(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 5. FRAMEWORKS
-- =============================================================================

CREATE TABLE frameworks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  default_threshold    NUMERIC DEFAULT 70,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. FRAMEWORK_OUTCOMES
-- =============================================================================

CREATE TABLE framework_outcomes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id   UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  label          TEXT NOT NULL,
  description    TEXT,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(framework_id, code)
);

-- =============================================================================
-- 7. FRAMEWORK_CRITERIA
-- =============================================================================

CREATE TABLE framework_criteria (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  max_score    NUMERIC NOT NULL,
  weight       NUMERIC NOT NULL,
  color        TEXT,
  rubric_bands JSONB,
  sort_order   INT DEFAULT 0,
  UNIQUE(framework_id, key)
);

-- =============================================================================
-- 8. FRAMEWORK_CRITERION_OUTCOME_MAPS
-- =============================================================================

CREATE TABLE framework_criterion_outcome_maps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  period_id       UUID REFERENCES periods(id) ON DELETE CASCADE,
  criterion_id    UUID NOT NULL REFERENCES framework_criteria(id) ON DELETE CASCADE,
  outcome_id      UUID NOT NULL REFERENCES framework_outcomes(id) ON DELETE CASCADE,
  coverage_type   TEXT NOT NULL DEFAULT 'direct'
                  CHECK (coverage_type IN ('direct', 'indirect')),
  weight          NUMERIC,
  UNIQUE(criterion_id, outcome_id)
);

-- =============================================================================
-- 9. PERIODS
-- =============================================================================

CREATE TABLE periods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework_id        UUID REFERENCES frameworks(id),
  name                TEXT NOT NULL,
  season              TEXT CHECK (season IN (
    'Fall', 'Spring', 'Summer',
    'Registration', 'Submission', 'Qualifying',
    'Semi-Finals', 'Finals', 'Evaluation',
    'Review', 'Selection', 'Announcement'
  )),
  description         TEXT,
  start_date          DATE,
  end_date            DATE,
  is_current          BOOLEAN DEFAULT false,
  is_locked           BOOLEAN DEFAULT false,
  is_visible          BOOLEAN DEFAULT true,
  activated_at        TIMESTAMPTZ,
  snapshot_frozen_at  TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  criteria_name       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_periods_organization_is_current
  ON periods (organization_id, is_current);

-- =============================================================================
-- 10. PROJECTS
-- =============================================================================

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
-- 11. JURORS
-- =============================================================================

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

CREATE INDEX idx_jurors_organization_id ON jurors(organization_id);

-- =============================================================================
-- 12. JUROR_PERIOD_AUTH
-- =============================================================================
-- session_token_hash: SHA-256 hex of the plain session token (never stored plain)
-- pin_pending_reveal: plain PIN shown once after admin reset (cleared on read)

CREATE TABLE juror_period_auth (
  juror_id            UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  period_id           UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  pin_hash            TEXT,
  session_token_hash  TEXT,
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
  pin_pending_reveal  TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (juror_id, period_id)
);

-- =============================================================================
-- 13. ENTRY_TOKENS
-- =============================================================================
-- token_hash: SHA-256 hex of the plain token (used for verification)
-- token_plain: stored for admin QR generation (readable only by authenticated)

CREATE TABLE entry_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id     UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  token_plain   TEXT,
  is_revoked    BOOLEAN DEFAULT false,
  revoked_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_entry_tokens_token_hash ON entry_tokens (token_hash);

-- =============================================================================
-- 13b. UNLOCK_REQUESTS
-- =============================================================================
-- Org admin cannot directly unlock a period that already has scores (fairness).
-- Super admin approval is required — this table holds pending/decided requests.

CREATE TABLE unlock_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES profiles(id),
  reason          TEXT NOT NULL CHECK (length(btrim(reason)) >= 10),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_unlock_requests_org_status ON unlock_requests (organization_id, status);
CREATE INDEX idx_unlock_requests_period ON unlock_requests (period_id);
-- One pending request per period at a time
CREATE UNIQUE INDEX idx_unlock_requests_one_pending_per_period
  ON unlock_requests (period_id) WHERE status = 'pending';

-- =============================================================================
-- 14. AUDIT TAXONOMY TYPES
-- =============================================================================
-- Defined here (before audit_logs) so the table can reference them directly.

CREATE TYPE audit_category  AS ENUM ('auth', 'access', 'data', 'config', 'security');
CREATE TYPE audit_severity  AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE audit_actor_type AS ENUM ('admin', 'juror', 'system', 'anonymous');

-- =============================================================================
-- 15. AUDIT_LOGS
-- =============================================================================

CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id),
  user_id          UUID REFERENCES profiles(id),
  action           TEXT NOT NULL,
  resource_type    TEXT,
  resource_id      UUID,
  details          JSONB,
  -- taxonomy (added via 043_audit_taxonomy)
  category         audit_category,
  severity         audit_severity DEFAULT 'info',
  actor_type       audit_actor_type,
  actor_name       TEXT,
  ip_address       INET,
  user_agent       TEXT,
  session_id       UUID,
  correlation_id   UUID,
  diff             JSONB,
  -- hash-chain (added via 054_audit_hash_chain)
  row_hash         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_organization_created
  ON audit_logs (organization_id, created_at DESC);

-- Filtered list by category (most common query pattern)
CREATE INDEX idx_audit_logs_category_created
  ON audit_logs (organization_id, category, created_at DESC);

-- Security/compliance dashboard: only ≥medium rows
CREATE INDEX idx_audit_logs_severity
  ON audit_logs (organization_id, severity, created_at DESC)
  WHERE severity IN ('medium', 'high', 'critical');

-- Actor-type drill-down (juror vs admin vs system activity)
CREATE INDEX idx_audit_logs_actor_type
  ON audit_logs (organization_id, actor_type, created_at DESC);

-- Filter by user_id (admin activity review across orgs)
CREATE INDEX idx_audit_logs_user_id
  ON audit_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- =============================================================================
-- 15. PERIOD_CRITERIA (snapshot)
-- =============================================================================

CREATE TABLE period_criteria (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id           UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  source_criterion_id UUID,
  key                 TEXT NOT NULL,
  label               TEXT NOT NULL,
  description         TEXT,
  max_score           NUMERIC NOT NULL,
  weight              NUMERIC NOT NULL,
  color               TEXT,
  rubric_bands        JSONB,
  sort_order          INT DEFAULT 0,
  UNIQUE(period_id, key)
);

-- =============================================================================
-- 16. PERIOD_OUTCOMES (snapshot)
-- =============================================================================

CREATE TABLE period_outcomes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id         UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  source_outcome_id UUID,
  code              TEXT NOT NULL,
  label             TEXT NOT NULL,
  description       TEXT,
  coverage_type     TEXT CHECK (coverage_type IN ('direct', 'indirect')),
  sort_order        INT DEFAULT 0,
  UNIQUE(period_id, code)
);

-- =============================================================================
-- 17. PERIOD_CRITERION_OUTCOME_MAPS (snapshot)
-- =============================================================================

CREATE TABLE period_criterion_outcome_maps (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id            UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  period_criterion_id  UUID NOT NULL REFERENCES period_criteria(id) ON DELETE CASCADE,
  period_outcome_id    UUID NOT NULL REFERENCES period_outcomes(id) ON DELETE CASCADE,
  coverage_type        TEXT CHECK (coverage_type IN ('direct', 'indirect')),
  weight               NUMERIC,
  UNIQUE(period_criterion_id, period_outcome_id)
);

-- =============================================================================
-- 18. SCORE_SHEETS
-- =============================================================================

CREATE TABLE score_sheets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id        UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  juror_id         UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  comment          TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'in_progress', 'submitted')),
  started_at       TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(juror_id, project_id)
);

CREATE INDEX idx_score_sheets_period ON score_sheets(period_id);
CREATE INDEX idx_score_sheets_juror  ON score_sheets(juror_id);

-- =============================================================================
-- 19. SCORE_SHEET_ITEMS
-- =============================================================================

CREATE TABLE score_sheet_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_sheet_id       UUID NOT NULL REFERENCES score_sheets(id) ON DELETE CASCADE,
  period_criterion_id  UUID NOT NULL REFERENCES period_criteria(id) ON DELETE CASCADE,
  score_value          NUMERIC CHECK (score_value >= 0),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(score_sheet_id, period_criterion_id)
);

CREATE INDEX idx_score_sheet_items_sheet ON score_sheet_items(score_sheet_id);
CREATE INDEX idx_score_sheet_items_period_criterion ON score_sheet_items(period_criterion_id);

-- =============================================================================
-- 20. MAINTENANCE_MODE (single-row config)
-- =============================================================================

CREATE TABLE maintenance_mode (
  id              INT PRIMARY KEY DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  mode            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (mode IN ('scheduled', 'immediate')),
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  message         TEXT NOT NULL DEFAULT 'VERA is undergoing scheduled maintenance. We''ll be back shortly.',
  affected_org_ids UUID[],
  notify_admins   BOOLEAN NOT NULL DEFAULT true,
  activated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT maintenance_mode_single_row CHECK (id = 1)
);

INSERT INTO maintenance_mode (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 21. SECURITY_POLICY (single-row config)
-- =============================================================================

CREATE TABLE security_policy (
  id         INT PRIMARY KEY DEFAULT 1,
  policy     JSONB NOT NULL DEFAULT '{
    "googleOAuth": true,
    "emailPassword": true,
    "rememberMe": true,
    "qrTtl": "24h",
    "maxPinAttempts": 5,
    "pinLockCooldown": "30m",
    "ccOnPinReset": true,
    "ccOnScoreEdit": false,
    "ccOnTenantApplication": true,
    "ccOnMaintenance": true,
    "ccOnPasswordChanged": true
  }'::JSONB,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT security_policy_single_row CHECK (id = 1)
);

INSERT INTO security_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 22. JURY_FEEDBACK
-- =============================================================================

CREATE TABLE jury_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  juror_id    UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_jury_feedback_juror_period
  ON jury_feedback(period_id, juror_id);

-- =============================================================================
-- 23. RECEIVED_EMAILS
-- =============================================================================
-- Stores inbound emails forwarded via the Resend webhook Edge Function
-- (supabase/functions/receive-email/index.ts).
-- Access is service_role-only (no GRANT to authenticated/anon; no RLS needed).

CREATE TABLE IF NOT EXISTS received_emails (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_address TEXT,
  to_address   TEXT,
  subject      TEXT,
  text_body    TEXT,
  html_body    TEXT,
  raw_payload  JSONB
);

-- =============================================================================
-- VIEW: scores_compat (backward-compatibility bridge for admin pages)
-- =============================================================================
-- Pivots normalized score_sheet_items to flat wide-row shape.
-- Criterion key mapping (matches fieldMapping.js):
--   technical -> technical, design -> written, delivery -> oral, teamwork -> teamwork

CREATE OR REPLACE VIEW scores_compat AS
SELECT
  ss.id,
  ss.juror_id,
  ss.project_id,
  ss.period_id,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'technical') AS technical,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'design')    AS written,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'delivery')  AS oral,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'teamwork')  AS teamwork,
  ss.comment AS comments,
  ss.created_at,
  ss.updated_at
FROM score_sheets ss
LEFT JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
LEFT JOIN period_criteria   pc  ON pc.id = ssi.period_criterion_id
GROUP BY ss.id;

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Identity
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON org_applications TO authenticated;
GRANT SELECT ON organizations    TO anon;
GRANT SELECT ON org_applications TO anon;

-- Frameworks
GRANT SELECT, INSERT, UPDATE, DELETE ON frameworks                       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON framework_outcomes               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON framework_criteria               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON framework_criterion_outcome_maps TO authenticated;
GRANT SELECT ON frameworks                       TO anon;
GRANT SELECT ON framework_outcomes               TO anon;
GRANT SELECT ON framework_criteria               TO anon;
GRANT SELECT ON framework_criterion_outcome_maps TO anon;

-- Execution
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
GRANT SELECT ON memberships       TO anon;
GRANT SELECT ON juror_period_auth TO anon;

-- Snapshots
GRANT SELECT, INSERT, UPDATE, DELETE ON period_criteria              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON period_outcomes              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON period_criterion_outcome_maps TO authenticated;
GRANT SELECT ON period_criteria               TO anon;
GRANT SELECT ON period_outcomes               TO anon;
GRANT SELECT ON period_criterion_outcome_maps TO anon;

-- Scoring
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheets      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheet_items TO authenticated;
GRANT SELECT ON scores_compat                             TO authenticated;
GRANT SELECT ON score_sheets      TO anon;
GRANT SELECT ON score_sheet_items TO anon;
GRANT SELECT ON scores_compat     TO anon;

-- Config
GRANT SELECT ON maintenance_mode TO anon, authenticated;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =============================================================================
-- TRIGGER: handle_invite_confirmed
-- =============================================================================
-- Automatically promotes memberships.status from 'invited' → 'active'
-- when the invited user confirms their email address via Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_invite_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE memberships
    SET status = 'active'
    WHERE user_id = NEW.id AND status = 'invited';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invite_confirmed();

-- =============================================================================
-- Supabase Realtime Publication
-- =============================================================================
-- Only tables that need live updates are included to minimise WAL overhead.
-- RLS still applies to all realtime subscriptions.
-- Note: ALTER PUBLICATION is idempotent for tables already in the publication.
--
-- audit_logs intentionally excluded: every mutation trigger writes here, so
-- including it in the publication causes WAL amplification on every admin
-- action. The Audit Log page uses polling/on-demand refresh instead.

ALTER PUBLICATION supabase_realtime ADD TABLE
  score_sheets,
  score_sheet_items,
  juror_period_auth,
  projects,
  periods,
  jurors;

-- =============================================================================
-- BACKFILL: periods.criteria_name
-- =============================================================================
-- Periods that have criteria saved in period_criteria but no criteria_name set
-- (created before the criteria_name column was introduced) get a default label
-- so the Periods page shows a meaningful badge instead of "N criteria".
-- Idempotent: WHERE criteria_name IS NULL — safe to re-run.

UPDATE periods
SET criteria_name = 'Custom Criteria'
WHERE criteria_name IS NULL
  AND id IN (SELECT DISTINCT period_id FROM period_criteria);
