-- VERA — Security Policy
-- Table: security_policy (single-row)
-- RPCs:
--   rpc_admin_get_security_policy  — super_admin: read current policy for drawer
--   rpc_admin_set_security_policy  — super_admin: persist policy changes

-- =============================================================================
-- TABLE: security_policy (enforced single-row via CHECK id = 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_policy (
  id         INT PRIMARY KEY DEFAULT 1,
  policy     JSONB NOT NULL DEFAULT '{
    "googleOAuth": true,
    "emailPassword": true,
    "rememberMe": true,
    "minPasswordLength": 8,
    "maxLoginAttempts": 5,
    "requireSpecialChars": true,
    "tokenTtl": "24h",
    "allowMultiDevice": false
  }'::JSONB,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single config row
INSERT INTO public.security_policy (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- updated_at trigger
CREATE TRIGGER set_updated_at_security_policy
  BEFORE UPDATE ON public.security_policy
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- RLS: only super admins can read or write
-- =============================================================================

ALTER TABLE public.security_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON public.security_policy
  FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- =============================================================================
-- rpc_admin_get_security_policy
-- Returns the policy JSONB for the admin drawer. Super admin only.
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_admin_get_security_policy();

CREATE OR REPLACE FUNCTION public.rpc_admin_get_security_policy()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.security_policy%ROWTYPE;
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  SELECT * INTO v_row FROM public.security_policy WHERE id = 1;

  RETURN (v_row.policy || jsonb_build_object('updated_at', v_row.updated_at))::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_security_policy() TO authenticated;

-- =============================================================================
-- rpc_admin_set_security_policy
-- Merges the provided JSONB into the existing policy. Super admin only.
-- Uses jsonb merge (||) so callers can send partial updates.
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_admin_set_security_policy(JSONB);

CREATE OR REPLACE FUNCTION public.rpc_admin_set_security_policy(p_policy JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  UPDATE public.security_policy
  SET
    policy     = policy || p_policy,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_security_policy(JSONB) TO authenticated;
