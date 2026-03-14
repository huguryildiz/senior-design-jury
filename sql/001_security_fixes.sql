-- sql/001_security_fixes.sql
-- Applied: 2026-03-14
-- Purpose: Security hardening from SQL audit findings.
--
-- C1: Add missing GRANT for rpc_admin_full_export (export was broken in production)
-- C2: Replace random() with gen_random_bytes-based CSPRNG for PIN generation (4 locations)
-- M1: Audit log on pin_plain_once IS NULL recovery path in rpc_create_or_get_juror_and_issue_pin
-- M3: Log every failed PIN attempt (not only lockout) in rpc_verify_juror_pin
-- L5: Strip pin_hash / pin_plain_once from rpc_admin_full_export payload
--
-- Safe to apply to existing Supabase DB via SQL Editor (no schema changes, no data migration).
-- All functions use CREATE OR REPLACE — idempotent.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Section 1/5: rpc_admin_full_export  (L5 + C1) ────────────────────────────
-- Strips pin_hash and pin_plain_once from the export payload.
-- GRANT added below (was missing, causing permission denied on anon key).

CREATE OR REPLACE FUNCTION public.rpc_admin_full_export(
  p_backup_password text,
  p_admin_password  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  PERFORM public._assert_backup_password(p_backup_password);

  v_payload := jsonb_build_object(
    'exported_at',     now(),
    'schema_version',  1,
    'semesters',       COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM semesters s),           '[]'::jsonb),
    'jurors',          COALESCE((SELECT jsonb_agg(row_to_json(j)) FROM jurors j),              '[]'::jsonb),
    'projects',        COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM projects p),            '[]'::jsonb),
    'scores',          COALESCE((SELECT jsonb_agg(row_to_json(sc)) FROM scores sc),            '[]'::jsonb),
    'juror_semester_auth', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                  a.id,
        'juror_id',            a.juror_id,
        'semester_id',         a.semester_id,
        'created_at',          a.created_at,
        'last_seen_at',        a.last_seen_at,
        'failed_attempts',     a.failed_attempts,
        'locked_until',        a.locked_until,
        'edit_enabled',        a.edit_enabled,
        'pin_reveal_pending',  a.pin_reveal_pending
        -- pin_hash and pin_plain_once intentionally excluded
      ))
      FROM juror_semester_auth a
    ), '[]'::jsonb)
  );

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'db_export',
    'settings',
    null::uuid,
    'Admin exported database backup.',
    null
  );

  RETURN v_payload;
END;
$$;

-- C1: GRANT that was missing — export was silently broken via anon key
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_export(text, text) TO anon, authenticated;


-- ── Section 2/5: rpc_admin_create_juror  (C2) ────────────────────────────────
-- Replaces random() with gen_random_bytes-based CSPRNG for PIN generation.

CREATE OR REPLACE FUNCTION public.rpc_admin_create_juror(
  p_juror_name text,
  p_juror_inst text,
  p_admin_password text
)
RETURNS TABLE (juror_id uuid, juror_name text, juror_inst text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_norm_name text;
  v_norm_inst text;
  v_id uuid;
  v_name text;
  v_inst text;
  v_created boolean := false;
  v_active_semester uuid;
  v_pin text;
  v_hash text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_norm_name := lower(regexp_replace(trim(coalesce(p_juror_name, '')), '\\s+', ' ', 'g'));
  v_norm_inst := lower(regexp_replace(trim(coalesce(p_juror_inst, '')), '\\s+', ' ', 'g'));

  SELECT j.id, j.juror_name, j.juror_inst
    INTO v_id, v_name, v_inst
  FROM jurors j
  WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
    AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RAISE EXCEPTION 'juror_exists';
  END IF;

  INSERT INTO jurors (juror_name, juror_inst)
  VALUES (trim(p_juror_name), trim(p_juror_inst))
  RETURNING jurors.id, jurors.juror_name, jurors.juror_inst
  INTO v_id, v_name, v_inst;

  SELECT id INTO v_active_semester
  FROM semesters
  WHERE is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_active_semester IS NOT NULL THEN
    v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
    v_hash := crypt(v_pin, gen_salt('bf'));

    INSERT INTO juror_semester_auth (juror_id, semester_id, pin_hash)
    VALUES (v_id, v_active_semester, v_hash)
    ON CONFLICT (juror_id, semester_id) DO NOTHING;

    INSERT INTO scores (semester_id, project_id, juror_id, poster_date)
    SELECT p.semester_id, p.id, v_id, s.poster_date
    FROM projects p
    JOIN semesters s ON s.id = p.semester_id
    WHERE p.semester_id = v_active_semester
    ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'juror_create',
    'juror',
    v_id,
    format(
      'Admin created juror %s%s.',
      COALESCE(v_name, ''),
      CASE
        WHEN COALESCE(NULLIF(trim(v_inst), ''), '') = '' THEN ''
        ELSE format(' (%s)', v_inst)
      END
    ),
    null
  );

  RETURN QUERY SELECT v_id, v_name, v_inst;
END;
$$;


-- ── Section 3/5: rpc_admin_reset_juror_pin  (C2) ─────────────────────────────
-- Replaces random() with gen_random_bytes-based CSPRNG for PIN generation.

CREATE OR REPLACE FUNCTION public.rpc_admin_reset_juror_pin(
  p_semester_id uuid,
  p_juror_id uuid,
  p_admin_password text
)
RETURNS TABLE (juror_id uuid, pin_plain_once text, failed_attempts integer, locked_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_pin text;
  v_hash text;
  v_juror_name text;
  v_juror_inst text;
  v_label text;
  v_secret text;
  v_pin_enc text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
  v_hash := crypt(v_pin, gen_salt('bf'));
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'pin_secret'
  LIMIT 1;
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'pin_secret_missing';
  END IF;
  v_pin_enc := 'enc:' || encode(pgp_sym_encrypt(v_pin, v_secret), 'base64');

  SELECT juror_name, juror_inst
    INTO v_juror_name, v_juror_inst
  FROM jurors
  WHERE id = p_juror_id;

  v_label := COALESCE(NULLIF(trim(v_juror_name), ''), p_juror_id::text);
  IF COALESCE(NULLIF(trim(v_juror_inst), ''), '') <> '' THEN
    v_label := v_label || format(' (%s)', v_juror_inst);
  END IF;

  INSERT INTO juror_semester_auth (juror_id, semester_id, pin_hash, pin_reveal_pending, pin_plain_once, failed_attempts, locked_until)
  VALUES (p_juror_id, p_semester_id, v_hash, true, v_pin_enc, 0, null)
  ON CONFLICT (juror_id, semester_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = null,
        pin_reveal_pending = true,
        pin_plain_once = EXCLUDED.pin_plain_once,
        last_seen_at = null;

  INSERT INTO scores (semester_id, project_id, juror_id, poster_date)
  SELECT p_semester_id, p.id, p_juror_id, s.poster_date
  FROM projects p
  JOIN semesters s ON s.id = p_semester_id
  WHERE p.semester_id = p_semester_id
  ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'juror_pin_reset',
    'juror',
    p_juror_id,
    format('Admin reset PIN for juror %s.', v_label),
    jsonb_build_object('semester_id', p_semester_id)
  );

  RETURN QUERY SELECT p_juror_id, v_pin, 0, null::timestamptz;
END;
$$;


-- ── Section 4/5: rpc_create_or_get_juror_and_issue_pin  (C2 + M1) ────────────
-- C2: Replaces random() with gen_random_bytes-based CSPRNG (2 locations).
-- M1: Audit log when pin_plain_once IS NULL on a pin_reveal_pending reveal
--     (data corruption recovery — admin is informed via audit_logs).

CREATE OR REPLACE FUNCTION public.rpc_create_or_get_juror_and_issue_pin(
  p_semester_id uuid,
  p_juror_name text,
  p_juror_inst text
)
RETURNS TABLE (
  juror_id       uuid,
  juror_name     text,
  juror_inst     text,
  needs_pin      boolean,
  pin_plain_once text,
  locked_until   timestamptz,
  failed_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_norm_name text;
  v_norm_inst text;
  v_juror_id  uuid;
  v_juror_name text;
  v_juror_inst text;
  v_pin text;
  v_pin_hash text;
  v_exists boolean;
  v_constraint text;
  v_locked_until timestamptz;
  v_failed_attempts integer;
  v_pin_plain_once text;
  v_secret text;
  v_reveal_pending boolean := false;
BEGIN
  v_norm_name := lower(regexp_replace(trim(coalesce(p_juror_name, '')), '\\s+', ' ', 'g'));
  v_norm_inst := lower(regexp_replace(trim(coalesce(p_juror_inst, '')), '\\s+', ' ', 'g'));

  PERFORM pg_advisory_xact_lock(hashtext(v_norm_name || '|' || v_norm_inst));

  IF NOT EXISTS (
    SELECT 1 FROM semesters s
    WHERE s.id = p_semester_id
      AND s.is_active = true
  ) THEN
    RAISE EXCEPTION 'semester_inactive';
  END IF;

  IF v_norm_name = '' OR v_norm_inst = '' THEN
    RAISE EXCEPTION 'invalid juror identity';
  END IF;

  SELECT j.id, j.juror_name, j.juror_inst
    INTO v_juror_id, v_juror_name, v_juror_inst
  FROM jurors j
  WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
    AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
  ORDER BY j.id
  LIMIT 1;

  IF v_juror_id IS NULL THEN
    BEGIN
      INSERT INTO jurors (juror_name, juror_inst)
      VALUES (trim(p_juror_name), trim(p_juror_inst))
      RETURNING id, juror_name, juror_inst
      INTO v_juror_id, v_juror_name, v_juror_inst;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint = 'jurors_name_inst_norm_uniq' THEN
        SELECT j.id, j.juror_name, j.juror_inst
          INTO v_juror_id, v_juror_name, v_juror_inst
        FROM jurors j
        WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
          AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
        ORDER BY j.id
        LIMIT 1;
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  SELECT true INTO v_exists
  FROM juror_semester_auth a
  WHERE a.juror_id = v_juror_id
    AND a.semester_id = p_semester_id
  LIMIT 1;

  IF v_exists THEN
    SELECT a.locked_until, a.failed_attempts, a.pin_plain_once, a.pin_reveal_pending
      INTO v_locked_until, v_failed_attempts, v_pin_plain_once, v_reveal_pending
    FROM juror_semester_auth a
    WHERE a.juror_id = v_juror_id
      AND a.semester_id = p_semester_id
    LIMIT 1;

    IF v_reveal_pending THEN
      IF v_pin_plain_once IS NOT NULL AND v_pin_plain_once LIKE 'enc:%' THEN
        SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets
        WHERE name = 'pin_secret'
        LIMIT 1;
        IF v_secret IS NULL OR v_secret = '' THEN
          RAISE EXCEPTION 'pin_secret_missing';
        END IF;
        v_pin_plain_once := pgp_sym_decrypt(
          decode(substring(v_pin_plain_once from 5), 'base64'),
          v_secret
        );
      END IF;
      IF v_pin_plain_once IS NULL THEN
        -- pin_plain_once is missing despite pin_reveal_pending=true (data corruption).
        -- Generate a new PIN silently and log the recovery for admin forensics.
        PERFORM public._audit_log(
          'system', null::uuid, 'pin_recovery_regen',
          'juror_semester_auth', v_juror_id,
          format('pin_plain_once missing on reveal for juror %s — new PIN generated', v_juror_id),
          jsonb_build_object(
            'juror_id', v_juror_id,
            'semester_id', p_semester_id,
            'reason', 'pin_plain_once_null_on_reveal'
          )
        );
        v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
        v_pin_hash := crypt(v_pin, gen_salt('bf'::text));
        v_pin_plain_once := v_pin;
        UPDATE juror_semester_auth
        SET pin_hash = v_pin_hash,
            failed_attempts = 0,
            locked_until = null,
            pin_reveal_pending = false,
            pin_plain_once = null
        WHERE juror_id = v_juror_id
          AND semester_id = p_semester_id;
      ELSE
        UPDATE juror_semester_auth
        SET failed_attempts = 0,
            locked_until = null,
            pin_reveal_pending = false,
            pin_plain_once = null
        WHERE juror_id = v_juror_id
          AND semester_id = p_semester_id;
      END IF;

      RETURN QUERY SELECT v_juror_id, v_juror_name, v_juror_inst, false, v_pin_plain_once,
        null::timestamptz, 0;
      RETURN;
    END IF;

    RETURN QUERY SELECT v_juror_id, v_juror_name, v_juror_inst, true, null::text,
      v_locked_until, coalesce(v_failed_attempts, 0);
    RETURN;
  END IF;

  v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'::text));

  INSERT INTO juror_semester_auth (juror_id, semester_id, pin_hash)
  VALUES (v_juror_id, p_semester_id, v_pin_hash)
  ON CONFLICT (juror_id, semester_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN QUERY SELECT v_juror_id, v_juror_name, v_juror_inst, true, null::text,
      null::timestamptz, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_juror_id, v_juror_name, v_juror_inst, false, v_pin,
    null::timestamptz, 0;
END;
$$;


-- ── Section 5/5: rpc_verify_juror_pin  (M3) ──────────────────────────────────
-- Logs every failed PIN attempt (not only lockout events) for poster-day forensics.
-- Single _audit_log call replaces the previous lockout-only conditional block.

DROP FUNCTION IF EXISTS public.rpc_verify_juror_pin(uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.rpc_verify_juror_pin(
  p_semester_id uuid,
  p_juror_name  text,
  p_juror_inst  text,
  p_pin         text
)
RETURNS TABLE (
  ok             boolean,
  juror_id       uuid,
  juror_name     text,
  juror_inst     text,
  error_code     text,
  locked_until   timestamptz,
  failed_attempts integer,
  pin_plain_once  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_norm_name text;
  v_norm_inst text;
  v_pin text;
  v_now timestamptz := now();
  v_juror_id uuid;
  v_juror_name text;
  v_juror_inst text;
  v_auth juror_semester_auth%ROWTYPE;
  v_failed integer;
  v_locked timestamptz;
  v_sem_name text;
  v_pin_plain_once text;
  v_secret text;
BEGIN
  v_norm_name := lower(regexp_replace(trim(coalesce(p_juror_name, '')), '\\s+', ' ', 'g'));
  v_norm_inst := lower(regexp_replace(trim(coalesce(p_juror_inst, '')), '\\s+', ' ', 'g'));
  v_pin := regexp_replace(coalesce(p_pin, ''), '\\s+', '', 'g');

  IF NOT EXISTS (
    SELECT 1 FROM semesters s
    WHERE s.id = p_semester_id
      AND s.is_active = true
  ) THEN
    RETURN QUERY SELECT false, null::uuid, null::text, null::text, 'semester_inactive', null::timestamptz, 0, null::text;
    RETURN;
  END IF;

  SELECT j.id, j.juror_name, j.juror_inst
    INTO v_juror_id, v_juror_name, v_juror_inst
  FROM jurors j
  WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
    AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
  ORDER BY j.id
  LIMIT 1;

  IF v_juror_id IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, null::text, null::text, 'not_found', null::timestamptz, 0, null::text;
    RETURN;
  END IF;

  SELECT *
    INTO v_auth
  FROM juror_semester_auth a
  WHERE a.juror_id = v_juror_id
    AND a.semester_id = p_semester_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'no_pin', null::timestamptz, 0, null::text;
    RETURN;
  END IF;

  IF v_auth.locked_until IS NOT NULL AND v_auth.locked_until > v_now THEN
    RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'locked', v_auth.locked_until, v_auth.failed_attempts, null::text;
    RETURN;
  END IF;

  -- Lock window expired: reset attempts so the next failure starts from 1 again.
  IF v_auth.locked_until IS NOT NULL AND v_auth.locked_until <= v_now THEN
    UPDATE juror_semester_auth
    SET failed_attempts = 0,
        locked_until = null
    WHERE id = v_auth.id;
    v_auth.failed_attempts := 0;
    v_auth.locked_until := null;
  END IF;

  IF crypt(v_pin, v_auth.pin_hash) = v_auth.pin_hash THEN
    v_pin_plain_once := null::text;
    IF v_auth.pin_reveal_pending AND v_auth.pin_plain_once IS NOT NULL THEN
      IF v_auth.pin_plain_once LIKE 'enc:%' THEN
        SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets
        WHERE name = 'pin_secret'
        LIMIT 1;
        IF v_secret IS NULL OR v_secret = '' THEN
          RAISE EXCEPTION 'pin_secret_missing';
        END IF;
        v_pin_plain_once := pgp_sym_decrypt(
          decode(substring(v_auth.pin_plain_once from 5), 'base64'),
          v_secret
        );
      ELSE
        v_pin_plain_once := v_auth.pin_plain_once;
      END IF;
    END IF;
    UPDATE juror_semester_auth
    SET last_seen_at = v_now,
        failed_attempts = 0,
        locked_until = null,
        pin_reveal_pending = false,
        pin_plain_once = null
    WHERE id = v_auth.id;

    RETURN QUERY SELECT true, v_juror_id, v_juror_name, v_juror_inst, null::text, null::timestamptz, 0, v_pin_plain_once;
    RETURN;
  END IF;

  v_failed := v_auth.failed_attempts + 1;
  v_locked := null;
  IF v_failed >= 3 THEN
    v_locked := v_now + interval '15 minutes';
  END IF;

  UPDATE juror_semester_auth
  SET failed_attempts = v_failed,
      locked_until = v_locked
  WHERE id = v_auth.id;

  -- Log every failed attempt (not only lockout) for poster-day forensics.
  SELECT name INTO v_sem_name FROM semesters WHERE id = p_semester_id;
  PERFORM public._audit_log(
    'juror',
    v_juror_id,
    CASE WHEN v_locked IS NOT NULL THEN 'juror_pin_locked' ELSE 'juror_pin_failed' END,
    'juror',
    v_juror_id,
    format(
      CASE WHEN v_locked IS NOT NULL
        THEN 'Juror %s PIN locked after too many failed attempts.'
        ELSE 'Juror %s failed PIN attempt %s/3.'
      END,
      COALESCE(v_juror_name, v_juror_id::text),
      v_failed
    ),
    jsonb_build_object(
      'juror_name', v_juror_name,
      'juror_inst', v_juror_inst,
      'semester_id', p_semester_id,
      'semester_name', v_sem_name,
      'failed_attempts', v_failed,
      'locked_until', v_locked
    )
  );

  IF v_locked IS NOT NULL THEN
    RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'locked', v_locked, v_failed, null::text;
  END IF;

  RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'invalid', v_locked, v_failed, null::text;
END;
$$;
