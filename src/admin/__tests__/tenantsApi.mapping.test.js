// src/admin/__tests__/tenantsApi.mapping.test.js
// ============================================================
// Organizations API (RPC) — mapping and normalization.
// listOrganizations() now calls rpc_admin_list_organizations
// (SECURITY DEFINER) instead of PostgREST embedding.
// ============================================================

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/shared/lib/supabaseClient";
import { listOrganizations } from "../../shared/api/admin/organizations";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("admin organization API mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps memberships and org_applications into UI shape", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: "t1",
          name: "TED University EE",
          code: "TEDU EE",
          status: "active",
          created_at: "2026-03-01T10:00:00Z",
          updated_at: "2026-03-02T10:00:00Z",
          memberships: [
            {
              user_id: "u1",
              role: "admin",
              created_at: "2026-03-02T12:00:00Z",
              profiles: {
                display_name: "Alice Smith",
                email: "alice@tedu.edu",
              },
            },
          ],
          org_applications: [
            {
              id: "app-1",
              applicant_name: "Bob Jones",
              contact_email: "bob@tedu.edu",
              status: "pending",
              created_at: "2026-03-03T10:00:00Z",
            },
          ],
        },
      ],
      error: null,
    });

    const result = await listOrganizations();
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_list_organizations");
    expect(result).toHaveLength(1);
    expect(result[0].shortLabel).toBe("TEDU EE");
    expect(result[0].tenantAdmins).toEqual([
      {
        name: "Alice Smith",
        userId: "u1",
        email: "alice@tedu.edu",
        role: "admin",
        status: "approved",
        updatedAt: "2026-03-02T12:00:00Z",
      },
    ]);
    expect(result[0].pendingApplications).toEqual([
      {
        applicationId: "app-1",
        name: "Bob Jones",
        email: "bob@tedu.edu",
        status: "pending",
        createdAt: "2026-03-03T10:00:00Z",
      },
    ]);
  });

  it("normalizes null memberships and org_applications to empty arrays", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: "t2",
          name: "TEDU CS",
          code: "TEDU CS",
          memberships: null,
          org_applications: null,
        },
      ],
      error: null,
    });

    const [row] = await listOrganizations();
    expect(row.tenantAdmins).toEqual([]);
    expect(row.pendingApplications).toEqual([]);
  });
});
