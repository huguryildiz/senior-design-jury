// src/admin/__tests__/listJurorsSummary.edit-window.test.js
// ============================================================
// Verifies active-edit derivation from edit_enabled + edit_expires_at.
// ============================================================

import { describe, expect, vi, beforeEach, afterEach, it } from "vitest";

function makeChain(rows, error = null) {
  const data = Array.isArray(rows) ? rows : [rows];
  const p = Promise.resolve({ data, error });
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
}

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/shared/lib/supabaseClient";
import { listJurorsSummary } from "../../shared/api/admin/scores";

describe("listJurorsSummary edit window activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks editing only when edit_enabled=true and edit_expires_at is in the future", async () => {
    supabase.from
      .mockReturnValueOnce(makeChain([
        {
          juror_id: "j-active",
          edit_enabled: true,
          edit_expires_at: "2026-04-05T10:30:00.000Z",
          final_submitted_at: "2026-04-05T09:00:00.000Z",
          last_seen_at: "2026-04-05T09:59:00.000Z",
          locked_until: null,
          is_blocked: false,
          juror: { juror_name: "Active Juror", affiliation: "EE", email: null },
        },
        {
          juror_id: "j-expired",
          edit_enabled: true,
          edit_expires_at: "2026-04-05T09:00:00.000Z",
          final_submitted_at: "2026-04-05T08:00:00.000Z",
          last_seen_at: "2026-04-05T09:10:00.000Z",
          locked_until: null,
          is_blocked: false,
          juror: { juror_name: "Expired Juror", affiliation: "ME", email: null },
        },
        {
          juror_id: "j-legacy",
          edit_enabled: true,
          edit_expires_at: null,
          final_submitted_at: "2026-04-05T08:30:00.000Z",
          last_seen_at: "2026-04-05T09:20:00.000Z",
          locked_until: null,
          is_blocked: false,
          juror: { juror_name: "Legacy Juror", affiliation: "CE", email: null },
        },
      ]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([{ id: "p1" }, { id: "p2" }]));

    const rows = await listJurorsSummary("period-1");
    const byId = Object.fromEntries(rows.map((r) => [r.jurorId, r]));

    expect(byId["j-active"].editEnabled).toBe(true);
    expect(byId["j-expired"].editEnabled).toBe(false);
    expect(byId["j-legacy"].editEnabled).toBe(false);
  });
});
