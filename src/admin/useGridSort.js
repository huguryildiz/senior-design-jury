// src/admin/useGridSort.js
// ── Sort & filter state for ScoreGrid ────────────────────────
// Encapsulates: sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter,
//               groupScoreFilters
// Reads/writes from localStorage via persist.js
// Returns: computed visibleJurors + toggle/set actions

import { useEffect, useMemo, useReducer } from "react";
import { readSection, writeSection } from "./persist";
import { getCellState } from "./scoreHelpers";
import { cmp } from "./utils";

const SECTION = "grid";
const LEGACY  = "matrix"; // old key name, kept for backwards compat
const SCORE_FILTER_MIN = 0;
const SCORE_FILTER_MAX = 100;

function normalizeScoreFilterValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  return String(Math.min(SCORE_FILTER_MAX, Math.max(SCORE_FILTER_MIN, n)));
}

function normalizeGroupScoreFilters(filters) {
  if (!filters || typeof filters !== "object") return {};
  return Object.fromEntries(
    Object.entries(filters).map(([groupId, range]) => [
      groupId,
      {
        min: normalizeScoreFilterValue(range?.min),
        max: normalizeScoreFilterValue(range?.max),
      },
    ])
  );
}

function readGridState() {
  const cur = readSection(SECTION);
  return Object.keys(cur).length ? cur : readSection(LEGACY);
}

function initState() {
  const s = readGridState();
  const sortMode =
    s.sortMode === "group" || s.sortMode === "juror" || s.sortMode === "none"
      ? s.sortMode
      : "none";
  return {
    sortGroupId:       (s.sortGroupId === null || typeof s.sortGroupId === "number") ? (s.sortGroupId ?? null) : null,
    sortGroupDir:      s.sortGroupDir === "asc" || s.sortGroupDir === "desc" ? s.sortGroupDir : "desc",
    sortJurorDir:      s.sortJurorDir === "asc" || s.sortJurorDir === "desc" ? s.sortJurorDir : "asc",
    sortMode,
    jurorFilter:       typeof s.jurorFilter === "string" ? s.jurorFilter : "",
    groupScoreFilters: normalizeGroupScoreFilters(s.groupScoreFilters),
  };
}

// Click cycle: new column → desc; same column desc → asc; same column asc → reset (null)
function reducer(state, action) {
  switch (action.type) {
    case "TOGGLE_GROUP_SORT": {
      const { id } = action;
      if (state.sortGroupId !== id)      return { ...state, sortGroupId: id, sortGroupDir: "desc", sortMode: "group" };
      if (state.sortGroupDir === "desc") return { ...state, sortGroupDir: "asc", sortMode: "group" };
      return                                    { ...state, sortGroupId: null,  sortGroupDir: "desc", sortMode: "none", sortJurorDir: "asc" };
    }
    case "TOGGLE_JUROR_SORT":
      if (state.sortMode !== "juror") return { ...state, sortMode: "juror", sortGroupId: null };
      return { ...state, sortJurorDir: state.sortJurorDir === "asc" ? "desc" : "asc" };
    case "SET_JUROR_FILTER":
      return { ...state, jurorFilter: action.value };
    case "SET_GROUP_SCORE_FILTER": {
      const { groupId, min, max } = action;
      return {
        ...state,
        groupScoreFilters: {
          ...state.groupScoreFilters,
          [groupId]: {
            min: normalizeScoreFilterValue(min),
            max: normalizeScoreFilterValue(max),
          },
        },
      };
    }
    case "CLEAR_GROUP_SCORE_FILTER": {
      const next = { ...state.groupScoreFilters };
      delete next[action.groupId];
      return { ...state, groupScoreFilters: next };
    }
    case "CLEAR_SORT":
      return { ...state, sortMode: "none", sortGroupId: null, sortGroupDir: "desc", sortJurorDir: "asc" };
    default:
      return state;
  }
}

export function useGridSort(jurors, groups, lookup) {
  const [state, dispatch] = useReducer(reducer, null, initState);
  const { sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter, groupScoreFilters } = state;
  const validGroupIds = useMemo(() => new Set((groups || []).map((g) => String(g.id))), [groups]);

  // Persist on every state change (single write, covers all fields)
  useEffect(() => {
    writeSection(SECTION, state);
  }, [state]);

  const visibleJurors = useMemo(() => {
    let list = jurors.slice();

    // 1. Juror name/dept text filter
    if (jurorFilter) {
      const q = jurorFilter.toLowerCase().trim();
      list = list.filter((j) => {
        const name = String(j.name || "").toLowerCase();
        const dept = String(j.dept || "").toLowerCase();
        return name.includes(q) || dept.includes(q);
      });
    }

    // 2. Group score range filters (AND logic — all active filters must match)
    const activeGroupFilters = Object.entries(groupScoreFilters).filter(
      ([groupId, { min, max }]) =>
        validGroupIds.has(String(groupId)) && (min !== "" || max !== "")
    );
    if (activeGroupFilters.length > 0) {
      list = list.filter((j) =>
        activeGroupFilters.every(([groupId, { min, max }]) => {
          const entry = lookup[j.key]?.[groupId];
          if (getCellState(entry) !== "scored") return false;
          const score = Number(entry.total);
          if (min !== "" && score < Number(min)) return false;
          if (max !== "" && score > Number(max)) return false;
          return true;
        })
      );
    }

    // 3. Sort
    if (sortMode === "group" && sortGroupId !== null) {
      // Sort by active group column; partial/empty cells always sink to bottom
      list.sort((a, b) => {
        const ea = lookup[a.key]?.[sortGroupId];
        const eb = lookup[b.key]?.[sortGroupId];
        const va = getCellState(ea) === "scored" ? Number(ea.total) : null;
        const vb = getCellState(eb) === "scored" ? Number(eb.total) : null;

        if (va === null && vb === null) return cmp(a.name, b.name);
        if (va === null) return 1;
        if (vb === null) return -1;

        const diff = sortGroupDir === "desc" ? vb - va : va - vb;
        return diff !== 0 ? diff : cmp(a.name, b.name); // stable tie-breaker
      });
    } else {
      // Juror name sort (or no sort → default alphabetical)
      const dir = sortMode === "juror" && sortJurorDir === "desc" ? -1 : 1;
      list.sort((a, b) => dir * cmp(a.name, b.name));
    }

    return list;
  }, [jurors, jurorFilter, groupScoreFilters, sortGroupId, sortGroupDir, sortMode, sortJurorDir, lookup, validGroupIds]);

  const toggleGroupSort      = (id)              => dispatch({ type: "TOGGLE_GROUP_SORT", id });
  const toggleJurorSort      = ()                => dispatch({ type: "TOGGLE_JUROR_SORT" });
  const setJurorFilter       = (v)               => dispatch({ type: "SET_JUROR_FILTER", value: v });
  const setGroupScoreFilter  = (groupId, min, max) => dispatch({ type: "SET_GROUP_SCORE_FILTER", groupId, min, max });
  const clearGroupScoreFilter = (groupId)        => dispatch({ type: "CLEAR_GROUP_SCORE_FILTER", groupId });
  const clearSort            = ()                => dispatch({ type: "CLEAR_SORT" });

  return {
    sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter, groupScoreFilters,
    visibleJurors, toggleGroupSort, toggleJurorSort, setJurorFilter, clearSort,
    setGroupScoreFilter, clearGroupScoreFilter,
  };
}
