-- VERA — Maintenance Mode
-- Table: maintenance_mode (single-row)
-- RPCs:
--   rpc_public_maintenance_status  — no auth, returns active status for app gate
--   rpc_admin_set_maintenance      — super_admin: activate / schedule maintenance
--   rpc_admin_cancel_maintenance   — super_admin: deactivate maintenance
--   rpc_admin_get_maintenance      — super_admin: read current config for drawer

-- =============================================================================
-- TABLE: maintenance_mode (enforced single-row via CHECK id = 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_mode (
  id              INT PRIMARY KEY DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  mode            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (mode IN ('scheduled', 'immediate')),
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  message         TEXT NOT NULL DEFAULT 'VERA is undergoing scheduled maintenance. We''ll be back shortly.',
  affected_org_ids UUID[],  -- NULL = all organizations
  notify_admins   BOOLEAN NOT NULL DEFAULT true,
  activated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single config row
INSERT INTO public.maintenance_mode (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- updated_at trigger
CREATE TRIGGER set_updated_at_maintenance_mode
  BEFORE UPDATE ON public.maintenance_mode
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- RLS: only super admins can write; public read for status check
-- =============================================================================

ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON public.maintenance_mode
  FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- Anon/authenticated can SELECT for the status gate
CREATE POLICY "public_read" ON public.maintenance_mode
  FOR SELECT
  USING (true);

-- =============================================================================
-- rpc_public_maintenance_status
-- Returns the effective maintenance state for the client-side gate.
-- Considers scheduled mode: active only when start_time has been reached.
-- No auth required (called before login).
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_public_maintenance_status();

CREATE OR REPLACE FUNCTION public.rpc_public_maintenance_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row  public.maintenance_mode%ROWTYPE;
  v_now  TIMESTAMPTZ := now();
  v_live BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM public.maintenance_mode WHERE id = 1;

  -- Determine if maintenance is currently live
  -- scheduled: active flag + start_time has passed
  -- immediate: active flag alone
  IF v_row.is_active THEN
    IF v_row.mode = 'scheduled' THEN
      v_live := (v_row.start_time IS NOT NULL AND v_now >= v_row.start_time);
    ELSE
      v_live := true;
    END IF;
  ELSE
    v_live := false;
  END IF;

  -- Auto-expire if end_time has passed
  IF v_live AND v_row.end_time IS NOT NULL AND v_now > v_row.end_time THEN
    v_live := false;
  END IF;

  RETURN jsonb_build_object(
    'is_active',   v_live,
    'mode',        v_row.mode,
    'start_time',  v_row.start_time,
    'end_time',    v_row.end_time,
    'message',     v_row.message
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_maintenance_status() TO anon, authenticated;

-- =============================================================================
-- rpc_admin_get_maintenance
-- Returns full config for the admin drawer. Super admin only.
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_admin_get_maintenance();

CREATE OR REPLACE FUNCTION public.rpc_admin_get_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.maintenance_mode%ROWTYPE;
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  SELECT * INTO v_row FROM public.maintenance_mode WHERE id = 1;

  RETURN jsonb_build_object(
    'is_active',        v_row.is_active,
    'mode',             v_row.mode,
    'start_time',       v_row.start_time,
    'end_time',         v_row.end_time,
    'message',          v_row.message,
    'affected_org_ids', v_row.affected_org_ids,
    'notify_admins',    v_row.notify_admins,
    'updated_at',       v_row.updated_at
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_maintenance() TO authenticated;

-- =============================================================================
-- rpc_admin_set_maintenance
-- Activates or schedules maintenance. Super admin only.
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN);

CREATE OR REPLACE FUNCTION public.rpc_admin_set_maintenance(
  p_mode            TEXT,          -- 'scheduled' | 'immediate'
  p_start_time      TIMESTAMPTZ DEFAULT NULL,
  p_duration_min    INT         DEFAULT NULL,  -- NULL = until manually lifted
  p_message         TEXT        DEFAULT NULL,
  p_affected_org_ids UUID[]     DEFAULT NULL,
  p_notify_admins   BOOLEAN     DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_end_time  TIMESTAMPTZ;
  v_effective_start TIMESTAMPTZ;
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  IF p_mode NOT IN ('scheduled', 'immediate') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  -- For immediate mode, start_time = now
  v_effective_start := CASE WHEN p_mode = 'immediate' THEN now() ELSE p_start_time END;

  -- Compute end_time from duration
  IF p_duration_min IS NOT NULL AND v_effective_start IS NOT NULL THEN
    v_end_time := v_effective_start + (p_duration_min || ' minutes')::INTERVAL;
  ELSE
    v_end_time := NULL;
  END IF;

  UPDATE public.maintenance_mode
  SET
    is_active        = true,
    mode             = p_mode,
    start_time       = v_effective_start,
    end_time         = v_end_time,
    message          = COALESCE(p_message, message),
    affected_org_ids = p_affected_org_ids,
    notify_admins    = p_notify_admins,
    activated_by     = auth.uid(),
    updated_at       = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true, 'start_time', v_effective_start, 'end_time', v_end_time)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN) TO authenticated;

-- =============================================================================
-- rpc_admin_cancel_maintenance
-- Deactivates maintenance immediately. Super admin only.
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_admin_cancel_maintenance();

CREATE OR REPLACE FUNCTION public.rpc_admin_cancel_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  UPDATE public.maintenance_mode
  SET is_active = false, updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_cancel_maintenance() TO authenticated;
