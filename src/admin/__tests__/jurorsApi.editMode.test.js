// src/admin/__tests__/jurorsApi.editMode.test.js
// ============================================================
// Safety tests for admin juror edit-mode RPC contract.
// ============================================================

import { describe, expect, vi, beforeEach, it } from "vitest";

vi.mock("../../shared/api/core/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from "../../shared/api/core/client";
import { setJurorEditMode } from "../../shared/api/admin/jurors";

describe("jurorsApi.editMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls rpc_juror_toggle_edit_mode_v2 with minute-based duration params", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { ok: true, edit_expires_at: "2099-01-01T00:30:00Z" },
      error: null,
    });

    const result = await setJurorEditMode({
      jurorId: "juror-1",
      periodId: "period-1",
      enabled: true,
      reason: "Accidental mismatch fix",
      durationMinutes: 60,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_juror_toggle_edit_mode_v2", {
      p_period_id: "period-1",
      p_juror_id: "juror-1",
      p_enabled: true,
      p_reason: "Accidental mismatch fix",
      p_duration_minutes: 60,
    });
    expect(result.ok).toBe(true);
  });

  it("throws when rpc returns error_code payload", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { ok: false, error_code: "final_submission_required" },
      error: null,
    });

    await expect(
      setJurorEditMode({
        jurorId: "juror-1",
        periodId: "period-1",
        enabled: true,
        reason: "Need correction",
        durationMinutes: 30,
      })
    ).rejects.toThrow("final_submission_required");
  });
});
