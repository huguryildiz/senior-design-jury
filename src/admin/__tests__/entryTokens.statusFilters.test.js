import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shared/api/core/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "../../shared/api/core/client";
import { getEntryTokenStatus } from "../../shared/api/admin/tokens";

function makeThenableQuery(payload) {
  const p = Promise.resolve(payload);
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    not: vi.fn(() => q),
    is: vi.fn(() => q),
    gt: vi.fn(() => q),
    lte: vi.fn(() => q),
    order: vi.fn(() => q),
    limit: vi.fn(() => q),
    maybeSingle: vi.fn(() => Promise.resolve(payload)),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return q;
}

describe("entry token status session filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes final-submitted jurors from Session Overview counts", async () => {
    const qLatestToken = makeThenableQuery({
      data: {
        id: "tok-1",
        token_hash: "h",
        token_plain: "plain",
        is_revoked: false,
        created_at: "2026-04-10T08:00:00.000Z",
        expires_at: "2099-01-01T00:00:00.000Z",
        last_used_at: null,
      },
      error: null,
    });
    const qActiveWithExpiry = makeThenableQuery({ count: 2, error: null });
    const qActiveNoExpiry = makeThenableQuery({ count: 1, error: null });
    const qTotal = makeThenableQuery({ count: 3, error: null });
    const qExpired = makeThenableQuery({ count: 0, error: null });
    const qRevoked = makeThenableQuery({ count: 1, error: null });
    const qLastSeen = makeThenableQuery({
      data: { last_seen_at: "2026-04-10T09:00:00.000Z" },
      error: null,
    });
    const qLastUsed = makeThenableQuery({
      data: { last_used_at: "2026-04-10T09:30:00.000Z" },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(qLatestToken)
      .mockReturnValueOnce(qActiveWithExpiry)
      .mockReturnValueOnce(qActiveNoExpiry)
      .mockReturnValueOnce(qTotal)
      .mockReturnValueOnce(qExpired)
      .mockReturnValueOnce(qRevoked)
      .mockReturnValueOnce(qLastSeen)
      .mockReturnValueOnce(qLastUsed);

    const result = await getEntryTokenStatus("period-1");

    expect(result.active_session_count).toBe(3);
    expect(result.total_sessions).toBe(3);
    expect(result.expired_session_count).toBe(0);

    expect(qActiveWithExpiry.is).toHaveBeenCalledWith("final_submitted_at", null);
    expect(qActiveNoExpiry.is).toHaveBeenCalledWith("final_submitted_at", null);
    expect(qTotal.is).toHaveBeenCalledWith("final_submitted_at", null);
    expect(qExpired.is).toHaveBeenCalledWith("final_submitted_at", null);
  });
});
