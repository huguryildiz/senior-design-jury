// src/admin/hooks/useReviewsFilters.js
// ============================================================
// Extracts all filter/sort/pagination state for Reviews.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { readSection, writeSection } from "../utils/persist";
import { useResponsiveFilterPresentation } from "../components";
import {
  APP_DATE_MIN_DATETIME,
  APP_DATE_MAX_DATETIME,
  isValidDateParts,
} from "../../shared/dateBounds";

// Factory functions — produce columns / max map from any criteria array.
export function buildScoreCols(criteria = []) {
  const cols = [
    ...(criteria || []).map((c) => ({
      id: c.id,
      key: c.id,
      label: `${c.shortLabel || c.label} (${c.max})`,
      sortKey: c.id,
    })),
  ];
  const totalMax = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
  cols.push({ key: "total", id: "total", label: `Total / ${totalMax}`, sortKey: "total" });
  return cols;
}

export function buildScoreMaxByKey(criteria = []) {
  const total = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
  return {
    ...Object.fromEntries(criteria.map((c) => [c.id, Number(c.max) || 0])),
    total,
  };
}

// Static config-based defaults kept for backward compat.
export const SCORE_COLS = buildScoreCols();
export const SCORE_FILTER_MIN = 0;
export const SCORE_FILTER_MAX = 0;
export const SCORE_MAX_BY_KEY = buildScoreMaxByKey();
export const STATUS_OPTIONS = [
  { value: "scored",      label: "Scored"       },
  { value: "partial",     label: "Partial"      },
  { value: "empty",       label: "Empty"        },
];
export const JUROR_STATUS_OPTIONS = [
  { value: "completed",       label: "Completed"       },
  { value: "ready_to_submit", label: "Ready to Submit" },
  { value: "in_progress",     label: "In Progress"     },
  { value: "editing",         label: "Editing"         },
  { value: "not_started",     label: "Not Started"     },
];
export const SCORE_STATUS_LEGEND = [
  { status: "scored", description: "All criteria are scored." },
  { status: "partial", description: "At least one criterion is missing." },
  { status: "empty", description: "No score entered yet." },
];
export const JUROR_STATUS_LEGEND = [
  { status: "completed", description: "Final submission completed." },
  { status: "ready_to_submit", description: "All groups scored." },
  { status: "in_progress", description: "Scoring has started." },
  { status: "not_started", description: "No scoring activity yet." },
  { status: "editing", description: "Editing mode enabled." },
];

export const VALID_SORT_DIRS = ["asc", "desc"];
export const DEFAULT_SORT_KEY = "updatedMs";
export const DEFAULT_SORT_DIR = "desc";

export const DATE_MIN_DATETIME = APP_DATE_MIN_DATETIME;
export const DATE_MAX_DATETIME = APP_DATE_MAX_DATETIME;

export const SCORE_KEYS = SCORE_COLS.map(({ key }) => key);

function isValidTimeParts(hh, mi, ss) {
  if (hh < 0 || hh > 23) return false;
  if (mi < 0 || mi > 59) return false;
  if (ss < 0 || ss > 59) return false;
  return true;
}

export function parseDateString(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [datePart, timePart] = value.split("T");
    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    const [hh, mi, ss = "0"] = timePart.split(":").map(Number);
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    if (!isValidTimeParts(hh, mi, ss)) return null;
    return { ms: new Date(yyyy, mm - 1, dd, hh, mi, ss).getTime(), isDateOnly: false };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-").map(Number);
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    return { ms: new Date(yyyy, mm - 1, dd).getTime(), isDateOnly: true };
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("/").map(Number);
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    return { ms: new Date(yyyy, mm - 1, dd).getTime(), isDateOnly: true };
  }
  return null;
}

export function buildDateRange(parsedFrom, parsedTo) {
  const fromMs = parsedFrom?.ms ?? 0;
  const toMsBase = parsedTo?.ms ?? Infinity;
  const toMs = Number.isFinite(toMsBase)
    ? toMsBase + (parsedTo?.isDateOnly ? (24 * 60 * 60 * 1000 - 1) : 0)
    : toMsBase;
  return { fromMs, toMs };
}

export function normalizeScoreFilterValue(value, key = "total", maxByKey = SCORE_MAX_BY_KEY) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  const maxAllowed = Number.isFinite(maxByKey[key]) ? maxByKey[key] : SCORE_FILTER_MAX;
  return String(Math.min(maxAllowed, Math.max(SCORE_FILTER_MIN, n)));
}

export function buildEmptyScoreFilters(stored, keys = SCORE_KEYS, maxByKey = SCORE_MAX_BY_KEY) {
  const base = {};
  (keys || []).forEach((key) => {
    const entry = stored && typeof stored === "object" ? stored[key] : null;
    base[key] = {
      min: normalizeScoreFilterValue(entry?.min, key, maxByKey),
      max: normalizeScoreFilterValue(entry?.max, key, maxByKey),
    };
  });
  return base;
}

export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isInvalidNumberRange(minRaw, maxRaw) {
  const minNum = toFiniteNumber(minRaw);
  const maxNum = toFiniteNumber(maxRaw);
  if (minRaw && minNum === null) return true;
  if (maxRaw && maxNum === null) return true;
  return minNum !== null && maxNum !== null && minNum > maxNum;
}

export function hasActiveValidNumberRange(range) {
  const minRaw = range?.min ?? "";
  const maxRaw = range?.max ?? "";
  if (!minRaw && !maxRaw) return false;
  return !isInvalidNumberRange(minRaw, maxRaw);
}

export function clampScoreInput(raw, key = "total", maxByKey = SCORE_MAX_BY_KEY) {
  if (raw === "") return "";
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return raw;
  const maxAllowed = Number.isFinite(maxByKey[key]) ? maxByKey[key] : SCORE_FILTER_MAX;
  return String(Math.min(maxAllowed, Math.max(SCORE_FILTER_MIN, n)));
}

export function isMissing(val) {
  if (val === "" || val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (typeof val === "number") return !Number.isFinite(val);
  return false;
}

export const NUMERIC_SORT_KEYS = new Set(SCORE_COLS.map(({ key }) => key));

/**
 * useReviewsFilters
 *
 * Manages all filter/sort/pagination state for the ReviewsPage component.
 * Persists to localStorage under the "details" section key.
 *
 */
export function useReviewsFilters(currentCriteria = []) {
  const _sRef = useRef(null);
  if (_sRef.current === null) _sRef.current = readSection("details");
  const _s = _sRef.current;

  // Stabilize criteria reference: recompute only when IDs/maxes actually change,
  // not on every render when caller passes a new [] literal each time.
  const criteriaKey = (currentCriteria || []).map((c) => `${c.id}:${c.max}`).join(",");

  // Derive dynamic keys and max map from passed criteria
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scoreCols = useMemo(() => buildScoreCols(currentCriteria), [criteriaKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scoreKeys = useMemo(() => scoreCols.map((c) => c.key), [criteriaKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scoreMaxByKey = useMemo(() => buildScoreMaxByKey(currentCriteria), [criteriaKey]);

  const [filterGroupNo, setFilterGroupNo] = useState(() => {
    if (Array.isArray(_s.filterGroupNo)) return _s.filterGroupNo;
    if (typeof _s.filterGroupNo === "string" && _s.filterGroupNo) return [_s.filterGroupNo];
    return null;
  });
  const [filterJuror, setFilterJuror] = useState(() => {
    if (typeof _s.filterJuror === "string") return _s.filterJuror === "ALL" ? "" : _s.filterJuror;
    return "";
  });
  const [filterDept, setFilterDept] = useState(() => {
    if (typeof _s.filterDept === "string") return _s.filterDept === "ALL" ? "" : _s.filterDept;
    return "";
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    if (Array.isArray(_s.filterStatus)) {
      if (_s.filterStatus.length === 0) return null;
      return _s.filterStatus.map((v) => (v === "not_started" ? "empty" : v));
    }
    if (typeof _s.filterStatus === "string" && _s.filterStatus && _s.filterStatus !== "ALL") {
      return [_s.filterStatus === "not_started" ? "empty" : _s.filterStatus];
    }
    return null;
  });
  const [filterJurorStatus, setFilterJurorStatus] = useState(() => {
    if (Array.isArray(_s.filterJurorStatus)) {
      return _s.filterJurorStatus.length === 0 ? null : _s.filterJurorStatus;
    }
    if (typeof _s.filterJurorStatus === "string" && _s.filterJurorStatus && _s.filterJurorStatus !== "ALL") {
      return [_s.filterJurorStatus];
    }
    return null;
  });
  const [filterProjectTitle, setFilterProjectTitle] = useState(() => typeof _s.filterProjectTitle === "string" ? _s.filterProjectTitle : "");
  const [filterStudents, setFilterStudents] = useState(() => typeof _s.filterStudents === "string" ? _s.filterStudents : "");

  const legacyDateFrom = typeof _s.dateFrom === "string" ? _s.dateFrom : "";
  const legacyDateTo = typeof _s.dateTo === "string" ? _s.dateTo : "";
  const legacyDateCol = _s.dateFilterCol === "completed" ? "completed" : "updated";

  const [updatedFrom, setUpdatedFrom] = useState(() => {
    if (typeof _s.updatedFrom === "string") return _s.updatedFrom;
    return legacyDateCol === "updated" ? legacyDateFrom : "";
  });
  const [updatedTo, setUpdatedTo] = useState(() => {
    if (typeof _s.updatedTo === "string") return _s.updatedTo;
    return legacyDateCol === "updated" ? legacyDateTo : "";
  });
  const [completedFrom, setCompletedFrom] = useState(() => {
    if (typeof _s.completedFrom === "string") return _s.completedFrom;
    return legacyDateCol === "completed" ? legacyDateFrom : "";
  });
  const [completedTo, setCompletedTo] = useState(() => {
    if (typeof _s.completedTo === "string") return _s.completedTo;
    return legacyDateCol === "completed" ? legacyDateTo : "";
  });
  const [updatedDateError, setUpdatedDateError] = useState(null);
  const [completedDateError, setCompletedDateError] = useState(null);

  // Initialize score filters using dynamic keys
  const [scoreFilters, setScoreFilters] = useState(() => 
    buildEmptyScoreFilters(_s.scoreFilters, scoreKeys, scoreMaxByKey)
  );
  
  // Sync score filters if criteria set changes drastically
  useEffect(() => {
    setScoreFilters((prev) => buildEmptyScoreFilters(prev, scoreKeys, scoreMaxByKey));
  }, [scoreKeys, scoreMaxByKey]);

  const [filterComment, setFilterComment] = useState(() => typeof _s.filterComment === "string" ? _s.filterComment : "");
  const [sortKey, setSortKey] = useState(() => {
    if (_s.sortKey === null) return null;
    const rawKey = typeof _s.sortKey === "string" && _s.sortKey ? _s.sortKey : DEFAULT_SORT_KEY;
    const key = rawKey === "tsMs" ? "updatedMs" : rawKey;
    return key === "projectId" ? "title" : key;
  });
  const [sortDir, setSortDir] = useState(() => VALID_SORT_DIRS.includes(_s.sortDir) ? _s.sortDir : DEFAULT_SORT_DIR);
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [multiSearchQuery, setMultiSearchQuery] = useState("");
  const [showStatusLegend, setShowStatusLegend] = useState(true);

  const filterPresentation = useResponsiveFilterPresentation();

  // Persist filter state
  useEffect(() => {
    writeSection("details", {
      filterGroupNo, filterJuror, filterDept, filterProjectTitle, filterStudents,
      filterStatus, filterJurorStatus, updatedFrom, updatedTo, completedFrom, completedTo, filterComment,
      scoreFilters,
      sortKey, sortDir,
    });
  }, [filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle, filterStudents, updatedFrom, updatedTo, completedFrom, completedTo, filterComment, scoreFilters, sortKey, sortDir]);

  // Date validation effects
  const updatedParsedFrom = useMemo(() => (updatedFrom ? parseDateString(updatedFrom) : null), [updatedFrom]);
  const updatedParsedTo = useMemo(() => (updatedTo ? parseDateString(updatedTo) : null), [updatedTo]);
  const updatedParsedFromMs = updatedParsedFrom ? updatedParsedFrom.ms : null;
  const updatedParsedToMs = updatedParsedTo ? updatedParsedTo.ms : null;
  const isUpdatedInvalidRange = useMemo(() => {
    if (updatedParsedFromMs === null || updatedParsedToMs === null) return false;
    return updatedParsedFromMs > updatedParsedToMs;
  }, [updatedParsedFromMs, updatedParsedToMs]);

  useEffect(() => {
    if (updatedTo && !updatedFrom) {
      setUpdatedDateError("The 'From' date is required.");
    } else if ((updatedFrom && updatedParsedFromMs === null) || (updatedTo && updatedParsedToMs === null)) {
      setUpdatedDateError("Invalid date format.");
    } else if (isUpdatedInvalidRange) {
      setUpdatedDateError("The 'From' date cannot be later than the 'To' date.");
    } else {
      setUpdatedDateError(null);
    }
  }, [updatedFrom, updatedTo, updatedParsedFromMs, updatedParsedToMs, isUpdatedInvalidRange]);

  const completedParsedFrom = useMemo(() => (completedFrom ? parseDateString(completedFrom) : null), [completedFrom]);
  const completedParsedTo = useMemo(() => (completedTo ? parseDateString(completedTo) : null), [completedTo]);
  const completedParsedFromMs = completedParsedFrom ? completedParsedFrom.ms : null;
  const completedParsedToMs = completedParsedTo ? completedParsedTo.ms : null;
  const isCompletedInvalidRange = useMemo(() => {
    if (completedParsedFromMs === null || completedParsedToMs === null) return false;
    return completedParsedFromMs > completedParsedToMs;
  }, [completedParsedFromMs, completedParsedToMs]);

  useEffect(() => {
    if (completedTo && !completedFrom) {
      setCompletedDateError("The 'From' date is required.");
    } else if ((completedFrom && completedParsedFromMs === null) || (completedTo && completedParsedToMs === null)) {
      setCompletedDateError("Invalid date format.");
    } else if (isCompletedInvalidRange) {
      setCompletedDateError("The 'From' date cannot be later than the 'To' date.");
    } else {
      setCompletedDateError(null);
    }
  }, [completedFrom, completedTo, completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange]);

  const buildEmptyFilters = () => buildEmptyScoreFilters(null, scoreKeys, scoreMaxByKey);

  const updateScoreFilter = (key, field, raw) => {
    const clipped = clampScoreInput(raw, key, scoreMaxByKey);
    setScoreFilters((prev) => ({
      ...prev,
      [key]: {
        ...(prev?.[key] || { min: "", max: "" }),
        [field]: clipped,
      },
    }));
  };

  return {
    // Shared dynamic metadata
    scoreCols,
    scoreKeys,
    scoreMaxByKey,
    updateScoreFilter,
    buildEmptyFilters,

    // Filter state + setters
    filterGroupNo, setFilterGroupNo,
    filterJuror, setFilterJuror,
    filterDept, setFilterDept,
    filterStatus, setFilterStatus,
    filterJurorStatus, setFilterJurorStatus,
    filterProjectTitle, setFilterProjectTitle,
    filterStudents, setFilterStudents,
    filterComment, setFilterComment,
    scoreFilters, setScoreFilters,
    updatedFrom, setUpdatedFrom,
    updatedTo, setUpdatedTo,
    completedFrom, setCompletedFrom,
    completedTo, setCompletedTo,
    // Date error states
    updatedDateError, setUpdatedDateError,
    completedDateError, setCompletedDateError,
    // Parsed date memos (exposed so ReviewsPage can use them in row computation)
    updatedParsedFrom,
    updatedParsedTo,
    updatedParsedFromMs,
    updatedParsedToMs,
    isUpdatedInvalidRange,
    completedParsedFrom,
    completedParsedTo,
    completedParsedFromMs,
    completedParsedToMs,
    isCompletedInvalidRange,
    // Sort
    sortKey, setSortKey,
    sortDir, setSortDir,
    // Pagination
    pageSize, setPageSize,
    currentPage, setCurrentPage,
    // Popover
    activeFilterCol, setActiveFilterCol,
    anchorRect, setAnchorRect,
    anchorEl, setAnchorEl,
    multiSearchQuery, setMultiSearchQuery,
    // UI
    showStatusLegend, setShowStatusLegend,
    filterPresentation,
  };
}
