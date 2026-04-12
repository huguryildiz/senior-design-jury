import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "@/test/qaTest.js";

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock("@/shared/api/admin/export", () => ({
  logExportInitiated: vi.fn(async () => undefined),
  fullExport: vi.fn(async () => ({
    periods: [{ id: "p1" }],
    projects: [{ id: "pr1" }, { id: "pr2" }],
    jurors: [],
    scores: [],
    audit_logs: [],
  })),
}));

import { supabase } from "@/shared/lib/supabaseClient";
import {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupSignedUrl,
  recordBackupDownload,
} from "@/shared/api/admin/backups.js";
import { logExportInitiated } from "@/shared/api/admin/export";

describe("backups API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("backups.api.list.01", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [{ id: "b1" }], error: null });
    const rows = await listBackups("org-1");
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_backup_list", { p_organization_id: "org-1" });
    expect(rows).toEqual([{ id: "b1" }]);
  });

  qaTest("backups.api.create.01", async () => {
    const mockUpload = vi.fn().mockResolvedValueOnce({ data: { path: "org-1/b1.json" }, error: null });
    const mockRemove = vi.fn().mockResolvedValueOnce({ data: [{}], error: null });

    supabase.storage.from.mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
    });
    supabase.rpc.mockResolvedValueOnce({ data: "b1", error: null });

    const result = await createBackup("org-1");

    expect(logExportInitiated).toHaveBeenCalledWith({
      action: "export.backup",
      organizationId: "org-1",
      resourceType: "platform_backups",
      resourceId: null,
      details: {
        format: "json",
        row_count: null,
        period_name: null,
        project_count: null,
        juror_count: null,
        filters: { origin: "manual" },
      },
    });

    expect(supabase.storage.from).toHaveBeenCalledWith("backups");
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const [path, blob, opts] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^org-1\/[0-9a-f-]+\.json$/);
    expect(blob).toBeInstanceOf(Blob);
    expect(opts).toEqual({ contentType: "application/json", upsert: false });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_backup_register", expect.objectContaining({
      p_organization_id: "org-1",
      p_format: "json",
      p_origin: "manual",
      p_row_counts: { periods: 1, projects: 2, jurors: 0, scores: 0, audit_logs: 0 },
    }));
    expect(result).toEqual({ id: "b1", path: expect.stringMatching(/^org-1\//) });
  });

  qaTest("backups.api.delete.01", async () => {
    const mockRemove = vi.fn().mockResolvedValueOnce({ data: [{}], error: null });

    supabase.rpc.mockResolvedValueOnce({ data: [{ storage_path: "org-1/b1.json" }], error: null });
    supabase.storage.from.mockReturnValue({ remove: mockRemove });

    await deleteBackup("b1");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_backup_delete", { p_backup_id: "b1" });
    expect(mockRemove).toHaveBeenCalledWith(["org-1/b1.json"]);
  });

  qaTest("backups.api.download.01", async () => {
    const mockCreateSignedUrl = vi.fn().mockResolvedValueOnce({
      data: { signedUrl: "https://x.supabase.co/signed/abc" },
      error: null,
    });

    supabase.storage.from.mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

    const url = await getBackupSignedUrl("org-1/b1.json");

    expect(mockCreateSignedUrl).toHaveBeenCalledWith("org-1/b1.json", 60);
    expect(url).toBe("https://x.supabase.co/signed/abc");
  });
});
