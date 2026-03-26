-- ============================================================
-- 014_remove_password_gates.sql
-- Remove legacy delete password and backup password gates.
--
-- Phase C introduced JWT auth + role checks + audit logs.
-- Separate global passwords for delete/backup operations are
-- now redundant and incompatible with multi-tenant architecture.
--
-- New security model: authenticated user + role check + audit log.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. DROP v2 RPCs (old signatures with password param)
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_semester_delete(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_project_delete(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_juror_delete(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_export_full(uuid, text);

-- ══════════════════════════════════════════════════════════════
-- 2. DROP v1 legacy RPCs (password + rpc_secret signatures)
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_delete_semester(uuid, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_delete_project(uuid, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_delete_juror(uuid, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_full_export(text, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_full_import(text, text, jsonb, text);

-- ══════════════════════════════════════════════════════════════
-- 3. DROP password helper functions (both overloads)
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public._verify_delete_password(text);
DROP FUNCTION IF EXISTS public._verify_delete_password(text, text);
DROP FUNCTION IF EXISTS public._assert_delete_password(text);
DROP FUNCTION IF EXISTS public._assert_delete_password(text, text);
DROP FUNCTION IF EXISTS public._assert_backup_password(text);
DROP FUNCTION IF EXISTS public._assert_backup_password(text, text);

-- ══════════════════════════════════════════════════════════════
-- 4. DROP bootstrap / change password RPCs
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_bootstrap_delete_password(text, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_bootstrap_backup_password(text, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_change_delete_password(text, text, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_change_backup_password(text, text, text, text);

-- ══════════════════════════════════════════════════════════════
-- 5. RECREATE v2 RPCs without password parameter
-- ══════════════════════════════════════════════════════════════

-- ── Semester delete ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_delete(p_semester_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_name text;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  SELECT semester_name INTO v_name FROM semesters WHERE id = p_semester_id;
  DELETE FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'semester_delete', 'semester', p_semester_id,
    format('Admin deleted semester %s.', COALESCE(v_name, p_semester_id::text)), NULL);
  RETURN true;
END; $$;

-- ── Project delete ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_admin_project_delete(p_project_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_title text; v_grp integer; v_sid uuid; v_lk boolean := false; v_hs boolean := false;
BEGIN
  SELECT project_title, group_no, semester_id INTO v_title, v_grp, v_sid FROM projects WHERE id = p_project_id;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'project_not_found'; END IF;
  v_uid := public._assert_semester_access(v_sid);
  SELECT COALESCE(is_locked,false) INTO v_lk FROM semesters WHERE id = v_sid;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  SELECT EXISTS (SELECT 1 FROM scores s WHERE s.project_id = p_project_id
    AND (s.final_submitted_at IS NOT NULL OR (s.criteria_scores IS NOT NULL AND s.criteria_scores <> '{}'::jsonb))) INTO v_hs;
  IF v_hs THEN RAISE EXCEPTION 'project_has_scored_data'; END IF;
  DELETE FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'project_delete', 'project', p_project_id,
    format('Admin deleted project Group %s — %s.', COALESCE(v_grp::text,'?'), COALESCE(v_title, p_project_id::text)),
    jsonb_build_object('group_no', v_grp, 'semester_id', v_sid));
  RETURN true;
END; $$;

-- ── Juror delete ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_admin_juror_delete(p_juror_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM juror_semester_auth jsa WHERE jsa.juror_id = p_juror_id) THEN
    v_uid := public._assert_super_admin();
  ELSE
    SELECT public._assert_tenant_admin(jsa.tenant_id) INTO v_uid FROM juror_semester_auth jsa WHERE jsa.juror_id = p_juror_id LIMIT 1;
  END IF;
  SELECT juror_name INTO v_name FROM jurors WHERE id = p_juror_id;
  DELETE FROM jurors WHERE id = p_juror_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'juror_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'juror_delete', 'juror', p_juror_id,
    format('Admin deleted juror %s.', COALESCE(v_name, p_juror_id::text)), NULL);
  RETURN true;
END; $$;

-- ── Export (tenant-scoped, no password) ───────────────────────

CREATE OR REPLACE FUNCTION public.rpc_admin_export_full(p_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_payload jsonb;
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  v_payload := jsonb_build_object(
    'exported_at', now(), 'schema_version', 2, 'tenant_id', p_tenant_id,
    'tenant', (SELECT row_to_json(t) FROM (
      SELECT id, code, short_label, university, department, status FROM tenants WHERE id = p_tenant_id) t),
    'semesters', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (
      SELECT id, tenant_id, semester_name, is_current, is_locked, poster_date,
        criteria_template, mudek_template, created_at, updated_at
      FROM semesters WHERE tenant_id = p_tenant_id) s), '[]'::jsonb),
    'jurors', COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'id',j.id,'juror_name',j.juror_name,'juror_inst',j.juror_inst,
      'created_at',j.created_at,'updated_at',j.updated_at))
      FROM jurors j WHERE EXISTS (
        SELECT 1 FROM juror_semester_auth jsa WHERE jsa.juror_id = j.id AND jsa.tenant_id = p_tenant_id
      )), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM projects p WHERE p.tenant_id = p_tenant_id), '[]'::jsonb),
    'scores', COALESCE((SELECT jsonb_agg(row_to_json(sc)) FROM scores sc WHERE sc.tenant_id = p_tenant_id), '[]'::jsonb),
    'juror_semester_auth', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',a.id,'juror_id',a.juror_id,'semester_id',a.semester_id,'tenant_id',a.tenant_id,
      'created_at',a.created_at,'last_seen_at',a.last_seen_at,'failed_attempts',a.failed_attempts,
      'locked_until',a.locked_until,'edit_enabled',a.edit_enabled,'pin_reveal_pending',a.pin_reveal_pending))
      FROM juror_semester_auth a WHERE a.tenant_id = p_tenant_id), '[]'::jsonb));
  PERFORM public._audit_log('admin', auth.uid(), 'db_export', 'settings', null::uuid,
    'Admin exported database backup.', jsonb_build_object('tenant_id', p_tenant_id));
  RETURN v_payload;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- 6. UPDATE security state (return false for removed passwords)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_security_state()
RETURNS TABLE (admin_password_set boolean, delete_password_set boolean, backup_password_set boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  RETURN QUERY SELECT
    EXISTS (SELECT 1 FROM settings WHERE key = 'admin_password_hash' AND tenant_id IS NULL AND value IS NOT NULL AND value <> ''),
    false::boolean,
    false::boolean;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- 7. GRANTS for new function signatures
-- ══════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_delete(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_delete(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_juror_delete(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_export_full(uuid) TO anon, authenticated;
