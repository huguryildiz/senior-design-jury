-- VERA — Fix org_applications RLS + add rpc_admin_list_organizations
--
-- Root cause of 403 on organizations?select=*,memberships(*,profiles(*)),org_applications(*):
-- The org_applications_select policy contained:
--   (SELECT email FROM auth.users WHERE id = auth.uid())
-- The `authenticated` role has no SELECT on auth.users, so PostgreSQL raises
-- a permission error when evaluating this condition (short-circuit is not
-- guaranteed by the planner). This causes PostgREST to return 403 on any
-- query embedding org_applications.
--
-- Two-part fix:
--   1. Rewrite the policy to use (auth.jwt() ->> 'email') — no auth.users access.
--   2. Add a SECURITY DEFINER RPC so the admin panel never relies on PostgREST
--      embedding across RLS-protected tables again.

-- =============================================================================
-- 1. Fix org_applications_select policy
-- =============================================================================

DROP POLICY IF EXISTS "org_applications_select" ON org_applications;

CREATE POLICY "org_applications_select" ON org_applications FOR SELECT USING (
  current_user_is_super_admin()
  OR contact_email = (auth.jwt() ->> 'email')
);

-- =============================================================================
-- 2. rpc_admin_list_organizations
-- =============================================================================
-- Super-admin only.  Returns all organizations with their org_admin memberships
-- (including profile display_name + auth email) and pending applications.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS so
-- that memberships / profiles / auth.users / org_applications are all readable.

DROP FUNCTION IF EXISTS public.rpc_admin_list_organizations();

CREATE OR REPLACE FUNCTION public.rpc_admin_list_organizations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(
    json_agg(
      jsonb_build_object(
        'id',               o.id,
        'code',             o.code,
        'name',             o.name,
        'subtitle',         o.subtitle,
        'contact_email',    o.contact_email,
        'status',           o.status,
        'settings',         o.settings,
        'created_at',       o.created_at,
        'updated_at',       o.updated_at,
        'memberships',      m_agg.data,
        'org_applications', a_agg.data
      ) ORDER BY o.name
    ),
    '[]'::json
  )
  INTO v_result
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              m.id,
          'user_id',         m.user_id,
          'organization_id', m.organization_id,
          'role',            m.role,
          'created_at',      m.created_at,
          'profiles', jsonb_build_object(
            'id',           p.id,
            'display_name', p.display_name,
            'email',        u.email
          )
        )
      ),
      '[]'::json
    ) AS data
    FROM memberships m
    LEFT JOIN profiles p ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = o.id
  ) m_agg ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              a.id,
          'organization_id', a.organization_id,
          'applicant_name',  a.applicant_name,
          'contact_email',   a.contact_email,
          'status',          a.status,
          'created_at',      a.created_at
        )
      ),
      '[]'::json
    ) AS data
    FROM org_applications a
    WHERE a.organization_id = o.id
  ) a_agg ON true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_list_organizations() TO authenticated;
