-- VERA v1 — Audit System: Backfills, Auth Failure RPC, Hash Chain, Anomaly Cron, Atomic Mutations
-- Depends on: 002_tables.sql (audit_logs table + ENUMs + row_hash/correlation_id columns)
--             003_helpers_and_triggers.sql (trigger_audit_log, trigger functions)
--             004_rls.sql (audit_logs append-only policy)
--             006_rpcs_admin.sql (_audit_write, rpc_admin_write_audit_event)

-- =============================================================================
-- 1) IDEMPOTENT BACKFILLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a. Backfill: periodName into evaluation.complete + edit_mode_closed rows
-- (042) Rows that only stored period_id (UUID) but never the human-readable name.
-- Safe to re-run: WHERE NOT (details ? 'periodName') is idempotent.
-- -----------------------------------------------------------------------------

UPDATE audit_logs
SET details = details || jsonb_build_object('periodName', p.name)
FROM periods p
WHERE audit_logs.action IN (
  'evaluation.complete',
  'juror.edit_mode_closed_on_resubmit'
)
  AND audit_logs.details ? 'period_id'
  AND NOT (audit_logs.details ? 'periodName')
  AND p.id = (audit_logs.details->>'period_id')::UUID;

-- -----------------------------------------------------------------------------
-- 1b. Backfill: category, severity, actor_type, actor_name for all existing rows
-- (044) New rows are written with these columns populated directly by _audit_write.
-- WHERE category IS NULL makes this idempotent — only touches un-tagged rows.
-- -----------------------------------------------------------------------------

UPDATE audit_logs
SET
  category = CASE
    -- auth
    WHEN action IN ('admin.login') THEN 'auth'::audit_category

    -- access
    WHEN action IN (
      'admin.create','admin.updated',
      'memberships.insert','memberships.update','memberships.delete',
      'admin_invites.insert','admin_invites.update','admin_invites.delete',
      'membership.join_requested','membership.join_approved','membership.join_rejected'
    ) THEN 'access'::audit_category

    -- config
    WHEN action IN (
      'criteria.save','criteria.update',
      'outcome.create','outcome.update','outcome.delete',
      'organization.status_changed',
      'frameworks.insert','frameworks.update','frameworks.delete'
    ) THEN 'config'::audit_category

    -- security
    WHEN action IN (
      'token.generate','token.revoke',
      'export.scores','export.rankings','export.heatmap',
      'export.analytics','export.audit','export.backup',
      'notification.application','notification.admin_invite',
      'notification.entry_token','notification.juror_pin',
      'notification.export_report','notification.password_reset',
      'backup.created','backup.deleted','backup.downloaded',
      'entry_tokens.insert','entry_tokens.update','entry_tokens.delete'
    ) THEN 'security'::audit_category

    -- data (period/juror/project/score/evaluation/trigger CRUD)
    ELSE 'data'::audit_category
  END,

  severity = CASE
    -- critical
    WHEN action IN ('juror.pin_locked','juror.blocked') THEN 'critical'::audit_severity

    -- high
    WHEN action IN (
      'period.lock','period.unlock',
      'project.delete',
      'organization.status_changed',
      'backup.deleted',
      'frameworks.delete',
      'memberships.delete',
      'membership.join_approved'
    ) THEN 'high'::audit_severity

    -- medium
    WHEN action IN (
      'admin.create',
      'membership.join_requested','membership.join_rejected',
      'pin.reset','juror.pin_unlocked','juror.edit_mode_enabled','juror.edit_enabled',
      'period.set_current',
      'snapshot.freeze',
      'application.approved','application.rejected',
      'token.revoke',
      'export.audit',
      'backup.downloaded',
      'criteria.save','criteria.update',
      'outcome.create','outcome.update','outcome.delete',
      'frameworks.update'
    ) THEN 'medium'::audit_severity

    -- low
    WHEN action IN (
      'admin.updated',
      'juror.edit_mode_closed_on_resubmit',
      'token.generate',
      'export.scores','export.rankings','export.heatmap','export.analytics','export.backup',
      'backup.created',
      'frameworks.insert',
      'admin_invites.insert',
      'memberships.insert','memberships.update'
    ) THEN 'low'::audit_severity

    -- info (default for everything else)
    ELSE 'info'::audit_severity
  END,

  actor_type = CASE
    -- juror-initiated
    WHEN action IN (
      'evaluation.complete',
      'score.update',
      'score_sheets.insert','score_sheets.update','score_sheets.delete'
    ) THEN 'juror'::audit_actor_type

    -- system/trigger generated
    WHEN action IN (
      'snapshot.freeze',
      'juror.pin_locked',
      'juror.edit_mode_closed_on_resubmit',
      'projects.insert','projects.update','projects.delete',
      'jurors.insert','jurors.update','jurors.delete',
      'periods.insert','periods.update','periods.delete',
      'profiles.insert','profiles.update',
      'org_applications.insert','org_applications.update','org_applications.delete',
      'organizations.insert','organizations.update',
      'admin_invites.update'
    ) THEN 'system'::audit_actor_type

    -- anonymous
    WHEN action IN ('application.submitted') THEN 'anonymous'::audit_actor_type

    -- admin (default)
    ELSE 'admin'::audit_actor_type
  END,

  -- Pull actor_name from details if already stored
  actor_name = COALESCE(
    details->>'actor_name',
    details->>'adminName',
    actor_name   -- keep existing if already set
  )

WHERE category IS NULL;  -- only rows not yet backfilled (idempotent)

-- =============================================================================
-- 2) AUTH FAILURE RPC (anon-callable, rate-limited)
-- =============================================================================
-- Anonymous-callable RPC to log failed admin login attempts.
-- Auth failures have no auth.uid() — normal authenticated RPCs cannot be used.
--
-- Rate-limited: max 20 failures per email per 5 minutes to prevent
-- audit table flooding from brute-force attacks.
-- Severity escalation: low (1–2), medium (3–4), high (5+).

CREATE OR REPLACE FUNCTION public.rpc_write_auth_failure_event(
  p_email  TEXT,
  p_method TEXT DEFAULT 'password'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_failure_count INT;
  v_severity      audit_severity;
BEGIN
  -- Sanitise inputs
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_email');
  END IF;

  -- Rate limit: count failures for this email in the last 5 minutes
  SELECT COUNT(*) INTO v_failure_count
  FROM audit_logs
  WHERE action     = 'auth.admin.login.failure'
    AND actor_name = trim(p_email)
    AND created_at > NOW() - INTERVAL '5 minutes';

  -- Reject if rate limit exceeded (20 per 5 min per email)
  IF v_failure_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'rate_limited');
  END IF;

  -- Severity escalates with repeated failures
  v_severity := CASE
    WHEN v_failure_count >= 4 THEN 'high'
    WHEN v_failure_count >= 2 THEN 'medium'
    ELSE                           'low'
  END::audit_severity;

  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    category,
    severity,
    actor_type,
    actor_name,
    details
  ) VALUES (
    NULL,
    NULL,
    'auth.admin.login.failure',
    'auth'::audit_category,
    v_severity,
    'anonymous'::audit_actor_type,
    trim(p_email),
    jsonb_build_object(
      'email',   trim(p_email),
      'method',  coalesce(p_method, 'password'),
      'attempt', v_failure_count + 1
    )
  );

  RETURN jsonb_build_object('ok', true, 'severity', v_severity::TEXT);
END;
$$;

-- Allow both unauthenticated browser (anon) and authenticated callers.
GRANT EXECUTE ON FUNCTION public.rpc_write_auth_failure_event(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_write_auth_failure_event(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 3) HASH CHAIN TAMPER EVIDENCE
-- =============================================================================
-- Each new audit_logs row's hash covers: id, action, organization_id, created_at,
-- and the previous row's hash (for the same org). Any deletion or modification of
-- a past row invalidates all subsequent hashes.
--
-- Note: concurrent inserts within the same millisecond may share the same
-- prev_hash (fork), which is acceptable for VERA's low-concurrency audit volume.
-- Rows inserted before this trigger was created have row_hash = NULL
-- and are treated as "pre-chain era".
--
-- row_hash column is defined in 002_tables.sql (TEXT, nullable).

-- -----------------------------------------------------------------------------
-- 3a. Trigger function: compute and attach SHA-256 chain hash on each INSERT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_logs_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_hash   TEXT;
  v_chain_input TEXT;
BEGIN
  -- Find the hash of the most recent row for the same organization_id.
  -- IS NOT DISTINCT FROM handles NULL org_id (super-admin events) correctly.
  SELECT row_hash INTO v_prev_hash
  FROM audit_logs
  WHERE organization_id IS NOT DISTINCT FROM NEW.organization_id
    AND row_hash IS NOT NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  -- Build the chain input: chain breaks if any field is tampered.
  v_chain_input :=
    NEW.id::text                                    ||
    NEW.action                                      ||
    COALESCE(NEW.organization_id::text, '')         ||
    NEW.created_at::text                            ||
    COALESCE(v_prev_hash, 'GENESIS');

  NEW.row_hash := encode(sha256(v_chain_input::bytea), 'hex');
  RETURN NEW;
END;
$$;

-- Idempotent trigger setup
DROP TRIGGER IF EXISTS audit_logs_hash_chain ON audit_logs;

CREATE TRIGGER audit_logs_hash_chain
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_compute_hash();

-- -----------------------------------------------------------------------------
-- 3b. _audit_verify_chain_internal — auth-free verification helper
-- Extracted from rpc_admin_verify_audit_chain so that
-- audit-anomaly-sweep (service_role, uid=NULL) can call it without triggering
-- the "Not authenticated" guard that protects the public RPC.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_verify_chain_internal(
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broken      JSONB := '[]'::JSONB;
  v_prev_hash   TEXT  := 'GENESIS';
  v_row         RECORD;
  v_expected    TEXT;
  v_chain_input TEXT;
BEGIN
  FOR v_row IN
    SELECT id, action, organization_id, created_at, row_hash
    FROM audit_logs
    WHERE organization_id IS NOT DISTINCT FROM p_org_id
      AND row_hash IS NOT NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    v_chain_input :=
      v_row.id::text                                       ||
      v_row.action                                         ||
      COALESCE(v_row.organization_id::text, '')            ||
      v_row.created_at::text                               ||
      v_prev_hash;

    v_expected := encode(sha256(v_chain_input::bytea), 'hex');

    IF v_row.row_hash IS DISTINCT FROM v_expected THEN
      v_broken := v_broken || jsonb_build_array(
        jsonb_build_object(
          'id',         v_row.id,
          'created_at', v_row.created_at,
          'action',     v_row.action,
          'stored',     v_row.row_hash,
          'expected',   v_expected
        )
      );
    END IF;

    -- Advance using stored hash so a forged hash propagates the break forward
    v_prev_hash := v_row.row_hash;
  END LOOP;

  RETURN v_broken;
END;
$$;

-- service_role only — UI must go through rpc_admin_verify_audit_chain
GRANT EXECUTE ON FUNCTION public._audit_verify_chain_internal(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 3c. rpc_admin_verify_audit_chain — thin authenticated wrapper
-- Delegates to _audit_verify_chain_internal after auth + role check.
-- Returns [] (empty array) when chain is intact; returns broken-link objects otherwise.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_admin_verify_audit_chain(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_uid
      AND (
        (role = 'super_admin' AND organization_id IS NULL)
        OR (role = 'org_admin' AND organization_id = p_org_id)
      )
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN public._audit_verify_chain_internal(p_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_verify_audit_chain(UUID) TO authenticated;

-- =============================================================================
-- 4) ANOMALY DETECTION CRON JOB
-- =============================================================================
-- Schedule the audit-anomaly-sweep Edge Function hourly via pg_cron + pg_net.
-- The sweep checks for brute-force patterns, chain integrity, and unusual event
-- spikes; results are written back to audit_logs by the Edge Function.
--
-- Requires: pg_cron enabled on the project (Supabase default: enabled).
-- The URL and X-Cron-Secret must match the Edge Function's deployment env vars.
-- Replace <project-ref> and <AUDIT_SWEEP_SECRET> before applying.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotent: remove existing job before re-scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-anomaly-sweep-hourly') THEN
    PERFORM cron.unschedule('audit-anomaly-sweep-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'audit-anomaly-sweep-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/audit-anomaly-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<AUDIT_SWEEP_SECRET>'
    ),
    body := '{}'::jsonb
  )
  $$
);

-- =============================================================================
-- 5) ADMIN ATOMIC MUTATION RPCs
-- =============================================================================
-- These RPCs perform a main-table write + _audit_write in a single transaction.
-- They live here (not in 006_rpcs_admin.sql) so the audit write semantics are
-- co-located with the rest of the audit system. All depend on _audit_write
-- being defined (006_rpcs_admin.sql runs before this file).

-- =============================================================================
-- rpc_admin_set_current_period
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_current_period(
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id       UUID;
  v_period_name  TEXT;
  v_activated_at TIMESTAMPTZ;
  v_row          JSONB;
BEGIN
  SELECT organization_id, name, activated_at
    INTO v_org_id, v_period_name, v_activated_at
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  -- Unset all current flags for this org
  UPDATE periods
  SET is_current = false
  WHERE organization_id = v_org_id AND is_current = true;

  -- Set target as current; stamp activated_at on first activation
  UPDATE periods
  SET is_current = true,
      activated_at = COALESCE(activated_at, now())
  WHERE id = p_period_id
  RETURNING to_jsonb(periods.*) INTO v_row;

  PERFORM public._audit_write(
    v_org_id,
    'period.set_current',
    'periods',
    p_period_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'activated_at', COALESCE(v_activated_at, now())
    )
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_current_period(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_set_period_lock
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_set_period_lock(
  p_period_id UUID,
  p_locked    BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_period_name TEXT;
  v_prev_locked BOOLEAN;
BEGIN
  SELECT organization_id, name, is_locked
    INTO v_org_id, v_period_name, v_prev_locked
  FROM periods WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE periods
  SET is_locked = COALESCE(p_locked, false)
  WHERE id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    CASE WHEN p_locked THEN 'period.lock' ELSE 'period.unlock' END,
    'periods',
    p_period_id,
    'config'::audit_category,
    'high'::audit_severity,
    jsonb_build_object(
      'periodName', v_period_name,
      'period_id', p_period_id,
      'previous_locked', v_prev_locked,
      'new_locked', COALESCE(p_locked, false)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'period_id', p_period_id,
    'is_locked', COALESCE(p_locked, false),
    'periodName', v_period_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_period_lock(UUID, BOOLEAN) TO authenticated;

-- =============================================================================
-- rpc_admin_save_period_criteria
-- =============================================================================
-- p_criteria is a JSONB array where each element has:
--   { key, label, shortLabel, color, max, blurb, outcomes: [code,...], rubric: [...] }

CREATE OR REPLACE FUNCTION public.rpc_admin_save_period_criteria(
  p_period_id UUID,
  p_criteria  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id       UUID;
  v_framework_id UUID;
  v_total_max    NUMERIC := 0;
  v_before       JSONB := '{}'::JSONB;
  v_after        JSONB := '{}'::JSONB;
  v_count        INT := 0;
  v_inserted     JSONB;
  v_elem         JSONB;
  v_key          TEXT;
  v_max          NUMERIC;
  v_crit_id      UUID;
  v_outcome_id   UUID;
  v_fw_outcome_id UUID;
  v_cov_type     TEXT;
  v_code         TEXT;
BEGIN
  IF p_period_id IS NULL THEN
    RAISE EXCEPTION 'period_id_required';
  END IF;
  IF jsonb_typeof(p_criteria) <> 'array' THEN
    RAISE EXCEPTION 'criteria_must_be_array';
  END IF;

  SELECT organization_id, framework_id INTO v_org_id, v_framework_id
  FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  -- Before snapshot: {key}_max_score map
  SELECT COALESCE(
    jsonb_object_agg(pc.key || '_max_score', pc.max_score),
    '{}'::JSONB
  )
  INTO v_before
  FROM period_criteria pc
  WHERE pc.period_id = p_period_id;

  -- Total max for weight calculation
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_criteria) LOOP
    v_total_max := v_total_max + COALESCE((v_elem->>'max')::NUMERIC, 0);
  END LOOP;

  -- Snapshot existing period coverage_type assignments before deleting
  CREATE TEMP TABLE IF NOT EXISTS _coverage_snapshot (
    crit_key      TEXT,
    outcome_code  TEXT,
    coverage_type TEXT
  ) ON COMMIT DROP;
  TRUNCATE _coverage_snapshot;

  INSERT INTO _coverage_snapshot (crit_key, outcome_code, coverage_type)
  SELECT pc.key, po.code, pcm.coverage_type
  FROM   period_criterion_outcome_maps pcm
  JOIN   period_criteria pc ON pc.id = pcm.period_criterion_id
  JOIN   period_outcomes po ON po.id = pcm.period_outcome_id
  WHERE  pcm.period_id = p_period_id
    AND  pcm.coverage_type IS NOT NULL; -- NULL means "not yet assigned"; don't restore those

  -- Snapshot existing framework coverage_type assignments before cascade-delete.
  -- ON DELETE CASCADE on period_criteria will wipe framework_criterion_outcome_maps,
  -- so we capture them here to restore after re-insertion.
  CREATE TEMP TABLE IF NOT EXISTS _fw_coverage_snapshot (
    crit_key      TEXT,
    outcome_code  TEXT,
    coverage_type TEXT
  ) ON COMMIT DROP;
  TRUNCATE _fw_coverage_snapshot;

  IF v_framework_id IS NOT NULL THEN
    INSERT INTO _fw_coverage_snapshot (crit_key, outcome_code, coverage_type)
    SELECT pc.key, fo.code, fcom.coverage_type
    FROM   framework_criterion_outcome_maps fcom
    JOIN   period_criteria pc ON pc.id = fcom.criterion_id
    JOIN   framework_outcomes fo ON fo.id = fcom.outcome_id
    WHERE  fcom.period_id = p_period_id;
  END IF;

  -- Delete existing maps (FK before criteria delete)
  DELETE FROM period_criterion_outcome_maps WHERE period_id = p_period_id;
  -- framework_criterion_outcome_maps cascade-deleted by period_criteria delete below

  DELETE FROM period_criteria WHERE period_id = p_period_id;

  -- Insert new criteria
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_criteria) LOOP
    v_key := v_elem->>'key';
    v_max := COALESCE((v_elem->>'max')::NUMERIC, 0);

    INSERT INTO period_criteria (
      period_id, key, label, short_label, description,
      max_score, weight, color, rubric_bands, sort_order
    ) VALUES (
      p_period_id,
      v_key,
      v_elem->>'label',
      COALESCE(v_elem->>'shortLabel', v_elem->>'label'),
      v_elem->>'blurb',
      v_max,
      CASE WHEN v_total_max > 0 THEN (v_max / v_total_max) * 100 ELSE 0 END,
      v_elem->>'color',
      CASE WHEN jsonb_typeof(v_elem->'rubric') = 'array' THEN v_elem->'rubric' ELSE NULL END,
      v_count
    )
    RETURNING id INTO v_crit_id;

    v_after := v_after || jsonb_build_object(v_key || '_max_score', v_max);
    v_count := v_count + 1;

    -- Insert period outcome maps for this criterion
    IF jsonb_typeof(v_elem->'outcomes') = 'array' THEN
      FOR v_code IN SELECT value::TEXT FROM jsonb_array_elements_text(v_elem->'outcomes') LOOP
        SELECT id INTO v_outcome_id
        FROM period_outcomes
        WHERE period_id = p_period_id AND code = v_code
        LIMIT 1;

        IF v_outcome_id IS NOT NULL THEN
          INSERT INTO period_criterion_outcome_maps (
            period_id, period_criterion_id, period_outcome_id
          ) VALUES (
            p_period_id, v_crit_id, v_outcome_id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- Insert framework outcome maps for this criterion (authoritative source for admin UI).
    -- outcomes[] from the criteria payload holds the user's selection from OutcomePillSelector
    -- (which is populated from framework_outcomes). Preserve coverage_type from snapshot
    -- so values set via the Outcomes page are not lost.
    IF v_framework_id IS NOT NULL AND jsonb_typeof(v_elem->'outcomes') = 'array' THEN
      FOR v_code IN SELECT value::TEXT FROM jsonb_array_elements_text(v_elem->'outcomes') LOOP
        SELECT id INTO v_fw_outcome_id
        FROM framework_outcomes
        WHERE framework_id = v_framework_id AND code = v_code
        LIMIT 1;

        IF v_fw_outcome_id IS NOT NULL THEN
          SELECT coverage_type INTO v_cov_type
          FROM _fw_coverage_snapshot
          WHERE crit_key = v_key AND outcome_code = v_code;

          INSERT INTO framework_criterion_outcome_maps (
            framework_id, period_id, criterion_id, outcome_id, coverage_type
          ) VALUES (
            v_framework_id, p_period_id, v_crit_id, v_fw_outcome_id,
            COALESCE(v_cov_type, 'direct')
          )
          ON CONFLICT (criterion_id, outcome_id) DO UPDATE
            SET coverage_type = COALESCE(EXCLUDED.coverage_type, 'direct');
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Restore period coverage_type from snapshot. Matches on criterion key + outcome code;
  -- if a key or code changed, the JOIN fails and the new map stays NULL (intentional).
  UPDATE period_criterion_outcome_maps pcm
  SET    coverage_type = snap.coverage_type
  FROM   _coverage_snapshot snap
  JOIN   period_criteria pc2  ON pc2.key  = snap.crit_key    AND pc2.period_id = p_period_id
  JOIN   period_outcomes po2  ON po2.code = snap.outcome_code AND po2.period_id = p_period_id
  WHERE  pcm.period_criterion_id = pc2.id
    AND  pcm.period_outcome_id   = po2.id
    AND  pcm.period_id           = p_period_id;

  -- Restore framework mappings that existed before but were NOT in outcomes[]
  -- (i.e., mappings added via the Outcomes page to outcomes absent from this
  -- criterion's own selection). This prevents Outcomes-page edits from being
  -- silently dropped when criteria are re-saved from the Criteria page.
  IF v_framework_id IS NOT NULL THEN
    INSERT INTO framework_criterion_outcome_maps (
      framework_id, period_id, criterion_id, outcome_id, coverage_type
    )
    SELECT
      v_framework_id,
      p_period_id,
      pc2.id,
      fo2.id,
      snap.coverage_type
    FROM _fw_coverage_snapshot snap
    JOIN period_criteria pc2 ON pc2.key = snap.crit_key AND pc2.period_id = p_period_id
    JOIN framework_outcomes fo2
      ON fo2.code = snap.outcome_code AND fo2.framework_id = v_framework_id
    WHERE NOT EXISTS (
      SELECT 1 FROM framework_criterion_outcome_maps fcom2
      WHERE fcom2.criterion_id = pc2.id AND fcom2.outcome_id = fo2.id
    );
  END IF;

  -- Collect the inserted rows for the return value
  SELECT jsonb_agg(to_jsonb(pc.*) ORDER BY pc.sort_order)
  INTO v_inserted
  FROM period_criteria pc
  WHERE pc.period_id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    'criteria.save',
    'periods',
    p_period_id,
    'config'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object('criteriaCount', v_count),
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN COALESCE(v_inserted, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_save_period_criteria(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_reorder_period_criteria
-- =============================================================================
-- Lightweight reorder-only update: updates sort_order for each key without
-- deleting or re-creating rows. Safe to call when score_sheet_items exist.
-- p_keys: JSONB array of criterion keys in the desired new order.

CREATE OR REPLACE FUNCTION public.rpc_admin_reorder_period_criteria(
  p_period_id UUID,
  p_keys      JSONB   -- ["key_a", "key_b", "key_c", ...]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_key    TEXT;
  v_idx    INT := 0;
BEGIN
  IF p_period_id IS NULL THEN
    RAISE EXCEPTION 'period_id_required';
  END IF;
  IF jsonb_typeof(p_keys) <> 'array' THEN
    RAISE EXCEPTION 'keys_must_be_array';
  END IF;

  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  FOR v_key IN SELECT value::TEXT FROM jsonb_array_elements_text(p_keys) LOOP
    UPDATE period_criteria
    SET sort_order = v_idx
    WHERE period_id = p_period_id AND key = v_key;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_reorder_period_criteria(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_create_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_create_framework_outcome(
  p_framework_id UUID,
  p_code         TEXT,
  p_label        TEXT,
  p_description  TEXT DEFAULT NULL,
  p_sort_order   INT  DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id  UUID;
  v_row     JSONB;
  v_new_id  UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM frameworks WHERE id = p_framework_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'framework_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order)
  VALUES (p_framework_id, p_code, p_label, p_description, p_sort_order)
  RETURNING id, to_jsonb(framework_outcomes.*) INTO v_new_id, v_row;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.created',
    'framework_outcomes',
    v_new_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object('outcome_code', p_code, 'outcome_label', p_label, 'framework_id', p_framework_id),
    jsonb_build_object('after', v_row)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_create_framework_outcome(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;

-- =============================================================================
-- rpc_admin_update_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_framework_outcome(
  p_outcome_id UUID,
  p_patch      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
  v_after  JSONB;
BEGIN
  SELECT f.organization_id, to_jsonb(fo.*)
    INTO v_org_id, v_before
  FROM framework_outcomes fo
  JOIN frameworks f ON f.id = fo.framework_id
  WHERE fo.id = p_outcome_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'outcome_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE framework_outcomes
  SET code          = COALESCE(p_patch->>'code', code),
      label         = COALESCE(p_patch->>'label', label),
      description   = COALESCE(p_patch->>'description', description),
      sort_order    = COALESCE((p_patch->>'sort_order')::INT, sort_order),
      coverage_hint = CASE WHEN p_patch ? 'coverage_hint' THEN p_patch->>'coverage_hint' ELSE coverage_hint END
  WHERE id = p_outcome_id
  RETURNING to_jsonb(framework_outcomes.*) INTO v_after;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.updated',
    'framework_outcomes',
    p_outcome_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'outcome_code', v_after->>'code',
      'outcome_label', v_after->>'label'
    ),
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN v_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_framework_outcome(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_delete_framework_outcome
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_framework_outcome(
  p_outcome_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
BEGIN
  SELECT f.organization_id, to_jsonb(fo.*)
    INTO v_org_id, v_before
  FROM framework_outcomes fo
  JOIN frameworks f ON f.id = fo.framework_id
  WHERE fo.id = p_outcome_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'outcome_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  DELETE FROM framework_outcomes WHERE id = p_outcome_id;

  PERFORM public._audit_write(
    v_org_id,
    'config.outcome.deleted',
    'framework_outcomes',
    p_outcome_id,
    'config'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'outcome_code', v_before->>'code',
      'outcome_label', v_before->>'label'
    ),
    jsonb_build_object('before', v_before)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_framework_outcome(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_update_organization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_organization(
  p_org_id  UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev_status TEXT;
  v_prev_name   TEXT;
  v_prev_code   TEXT;
  v_row         JSONB;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id_required';
  END IF;

  PERFORM public._assert_org_admin(p_org_id);

  SELECT status, name, code
    INTO v_prev_status, v_prev_name, v_prev_code
  FROM organizations WHERE id = p_org_id;

  IF v_prev_status IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  UPDATE organizations
  SET name          = COALESCE(p_updates->>'name', name),
      code          = COALESCE(p_updates->>'code', code),
      institution   = CASE
                        WHEN p_updates ? 'institution' THEN p_updates->>'institution'
                        ELSE institution
                      END,
      contact_email = CASE
                        WHEN p_updates ? 'contact_email' THEN p_updates->>'contact_email'
                        ELSE contact_email
                      END,
      status        = COALESCE(p_updates->>'status', status)
  WHERE id = p_org_id
  RETURNING to_jsonb(organizations.*) INTO v_row;

  -- Audit: status change gets a dedicated high-severity event with diff
  IF p_updates ? 'status' AND (p_updates->>'status') IS DISTINCT FROM v_prev_status THEN
    PERFORM public._audit_write(
      p_org_id,
      'organization.status_changed',
      'organizations',
      p_org_id,
      'config'::audit_category,
      'high'::audit_severity,
      jsonb_build_object(
        'previousStatus', v_prev_status,
        'newStatus', v_row->>'status',
        'organizationCode', v_row->>'code',
        'reason', p_updates->>'reason'
      ),
      jsonb_build_object(
        'before', jsonb_build_object('status', v_prev_status),
        'after',  jsonb_build_object('status', v_row->>'status')
      )
    );
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_organization(UUID, JSONB) TO authenticated;

-- =============================================================================
-- rpc_admin_update_member_profile
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_member_profile(
  p_user_id         UUID,
  p_display_name    TEXT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_new_name TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id_required';
  END IF;

  PERFORM public._assert_org_admin(p_organization_id);

  v_new_name := NULLIF(trim(COALESCE(p_display_name, '')), '');

  UPDATE profiles
  SET display_name = v_new_name
  WHERE id = p_user_id;

  PERFORM public._audit_write(
    p_organization_id,
    'admin.updated',
    'memberships',
    p_user_id,
    'access'::audit_category,
    'low'::audit_severity,
    jsonb_build_object(
      'adminName', v_new_name,
      'organizationId', p_organization_id
    )
  );

  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id, 'display_name', v_new_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_member_profile(UUID, TEXT, UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_revoke_entry_token
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_revoke_entry_token(
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id           UUID;
  v_revoked_count    INT;
  v_first_revoked_id UUID;
  v_active_count     INT;
  v_now              TIMESTAMPTZ := now();
BEGIN
  SELECT organization_id INTO v_org_id FROM periods WHERE id = p_period_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  WITH revoked AS (
    UPDATE entry_tokens
    SET is_revoked = true, revoked_at = now()
    WHERE period_id = p_period_id
      AND is_revoked = false
    RETURNING id
  )
  SELECT COUNT(*), MIN(id) INTO v_revoked_count, v_first_revoked_id FROM revoked;

  -- Count active sessions for this period (session_expires_at in the future or null)
  SELECT COUNT(*) INTO v_active_count
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash IS NOT NULL
    AND (session_expires_at IS NULL OR session_expires_at > v_now);

  IF v_revoked_count > 0 THEN
    PERFORM public._audit_write(
      v_org_id,
      'security.entry_token.revoked',
      'entry_tokens',
      v_first_revoked_id,
      'security'::audit_category,
      'high'::audit_severity,
      jsonb_build_object(
        'period_id', p_period_id,
        'revoked_count', v_revoked_count,
        'active_juror_count', v_active_count
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'revoked_count', v_revoked_count,
    'active_juror_count', v_active_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_entry_token(UUID) TO authenticated;

-- =============================================================================
-- rpc_admin_force_close_juror_edit_mode
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_force_close_juror_edit_mode(
  p_juror_id  UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id      UUID;
  v_juror_name  TEXT;
  v_period_name TEXT;
BEGIN
  IF p_juror_id IS NULL OR p_period_id IS NULL THEN
    RAISE EXCEPTION 'juror_id_and_period_id_required';
  END IF;

  SELECT organization_id, juror_name INTO v_org_id, v_juror_name
  FROM jurors WHERE id = p_juror_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'juror_not_found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  SELECT name INTO v_period_name FROM periods WHERE id = p_period_id;

  UPDATE juror_period_auth
  SET edit_enabled       = false,
      session_token_hash = NULL,
      edit_reason        = NULL,
      edit_expires_at    = NULL
  WHERE juror_id = p_juror_id
    AND period_id = p_period_id;

  PERFORM public._audit_write(
    v_org_id,
    'data.juror.edit_mode.force_closed',
    'juror_period_auth',
    p_juror_id,
    'data'::audit_category,
    'medium'::audit_severity,
    jsonb_build_object(
      'juror_name', v_juror_name,
      'juror_id', p_juror_id,
      'period_id', p_period_id,
      'period_name', v_period_name,
      'close_source', 'admin_force',
      'closed_at', now()
    )
  );

  RETURN jsonb_build_object('ok', true, 'juror_id', p_juror_id, 'period_id', p_period_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_force_close_juror_edit_mode(UUID, UUID) TO authenticated;
