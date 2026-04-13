// src/admin/__tests__/cloneFramework.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../shared/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from "../../shared/lib/supabaseClient";
import { cloneFramework, assignFrameworkToPeriod } from "../../shared/api/admin/frameworks";

describe("cloneFramework", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls rpc_admin_clone_framework and returns { id, name }", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: "new-framework-uuid",
      error: null,
    });

    const result = await cloneFramework("source-uuid", "Clone Name", "org-uuid");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_clone_framework", {
      p_framework_id: "source-uuid",
      p_new_name: "Clone Name",
      p_org_id: "org-uuid",
    });
    expect(result).toEqual({ id: "new-framework-uuid", name: "Clone Name" });
  });

  it("throws on RPC error", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "unauthorized" },
    });

    await expect(cloneFramework("x", "y", "z")).rejects.toThrow("unauthorized");
  });
});

describe("assignFrameworkToPeriod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates periods.framework_id", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ update: mockUpdate });

    await assignFrameworkToPeriod("period-uuid", "fw-uuid");

    expect(supabase.from).toHaveBeenCalledWith("periods");
    expect(mockUpdate).toHaveBeenCalledWith({ framework_id: "fw-uuid" });
    expect(mockEq).toHaveBeenCalledWith("id", "period-uuid");
  });

  it("throws on DB error", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "rls error" } });
    supabase.from.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

    await expect(assignFrameworkToPeriod("p", "f")).rejects.toThrow("rls error");
  });
});
