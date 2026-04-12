-- 054_audit_hash_chain.sql
-- Row-level hash chain for audit_logs tamper evidence.
--
-- Each new row's hash covers: id, action, organization_id, created_at, and the
-- previous row's hash (for the same org). This creates a verifiable chain: any
-- deletion or modification of a past row invalidates all subsequent hashes.
--
-- Limitation: concurrent inserts within the same millisecond may share the same
-- prev_hash (fork), which is acceptable for VERA's low-concurrency audit volume.
-- Old rows (pre-trigger) have row_hash = NULL and are treated as "pre-chain era".

-- 1. Add row_hash column (nullable so old rows are not affected)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS row_hash TEXT;

-- 2. Trigger function: compute hash on INSERT
CREATE OR REPLACE FUNCTION audit_logs_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_hash TEXT;
  v_chain_input TEXT;
BEGIN
  -- Find the hash of the most recent row for the same organization_id.
  -- IS NOT DISTINCT FROM handles NULL org (super-admin events) correctly.
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

-- Drop trigger if it already exists (idempotent re-run)
DROP TRIGGER IF EXISTS audit_logs_hash_chain ON audit_logs;

CREATE TRIGGER audit_logs_hash_chain
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_compute_hash();

-- 3. Verification RPC: recomputes hashes and returns broken links.
--    Returns [] (empty array) when chain is intact.
--    Only inspects rows where row_hash IS NOT NULL (skips pre-chain era).
CREATE OR REPLACE FUNCTION rpc_admin_verify_audit_chain(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broken       JSONB  := '[]'::JSONB;
  v_prev_hash    TEXT   := 'GENESIS';
  v_row          RECORD;
  v_expected     TEXT;
  v_chain_input  TEXT;
  v_uid          UUID;
  v_is_admin     BOOLEAN;
BEGIN
  -- Authenticate caller
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must be super_admin OR tenant admin for this org
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

  -- Walk rows in insertion order, verify each hash
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

    -- Advance chain using the stored hash (so a forged hash propagates
    -- the break forward rather than masking it)
    v_prev_hash := v_row.row_hash;
  END LOOP;

  RETURN v_broken;
END;
$$;

-- Grant execute to authenticated role (RLS + auth check inside handle auth)
GRANT EXECUTE ON FUNCTION rpc_admin_verify_audit_chain(UUID) TO authenticated;
