import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGridSort } from "../useGridSort";

vi.mock("../persist", () => ({
  readSection: () => ({}),
  writeSection: () => {},
}));

// Minimal scored entry: total is a number → getCellState returns "scored"
const scored = (total) => ({ total, technical: null, design: null, delivery: null, teamwork: null });
const empty  = ()       => ({ total: null, technical: null, design: null, delivery: null, teamwork: null });

const JURORS = [
  { key: "j1", name: "Alice", dept: "EE" },
  { key: "j2", name: "Bob",   dept: "CS" },
];

const GROUPS = [{ id: "g1" }, { id: "g2" }];

const LOOKUP = {
  j1: { g1: scored(80), g2: scored(60) },
  j2: { g1: scored(50), g2: scored(70) },
};

describe("useGridSort", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Score range filter ────────────────────────────────────────

  describe("score range filter", () => {
    it("shows all jurors when no filters are active", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      expect(result.current.visibleJurors).toHaveLength(2);
    });

    it("keeps juror that passes a single group score filter", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setGroupScoreFilter("g1", 60, 100));
      // Alice=80 ✓, Bob=50 ✗
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    it("hides juror failing one of two active filters (AND logic)", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setGroupScoreFilter("g1", 60, 100)); // Alice=80✓ Bob=50✗
      act(() => result.current.setGroupScoreFilter("g2", 55, 100)); // Alice=60✓ Bob=70✓
      // AND: Alice passes both, Bob fails g1
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    it("does not apply a filter when min > max (invalid range)", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setGroupScoreFilter("g1", 90, 10)); // invalid
      expect(result.current.visibleJurors).toHaveLength(2);
    });

    it("includes score=0 entry (boundary min value)", () => {
      const lookup = {
        j1: { g1: scored(0),   g2: scored(0)   },
        j2: { g1: scored(100), g2: scored(100) },
      };
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, lookup));
      act(() => result.current.setGroupScoreFilter("g1", 0, 50));
      // Alice=0 ✓, Bob=100 ✗
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    it("includes score=TOTAL_MAX entry (boundary max value)", () => {
      const lookup = {
        j1: { g1: scored(100), g2: scored(100) },
        j2: { g1: scored(50),  g2: scored(50)  },
      };
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, lookup));
      act(() => result.current.setGroupScoreFilter("g1", 90, 100));
      // Alice=100 ✓, Bob=50 ✗
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    it("excludes juror whose target group entry is unscored (null total)", () => {
      const lookup = {
        j1: { g1: scored(80), g2: empty() }, // g2 is unscored
        j2: { g1: scored(80), g2: scored(70) },
      };
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, lookup));
      act(() => result.current.setGroupScoreFilter("g2", 0, 100)); // any scored entry passes
      // Alice: g2 is not scored → excluded; Bob: g2=70 → passes
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j2"]);
    });
  });

  // ── Sort toggle cycle ─────────────────────────────────────────

  describe("sort toggle cycle", () => {
    it("first click on a column → sortMode=group, dir=desc", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.sortMode).toBe("group");
      expect(result.current.sortGroupId).toBe("g1");
      expect(result.current.sortGroupDir).toBe("desc");
    });

    it("second click on the same column → dir flips to asc", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.sortGroupDir).toBe("asc");
      expect(result.current.sortMode).toBe("group");
    });

    it("third click on the same column → sort resets (sortMode=none)", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.sortMode).toBe("none");
      expect(result.current.sortGroupId).toBeNull();
    });

    it("clicking a different column resets cycle to desc on new column", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1")); // now asc on g1
      act(() => result.current.toggleGroupSort("g2")); // switch to g2
      expect(result.current.sortGroupId).toBe("g2");
      expect(result.current.sortGroupDir).toBe("desc");
    });

    it("desc sort orders higher scores first", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      // g1: Alice=80, Bob=50 — desc → Alice first
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.visibleJurors[0].key).toBe("j1");
      expect(result.current.visibleJurors[1].key).toBe("j2");
    });

    it("asc sort orders lower scores first", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      // g1: Alice=80, Bob=50 — asc → Bob first
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1")); // flip to asc
      expect(result.current.visibleJurors[0].key).toBe("j2");
      expect(result.current.visibleJurors[1].key).toBe("j1");
    });
  });

  // ── Juror text filter ─────────────────────────────────────────

  describe("juror text filter", () => {
    it("matches on juror name (case insensitive)", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setJurorFilter("ALICE"));
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    it("matches on juror dept", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setJurorFilter("cs"));
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j2"]);
    });

    it("OR logic — matches jurors whose name OR dept contains the query", () => {
      const jurors = [
        { key: "j1", name: "Alice", dept: "EE" },
        { key: "j2", name: "Bob",   dept: "EE" },
        { key: "j3", name: "Carol", dept: "CS" },
      ];
      const lookup = { j1: {}, j2: {}, j3: {} };
      const { result } = renderHook(() => useGridSort(jurors, GROUPS, lookup));
      act(() => result.current.setJurorFilter("ee"));
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1", "j2"]);
    });

    it("no match → empty visible list", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setJurorFilter("zzznomatch"));
      expect(result.current.visibleJurors).toHaveLength(0);
    });
  });
});
