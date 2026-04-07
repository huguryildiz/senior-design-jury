import { describe, expect, it } from "vitest";
import {
  buildTokenPeriod,
  isEvaluablePeriod,
  listEvaluablePeriods,
  pickDemoPeriod,
} from "./periodSelection";

describe("periodSelection", () => {
  it("buildTokenPeriod maps entry-token payload to period shape", () => {
    const period = buildTokenPeriod({
      period_id: "p1",
      period_name: "Fall 2026",
      is_current: true,
      is_locked: false,
    });
    expect(period).toEqual({
      id: "p1",
      name: "Fall 2026",
      is_current: true,
      is_locked: false,
    });
  });

  it("returns evaluable periods only (current and unlocked)", () => {
    const periods = [
      { id: "a", is_current: true, is_locked: false },
      { id: "b", is_current: true, is_locked: true },
      { id: "c", is_current: false, is_locked: false },
    ];
    expect(listEvaluablePeriods(periods).map((p) => p.id)).toEqual(["a"]);
    expect(isEvaluablePeriod(periods[0])).toBe(true);
    expect(isEvaluablePeriod(periods[1])).toBe(false);
  });

  it("prefers token period over list ordering in demo mode", () => {
    const periods = [
      { id: "old", name: "Old", is_current: true, is_locked: false },
      { id: "token", name: "Token From List", is_current: true, is_locked: false, poster_date: "2026-04-01" },
    ];
    const selected = pickDemoPeriod(periods, {
      id: "token",
      name: "Token Base",
      is_current: true,
      is_locked: false,
    });

    expect(selected?.id).toBe("token");
    expect(selected?.name).toBe("Token From List");
    expect(selected?.poster_date).toBe("2026-04-01");
  });

  it("falls back to first evaluable period when token is absent", () => {
    const periods = [
      { id: "locked", is_current: true, is_locked: true },
      { id: "ok", is_current: true, is_locked: false },
      { id: "other", is_current: false, is_locked: false },
    ];
    expect(pickDemoPeriod(periods, null)?.id).toBe("ok");
  });
});
