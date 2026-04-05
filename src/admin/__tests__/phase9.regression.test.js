// src/admin/__tests__/phase9.regression.test.js
// ============================================================
// Phase 9 regression tests — API field mapping + admin hook
// delete handlers + period alias contract.
//
// Tests: juryapi.fieldmap.01, admin.delete.01, period.aliases.01
// ============================================================

import { describe, expect, vi, beforeEach, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks (before imports that touch these modules) ────────────────────────

// Prevent VITE_SUPABASE_URL errors from direct supabase client access.
vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock the whole shared API so no network calls go out.
vi.mock("../../shared/api", () => ({
  // period hooks
  listPeriods:                  vi.fn().mockResolvedValue([]),
  setCurrentPeriod:             vi.fn().mockResolvedValue({}),
  createPeriod:                 vi.fn().mockResolvedValue({}),
  updatePeriod:                 vi.fn().mockResolvedValue({}),
  updatePeriodCriteriaConfig:   vi.fn().mockResolvedValue({}),
  updatePeriodOutcomeConfig:    vi.fn().mockResolvedValue({}),
  deletePeriod:                 vi.fn().mockResolvedValue({}),
  setEvalLock:                  vi.fn().mockResolvedValue({}),
  // project hooks
  adminListProjects:            vi.fn().mockResolvedValue([]),
  createProject:                vi.fn().mockResolvedValue({}),
  upsertProject:                vi.fn().mockResolvedValue({}),
  deleteProject:                vi.fn().mockResolvedValue({}),
  // juror hooks
  listJurorsSummary:            vi.fn().mockResolvedValue([]),
  getScores:                    vi.fn().mockResolvedValue([]),
  createJuror:                  vi.fn().mockResolvedValue({}),
  updateJuror:                  vi.fn().mockResolvedValue({}),
  deleteJuror:                  vi.fn().mockResolvedValue({}),
  resetJurorPin:                vi.fn().mockResolvedValue({}),
  setJurorEditMode:             vi.fn().mockResolvedValue({}),
  forceCloseJurorEditMode:      vi.fn().mockResolvedValue({}),
}));

// ── Imports (after vi.mock declarations) ──────────────────────────────────

import { supabase } from "@/shared/lib/supabaseClient";
import * as api from "../../shared/api";
import { getJurorEditState, upsertScore } from "../../shared/api/juryApi";
import { useManageProjects } from "../../admin/hooks/useManageProjects";
import { useManageJurors } from "../../admin/hooks/useManageJurors";
import { useManagePeriods } from "../../admin/hooks/useManagePeriods";

// ── Shared test fixtures ──────────────────────────────────────────────────

const noop = vi.fn();

const baseProjectProps = {
  organizationId: "org-1",
  viewPeriodId: "period-1",
  viewPeriodLabel: "Spring 2026",
  periodList: [],
  setMessage: noop,
  incLoading: noop,
  decLoading: noop,
  setPanelError: noop,
  clearPanelError: noop,
};

const baseJurorProps = {
  organizationId: "org-1",
  viewPeriodId: "period-1",
  viewPeriodLabel: "Spring 2026",
  projects: [],
  setMessage: noop,
  incLoading: noop,
  decLoading: noop,
  setPanelError: noop,
  clearPanelError: noop,
  setEvalLockError: noop,
};

const basePeriodProps = {
  organizationId: "org-1",
  selectedPeriodId: "period-1",
  setMessage: noop,
  incLoading: noop,
  decLoading: noop,
  onCurrentPeriodChange: noop,
  setPanelError: noop,
  clearPanelError: noop,
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Phase 9 regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── juryapi.fieldmap.01 — getJurorEditState field mapping ─────────────

  qaTest("juryapi.fieldmap.01", async () => {
    // Simulate the chainable PostgREST query returning DB-column names.
    const dbRow = {
      edit_enabled: true,
      edit_expires_at: "2099-04-01T10:30:00Z",
      is_blocked: false,
      last_seen_at: "2026-04-01T10:00:00Z",
      final_submitted_at: null,
    };
    const singleMock = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const matchMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ match: matchMock });
    supabase.from.mockReturnValue({ select: selectMock });

    const result = await getJurorEditState("period-1", "juror-1", "tok-1");

    // DB columns must be remapped to UI field names.
    expect(result.edit_allowed).toBe(true);    // edit_enabled → edit_allowed
    expect(result.lock_active).toBe(false);    // is_blocked   → lock_active
    expect(result.edit_expires_at).toBe("2099-04-01T10:30:00Z");
    expect(result.last_seen_at).toBe("2026-04-01T10:00:00Z");
    expect(result.final_submitted_at).toBeNull();

    // Verify raw DB field names are NOT forwarded to the caller.
    expect(result).not.toHaveProperty("edit_enabled");
    expect(result).not.toHaveProperty("is_blocked");
  });

  it("returns edit_allowed=false when edit window is expired", async () => {
    const dbRow = {
      edit_enabled: true,
      edit_expires_at: "2000-01-01T00:00:00Z",
      is_blocked: false,
      last_seen_at: "2026-04-01T10:00:00Z",
      final_submitted_at: "2026-04-01T09:00:00Z",
    };
    const singleMock = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const matchMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ match: matchMock });
    supabase.from.mockReturnValue({ select: selectMock });

    const result = await getJurorEditState("period-1", "juror-1", "tok-1");
    expect(result.edit_allowed).toBe(false);
  });

  it("maps rpc_jury_upsert_score session errors to jury session classifier shape", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { ok: false, error_code: "session_expired" },
      error: null,
    });

    await expect(
      upsertScore("period-1", "project-1", "juror-1", "tok-1", { technical: 20 }, "", null)
    ).rejects.toMatchObject({
      message: "juror_session_expired",
      code: "P0401",
    });
  });

  // ── admin.delete.01 — delete handlers call the real API ───────────────

  qaTest("admin.delete.01", async () => {
    // --- handleDeleteProject ---
    const { result: projectResult } = renderHook(
      () => useManageProjects(baseProjectProps)
    );

    await act(async () => {
      await projectResult.current.handleDeleteProject("proj-uuid-1");
    });

    expect(api.deleteProject).toHaveBeenCalledWith("proj-uuid-1");

    // --- handleDeleteJuror ---
    const { result: jurorResult } = renderHook(
      () => useManageJurors(baseJurorProps)
    );

    await act(async () => {
      await jurorResult.current.handleDeleteJuror("juror-uuid-1");
    });

    expect(api.deleteJuror).toHaveBeenCalledWith("juror-uuid-1");

    // --- handleDeletePeriod ---
    const { result: periodResult } = renderHook(
      () => useManagePeriods(basePeriodProps)
    );

    await act(async () => {
      await periodResult.current.handleDeletePeriod("period-uuid-1");
    });

    expect(api.deletePeriod).toHaveBeenCalledWith("period-uuid-1");
  });

  // ── period.aliases.01 — updateCriteriaTemplate / updateMudekTemplate ──

  qaTest("period.aliases.01", () => {
    const { result } = renderHook(() => useManagePeriods(basePeriodProps));

    // Aliases must be the same function reference as the canonical handlers.
    expect(result.current.updateCriteriaTemplate).toBe(
      result.current.handleUpdateCriteriaConfig
    );
    expect(result.current.updateMudekTemplate).toBe(
      result.current.handleUpdateOutcomeConfig
    );
  });
});
