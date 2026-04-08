-- VERA v1 — Identity & Organizations
-- Tables: organizations, profiles, memberships, org_applications
-- Helper: current_user_is_super_admin()

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
-- Changes from v0:
--   short_name -> code (UNIQUE NOT NULL)
--   + subtitle TEXT (was institution_name)
--   + settings JSONB DEFAULT '{}'
--   + updated_at TIMESTAMPTZ
--   status CHECK updated: removed 'limited'

CREATE TABLE organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  subtitle          TEXT,
  contact_email     TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'disabled', 'archived')),
  settings          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_organizations_name_lower ON organizations (lower(name));

-- =============================================================================
-- PROFILES
-- =============================================================================
-- Unchanged from v0.

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- MEMBERSHIPS
-- =============================================================================
-- Changes from v0:
--   role CHECK: 'admin' -> 'org_admin'

CREATE TABLE memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'org_admin'
                   CHECK (role IN ('org_admin', 'super_admin')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- =============================================================================
-- ORG_APPLICATIONS
-- =============================================================================
-- Renamed from tenant_applications.
-- Changes from v0:
--   organization_name -> (dropped; organization_id FK implies the name)
--   status CHECK: added 'cancelled'

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
-- HELPER: current_user_is_super_admin()
-- =============================================================================
-- Security-definer helper used in RLS policies.
-- Avoids infinite recursion when memberships policies reference themselves.

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = auth.uid()
      AND organization_id IS NULL
  );
$$;

-- =============================================================================
-- ROLE GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON org_applications TO authenticated;

GRANT SELECT ON organizations    TO anon;
GRANT SELECT ON org_applications TO anon;

GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;
