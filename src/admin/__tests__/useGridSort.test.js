import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, vi } from "vitest";
import { useGridSort } from "../useGridSort";
import { qaTest } from "../../test/qaTest.js";

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
    qaTest("grid.filter.01", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      expect(result.current.visibleJurors).toHaveLength(2);
    });

    qaTest("grid.filter.02", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setGroupScoreFilter("g1", 60, 100));
      // Alice=80 ✓, Bob=50 ✗
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    qaTest("grid.filter.03", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setGroupScoreFilter("g1", 60, 100)); // Alice=80✓ Bob=50✗
      act(() => result.current.setGroupScoreFilter("g2", 55, 100)); // Alice=60✓ Bob=70✓
      // AND: Alice passes both, Bob fails g1
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    qaTest("grid.filter.04", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setGroupScoreFilter("g1", 90, 10)); // invalid
      expect(result.current.visibleJurors).toHaveLength(2);
    });

    qaTest("grid.filter.05", () => {
      const lookup = {
        j1: { g1: scored(0),   g2: scored(0)   },
        j2: { g1: scored(100), g2: scored(100) },
      };
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, lookup));
      act(() => result.current.setGroupScoreFilter("g1", 0, 50));
      // Alice=0 ✓, Bob=100 ✗
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    qaTest("grid.filter.06", () => {
      const lookup = {
        j1: { g1: scored(100), g2: scored(100) },
        j2: { g1: scored(50),  g2: scored(50)  },
      };
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, lookup));
      act(() => result.current.setGroupScoreFilter("g1", 90, 100));
      // Alice=100 ✓, Bob=50 ✗
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    qaTest("grid.filter.07", () => {
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
    qaTest("grid.sort.01", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.sortMode).toBe("group");
      expect(result.current.sortGroupId).toBe("g1");
      expect(result.current.sortGroupDir).toBe("desc");
    });

    qaTest("grid.sort.02", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.sortGroupDir).toBe("asc");
      expect(result.current.sortMode).toBe("group");
    });

    qaTest("grid.sort.03", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.sortMode).toBe("none");
      expect(result.current.sortGroupId).toBeNull();
    });

    qaTest("grid.sort.04", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.toggleGroupSort("g1"));
      act(() => result.current.toggleGroupSort("g1")); // now asc on g1
      act(() => result.current.toggleGroupSort("g2")); // switch to g2
      expect(result.current.sortGroupId).toBe("g2");
      expect(result.current.sortGroupDir).toBe("desc");
    });

    qaTest("grid.sort.05", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      // g1: Alice=80, Bob=50 — desc → Alice first
      act(() => result.current.toggleGroupSort("g1"));
      expect(result.current.visibleJurors[0].key).toBe("j1");
      expect(result.current.visibleJurors[1].key).toBe("j2");
    });

    qaTest("grid.sort.06", () => {
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
    qaTest("grid.jurorfilter.01", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setJurorFilter("ALICE"));
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j1"]);
    });

    qaTest("grid.jurorfilter.02", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setJurorFilter("cs"));
      expect(result.current.visibleJurors.map((j) => j.key)).toEqual(["j2"]);
    });

    qaTest("grid.jurorfilter.03", () => {
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

    qaTest("grid.jurorfilter.04", () => {
      const { result } = renderHook(() => useGridSort(JURORS, GROUPS, LOOKUP));
      act(() => result.current.setJurorFilter("zzznomatch"));
      expect(result.current.visibleJurors).toHaveLength(0);
    });
  });
});
