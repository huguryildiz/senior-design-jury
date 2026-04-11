-- 031_fix_approve_upsert_membership.sql
-- Fixes rpc_admin_approve_application: the previous ON CONFLICT DO NOTHING
-- silently left an existing 'invited' membership unchanged when an approved
-- applicant already had a membership row (e.g. from a prior manual invite).
-- Changed to DO UPDATE SET status = 'active' so approval always promotes the
-- user to active regardless of prior membership state.

CREATE OR REPLACE FUNCTION public.rpc_admin_approve_application(
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app_row  org_applications%ROWTYPE;
  v_user_id  UUID;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'unauthorized')::JSON;
  END IF;

  SELECT * INTO v_app_row FROM org_applications WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'application_not_found')::JSON;
  END IF;

  IF v_app_row.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_status')::JSON;
  END IF;

  -- Mark application approved
  UPDATE org_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  -- Look up the Supabase Auth user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(v_app_row.contact_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Ensure a profiles row exists
    INSERT INTO profiles (id)
    VALUES (v_user_id)
    ON CONFLICT (id) DO NOTHING;

    -- Grant org_admin membership. If a prior 'invited' row exists for this
    -- user+org, promote it to 'active' rather than silently skipping.
    INSERT INTO memberships (user_id, organization_id, role, status)
    VALUES (v_user_id, v_app_row.organization_id, 'org_admin', 'active')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET status = 'active';
  END IF;

  -- Audit log
  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    v_app_row.organization_id,
    auth.uid(),
    'application.approved',
    'org_applications',
    p_application_id,
    jsonb_build_object(
      'applicant_email', v_app_row.contact_email,
      'applicant_name',  v_app_row.applicant_name,
      'membership_created', v_user_id IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'membership_created', v_user_id IS NOT NULL
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_approve_application(UUID) TO authenticated;
