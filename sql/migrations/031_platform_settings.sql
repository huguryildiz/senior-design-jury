-- sql/migrations/031_platform_settings.sql
-- Platform-wide settings: single-row config table + get/set RPCs.
-- Mirrors the maintenance_mode / security_policy single-row pattern.
--
-- Fields:
--   platform_name         — shown in login, landing, email templates (future)
--   support_email         — shown alongside platform_name (future)
--   auto_approve_new_orgs — toggle persisted now, wired to approval flow in v2

-- =============================================================================
-- TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id                     INT PRIMARY KEY DEFAULT 1,
  platform_name          TEXT NOT NULL DEFAULT 'VERA Evaluation Platform',
  support_email          TEXT NOT NULL DEFAULT 'support@vera-eval.app',
  auto_approve_new_orgs  BOOLEAN NOT NULL DEFAULT false,
  updated_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_single_row CHECK (id = 1),
  CONSTRAINT platform_settings_name_not_empty
    CHECK (length(trim(platform_name)) > 0),
  CONSTRAINT platform_settings_name_max_length
    CHECK (length(platform_name) <= 100),
  CONSTRAINT platform_settings_email_format
    CHECK (support_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Super admins may read the row directly (debugging convenience).
-- All writes go through SECURITY DEFINER RPCs, so no write policy is needed.
DROP POLICY IF EXISTS platform_settings_super_admin_read ON platform_settings;
CREATE POLICY platform_settings_super_admin_read
  ON platform_settings
  FOR SELECT
  TO authenticated
  USING (current_user_is_super_admin());

-- =============================================================================
-- RPC: read
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_get_platform_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row platform_settings%ROWTYPE;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  SELECT * INTO v_row FROM platform_settings WHERE id = 1;

  RETURN jsonb_build_object(
    'platform_name',         v_row.platform_name,
    'support_email',         v_row.support_email,
    'auto_approve_new_orgs', v_row.auto_approve_new_orgs,
    'updated_at',            v_row.updated_at,
    'updated_by',            v_row.updated_by
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_platform_settings() TO authenticated;

-- =============================================================================
-- RPC: update
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_platform_settings(
  p_platform_name          TEXT,
  p_support_email          TEXT,
  p_auto_approve_new_orgs  BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  IF p_platform_name IS NULL OR length(trim(p_platform_name)) = 0 THEN
    RAISE EXCEPTION 'platform_name required';
  END IF;

  IF length(p_platform_name) > 100 THEN
    RAISE EXCEPTION 'platform_name too long (max 100)';
  END IF;

  IF p_support_email IS NULL
     OR p_support_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'support_email invalid';
  END IF;

  UPDATE platform_settings
  SET platform_name         = trim(p_platform_name),
      support_email         = trim(p_support_email),
      auto_approve_new_orgs = p_auto_approve_new_orgs,
      updated_by            = auth.uid(),
      updated_at            = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_platform_settings(TEXT, TEXT, BOOLEAN)
  TO authenticated;
