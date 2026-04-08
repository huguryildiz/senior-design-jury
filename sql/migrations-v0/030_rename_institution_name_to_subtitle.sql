-- VERA v1 — Rename institution_name → subtitle
-- The column was semantically inverted: "institution_name" held department/sub-unit
-- names, while "name" held the institution. Rename to "subtitle" — a display-oriented
-- label that works for academic departments, competition tracks, and program codes.

-- Idempotent: skip if already renamed (fresh bootstrap has subtitle from 002)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'institution_name'
  ) THEN
    ALTER TABLE organizations RENAME COLUMN institution_name TO subtitle;
  END IF;
END $$;

-- Recreate rpc_landing_stats to reference the new column name
CREATE OR REPLACE FUNCTION rpc_landing_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'organizations', (SELECT count(*) FROM organizations),
    'evaluations',   (SELECT count(*) FROM scores_compat),
    'jurors',        (SELECT count(DISTINCT juror_id) FROM scores_compat),
    'projects',      (SELECT count(DISTINCT project_id) FROM scores_compat),
    'institutions',  (SELECT json_agg(DISTINCT subtitle ORDER BY subtitle)
                       FROM organizations
                       WHERE status = 'active')
  );
$$;

-- Recreate rpc_admin_list_organizations to reference the new column name
CREATE OR REPLACE FUNCTION rpc_admin_list_organizations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result json;
BEGIN
  PERFORM _assert_super_admin();

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
    SELECT COALESCE(json_agg(jsonb_build_object(
      'user_id', m.user_id,
      'role',    m.role,
      'display_name', p.display_name,
      'email',        u.email
    )), '[]'::json) AS data
    FROM memberships m
    JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.organization_id = o.id
  ) m_agg ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(json_agg(jsonb_build_object(
      'id',             a.id,
      'applicant_name', a.applicant_name,
      'contact_email',  a.contact_email,
      'status',         a.status,
      'created_at',     a.created_at
    ) ORDER BY a.created_at DESC), '[]'::json) AS data
    FROM org_applications a
    WHERE a.organization_id = o.id
  ) a_agg ON TRUE;

  RETURN v_result;
END;
$$;
