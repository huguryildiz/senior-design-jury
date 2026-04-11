# Backups Drawer + Storage Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disk-only Full Backup button with a persistent Backups drawer. Org admins create backups that are stored in Supabase Storage and tracked in a new `platform_backups` table, then listed, downloaded, and deleted from a drawer following the `ViewSessionsDrawer` pattern.

**Architecture:** Frontend reuses the existing `fullExport()` client-side helper to build the JSON payload, then uploads it to the `backups` Storage bucket via `supabase-js`, then calls `rpc_backup_register` to insert the metadata row. Listing uses `rpc_backup_list`. Download uses a Storage signed URL. Deletion calls `rpc_backup_delete` followed by a Storage `remove()`. Every mutating action emits an audit log event via the existing `rpc_admin_write_audit_log`.

**Tech Stack:** React + Vite, Supabase (Postgres, Storage, Auth), `@supabase/supabase-js`, vitest + qaTest pattern, existing `fs-drawer` CSS system.

**Scope boundary (MVP in THIS plan):**

- `platform_backups` table + RLS
- `backups` Storage bucket + RLS policies
- `rpc_backup_list`, `rpc_backup_register`, `rpc_backup_delete`, `rpc_backup_record_download` RPCs
- `backups.js` API module (list / create / delete / getSignedUrl / recordDownload)
- `useBackups` hook
- `ManageBackupsDrawer.jsx` component (schedule section is a "coming soon" placeholder)
- Wire `ExportPage` Full Backup card → opens drawer
- Tests (qaTest pattern) for API module + hook + drawer
- Apply migrations to both prod + demo Supabase projects

**Deferred to Phase 2 (NOT in this plan, documented at end):**

- Auto-backup via pg_cron
- Period freeze → Snapshot backup integration
- XLSX format option
- Retention cleanup job
- Super-admin cross-org backup drawer (GovernanceDrawers)
- Backup size quota enforcement
- Audit Log feed redesign (separate plan)

---

## File Structure

**Create (new):**

- `sql/migrations/034_platform_backups.sql` — table, indexes, RLS policies
- `sql/migrations/035_platform_backups_storage.sql` — `backups` bucket + `storage.objects` policies
- `sql/migrations/036_platform_backups_rpcs.sql` — 4 RPCs
- `src/shared/api/admin/backups.js` — API module, 5 exports
- `src/admin/hooks/useBackups.js` — React hook with list + actions
- `src/admin/drawers/ManageBackupsDrawer.jsx` — drawer component
- `src/shared/api/__tests__/backups.test.js` — API unit tests
- `src/admin/__tests__/useBackups.test.js` — hook tests
- `src/admin/__tests__/ManageBackupsDrawer.test.jsx` — drawer tests

**Modify (existing):**

- `src/shared/api/admin/index.js` — re-export backups module
- `src/shared/api/index.js` — re-export new functions
- `src/admin/pages/ExportPage.jsx` — change Full Backup card to open drawer
- `src/styles/drawers.css` — add backup-specific styles (status card, meter, backup-card, extra pills)
- `src/test/qa-catalog.json` — add test IDs
- `docs/audit/audit-coverage.md` — document 3 new backup events

---

## Task 1: Create `platform_backups` table + RLS

**Files:**

- Create: `sql/migrations/034_platform_backups.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 034_platform_backups.sql
-- Creates the platform_backups table that tracks metadata for
-- backup files stored in the 'backups' Storage bucket.

CREATE TABLE IF NOT EXISTS public.platform_backups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  origin            TEXT NOT NULL CHECK (origin IN ('manual', 'auto', 'snapshot')),
  format            TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'xlsx')),
  storage_path      TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  row_counts        JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_ids        UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  download_count    INT NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_backups_org_created
  ON public.platform_backups (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_backups_storage_path
  ON public.platform_backups (storage_path);

ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;

-- Org admins can SELECT their org's backups
CREATE POLICY "platform_backups_select_org_admin"
  ON public.platform_backups FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- INSERT / UPDATE / DELETE go through SECURITY DEFINER RPCs only.
-- No direct policies granted — RPCs use the table with definer rights.
```

- [ ] **Step 2: Apply migration to local dev DB**

Run via Supabase MCP:

```text
mcp__claude_ai_Supabase__apply_migration
  project_id: <vera-prod>
  name: 034_platform_backups
  query: <contents of file>
```

Expected: Success, no error.

- [ ] **Step 3: Verify table exists**

Run via Supabase MCP:

```text
mcp__claude_ai_Supabase__execute_sql
  project_id: <vera-prod>
  query: SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name = 'platform_backups' ORDER BY ordinal_position;
```

Expected: 12 columns listed (`id`, `organization_id`, `origin`, `format`, `storage_path`, `size_bytes`, `row_counts`, `period_ids`, `created_by`, `created_at`, `expires_at`, `download_count`, `last_downloaded_at`).

- [ ] **Step 4: Verify RLS policy**

```text
mcp__claude_ai_Supabase__execute_sql
  query: SELECT policyname, cmd FROM pg_policies WHERE tablename = 'platform_backups';
```

Expected: 1 policy `platform_backups_select_org_admin` with `cmd = SELECT`.

- [ ] **Step 5: Commit (ask user first per CLAUDE.md)**

```bash
git add sql/migrations/034_platform_backups.sql
git commit -m "feat(backups): add platform_backups table + RLS"
```

---

## Task 2: Create `backups` Storage bucket + policies

**Files:**

- Create: `sql/migrations/035_platform_backups_storage.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 035_platform_backups_storage.sql
-- Creates the 'backups' Storage bucket and RLS policies on storage.objects
-- so org admins can read / write / delete files only within their own
-- org's folder. Files are organized as: backups/<organization_id>/<backup_id>.<format>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  52428800, -- 50 MB per file
  ARRAY['application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract org_id from the object's folder path.
-- Objects look like: <org_id>/<backup_id>.json
-- storage.foldername(name) returns an array of path segments.

-- SELECT: allow read if the first folder segment matches the caller's org
CREATE POLICY "backups_select_own_org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backups'
    AND (
      CASE
        WHEN cardinality(storage.foldername(name)) > 0 THEN
          (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
        ELSE FALSE
      END
    )
  );

-- INSERT: allow write if the caller is an org admin for that folder
CREATE POLICY "backups_insert_own_org"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backups'
    AND (
      CASE
        WHEN cardinality(storage.foldername(name)) > 0 THEN
          (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
        ELSE FALSE
      END
    )
  );

-- DELETE: same check
CREATE POLICY "backups_delete_own_org"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backups'
    AND (
      CASE
        WHEN cardinality(storage.foldername(name)) > 0 THEN
          (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
        ELSE FALSE
      END
    )
  );
```

- [ ] **Step 2: Apply migration**

```text
mcp__claude_ai_Supabase__apply_migration
  name: 035_platform_backups_storage
```

- [ ] **Step 3: Verify bucket exists**

```text
mcp__claude_ai_Supabase__execute_sql
  query: SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'backups';
```

Expected: One row, `public = false`, `file_size_limit = 52428800`.

- [ ] **Step 4: Verify 3 policies exist on storage.objects**

```text
mcp__claude_ai_Supabase__execute_sql
  query: SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
         AND policyname LIKE 'backups_%';
```

Expected: 3 rows — `backups_select_own_org`, `backups_insert_own_org`, `backups_delete_own_org`.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/035_platform_backups_storage.sql
git commit -m "feat(backups): add backups storage bucket + policies"
```

---

## Task 3: Create backup RPCs

**Files:**

- Create: `sql/migrations/036_platform_backups_rpcs.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 036_platform_backups_rpcs.sql
-- RPCs for platform_backups: list, register, delete, record_download.
-- All are SECURITY DEFINER and assert that the caller is an admin of
-- the affected organization via _assert_tenant_admin() (from migration 003).

-- ── List backups for an organization ────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_backup_list(
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  origin TEXT,
  format TEXT,
  storage_path TEXT,
  size_bytes BIGINT,
  row_counts JSONB,
  period_ids UUID[],
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  download_count INT,
  last_downloaded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_tenant_admin(p_organization_id);

  RETURN QUERY
  SELECT
    b.id,
    b.organization_id,
    b.origin,
    b.format,
    b.storage_path,
    b.size_bytes,
    b.row_counts,
    b.period_ids,
    b.created_by,
    COALESCE(p.display_name, 'System') AS created_by_name,
    b.created_at,
    b.expires_at,
    b.download_count,
    b.last_downloaded_at
  FROM public.platform_backups b
  LEFT JOIN public.profiles p ON p.id = b.created_by
  WHERE b.organization_id = p_organization_id
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_list(UUID) TO authenticated;

-- ── Register a new backup row (called after Storage upload) ─────
CREATE OR REPLACE FUNCTION public.rpc_backup_register(
  p_organization_id UUID,
  p_storage_path    TEXT,
  p_size_bytes      BIGINT,
  p_format          TEXT,
  p_row_counts      JSONB,
  p_period_ids      UUID[],
  p_origin          TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id UUID;
  v_retention_days INT := 90;
  v_expires_at TIMESTAMPTZ;
BEGIN
  PERFORM public._assert_tenant_admin(p_organization_id);

  IF p_origin NOT IN ('manual', 'auto', 'snapshot') THEN
    RAISE EXCEPTION 'invalid origin: %', p_origin;
  END IF;

  IF p_format NOT IN ('json', 'xlsx') THEN
    RAISE EXCEPTION 'invalid format: %', p_format;
  END IF;

  -- Snapshot backups are pinned (never expire)
  IF p_origin = 'snapshot' THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (v_retention_days || ' days')::interval;
  END IF;

  INSERT INTO public.platform_backups (
    organization_id, origin, format, storage_path, size_bytes,
    row_counts, period_ids, created_by, expires_at
  )
  VALUES (
    p_organization_id, p_origin, p_format, p_storage_path, p_size_bytes,
    p_row_counts, p_period_ids, auth.uid(), v_expires_at
  )
  RETURNING id INTO v_id;

  -- Audit
  PERFORM public.rpc_admin_write_audit_log(
    'backup.created',
    'platform_backups',
    v_id,
    jsonb_build_object(
      'origin', p_origin,
      'format', p_format,
      'size_bytes', p_size_bytes,
      'row_counts', p_row_counts
    ),
    p_organization_id
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_register(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[], TEXT) TO authenticated;

-- ── Delete a backup row ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_backup_delete(
  p_backup_id UUID
)
RETURNS TABLE (storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
  v_path TEXT;
  v_origin TEXT;
BEGIN
  SELECT b.organization_id, b.storage_path, b.origin
    INTO v_org_id, v_path, v_origin
    FROM public.platform_backups b
    WHERE b.id = p_backup_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'backup not found';
  END IF;

  PERFORM public._assert_tenant_admin(v_org_id);

  IF v_origin = 'snapshot' THEN
    RAISE EXCEPTION 'snapshot backups are pinned and cannot be deleted';
  END IF;

  DELETE FROM public.platform_backups WHERE id = p_backup_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.deleted',
    'platform_backups',
    p_backup_id,
    jsonb_build_object('storage_path', v_path, 'origin', v_origin),
    v_org_id
  );

  RETURN QUERY SELECT v_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_delete(UUID) TO authenticated;

-- ── Record a download event ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_backup_record_download(
  p_backup_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.platform_backups WHERE id = p_backup_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'backup not found';
  END IF;

  PERFORM public._assert_tenant_admin(v_org_id);

  UPDATE public.platform_backups
    SET download_count = download_count + 1,
        last_downloaded_at = now()
    WHERE id = p_backup_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.downloaded',
    'platform_backups',
    p_backup_id,
    '{}'::jsonb,
    v_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_record_download(UUID) TO authenticated;
```

- [ ] **Step 2: Apply migration**

```text
mcp__claude_ai_Supabase__apply_migration
  name: 036_platform_backups_rpcs
```

- [ ] **Step 3: Verify all 4 RPCs exist**

```text
mcp__claude_ai_Supabase__execute_sql
  query: SELECT proname FROM pg_proc WHERE proname LIKE 'rpc_backup_%' ORDER BY proname;
```

Expected: 4 rows — `rpc_backup_delete`, `rpc_backup_list`, `rpc_backup_record_download`, `rpc_backup_register`.

- [ ] **Step 4: Smoke test rpc_backup_list (should return empty for any org)**

```text
mcp__claude_ai_Supabase__execute_sql
  query: SELECT * FROM public.rpc_backup_list(
    (SELECT id FROM public.organizations LIMIT 1)
  );
```

Expected: empty result set (no backups yet) OR RLS error (if caller is not a member of any org — acceptable for service role).

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/036_platform_backups_rpcs.sql
git commit -m "feat(backups): add list/register/delete/download RPCs"
```

---

## Task 4: Add qa-catalog entries for tests

**Files:**

- Modify: `src/test/qa-catalog.json`

- [ ] **Step 1: Read the current file to find the right section**

```bash
# Locate the file
cat src/test/qa-catalog.json | head -40
```

- [ ] **Step 2: Add 8 new entries to the "api" and "admin" sections**

Add these entries to `src/test/qa-catalog.json` (adjust the existing JSON structure — insert alphabetically within the right section):

```json
{
  "id": "backups.api.list.01",
  "title": "backups API — list returns rows for an org",
  "surface": "api",
  "owner": "admin"
},
{
  "id": "backups.api.create.01",
  "title": "backups API — createBackup uploads and registers",
  "surface": "api",
  "owner": "admin"
},
{
  "id": "backups.api.delete.01",
  "title": "backups API — deleteBackup removes row and Storage file",
  "surface": "api",
  "owner": "admin"
},
{
  "id": "backups.api.download.01",
  "title": "backups API — getSignedUrl returns a valid URL",
  "surface": "api",
  "owner": "admin"
},
{
  "id": "backups.hook.load.01",
  "title": "useBackups — loads list on mount",
  "surface": "admin",
  "owner": "admin"
},
{
  "id": "backups.hook.create.01",
  "title": "useBackups — create action refreshes list",
  "surface": "admin",
  "owner": "admin"
},
{
  "id": "backups.drawer.render.01",
  "title": "ManageBackupsDrawer — renders list and empty state",
  "surface": "admin",
  "owner": "admin"
},
{
  "id": "backups.drawer.delete.01",
  "title": "ManageBackupsDrawer — delete action calls hook",
  "surface": "admin",
  "owner": "admin"
}
```

- [ ] **Step 3: Validate the JSON is still parseable**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/test/qa-catalog.json', 'utf8'));" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add src/test/qa-catalog.json
git commit -m "chore(qa): add backups drawer test IDs"
```

---

## Task 5: Create `backups.js` API module

**Files:**

- Create: `src/shared/api/admin/backups.js`
- Test: `src/shared/api/__tests__/backups.test.js`
- Modify: `src/shared/api/admin/index.js` (re-export)
- Modify: `src/shared/api/index.js` (re-export)

- [ ] **Step 1: Write the failing test**

Create `src/shared/api/__tests__/backups.test.js`:

```js
// src/shared/api/__tests__/backups.test.js
import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

const mockRpc = vi.fn();
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  createSignedUrl: mockCreateSignedUrl,
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    storage: { from: mockStorageFrom },
  },
}));

// Reset the fullExport mock so each test sets its own return
vi.mock("../admin/export", () => ({
  fullExport: vi.fn(async () => ({
    periods: [{ id: "p1" }],
    projects: [{ id: "pr1" }, { id: "pr2" }],
    jurors: [],
    scores: [],
    audit_logs: [],
  })),
}));

import {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupSignedUrl,
  recordBackupDownload,
} from "../admin/backups.js";

describe("backups API", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockUpload.mockReset();
    mockRemove.mockReset();
    mockCreateSignedUrl.mockReset();
  });

  qaTest("backups.api.list.01", async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ id: "b1" }], error: null });
    const rows = await listBackups("org-1");
    expect(mockRpc).toHaveBeenCalledWith("rpc_backup_list", { p_organization_id: "org-1" });
    expect(rows).toEqual([{ id: "b1" }]);
  });

  qaTest("backups.api.create.01", async () => {
    mockUpload.mockResolvedValueOnce({ data: { path: "org-1/b1.json" }, error: null });
    mockRpc.mockResolvedValueOnce({ data: "b1", error: null });

    const result = await createBackup("org-1");

    expect(mockStorageFrom).toHaveBeenCalledWith("backups");
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const [path, blob, opts] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^org-1\/[0-9a-f-]+\.json$/);
    expect(blob).toBeInstanceOf(Blob);
    expect(opts).toEqual({ contentType: "application/json", upsert: false });

    expect(mockRpc).toHaveBeenCalledWith("rpc_backup_register", expect.objectContaining({
      p_organization_id: "org-1",
      p_format: "json",
      p_origin: "manual",
      p_row_counts: { periods: 1, projects: 2, jurors: 0, scores: 0, audit_logs: 0 },
    }));
    expect(result).toEqual({ id: "b1", path: expect.stringMatching(/^org-1\//) });
  });

  qaTest("backups.api.delete.01", async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ storage_path: "org-1/b1.json" }], error: null });
    mockRemove.mockResolvedValueOnce({ data: [{}], error: null });

    await deleteBackup("b1");

    expect(mockRpc).toHaveBeenCalledWith("rpc_backup_delete", { p_backup_id: "b1" });
    expect(mockRemove).toHaveBeenCalledWith(["org-1/b1.json"]);
  });

  qaTest("backups.api.download.01", async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: "https://x.supabase.co/signed/abc" },
      error: null,
    });

    const url = await getBackupSignedUrl("org-1/b1.json");

    expect(mockCreateSignedUrl).toHaveBeenCalledWith("org-1/b1.json", 60);
    expect(url).toBe("https://x.supabase.co/signed/abc");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- --run src/shared/api/__tests__/backups.test.js
```

Expected: FAIL — `Cannot find module '../admin/backups.js'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/shared/api/admin/backups.js`:

```js
// src/shared/api/admin/backups.js
// API module for platform_backups: list, create, delete, download.
// All mutating operations go through SECURITY DEFINER RPCs; file bytes
// are moved via the client-side Storage SDK.

import { supabase } from "../../lib/supabaseClient";
import { fullExport } from "./export.js";

const BUCKET = "backups";

/**
 * List all backups for an organization.
 * @param {string} organizationId
 * @returns {Promise<Array>}
 */
export async function listBackups(organizationId) {
  const { data, error } = await supabase.rpc("rpc_backup_list", {
    p_organization_id: organizationId,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Create a new manual backup.
 * Builds JSON via fullExport(), uploads to Storage, registers the row.
 * @param {string} organizationId
 * @returns {Promise<{ id: string, path: string }>}
 */
export async function createBackup(organizationId) {
  const payload = await fullExport(organizationId);

  const rowCounts = {
    periods: (payload.periods || []).length,
    projects: (payload.projects || []).length,
    jurors: (payload.jurors || []).length,
    scores: (payload.scores || []).length,
    audit_logs: (payload.audit_logs || []).length,
  };

  const periodIds = (payload.periods || []).map((p) => p.id).filter(Boolean);

  const backupUuid = crypto.randomUUID();
  const path = `${organizationId}/${backupUuid}.json`;
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: "application/json",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: insertedId, error: rpcError } = await supabase.rpc(
    "rpc_backup_register",
    {
      p_organization_id: organizationId,
      p_storage_path: path,
      p_size_bytes: blob.size,
      p_format: "json",
      p_row_counts: rowCounts,
      p_period_ids: periodIds,
      p_origin: "manual",
    },
  );
  if (rpcError) {
    // Best-effort rollback of the Storage file
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw rpcError;
  }

  return { id: insertedId, path };
}

/**
 * Delete a backup (both row and Storage file).
 * @param {string} backupId
 */
export async function deleteBackup(backupId) {
  const { data, error } = await supabase.rpc("rpc_backup_delete", {
    p_backup_id: backupId,
  });
  if (error) throw error;

  const path = Array.isArray(data) ? data[0]?.storage_path : data?.storage_path;
  if (path) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (removeError) {
      // Row is already gone; log but don't fail the user action.
      console.warn("[backups] Storage remove failed:", removeError.message);
    }
  }
}

/**
 * Get a 60-second signed URL for downloading a backup file.
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
export async function getBackupSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Record a download event for audit purposes.
 * @param {string} backupId
 */
export async function recordBackupDownload(backupId) {
  const { error } = await supabase.rpc("rpc_backup_record_download", {
    p_backup_id: backupId,
  });
  if (error) throw error;
}
```

- [ ] **Step 4: Update the barrel files**

Modify `src/shared/api/admin/index.js` — add at the end:

```js
export * from "./backups.js";
```

Modify `src/shared/api/index.js` — find the block that re-exports from `./admin/` and add:

```js
export {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupSignedUrl,
  recordBackupDownload,
} from "./admin/backups.js";
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test -- --run src/shared/api/__tests__/backups.test.js
```

Expected: PASS — all 4 tests green.

- [ ] **Step 6: Run the full unit test suite to check nothing else broke**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/shared/api/admin/backups.js src/shared/api/__tests__/backups.test.js \
        src/shared/api/admin/index.js src/shared/api/index.js
git commit -m "feat(backups): add backups API module (list/create/delete/download)"
```

---

## Task 6: Create `useBackups` hook

**Files:**

- Create: `src/admin/hooks/useBackups.js`
- Test: `src/admin/__tests__/useBackups.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/admin/__tests__/useBackups.test.js`:

```jsx
// src/admin/__tests__/useBackups.test.js
import { describe, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockSignedUrl = vi.fn();
const mockRecordDownload = vi.fn();

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../shared/api", () => ({
  listBackups: (...a) => mockList(...a),
  createBackup: (...a) => mockCreate(...a),
  deleteBackup: (...a) => mockDelete(...a),
  getBackupSignedUrl: (...a) => mockSignedUrl(...a),
  recordBackupDownload: (...a) => mockRecordDownload(...a),
}));

import { useBackups } from "../hooks/useBackups.js";

const SAMPLE = [
  { id: "b1", origin: "manual", size_bytes: 4200, created_at: "2026-04-11T14:02:00Z", storage_path: "org-1/b1.json" },
  { id: "b2", origin: "auto", size_bytes: 4000, created_at: "2026-04-08T03:00:00Z", storage_path: "org-1/b2.json" },
];

describe("useBackups", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockDelete.mockReset();
    mockSignedUrl.mockReset();
    mockRecordDownload.mockReset();
  });

  qaTest("backups.hook.load.01", async () => {
    mockList.mockResolvedValueOnce(SAMPLE);
    const { result } = renderHook(() => useBackups("org-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.backups).toEqual(SAMPLE);
    expect(mockList).toHaveBeenCalledWith("org-1");
  });

  qaTest("backups.hook.create.01", async () => {
    mockList.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce({ id: "b3", path: "org-1/b3.json" });
    mockList.mockResolvedValueOnce([{ id: "b3" }]);

    const { result } = renderHook(() => useBackups("org-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create();
    });

    expect(mockCreate).toHaveBeenCalledWith("org-1");
    await waitFor(() => expect(result.current.backups).toEqual([{ id: "b3" }]));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- --run src/admin/__tests__/useBackups.test.js
```

Expected: FAIL — `Cannot find module '../hooks/useBackups.js'`.

- [ ] **Step 3: Write the hook**

Create `src/admin/hooks/useBackups.js`:

```js
// src/admin/hooks/useBackups.js
// State hook for the Backups drawer.
// Loads the list on mount + whenever organizationId changes; exposes
// create / delete / download actions that refresh the list.

import { useCallback, useEffect, useState } from "react";
import {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupSignedUrl,
  recordBackupDownload,
} from "../../shared/api";

export function useBackups(organizationId) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listBackups(organizationId);
      setBackups(rows);
    } catch (e) {
      setError(e?.message || "Failed to load backups");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async () => {
    if (!organizationId) return;
    setCreating(true);
    setError("");
    try {
      await createBackup(organizationId);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create backup");
      throw e;
    } finally {
      setCreating(false);
    }
  }, [organizationId, refresh]);

  const remove = useCallback(
    async (backupId) => {
      setDeletingId(backupId);
      setError("");
      try {
        await deleteBackup(backupId);
        await refresh();
      } catch (e) {
        setError(e?.message || "Failed to delete backup");
        throw e;
      } finally {
        setDeletingId(null);
      }
    },
    [refresh],
  );

  const download = useCallback(async (backup) => {
    if (!backup?.storage_path) return;
    const url = await getBackupSignedUrl(backup.storage_path);
    // Trigger browser download
    const a = document.createElement("a");
    a.href = url;
    a.download = backup.storage_path.split("/").pop() || "backup.json";
    a.click();
    // Fire-and-forget audit
    recordBackupDownload(backup.id).catch((e) =>
      console.warn("[backups] record download failed:", e?.message),
    );
  }, []);

  const totalBytes = backups.reduce((sum, b) => sum + (b.size_bytes || 0), 0);

  return {
    backups,
    loading,
    error,
    creating,
    deletingId,
    totalBytes,
    refresh,
    create,
    remove,
    download,
  };
}
```

- [ ] **Step 4: Run the test**

```bash
npm test -- --run src/admin/__tests__/useBackups.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/hooks/useBackups.js src/admin/__tests__/useBackups.test.js
git commit -m "feat(backups): add useBackups hook"
```

---

## Task 7: Add backup-specific CSS to drawers.css

**Files:**

- Modify: `src/styles/drawers.css`

- [ ] **Step 1: Find the end of the file**

```bash
wc -l src/styles/drawers.css
```

Note the line count.

- [ ] **Step 2: Append the new CSS block**

Add at the end of `src/styles/drawers.css`:

```css
/* ── Backups drawer ────────────────────────────────────── */

/* Status card (schedule section) */
.fs-status-card {
  background: var(--success-soft, rgba(22, 163, 74, 0.08));
  border: 1px solid rgba(22, 163, 74, 0.22);
  border-radius: 9px;
  padding: 12px 14px;
  display: flex;
  gap: 11px;
  align-items: flex-start;
}
.fs-status-card.muted {
  background: var(--surface-1);
  border-color: var(--border);
}
.fs-status-card > svg {
  color: var(--success);
  flex-shrink: 0;
  margin-top: 1px;
}
.fs-status-card.muted > svg { color: var(--text-tertiary); }
.fs-status-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--success);
}
.fs-status-card.muted .fs-status-title { color: var(--text-secondary); }
.fs-status-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Inline stat row (3-col) */
.fs-inline-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.fs-inline-stat {
  background: var(--bg-card);
  padding: 9px 11px;
}
.fs-inline-stat-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.fs-inline-stat-label {
  font-size: 9.5px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  margin-top: 1px;
}

/* Storage meter */
.fs-meter-wrap {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.fs-meter-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}
.fs-meter-row strong { color: var(--text-primary); }
.fs-meter-track {
  height: 5px;
  background: var(--surface-2, rgba(255, 255, 255, 0.05));
  border-radius: 99px;
  overflow: hidden;
}
.fs-meter-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-dark, #7c3aed));
  border-radius: 99px;
  transition: width 0.3s ease;
}

/* Backup item card */
.fs-backup-card {
  display: flex;
  gap: 11px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--bg-card);
  margin-bottom: 8px;
  align-items: flex-start;
  transition: background 0.12s, border-color 0.12s;
}
.fs-backup-card:hover {
  background: var(--surface-1);
  border-color: var(--border-strong);
}
.fs-backup-card:last-child { margin-bottom: 0; }
.fs-backup-card.pinned { border-left: 2px solid #93c5fd; }

.fs-backup-icon {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: var(--surface-1);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.fs-backup-card.origin-manual .fs-backup-icon {
  background: var(--accent-soft);
  border-color: rgba(99, 102, 241, 0.22);
  color: var(--accent);
}
.fs-backup-card.origin-auto .fs-backup-icon {
  background: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.22);
  color: var(--success);
}
.fs-backup-card.origin-snapshot .fs-backup-icon {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.22);
  color: #3b82f6;
}

.fs-backup-body { flex: 1; min-width: 0; }
.fs-backup-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
}
.fs-backup-sub {
  font-size: 10.5px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.fs-backup-meta {
  font-size: 10.5px;
  color: var(--text-tertiary);
  margin-top: 6px;
  line-height: 1.5;
}

/* Extended pill variants (Manual / Auto / Snapshot / Warning) */
.fs-session-pill.backup-manual   { background: var(--accent-soft); border-color: rgba(99, 102, 241, 0.22); color: var(--accent); }
.fs-session-pill.backup-auto     { background: rgba(22, 163, 74, 0.1); border-color: rgba(22, 163, 74, 0.22); color: var(--success); }
.fs-session-pill.backup-snapshot { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.22); color: #3b82f6; }
.fs-session-pill.muted           { background: var(--surface-1); border-color: var(--border); color: var(--text-tertiary); }

/* Row actions (icon buttons) */
.fs-backup-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;
}
.fs-backup-card:hover .fs-backup-actions { opacity: 1; }
.fs-backup-card.featured .fs-backup-actions { opacity: 1; }

.fs-icon-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.fs-icon-btn:hover {
  background: var(--surface-1);
  color: var(--text-primary);
}
.fs-icon-btn.danger:hover {
  color: var(--danger);
  border-color: rgba(225, 29, 72, 0.4);
}
.fs-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 3: Run the no-native-select check to make sure nothing broke**

```bash
npm run check:no-native-select
```

Expected: `OK: no native <select> usage found`.

- [ ] **Step 4: Commit**

```bash
git add src/styles/drawers.css
git commit -m "style(drawers): add backup drawer CSS primitives"
```

---

## Task 8: Create `ManageBackupsDrawer.jsx`

**Files:**

- Create: `src/admin/drawers/ManageBackupsDrawer.jsx`
- Test: `src/admin/__tests__/ManageBackupsDrawer.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/admin/__tests__/ManageBackupsDrawer.test.jsx`:

```jsx
// src/admin/__tests__/ManageBackupsDrawer.test.jsx
import { describe, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

const mockHook = vi.fn();
vi.mock("../hooks/useBackups", () => ({
  useBackups: (...a) => mockHook(...a),
}));
vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/shared/hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import ManageBackupsDrawer from "../drawers/ManageBackupsDrawer.jsx";

const SAMPLE = [
  {
    id: "b1",
    origin: "manual",
    format: "json",
    size_bytes: 4200,
    row_counts: { projects: 48 },
    period_ids: ["p1"],
    created_by_name: "Hugur",
    created_at: "2026-04-11T14:02:00Z",
    expires_at: "2026-07-10T14:02:00Z",
    storage_path: "org-1/b1.json",
  },
];

describe("ManageBackupsDrawer", () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  qaTest("backups.drawer.render.01", () => {
    mockHook.mockReturnValue({
      backups: SAMPLE,
      loading: false,
      error: "",
      creating: false,
      deletingId: null,
      totalBytes: 4200,
      refresh: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
    });

    render(<ManageBackupsDrawer open organizationId="org-1" onClose={() => {}} />);

    expect(screen.getByText("Database Backups")).toBeInTheDocument();
    expect(screen.getByText(/Apr 11, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  qaTest("backups.drawer.delete.01", async () => {
    const removeFn = vi.fn();
    mockHook.mockReturnValue({
      backups: SAMPLE,
      loading: false,
      error: "",
      creating: false,
      deletingId: null,
      totalBytes: 4200,
      refresh: vi.fn(),
      create: vi.fn(),
      remove: removeFn,
      download: vi.fn(),
    });

    render(<ManageBackupsDrawer open organizationId="org-1" onClose={() => {}} />);

    const deleteBtn = screen.getByLabelText("Delete backup");
    fireEvent.click(deleteBtn);

    // Confirmation dialog opens; click confirm
    const confirmBtn = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(confirmBtn);

    expect(removeFn).toHaveBeenCalledWith("b1");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- --run src/admin/__tests__/ManageBackupsDrawer.test.jsx
```

Expected: FAIL — `Cannot find module '../drawers/ManageBackupsDrawer.jsx'`.

- [ ] **Step 3: Write the component**

Create `src/admin/drawers/ManageBackupsDrawer.jsx`:

```jsx
// src/admin/drawers/ManageBackupsDrawer.jsx
// Drawer: create, list, download, and delete org backups.
// Backups are JSON snapshots stored in Supabase Storage and tracked
// in the platform_backups table. Uses the fs-drawer / fs-session-card
// design system (see ViewSessionsDrawer for the reference pattern).

import { useState } from "react";
import {
  Database,
  X,
  Plus,
  Download,
  Trash2,
  Calendar,
  RefreshCw,
  Clock,
  AlertCircle,
} from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import FbAlert from "@/shared/ui/FbAlert";
import ConfirmDialog from "@/shared/ConfirmDialog";
import { useToast } from "@/shared/hooks/useToast";
import { useBackups } from "../hooks/useBackups";

const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[idx]}`;
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExpiry(ts) {
  if (!ts) return "Never expires";
  const d = new Date(ts);
  const now = Date.now();
  const diffDays = Math.ceil((d.getTime() - now) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Expires today";
  if (diffDays <= 7) return `Expires in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  return `Expires ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function BackupRow({ backup, onDownload, onDelete, isDeleting }) {
  const isPinned = backup.origin === "snapshot";
  const expiringSoon =
    backup.expires_at && new Date(backup.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className={`fs-backup-card origin-${backup.origin}${isPinned ? " pinned" : ""}`}>
      <div className="fs-backup-icon">
        <Database size={15} strokeWidth={2} />
      </div>
      <div className="fs-backup-body">
        <div className="fs-backup-title">
          {formatDate(backup.created_at)}
          <span className={`fs-session-pill backup-${backup.origin}`}>
            {backup.origin[0].toUpperCase() + backup.origin.slice(1)}
          </span>
          {isPinned && <span className="fs-session-pill muted">Pinned</span>}
          {expiringSoon && !isPinned && (
            <span className="fs-session-pill warning">Expires soon</span>
          )}
        </div>
        <div className="fs-backup-sub">
          {backup.period_ids?.length || 0} period{backup.period_ids?.length !== 1 ? "s" : ""} ·
          {" "}{formatBytes(backup.size_bytes)} · {backup.format?.toUpperCase() || "JSON"}
        </div>
        <div className="fs-backup-meta">
          By {backup.created_by_name || "System"} · {formatExpiry(backup.expires_at)}
        </div>
      </div>
      <div className="fs-backup-actions">
        <button
          type="button"
          className="fs-icon-btn"
          aria-label="Download backup"
          onClick={() => onDownload(backup)}
        >
          <Download size={12} strokeWidth={2} />
        </button>
        {!isPinned && (
          <button
            type="button"
            className="fs-icon-btn danger"
            aria-label="Delete backup"
            disabled={isDeleting}
            onClick={() => onDelete(backup)}
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ManageBackupsDrawer({ open, onClose, organizationId }) {
  const toast = useToast();
  const {
    backups,
    loading,
    error,
    creating,
    deletingId,
    totalBytes,
    create,
    remove,
    download,
  } = useBackups(organizationId);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleCreate = async () => {
    try {
      await create();
      toast.success("Backup created");
    } catch (e) {
      toast.error(e?.message || "Backup failed");
    }
  };

  const handleDownload = async (backup) => {
    try {
      await download(backup);
    } catch (e) {
      toast.error(e?.message || "Download failed");
    }
  };

  const handleDeleteConfirmed = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (!target) return;
    try {
      await remove(target.id);
      toast.success("Backup deleted");
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const meterPct = Math.min(100, (totalBytes / STORAGE_QUOTA_BYTES) * 100);

  return (
    <>
      <Drawer open={open} onClose={onClose}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="fs-icon identity">
                <Database size={18} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  Database Backups
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Snapshots stored securely · 90-day retention
                </div>
              </div>
            </div>
            <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="fs-drawer-body">
          {error && (
            <FbAlert variant="danger" style={{ marginBottom: 14 }}>
              {error}
            </FbAlert>
          )}

          {/* Schedule section (coming soon) */}
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Schedule</span>
            </div>
            <div className="fs-status-card muted">
              <Clock size={14} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div className="fs-status-title">Auto-backup coming soon</div>
                <div className="fs-status-desc">
                  For now, create backups manually from the button below.
                </div>
              </div>
            </div>
          </div>

          {/* Storage stats */}
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Storage</span>
            </div>
            <div className="fs-inline-stats">
              <div className="fs-inline-stat">
                <div className="fs-inline-stat-value">{backups.length}</div>
                <div className="fs-inline-stat-label">Total</div>
              </div>
              <div className="fs-inline-stat">
                <div className="fs-inline-stat-value">{formatBytes(totalBytes)}</div>
                <div className="fs-inline-stat-label">Used</div>
              </div>
              <div className="fs-inline-stat">
                <div className="fs-inline-stat-value">
                  {backups.filter((b) => b.origin === "manual").length}
                </div>
                <div className="fs-inline-stat-label">Manual</div>
              </div>
            </div>
            <div className="fs-meter-wrap">
              <div className="fs-meter-row">
                <span>Storage quota</span>
                <span>
                  <strong>{formatBytes(totalBytes)}</strong> / 500 MB
                </span>
              </div>
              <div className="fs-meter-track">
                <div className="fs-meter-fill" style={{ width: `${meterPct}%` }} />
              </div>
            </div>
          </div>

          {/* Backup list */}
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Recent Backups</span>
              <span className="fs-section-badge">{backups.length} total</span>
            </div>

            {loading && (
              <div
                style={{
                  padding: "20px 0",
                  textAlign: "center",
                  color: "var(--text-quaternary)",
                  fontSize: 12,
                }}
              >
                Loading backups…
              </div>
            )}

            {!loading && backups.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 12,
                  border: "1px dashed var(--border)",
                  borderRadius: 9,
                }}
              >
                <AlertCircle
                  size={22}
                  style={{ marginBottom: 8, opacity: 0.5 }}
                  strokeWidth={1.5}
                />
                <div>No backups yet</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>
                  Create your first backup to protect your data
                </div>
              </div>
            )}

            {!loading &&
              backups.map((b) => (
                <BackupRow
                  key={b.id}
                  backup={b}
                  onDownload={handleDownload}
                  onDelete={(backup) => setConfirmDelete(backup)}
                  isDeleting={deletingId === b.id}
                />
              ))}
          </div>
        </div>

        <div className="fs-drawer-footer">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-tertiary)" }}>
            {backups.length} backup{backups.length !== 1 ? "s" : ""} · {formatBytes(totalBytes)} used
          </div>
          <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="fs-btn fs-btn-primary"
            type="button"
            disabled={creating || !organizationId}
            onClick={handleCreate}
          >
            {creating ? (
              <>
                <RefreshCw size={12} className="spin" strokeWidth={2.5} />
                Creating…
              </>
            ) : (
              <>
                <Plus size={12} strokeWidth={2.5} />
                Create backup
              </>
            )}
          </button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete backup?"
        message={
          confirmDelete
            ? `This will permanently delete the backup from ${formatDate(confirmDelete.created_at)}. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
```

- [ ] **Step 4: Run the drawer test**

```bash
npm test -- --run src/admin/__tests__/ManageBackupsDrawer.test.jsx
```

Expected: PASS — both tests green.

- [ ] **Step 5: Run the axe accessibility test to catch any a11y regressions**

```bash
npm test -- --run src/test/a11y.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/drawers/ManageBackupsDrawer.jsx src/admin/__tests__/ManageBackupsDrawer.test.jsx
git commit -m "feat(backups): add ManageBackupsDrawer component"
```

---

## Task 9: Wire the drawer into `ExportPage`

**Files:**

- Modify: `src/admin/pages/ExportPage.jsx`

- [ ] **Step 1: Read the current Full Backup card block**

```bash
# Read lines 275-320 (approximately — check file)
grep -n "Full Backup" src/admin/pages/ExportPage.jsx
```

Expected: One match near line 277.

- [ ] **Step 2: Replace the Full Backup card button + handler**

In `src/admin/pages/ExportPage.jsx`:

1. Add a new import at the top:

```js
import ManageBackupsDrawer from "../drawers/ManageBackupsDrawer";
```

2. Add state inside the component (near other `useState` calls):

```js
const [backupsOpen, setBackupsOpen] = useState(false);
```

3. Find the Full Backup card JSX (around line 275-310) and replace its button with:

```jsx
<button
  className="btn btn-outline btn-sm"
  type="button"
  disabled={!organizationId}
  onClick={() => setBackupsOpen(true)}
>
  Manage backups →
</button>
```

Also update the card's description text to:

```text
Browse, create, and download full backups stored in Supabase Storage
```

4. At the end of the component's JSX (just before the closing `</div>` of `.page`), add the drawer:

```jsx
<ManageBackupsDrawer
  open={backupsOpen}
  onClose={() => setBackupsOpen(false)}
  organizationId={organizationId}
/>
```

5. Remove the now-unused `handleDbExportConfirm` function, `dbBackupLoading`, `dbBackupError`, `setDbBackupLoading`, `setDbBackupError`, `MAX_BACKUP_BYTES`, `MIN_BACKUP_DELAY` constants, `fullExport` import, `mapDbBackupError`, and the `dbBackupError` FbAlert block. Also remove the top-level FbAlert for `dbBackupError` around line 214-218.

- [ ] **Step 3: Manually verify the app builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Start dev server and smoke-test in a browser**

```bash
npm run dev
```

Navigate to the admin Export & Backup page. Click "Manage backups". Verify:

- Drawer opens, shows "No backups yet" empty state
- Schedule section shows "Auto-backup coming soon"
- Storage meter shows 0 B / 500 MB
- Click "Create backup" → wait → a new row appears with origin = Manual
- Click download icon on the row → browser downloads the .json file
- Click delete icon → confirmation dialog appears → confirm → row disappears
- Verify via Supabase MCP: `SELECT count(*) FROM platform_backups;` matches UI

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/ExportPage.jsx
git commit -m "feat(backups): wire ManageBackupsDrawer into ExportPage"
```

---

## Task 10: Apply migrations to the demo Supabase project

Per memory `feedback_db_both_projects.md`: every migration must land on both `vera-prod` and `vera-demo`.

**Files:** None (remote DB operations)

- [ ] **Step 1: List current projects to grab the demo project ref**

```text
mcp__claude_ai_Supabase__list_projects
```

Note the demo project's `id`.

- [ ] **Step 2: Apply migration 034 to demo**

```text
mcp__claude_ai_Supabase__apply_migration
  project_id: <vera-demo>
  name: 034_platform_backups
  query: <contents of file>
```

- [ ] **Step 3: Apply migration 035 to demo**

```text
mcp__claude_ai_Supabase__apply_migration
  project_id: <vera-demo>
  name: 035_platform_backups_storage
  query: <contents of file>
```

- [ ] **Step 4: Apply migration 036 to demo**

```text
mcp__claude_ai_Supabase__apply_migration
  project_id: <vera-demo>
  name: 036_platform_backups_rpcs
  query: <contents of file>
```

- [ ] **Step 5: Verify on demo**

```text
mcp__claude_ai_Supabase__execute_sql
  project_id: <vera-demo>
  query: SELECT
    (SELECT count(*) FROM information_schema.tables WHERE table_name = 'platform_backups') AS table_count,
    (SELECT count(*) FROM storage.buckets WHERE id = 'backups') AS bucket_count,
    (SELECT count(*) FROM pg_proc WHERE proname LIKE 'rpc_backup_%') AS rpc_count;
```

Expected: `table_count = 1`, `bucket_count = 1`, `rpc_count = 4`.

- [ ] **Step 6: Smoke-test demo end-to-end**

Visit the demo site with `?env=demo&explore` → admin panel → Export & Backup → Manage backups → Create backup → verify it appears in the drawer.

---

## Task 11: Update audit-coverage documentation

**Files:**

- Modify: `docs/audit/audit-coverage.md`

- [ ] **Step 1: Add 3 new rows to the "Frontend-Instrumented Logs" section**

In `docs/audit/audit-coverage.md`, find section 4 "Frontend-Instrumented Logs" and add a new subsection below "Auth (1)":

```markdown
### Backups (3)

| Action | UI Label | Detail shown |
|--------|----------|-------------|
| `backup.created` | Backup created | `JSON · 1.2 MB · 48 projects` |
| `backup.downloaded` | Backup downloaded | `JSON · Apr 11, 14:02` |
| `backup.deleted` | Backup deleted | `Manual · org-uuid/b1.json` |
```

Also update the top-of-file "Coverage" line from "15 frontend-instrumented actions" to "18 frontend-instrumented actions" and "8 RPC-emitted actions" → "11 RPC-emitted actions" (since the 3 backup events are emitted by SECURITY DEFINER RPCs, not pure frontend).

Then add these 3 actions to the ACTION_LABELS list in section 5:

```markdown
| `backup.created` | Backup created |
| `backup.downloaded` | Backup downloaded |
| `backup.deleted` | Backup deleted |
```

And add a changelog entry at the bottom:

```markdown
| 2026-04-11 | Added backup lifecycle events (`backup.created`, `backup.downloaded`, `backup.deleted`) via `rpc_backup_*` RPCs |
```

- [ ] **Step 2: Run markdownlint to verify the file is valid**

```bash
npx markdownlint docs/audit/audit-coverage.md
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add docs/audit/audit-coverage.md
git commit -m "docs(audit): document backup lifecycle events"
```

---

## Task 12: Final integration test + summary

- [ ] **Step 1: Run the full unit test suite**

```bash
npm test -- --run
```

Expected: All tests pass. Specifically verify:

- `backups.api.list.01`
- `backups.api.create.01`
- `backups.api.delete.01`
- `backups.api.download.01`
- `backups.hook.load.01`
- `backups.hook.create.01`
- `backups.drawer.render.01`
- `backups.drawer.delete.01`

All in the output.

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Manual E2E smoke test on prod Supabase**

Against the dev server (`npm run dev`) pointing at vera-prod:

1. Log in as an org admin
2. Navigate to Export & Backup
3. Click "Manage backups"
4. Empty state appears
5. Click "Create backup" — spinner, then new row
6. Verify row details: origin = Manual, size > 0, created_by = your name
7. Download the backup — JSON file opens correctly, structure matches `{ periods, projects, jurors, scores, audit_logs }`
8. Check Audit Log page → new `Backup created` and `Backup downloaded` events appear
9. Delete the backup → confirmation → row disappears
10. Check Audit Log → `Backup deleted` event appears
11. Refresh the drawer → empty state again

- [ ] **Step 4: Repeat on demo**

Same flow against the demo environment (`?env=demo&explore`).

- [ ] **Step 5: Final summary message to user**

Report:

- All tasks complete
- Tests: N passed (list actual number)
- Backup end-to-end verified on both prod and demo
- Migrations 034, 035, 036 applied to both projects
- Known follow-ups (Phase 2, documented below)

---

## Phase 2 (NOT in this plan)

The following items were intentionally deferred and should be tracked as separate plans:

1. **Auto-backup via pg_cron**
   - New migration adding `cron.schedule('platform_backups_weekly', '0 3 * * 1', 'SELECT rpc_backup_create_auto();')`
   - New Edge Function or pl/pgsql RPC that assembles the JSON server-side (frontend-only path doesn't work from cron)
   - UI: schedule section becomes live ("Next in 3 days")
   - Consider pg_net for HTTP calls to Edge Functions

2. **Snapshot integration**
   - Hook into `rpc_period_freeze_snapshot` — when it fires successfully, create a `platform_backups` row with `origin = 'snapshot'` and `expires_at = NULL`
   - Snapshot backups are pinned; the RPC already blocks deletion

3. **XLSX format**
   - `rpc_backup_register` already accepts `p_format = 'xlsx'`
   - Add a format selector in the drawer's "Create backup" button (dropdown: JSON / XLSX)
   - Server-side or client-side XLSX generation — easier client-side via `xlsx-js-style` (already a dependency)

4. **Retention cleanup**
   - New pg_cron job running daily: `DELETE FROM platform_backups WHERE expires_at < now() AND origin != 'snapshot'`
   - Trigger or Edge Function cleans up the Storage files for deleted rows

5. **Super-admin cross-org drawer**
   - The existing `ExportBackupDrawer` in `GovernanceDrawers.jsx` is currently a mock
   - Wire it to `rpc_backup_list` with a super-admin bypass (no `p_organization_id`, returns all rows with org name joined)
   - Requires a new `rpc_backup_list_all` RPC that asserts super-admin via `current_user_is_super_admin()`

6. **Quota enforcement**
   - Add a hard limit check to `rpc_backup_register` — if `SUM(size_bytes) > quota`, reject with error
   - UI already has the meter bar

7. **Audit Log feed redesign (Mockup 1 from the HTML spec)**
   - Entirely separate plan: activity feed view, drill-down drawer, saved views, diff badges, bulk grouping, anomaly banner
   - No shared code with this plan beyond the 3 new `backup.*` audit events
