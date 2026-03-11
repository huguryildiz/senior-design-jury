// src/admin/ScoreDetails.jsx
// ============================================================
// Sortable details table with Excel-style column header filters.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { cmp, exportXLSX, formatTs, tsToMillis, rowKey } from "./utils";
import { readSection, writeSection } from "./persist";
import { FilterPopoverPortal, StatusBadge } from "./components";
import { getCellState } from "./scoreHelpers";
import { FilterIcon, DownloadIcon, InfoIcon, XIcon } from "../shared/Icons";
import {
  APP_DATE_MIN_DATETIME,
  APP_DATE_MAX_DATETIME,
  isValidDateParts,
} from "../shared/dateBounds";

// Show "" for null/undefined/empty/NaN.  0 is a valid score.
function displayScore(val) {
  if (val === "" || val === null || val === undefined) return "";
  if (typeof val === "string" && val.trim() === "") return "";
  const n = Number(val);
  if (!Number.isFinite(n)) return "";
  return n;
}

const SCORE_COLS = [
  { key: "technical", label: "Technical /30" },
  { key: "design",    label: "Written /30"   },
  { key: "delivery",  label: "Oral /30"      },
  { key: "teamwork",  label: "Teamwork /10"  },
  { key: "total",     label: "Total"         },
];
const SCORE_FILTER_MIN = 0;
const SCORE_FILTER_MAX = 100;
const SCORE_MAX_BY_KEY = {
  technical: 30,
  design: 30,
  delivery: 30,
  teamwork: 10,
  total: 100,
};
const STATUS_OPTIONS = [
  { value: "scored",      label: "Scored"       },
  { value: "partial",     label: "Partial"      },
  { value: "empty",       label: "Empty"        },
];
const JUROR_STATUS_OPTIONS = [
  { value: "completed",       label: "Completed"       },
  { value: "ready_to_submit", label: "Ready to Submit" },
  { value: "in_progress",     label: "In Progress"     },
  { value: "editing",         label: "Editing"         },
  { value: "not_started",     label: "Not Started"     },
];

const VALID_SORT_DIRS = ["asc", "desc"];
const DEFAULT_SORT_KEY = "updatedMs";
const DEFAULT_SORT_DIR = "desc";

const DATE_MIN_DATETIME = APP_DATE_MIN_DATETIME;
const DATE_MAX_DATETIME = APP_DATE_MAX_DATETIME;

function isValidTimeParts(hh, mi, ss) {
  if (hh < 0 || hh > 23) return false;
  if (mi < 0 || mi > 59) return false;
  if (ss < 0 || ss > 59) return false;
  return true;
}

function parseDateString(value) {
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

function formatDateOnlyFromMs(ms) {
  if (!Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function buildDateRange(parsedFrom, parsedTo) {
  const fromMs = parsedFrom?.ms ?? 0;
  const toMsBase = parsedTo?.ms ?? Infinity;
  const toMs = Number.isFinite(toMsBase)
    ? toMsBase + (parsedTo?.isDateOnly ? (24 * 60 * 60 * 1000 - 1) : 0)
    : toMsBase;
  return { fromMs, toMs };
}

const SCORE_KEYS = SCORE_COLS.map(({ key }) => key);

function normalizeScoreFilterValue(value, key = "total") {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  const maxAllowed = Number.isFinite(SCORE_MAX_BY_KEY[key]) ? SCORE_MAX_BY_KEY[key] : SCORE_FILTER_MAX;
  return String(Math.min(maxAllowed, Math.max(SCORE_FILTER_MIN, n)));
}

function buildEmptyScoreFilters(stored) {
  const base = {};
  SCORE_KEYS.forEach((key) => {
    const entry = stored && typeof stored === "object" ? stored[key] : null;
    base[key] = {
      min: normalizeScoreFilterValue(entry?.min, key),
      max: normalizeScoreFilterValue(entry?.max, key),
    };
  });
  return base;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampScoreInput(raw, key = "total") {
  if (raw === "") return "";
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return raw;
  const maxAllowed = Number.isFinite(SCORE_MAX_BY_KEY[key]) ? SCORE_MAX_BY_KEY[key] : SCORE_FILTER_MAX;
  return String(Math.min(maxAllowed, Math.max(SCORE_FILTER_MIN, n)));
}

function isMissing(val) {
  if (val === "" || val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (typeof val === "number") return !Number.isFinite(val);
  return false;
}

const NUMERIC_SORT_KEYS = new Set(SCORE_COLS.map(({ key }) => key));
const joinClass = (...parts) => parts.filter(Boolean).join(" ");

const SWIPE_ACTIVATION_PX = 6;

function enableCellScroll(evt) {
  const el = evt.currentTarget;
  if (!el || !el.classList) return;
  if (typeof el.matches === "function" && !el.matches(":focus-visible")) return;
  el.classList.add("is-scrollable");
}
function disableCellScroll(evt) {
  const el = evt.currentTarget;
  if (!el || !el.classList) return;
  el.classList.remove("is-scrollable");
  const inner = el.firstElementChild;
  if (inner) { inner.style.transition = ""; inner.style.transform = ""; }
  delete el.dataset.currentTranslate;
}
function handleCellTouchStart(evt) {
  const el = evt.currentTarget;
  const t = evt.touches?.[0];
  if (!el || !el.classList || !t) return;
  const inner = el.firstElementChild;
  if (inner) inner.style.transition = "";
  el.dataset.touchStartX   = String(t.clientX);
  el.dataset.touchStartY   = String(t.clientY);
  el.dataset.baseTranslate = el.dataset.currentTranslate ?? "0";
  delete el.dataset.maxScroll;
  delete el.dataset.lastMoveX;
  delete el.dataset.lastMoveTime;
  delete el.dataset.pastMoveX;
  delete el.dataset.pastMoveTime;
}
function handleCellTouchMove(evt) {
  const el = evt.currentTarget;
  const t = evt.touches?.[0];
  if (!el || !el.classList || !t) return;
  const startX = Number(el.dataset.touchStartX);
  const startY = Number(el.dataset.touchStartY);
  if (!Number.isFinite(startX) || !Number.isFinite(startY)) return;
  const rawDx = t.clientX - startX;
  const dy    = Math.abs(t.clientY - startY);
  if (Math.abs(rawDx) < SWIPE_ACTIVATION_PX || Math.abs(rawDx) <= dy) return;

  const inner = el.firstElementChild;
  if (!inner) return;

  if (!el.classList.contains("is-scrollable")) {
    el.classList.add("is-scrollable");
    void el.offsetWidth;
  }
  if (!el.dataset.maxScroll) {
    const overflow = inner.scrollWidth - el.clientWidth;
    el.dataset.maxScroll = String(overflow > 0 ? overflow : 0);
  }

  const now = Date.now();
  if (now - Number(el.dataset.pastMoveTime ?? 0) > 80) {
    el.dataset.pastMoveX    = el.dataset.lastMoveX    ?? String(t.clientX);
    el.dataset.pastMoveTime = el.dataset.lastMoveTime ?? String(now);
  }
  el.dataset.lastMoveX    = String(t.clientX);
  el.dataset.lastMoveTime = String(now);

  const maxScroll    = Number(el.dataset.maxScroll ?? "0");
  const baseTranslate = Number(el.dataset.baseTranslate ?? "0");
  const newTranslate  = Math.min(0, Math.max(-maxScroll, baseTranslate + rawDx));
  inner.style.transform = `translateX(${newTranslate}px)`;
  el.dataset.currentTranslate = String(newTranslate);
}
function handleCellTouchEnd(evt) {
  const el = evt.currentTarget;
  if (!el || !el.classList) return;
  const pos       = Number(el.dataset.currentTranslate ?? "0");
  const maxScroll = Number(el.dataset.maxScroll ?? "0");
  const inner     = el.firstElementChild;

  const lastX    = Number(el.dataset.lastMoveX    ?? "0");
  const lastTime = Number(el.dataset.lastMoveTime ?? "0");
  const pastX    = Number(el.dataset.pastMoveX    ?? lastX);
  const pastTime = Number(el.dataset.pastMoveTime ?? lastTime);
  const dt       = lastTime - pastTime;
  const velocity = dt > 10 ? (lastX - pastX) / dt : 0;

  delete el.dataset.touchStartX;
  delete el.dataset.touchStartY;
  delete el.dataset.baseTranslate;
  delete el.dataset.maxScroll;
  delete el.dataset.lastMoveX;
  delete el.dataset.lastMoveTime;
  delete el.dataset.pastMoveX;
  delete el.dataset.pastMoveTime;

  if (inner && maxScroll > 0 && Math.abs(velocity) > 0.15) {
    const target = Math.min(0, Math.max(-maxScroll, pos + velocity * 280));
    if (Math.abs(target - pos) > 3) {
      inner.style.transition = "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)";
      inner.style.transform  = `translateX(${target}px)`;
      el.dataset.currentTranslate = String(target);
      inner.addEventListener("transitionend", function onEnd() {
        inner.style.transition = "";
        inner.removeEventListener("transitionend", onEnd);
        if (Number(el.dataset.currentTranslate ?? "0") >= 0) {
          el.classList.remove("is-scrollable");
          inner.style.transform = "";
          delete el.dataset.currentTranslate;
        }
      });
      return;
    }
  }

  if (pos >= 0) {
    el.classList.remove("is-scrollable");
    if (inner) inner.style.transform = "";
    delete el.dataset.currentTranslate;
  }
}
const CELL_SCROLL_PROPS = {
  className: "detail-cell-scroll",
  tabIndex: 0,
  onFocus: enableCellScroll,
  onBlur: disableCellScroll,
  onTouchStart: handleCellTouchStart,
  onTouchMove: handleCellTouchMove,
  onTouchEnd: handleCellTouchEnd,
  onTouchCancel: handleCellTouchEnd,
};
function updateNativeCellScrollState(el) {
  if (!el || !el.classList) return;
  const isOverflowing = el.scrollWidth > el.clientWidth + 1;
  el.classList.toggle("is-overflowing", isOverflowing);
  el.classList.toggle("is-scrolled", el.scrollLeft > 0);
}
function handleNativeCellScroll(evt) {
  updateNativeCellScrollState(evt.currentTarget);
}
function setNativeCellScrollRef(el) {
  updateNativeCellScrollState(el);
}
const CELL_SCROLL_NATIVE_PROPS = {
  className: "detail-cell-scroll is-native-scroll",
  onScroll: handleNativeCellScroll,
  ref: setNativeCellScrollRef,
};

// ── Pagination helpers ─────────────────────────────────────────
function buildPageTokens(current, total) {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const always = new Set([1, total, current, current - 1, current + 1]);
  const pages  = Array.from(always).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const tokens = [];
  for (let idx = 0; idx < pages.length; idx++) {
    if (idx > 0 && pages[idx] - pages[idx - 1] > 1) tokens.push("...");
    tokens.push(pages[idx]);
  }
  return tokens;
}

function TablePagination({ currentPage, totalPages, pageSize, totalRows, onPageChange, onPageSizeChange }) {
  const PAGE_SIZES = [10, 15, 25, 50];
  const rangeStart = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd   = Math.min(currentPage * pageSize, totalRows);
  const tokens     = buildPageTokens(currentPage, totalPages);

  return (
    <div className="details-pagination">
      <div className="details-pagination__left">
        <label className="details-pagination__size-label" htmlFor="details-page-size">
          Rows per page
        </label>
        <select
          id="details-page-size"
          className="details-pagination__size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <span className="details-pagination__range">
        {totalRows === 0 ? "0 rows" : `${rangeStart}–${rangeEnd} of ${totalRows} rows`}
      </span>
      <div className="details-pagination__controls">
        <button type="button" className="details-pagination__btn" onClick={() => onPageChange(1)} disabled={currentPage === 1} aria-label="First page">{"<<"}</button>
        <button type="button" className="details-pagination__btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">{"<"}</button>
        {tokens.map((token, idx) =>
          token === "..." ? (
            <span key={`el-${idx}`} className="details-pagination__ellipsis">…</span>
          ) : (
            <button
              key={token}
              type="button"
              className={`details-pagination__btn details-pagination__page-btn${token === currentPage ? " details-pagination__page-btn--active" : ""}`}
              onClick={() => onPageChange(token)}
              aria-label={`Page ${token}`}
              aria-current={token === currentPage ? "page" : undefined}
            >
              {token}
            </button>
          )
        )}
        <button type="button" className="details-pagination__btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">{">"}</button>
        <button type="button" className="details-pagination__btn" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} aria-label="Last page">{">>"}</button>
      </div>
    </div>
  );
}

// ── ColHeader ─────────────────────────────────────────────────
// Reusable <th> with optional sort button + optional filter icon.
// sk         — sort key (falsy → no sort)
// filterCol  — filter column id (falsy or noFilter → no filter)
// isActive   — drives "filtered" CSS class + filter-icon-active
// onFilterClick — custom filter button click (overrides default)
// sortIconNode  — extra node rendered inside the sort button (for score cols)
function ColHeader({ label, sk, filterCol, isActive, noFilter = false, noSort = false,
                     sortKey, sortDir, onSort, onFilter, onFilterClick, sortIconNode,
                     thClassName, filterId, isOpen }) {
  const ariaSortVal = sk && sortKey === sk
    ? (sortDir === "asc" ? "ascending" : "descending")
    : undefined;
  const defaultFilterClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFilter(filterCol, e);
  };
  return (
    <th style={{ position: "relative", whiteSpace: "nowrap" }} className={thClassName}
      {...(ariaSortVal ? { "aria-sort": ariaSortVal } : {})}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {noSort ? (
          <span className={`details-col-label${isActive ? " filtered" : ""}`}>{label}</span>
        ) : (
          <button
            type="button"
            className={`col-sort-label details-col-label${isActive ? " filtered" : ""}`}
            onClick={() => onSort(sk)}
          >
            {label}{sortIconNode && <> {sortIconNode}</>}
          </button>
        )}
        {!noFilter && (
          <button
            type="button"
            className={`col-filter-hotspot${isActive ? " active filter-icon-active" : ""}`}
            onClick={onFilterClick ?? defaultFilterClick}
            title={`Filter by ${label.toLowerCase()}`}
            aria-label={`Filter by ${label}`}
            aria-expanded={!!isOpen}
            aria-controls={filterId}
          >
            <FilterIcon />
          </button>
        )}
      </div>
    </th>
  );
}

// jurors prop: { key, name, dept }[]
export default function ScoreDetails({
  data,
  jurors,
  assignedJurors = null,
  groups = [],
  semesterName = "",
  summaryData = [],
  loading = false,
}) {
  // Read persisted state exactly once (mount only) — useRef prevents re-reads on every render.
  const _sRef = useRef(null);
  if (_sRef.current === null) _sRef.current = readSection("details");
  const _s = _sRef.current;

  const [filterSemester, setFilterSemester] = useState(() => {
    if (Array.isArray(_s.filterSemester)) return _s.filterSemester;
    if (typeof _s.filterSemester === "string" && _s.filterSemester) return [_s.filterSemester];
    return null; // null = all semesters
  });
  const [filterGroupNo,  setFilterGroupNo]  = useState(() => {
    if (Array.isArray(_s.filterGroupNo)) return _s.filterGroupNo;
    if (typeof _s.filterGroupNo === "string" && _s.filterGroupNo) return [_s.filterGroupNo];
    return null; // null = all groups
  });
  const [filterJuror,    setFilterJuror]    = useState(() => {
    if (typeof _s.filterJuror === "string") return _s.filterJuror === "ALL" ? "" : _s.filterJuror;
    return "";
  });
  const [filterDept,     setFilterDept]     = useState(() => {
    if (typeof _s.filterDept === "string") return _s.filterDept === "ALL" ? "" : _s.filterDept;
    return "";
  });
  const [filterStatus,   setFilterStatus]   = useState(() => {
    if (Array.isArray(_s.filterStatus)) {
      if (_s.filterStatus.length === 0) return null;
      return _s.filterStatus.map((v) => (v === "not_started" ? "empty" : v));
    }
    if (typeof _s.filterStatus === "string" && _s.filterStatus && _s.filterStatus !== "ALL") {
      return [_s.filterStatus === "not_started" ? "empty" : _s.filterStatus];
    }
    return null; // null = all statuses
  });
  const [filterJurorStatus, setFilterJurorStatus] = useState(() => {
    if (Array.isArray(_s.filterJurorStatus)) {
      return _s.filterJurorStatus.length === 0 ? null : _s.filterJurorStatus;
    }
    if (typeof _s.filterJurorStatus === "string" && _s.filterJurorStatus && _s.filterJurorStatus !== "ALL") {
      return [_s.filterJurorStatus];
    }
    return null; // null = all juror statuses
  });
  const [filterProjectTitle, setFilterProjectTitle] = useState(() => typeof _s.filterProjectTitle === "string" ? _s.filterProjectTitle : "");
  const [filterStudents,     setFilterStudents]     = useState(() => typeof _s.filterStudents     === "string" ? _s.filterStudents     : "");
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
  const [scoreFilters, setScoreFilters] = useState(() => buildEmptyScoreFilters(_s.scoreFilters));
  const jurorEditMap = useMemo(() => {
    const map = new Map();
    (jurors || []).forEach((j) => {
      const editEnabled = !!(j.editEnabled ?? j.edit_enabled);
      if (j.jurorId) map.set(j.jurorId, editEnabled);
      if (j.key) map.set(j.key, editEnabled);
      const name = String(j.name ?? j.juryName ?? "").trim().toLowerCase();
      const dept = String(j.dept ?? j.juryDept ?? "").trim().toLowerCase();
      if (name || dept) map.set(`${name}__${dept}`, editEnabled);
    });
    return map;
  }, [jurors]);
  const [filterComment,  setFilterComment]  = useState(() => typeof _s.filterComment === "string" ? _s.filterComment : "");
  const [sortKey,        setSortKey]        = useState(() => {
    if (_s.sortKey === null) return null;
    const rawKey = typeof _s.sortKey === "string" && _s.sortKey ? _s.sortKey : DEFAULT_SORT_KEY;
    const key = rawKey === "tsMs" ? "updatedMs" : rawKey;
    return key === "projectId" ? "projectTitle" : key;
  });
  const [sortDir,        setSortDir]        = useState(() => VALID_SORT_DIRS.includes(_s.sortDir) ? _s.sortDir : DEFAULT_SORT_DIR);
  const [pageSize,       setPageSize]       = useState(15);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [multiSearchQuery, setMultiSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 480px)").matches
  ));
  const [isTouchInput, setIsTouchInput] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches
  ));
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const cellScrollProps = isTouchInput ? CELL_SCROLL_NATIVE_PROPS : CELL_SCROLL_PROPS;

  const projectMetaById = useMemo(
    () => new Map((summaryData || []).map((p) => [p.id, { title: p?.name ?? "", students: p?.students ?? "" }])),
    [summaryData]
  );
  const semesterOptions = useMemo(() => {
    const map = new Map();
    const add = (val) => {
      const label = String(val ?? "").trim();
      if (!label) return;
      map.set(label.toLowerCase(), label);
    };
    data.forEach((row) => add(row?.semester));
    add(semesterName);
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "tr"))
      .map(([, label]) => label);
  }, [data, semesterName]);
  const groupNoOptions = useMemo(() => {
    const map = new Map();
    data.forEach((row) => {
      const label = String(row?.groupNo ?? "").trim();
      if (!label) return;
      map.set(label.toLowerCase(), label);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "tr", { numeric: true }))
      .map(([, label]) => label);
  }, [data]);
  useEffect(() => {
    if (!isMobile) return;
    if (activeFilterCol !== "updatedAt" && activeFilterCol !== "completedAt") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [activeFilterCol, isMobile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 480px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.addEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setIsTouchInput(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.addEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);


  useEffect(() => {
    const top = topScrollRef.current;
    const wrap = tableScrollRef.current;
    if (!top || !wrap) return;

    const inner = top.firstElementChild;
    if (!inner) return;

    let syncing = false;
    const syncFromWrap = () => {
      if (syncing) return;
      syncing = true;
      top.scrollLeft = wrap.scrollLeft;
      syncing = false;
    };
    const syncFromTop = () => {
      if (syncing) return;
      syncing = true;
      wrap.scrollLeft = top.scrollLeft;
      syncing = false;
    };
    const updateWidth = () => {
      inner.style.width = `${wrap.scrollWidth}px`;
      syncFromWrap();
    };

    updateWidth();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateWidth) : null;
    ro?.observe(wrap);
    window.addEventListener("resize", updateWidth);
    wrap.addEventListener("scroll", syncFromWrap, { passive: true });
    top.addEventListener("scroll", syncFromTop, { passive: true });

    return () => {
      wrap.removeEventListener("scroll", syncFromWrap);
      top.removeEventListener("scroll", syncFromTop);
      window.removeEventListener("resize", updateWidth);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    writeSection("details", {
      filterSemester, filterGroupNo, filterJuror, filterDept, filterProjectTitle, filterStudents,
      filterStatus, filterJurorStatus, updatedFrom, updatedTo, completedFrom, completedTo, filterComment,
      scoreFilters,
      sortKey, sortDir,
    });
  }, [filterSemester, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle, filterStudents, updatedFrom, updatedTo, completedFrom, completedTo, filterComment, scoreFilters, sortKey, sortDir]);

  const updatedParsedFrom = useMemo(() => (updatedFrom ? parseDateString(updatedFrom) : null), [updatedFrom]);
  const updatedParsedTo = useMemo(() => (updatedTo ? parseDateString(updatedTo) : null), [updatedTo]);
  const updatedParsedFromMs = updatedParsedFrom ? updatedParsedFrom.ms : null;
  const updatedParsedToMs = updatedParsedTo ? updatedParsedTo.ms : null;
  const isUpdatedInvalidRange = useMemo(() => {
    if (updatedParsedFromMs === null || updatedParsedToMs === null) return false;
    return updatedParsedFromMs > updatedParsedToMs;
  }, [updatedParsedFromMs, updatedParsedToMs]);

  useEffect(() => {
    if ((updatedFrom && updatedParsedFromMs === null) || (updatedTo && updatedParsedToMs === null)) {
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
    if ((completedFrom && completedParsedFromMs === null) || (completedTo && completedParsedToMs === null)) {
      setCompletedDateError("Invalid date format.");
    } else if (isCompletedInvalidRange) {
      setCompletedDateError("The 'From' date cannot be later than the 'To' date.");
    } else {
      setCompletedDateError(null);
    }
  }, [completedFrom, completedTo, completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (Array.isArray(filterSemester)) count += 1;
    if (Array.isArray(filterGroupNo)) count += 1;
    if (filterJuror) count += 1;
    if (filterDept) count += 1;
    if (Array.isArray(filterStatus)) count += 1;
    if (Array.isArray(filterJurorStatus)) count += 1;
    if (filterProjectTitle) count += 1;
    if (filterStudents) count += 1;
    if (updatedFrom || updatedTo) count += 1;
    if (completedFrom || completedTo) count += 1;
    SCORE_KEYS.forEach((key) => {
      const f = scoreFilters[key];
      if (f?.min || f?.max) count += 1;
    });
    if (filterComment) count += 1;
    return count;
  }, [filterSemester, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle, filterStudents, updatedFrom, updatedTo, completedFrom, completedTo, scoreFilters, filterComment]);
  const hasAnyFilter = activeFilterCount > 0;
  const isSemesterFilterActive = Array.isArray(filterSemester) || activeFilterCol === "semester";
  const isGroupNoFilterActive = Array.isArray(filterGroupNo) || activeFilterCol === "groupNo";
  const isJurorFilterActive = !!filterJuror || activeFilterCol === "juror";
  const isDeptFilterActive = !!filterDept || activeFilterCol === "dept";
  const isStatusFilterActive = Array.isArray(filterStatus) || activeFilterCol === "status";
  const isJurorStatusFilterActive = Array.isArray(filterJurorStatus) || activeFilterCol === "jurorStatus";
  const isProjectTitleFilterActive = !!filterProjectTitle || activeFilterCol === "projectTitle";
  const isStudentsFilterActive = !!filterStudents || activeFilterCol === "students";
  const isUpdatedDateFilterActive = (updatedFrom || updatedTo) || activeFilterCol === "updatedAt";
  const isCompletedDateFilterActive = (completedFrom || completedTo) || activeFilterCol === "completedAt";
  const isCommentFilterActive = !!filterComment || activeFilterCol === "comment";

  function resetFilters() {
    setFilterSemester(null);
    setFilterGroupNo(null);
    setFilterJuror("");
    setFilterDept("");
    setFilterStatus(null);
    setFilterJurorStatus(null);
    setFilterProjectTitle("");
    setFilterStudents("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setUpdatedDateError(null);
    setCompletedFrom("");
    setCompletedTo("");
    setCompletedDateError(null);
    setScoreFilters(buildEmptyScoreFilters());
    setFilterComment("");
    setActiveFilterCol(null);
    setAnchorRect(null);
  }

  function closePopover() {
    setActiveFilterCol(null);
    setAnchorRect(null);
    setAnchorEl(null);
    setMultiSearchQuery("");
  }

  const updateScoreFilter = (key, field, raw) => {
    const clipped = clampScoreInput(raw, key);
    setScoreFilters((prev) => ({
      ...prev,
      [key]: {
        ...(prev?.[key] || { min: "", max: "" }),
        [field]: clipped,
      },
    }));
  };

  const toggleMulti = (value, selected, setter, order = []) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    let list = Array.from(next);
    if (order.length > 0) {
      const orderMap = new Map(order.map((v, i) => [v, i]));
      list.sort((a, b) => (orderMap.get(a) ?? 9999) - (orderMap.get(b) ?? 9999));
    }
    setter(list);
  };

  function toggleFilterCol(colId, evt) {
    const rect = evt?.currentTarget?.getBoundingClientRect?.();
    const el = evt?.currentTarget ?? null;
    setActiveFilterCol((prev) => {
      const next = prev === colId ? null : colId;
      if (next && rect) {
        setAnchorRect(rect);
        setAnchorEl(el);
      }
      if (!next) {
        setAnchorRect(null);
        setAnchorEl(null);
      }
      return next;
    });
  }

  const rows = useMemo(() => {
    const { fromMs: updatedFromMs, toMs: updatedToMs } = buildDateRange(updatedParsedFrom, updatedParsedTo);
    const { fromMs: completedFromMs, toMs: completedToMs } = buildDateRange(completedParsedFrom, completedParsedTo);

    const assignedList = Array.isArray(assignedJurors) && assignedJurors.length
      ? assignedJurors
      : (Array.isArray(jurors) ? jurors : []);
    const groupList = Array.isArray(groups) ? groups : [];
    const existingKeys = new Set();
    data.forEach((row) => {
      if (!row?.projectId) return;
      const key = rowKey(row);
      if (!key) return;
      existingKeys.add(`${key}__${row.projectId}`);
    });

    const generated = [];
    if (assignedList.length > 0 && groupList.length > 0) {
      assignedList.forEach((j) => {
        const jurorId = j.jurorId ?? j.key;
        const juryName = String(j.name ?? j.juryName ?? "").trim();
        const juryDept = String(j.dept ?? j.juryDept ?? "").trim();
        if (!jurorId && !juryName) return;
        const jurorKey = rowKey({ jurorId, juryName, juryDept });
        groupList.forEach((g) => {
          const projectId = g.id ?? g.projectId;
          if (!projectId) return;
          const key = `${jurorKey}__${projectId}`;
          if (existingKeys.has(key)) return;
          const meta = projectMetaById.get(projectId);
          generated.push({
            jurorId,
            juryName,
            juryDept,
            projectId,
            groupNo: g.groupNo ?? g.group_no ?? null,
            projectName: String(meta?.title ?? g.title ?? "").trim(),
            students: meta?.students ?? g.students ?? "",
            technical: null,
            design: null,
            delivery: null,
            teamwork: null,
            total: null,
            comments: "",
            updatedAt: "",
            updatedMs: null,
            finalSubmittedAt: "",
            finalSubmittedMs: null,
            timestamp: "",
            tsMs: null,
            status: "empty",
            editingFlag: "",
          });
        });
      });
    }

    const combinedRows = [...data, ...generated];
    const jurorAgg = new Map();
    combinedRows.forEach((row) => {
      const key = rowKey(row);
      if (!key) return;
      const cellSt = getCellState(row);
      const prev = jurorAgg.get(key) || { scored: 0, started: 0, isFinal: false, jurorId: row.jurorId };
      if (cellSt === "scored") prev.scored += 1;
      if (cellSt !== "empty") prev.started += 1;
      if (row.finalSubmittedAt || row.finalSubmittedMs) prev.isFinal = true;
      jurorAgg.set(key, prev);
    });
    const totalGroups = groupList.length;
    const jurorStatusMap = new Map();
    jurorAgg.forEach((agg, key) => {
      const isEditing = !!(jurorEditMap.get(agg.jurorId) || jurorEditMap.get(key));
      if (isEditing) { jurorStatusMap.set(key, "editing"); return; }
      if (agg.isFinal) { jurorStatusMap.set(key, "completed"); return; }
      if (totalGroups > 0 && agg.scored >= totalGroups) { jurorStatusMap.set(key, "ready_to_submit"); return; }
      if (agg.started > 0) { jurorStatusMap.set(key, "in_progress"); return; }
      jurorStatusMap.set(key, "not_started");
    });

    let list = combinedRows.map((row) => {
      const meta = projectMetaById.get(row.projectId);
      const projectTitle = String(row.projectName ?? meta?.title ?? "").trim();
      const studentsRaw = row.students ?? meta?.students ?? "";
      const students = Array.isArray(studentsRaw)
        ? studentsRaw.map((s) => String(s).trim()).filter(Boolean).join(", ")
        : String(studentsRaw).trim();
      const jurorKey = rowKey(row);
      const isEditing = !!(jurorEditMap.get(row.jurorId) || jurorEditMap.get(jurorKey));
      return {
        ...row,
        semester: row.semester ?? semesterName ?? "",
        projectTitle,
        students,
        isEditing,
        effectiveStatus: getCellState(row), // "scored" | "partial" | "empty"
        jurorStatus: jurorStatusMap.get(jurorKey) || "not_started",
      };
    });

    if (Array.isArray(filterSemester)) {
      if (filterSemester.length === 0) return [];
      const set = new Set(filterSemester.map((v) => String(v).trim().toLowerCase()));
      list = list.filter((r) => set.has(String(r.semester || "").trim().toLowerCase()));
    }
    if (Array.isArray(filterGroupNo)) {
      if (filterGroupNo.length === 0) return [];
      const set = new Set(filterGroupNo.map((v) => String(v).trim().toLowerCase()));
      list = list.filter((r) => set.has(String(r.groupNo ?? "").trim().toLowerCase()));
    }
    if (filterJuror) {
      const q = filterJuror.toLowerCase();
      list = list.filter((r) => `${r.juryName ?? ""} ${r.juryDept ?? ""}`.toLowerCase().includes(q));
    }
    if (filterDept) {
      const q = filterDept.toLowerCase();
      list = list.filter((r) => String(r.juryDept ?? "").toLowerCase().includes(q));
    }
    if (Array.isArray(filterStatus)) {
      if (filterStatus.length === 0) return [];
      const set = new Set(filterStatus);
      list = list.filter((r) => set.has(r.effectiveStatus));
    }
    if (Array.isArray(filterJurorStatus)) {
      if (filterJurorStatus.length === 0) return [];
      const set = new Set(filterJurorStatus);
      list = list.filter((r) => set.has(r.jurorStatus));
    }
    if (filterProjectTitle) {
      const q = filterProjectTitle.toLowerCase();
      list = list.filter((r) => (r.projectTitle || "").toLowerCase().includes(q));
    }
    if (filterStudents) {
      const q = filterStudents.toLowerCase();
      list = list.filter((r) => (r.students || "").toLowerCase().includes(q));
    }
    const canApplyUpdated =
      (!updatedFrom || updatedParsedFromMs !== null) &&
      (!updatedTo || updatedParsedToMs !== null) &&
      !isUpdatedInvalidRange;
    if ((updatedFrom || updatedTo) && canApplyUpdated) {
      list = list.filter((r) => {
        const ms = r.updatedMs || tsToMillis(r.updatedAt);
        return ms >= updatedFromMs && ms <= updatedToMs;
      });
    }
    const canApplyCompleted =
      (!completedFrom || completedParsedFromMs !== null) &&
      (!completedTo || completedParsedToMs !== null) &&
      !isCompletedInvalidRange;
    if ((completedFrom || completedTo) && canApplyCompleted) {
      list = list.filter((r) => {
        const ms = r.finalSubmittedMs || tsToMillis(r.finalSubmittedAt);
        return ms >= completedFromMs && ms <= completedToMs;
      });
    }
    const activeScoreFilters = SCORE_KEYS.filter((key) => {
      const filter = scoreFilters[key];
      return !!(filter?.min || filter?.max);
    });
    if (activeScoreFilters.length > 0) {
      list = list.filter((r) => {
        for (const key of activeScoreFilters) {
          const filter = scoreFilters[key];
          let min = toFiniteNumber(filter?.min);
          let max = toFiniteNumber(filter?.max);
          if (min !== null && max !== null && min > max) {
            const swap = min;
            min = max;
            max = swap;
          }
          const value = toFiniteNumber(r[key]);
          if (value === null) return false;
          if (min !== null && value < min) return false;
          if (max !== null && value > max) return false;
        }
        return true;
      });
    }
    if (filterComment) {
      const q = filterComment.toLowerCase();
      list = list.filter((r) => (r.comments || "").toLowerCase().includes(q));
    }

    if (sortKey) {
      // Missing values always sink to bottom regardless of sort direction.
      list.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const aMiss = isMissing(av);
        const bMiss = isMissing(bv);
        if (aMiss && bMiss) return 0;
        if (aMiss) return 1;
        if (bMiss) return -1;
        return sortDir === "asc" ? cmp(av, bv) : cmp(bv, av);
      });
    }
    return list;
  }, [data, projectMetaById, semesterName, filterSemester, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle, filterStudents,
      updatedFrom, updatedTo, completedFrom, completedTo, updatedParsedFrom, updatedParsedTo, completedParsedFrom, completedParsedTo,
      updatedParsedFromMs, updatedParsedToMs, completedParsedFromMs, completedParsedToMs, isUpdatedInvalidRange, isCompletedInvalidRange,
      scoreFilters, filterComment, sortKey, sortDir, jurorEditMap, assignedJurors, jurors, groups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSemester, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus,
      filterProjectTitle, filterStudents, updatedFrom, updatedTo, completedFrom, completedTo, scoreFilters, filterComment,
      sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage   = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageRows   = rows.slice(pageStart, pageStart + pageSize);

  function setSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
      return;
    }
    if (sortDir === "desc") {
      setSortDir("asc");
      return;
    }
    setSortKey(null);
    setSortDir(DEFAULT_SORT_DIR);
  }
  const columns = useMemo(() => {
    const updatedDateFilterValue = { from: updatedFrom, to: updatedTo };
    const completedDateFilterValue = { from: completedFrom, to: completedTo };
    const base = [
      {
        id: "semester",
        label: "Semester",
        sortKey: "semester",
        filter: {
          type: "multi",
          value: filterSemester,
          setValue: setFilterSemester,
          options: semesterOptions.map((label) => ({ value: label, label })),
          allLabel: "All semesters",
          allMode: "all",
          isActive: isSemesterFilterActive,
          clear: () => setFilterSemester(null),
          searchable: true,
        },
        className: "cell-semester",
      },
      {
        id: "groupNo",
        label: "Group No",
        sortKey: "groupNo",
        filter: {
          type: "multi",
          value: filterGroupNo,
          setValue: setFilterGroupNo,
          options: groupNoOptions.map((l) => ({ value: l, label: l })),
          allLabel: "All groups",
          allMode: "all",
          isActive: isGroupNoFilterActive,
          clear: () => setFilterGroupNo(null),
          searchable: true,
        },
        className: "cell-group-no",
      },
      {
        id: "projectTitle",
        label: "Project Title",
        sortKey: "projectTitle",
        filter: {
          type: "text",
          value: filterProjectTitle,
          setValue: setFilterProjectTitle,
          placeholder: "Search projects",
          isActive: isProjectTitleFilterActive,
          clear: () => setFilterProjectTitle(""),
        },
        className: "cell-project-title",
        minWidthClass: "col-project-title",
      },
      {
        id: "students",
        label: "Group Students",
        sortKey: "students",
        filter: {
          type: "text",
          value: filterStudents,
          setValue: setFilterStudents,
          placeholder: "Search students",
          isActive: isStudentsFilterActive,
          clear: () => setFilterStudents(""),
        },
        className: "cell-students",
        minWidthClass: "col-students",
      },
      {
        id: "juror",
        label: "Juror",
        sortKey: "juryName",
        filter: {
          type: "text",
          value: filterJuror,
          setValue: setFilterJuror,
          placeholder: "Search jurors",
          isActive: isJurorFilterActive,
          clear: () => setFilterJuror(""),
        },
        className: "cell-juror",
        minWidthClass: "col-juror",
      },
      {
        id: "dept",
        label: "Department",
        sortKey: "juryDept",
        filter: {
          type: "text",
          value: filterDept,
          setValue: setFilterDept,
          placeholder: "Search departments",
          isActive: isDeptFilterActive,
          clear: () => setFilterDept(""),
        },
        className: "cell-dept",
        minWidthClass: "col-dept",
      },
      {
        id: "status",
        label: "Cell Status",
        sortKey: "effectiveStatus",
        filter: {
          type: "multi",
          value: filterStatus,
          setValue: setFilterStatus,
          options: STATUS_OPTIONS,
          allLabel: "All cell statuses",
          allMode: "all",
          isActive: isStatusFilterActive,
          clear: () => setFilterStatus(null),
        },
        className: "cell-status",
      },
      {
        id: "jurorStatus",
        label: "Juror Status",
        sortKey: "jurorStatus",
        filter: {
          type: "multi",
          value: filterJurorStatus,
          setValue: setFilterJurorStatus,
          options: JUROR_STATUS_OPTIONS,
          allLabel: "All juror statuses",
          allMode: "all",
          isActive: isJurorStatusFilterActive,
          clear: () => setFilterJurorStatus(null),
        },
        className: "cell-juror-status",
      },
    ];

    const scores = SCORE_COLS.map(({ key: col, label }) => {
      const filterValue = scoreFilters[col] || { min: "", max: "" };
      const isActive = !!(filterValue.min || filterValue.max) || activeFilterCol === col;
      return ({
        id: col,
        label,
        sortKey: col,
        filter: {
          type: "numberRange",
          value: filterValue,
          filterKey: col,
          isActive,
          clear: () => setScoreFilters((prev) => ({
            ...prev,
            [col]: { min: "", max: "" },
          })),
        },
        className: null,
        headerIcon: null,
        cellClassName: (row) => (row.effectiveStatus === "empty" ? "score-cell-unscored" : undefined),
        renderCell: (row) => (col === "total" ? <strong>{displayScore(row[col])}</strong> : displayScore(row[col])),
      });
    });

    const dates = [
      {
        id: "updatedAt",
        label: "Updated At",
        sortKey: "updatedMs",
        filter: {
          type: "dateRange",
          value: updatedDateFilterValue,
          parsedFrom: updatedParsedFrom,
          parsedTo: updatedParsedTo,
          setFrom: setUpdatedFrom,
          setTo: setUpdatedTo,
          error: updatedDateError,
          setError: setUpdatedDateError,
          isActive: isUpdatedDateFilterActive,
          clear: () => { setUpdatedFrom(""); setUpdatedTo(""); setUpdatedDateError(null); },
        },
        className: "cell-updated-at",
        renderCell: (row) => formatTs(row.updatedAt),
      },
      {
        id: "completedAt",
        label: "Completed At",
        sortKey: "finalSubmittedMs",
        filter: {
          type: "dateRange",
          value: completedDateFilterValue,
          parsedFrom: completedParsedFrom,
          parsedTo: completedParsedTo,
          setFrom: setCompletedFrom,
          setTo: setCompletedTo,
          error: completedDateError,
          setError: setCompletedDateError,
          isActive: isCompletedDateFilterActive,
          clear: () => { setCompletedFrom(""); setCompletedTo(""); setCompletedDateError(null); },
        },
        className: "cell-completed-at",
        renderCell: (row) => formatTs(row.finalSubmittedAt),
      },
      {
        id: "comment",
        label: "Comment",
        sortKey: null,
        filter: {
          type: "text",
          value: filterComment,
          setValue: setFilterComment,
          placeholder: "Search comments",
          isActive: isCommentFilterActive,
          clear: () => setFilterComment(""),
        },
        className: "cell-comment comment-cell",
        minWidthClass: "col-comment",
        renderCell: (row) => row.comments,
        cellTitle: (row) => row.comments || "",
      },
    ];

    return [...base, ...scores, ...dates];
  }, [
    filterSemester, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle,
    filterStudents, filterComment, updatedFrom, updatedTo, completedFrom, completedTo, updatedParsedFrom, updatedParsedTo,
    completedParsedFrom, completedParsedTo, updatedDateError, completedDateError, scoreFilters, activeFilterCol,
    semesterOptions, groupNoOptions,
    isSemesterFilterActive, isGroupNoFilterActive, isJurorFilterActive, isDeptFilterActive, isStatusFilterActive,
    isJurorStatusFilterActive, isProjectTitleFilterActive, isStudentsFilterActive, isUpdatedDateFilterActive,
    isCompletedDateFilterActive, isCommentFilterActive, sortKey, sortDir,
  ]);

  const columnsById = useMemo(() => new Map(columns.map((col) => [col.id, col])), [columns]);
  const sortLabel = useMemo(() => {
    if (!sortKey) return null;
    const col = columns.find((c) => c.sortKey === sortKey);
    const colLabel = col?.label || "Column";
    const isDateSort = sortKey === "updatedMs" || sortKey === "finalSubmittedMs";
    const isTextSort = [
      "semester",
      "projectTitle",
      "students",
      "juryName",
      "juryDept",
      "effectiveStatus",
      "jurorStatus",
    ].includes(sortKey);
    const dirLabel = isDateSort
      ? (sortDir === "asc" ? "oldest → newest" : "newest → oldest")
      : isTextSort
        ? (sortDir === "asc" ? "A → Z" : "Z → A")
        : (sortDir === "asc" ? "low → high" : "high → low");
    return `${colLabel} (${dirLabel})`;
  }, [columns, sortKey, sortDir]);

  function clearSort() {
    setSortKey(null);
    setSortDir(DEFAULT_SORT_DIR);
  }

  const activeFilterChips = useMemo(() => {
    const chips = [];
    columns.forEach((col) => {
      const f = col.filter;
      if (!f || !f.isActive) return;
      let value = "";
      if (f.type === "text" || f.type === "select") value = f.value || "";
      if (f.type === "multi") {
        const allMode = f.allMode || "empty";
        if (allMode === "all" && f.value === null) return;
        const selected = Array.isArray(f.value) ? f.value : [];
        if (selected.length === 0) {
          if (allMode === "all") {
            value = "None";
          } else {
            return;
          }
        } else {
          const labelMap = new Map((f.options || []).map((o) => {
            if (typeof o === "string") return [o, o];
            return [o.value, o.label];
          }));
          value = selected.length <= 2
            ? selected.map((v) => labelMap.get(v) ?? v).join(", ")
            : `${selected.length} selected`;
        }
      }
      if (f.type === "dateRange") {
        const fromRaw = f.value?.from ?? "";
        const toRaw = f.value?.to ?? "";
        if (!fromRaw && !toRaw) return;
        const fromParsed = f.parsedFrom;
        const toParsed = f.parsedTo;
        const from = fromRaw
          ? (fromParsed?.isDateOnly ? formatDateOnlyFromMs(fromParsed.ms) : formatTs(fromRaw))
          : "—";
        const to = toRaw
          ? (toParsed?.isDateOnly ? formatDateOnlyFromMs(toParsed.ms) : formatTs(toRaw))
          : "—";
        value = `${from} → ${to}`;
      }
      if (f.type === "numberRange") {
        const minRaw = f.value?.min ?? "";
        const maxRaw = f.value?.max ?? "";
        if (!minRaw && !maxRaw) return;
        if (minRaw && maxRaw) value = `${minRaw}–${maxRaw}`;
        else if (minRaw) value = `≥ ${minRaw}`;
        else value = `≤ ${maxRaw}`;
      }
      chips.push({ id: col.id, label: col.label, value, onClear: f.clear });
    });
    return chips;
  }, [columns]);

  const openFilterCol = (colId, evt) => {
    const col = columnsById.get(colId);
    col?.filter?.onOpen?.();
    setMultiSearchQuery("");
    toggleFilterCol(colId, evt);
  };

  // ── Popover config helpers ─────────────────────────────────
  // Closed over closePopover / toggleMulti — called inline below.
  const makeTextFilter = (value, setValue, placeholder, isActive) => ({
    className: "col-filter-popover col-filter-popover-portal",
    contentKey: value,
    content: (
      <>
        <input
          autoFocus
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={isActive ? "filter-input-active" : ""}
        />
        {value && (
          <button className="col-filter-clear" onClick={() => { setValue(""); closePopover(); }}>
            Clear
          </button>
        )}
      </>
    ),
  });

  const makeNumberRangeFilter = (key, isActive) => {
    const current = scoreFilters[key] || { min: "", max: "" };
    const minValue = current.min ?? "";
    const maxValue = current.max ?? "";
    const minNum = toFiniteNumber(minValue);
    const maxNum = toFiniteNumber(maxValue);
    const hasError = minNum !== null && maxNum !== null && minNum > maxNum;
    const maxAllowed = Number.isFinite(SCORE_MAX_BY_KEY[key]) ? SCORE_MAX_BY_KEY[key] : SCORE_FILTER_MAX;

    return ({
      className: "col-filter-popover col-filter-popover-portal col-filter-popover-number",
      contentKey: `${minValue}|${maxValue}`,
      content: (
        <>
          <div className="range-field">
            <label>Min</label>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min={SCORE_FILTER_MIN}
              max={maxAllowed}
              value={minValue}
              onChange={(e) => updateScoreFilter(key, "min", e.target.value)}
              className={isActive ? "filter-input-active" : ""}
            />
          </div>
          <div className="range-field">
            <label>Max</label>
            <input
              type="number"
              inputMode="decimal"
              min={SCORE_FILTER_MIN}
              max={maxAllowed}
              value={maxValue}
              onChange={(e) => updateScoreFilter(key, "max", e.target.value)}
              className={isActive ? "filter-input-active" : ""}
            />
          </div>
          {hasError && (
            <div className="range-error">Min must be ≤ Max.</div>
          )}
          {(minValue || maxValue) && (
            <button
              type="button"
              className="col-filter-clear"
              onClick={() => {
                setScoreFilters((prev) => ({ ...prev, [key]: { min: "", max: "" } }));
              }}
            >
              Clear
            </button>
          )}
        </>
      ),
    });
  };

  const makeSelectFilter = (value, setValue, options, allLabel, isActive) => ({
    className: "col-filter-popover col-filter-popover-portal",
    contentKey: value,
    content: (
      <>
        <select
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); closePopover(); }}
          aria-label={allLabel}
          className={isActive ? "filter-input-active" : ""}
        >
          <option value="">{allLabel}</option>
          {options.map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        {value && (
          <button className="col-filter-clear" onClick={() => { setValue(""); closePopover(); }}>
            Clear
          </button>
        )}
      </>
    ),
  });

  const makeMultiFilter = (
    options, selected, setSelected, allLabel, allMode = "empty",
    searchable = false, searchQuery = "", setSearchQuery = () => {}
  ) => {
    const optionValues = options.map((o) => (typeof o === "string" ? o : o.value));
    const isAll = allMode === "all" ? selected == null : (Array.isArray(selected) && selected.length === 0);
    const toggleOption = (val) => {
      if (isAll && allMode === "all") {
        setSelected(optionValues.filter((v) => v !== val));
        return;
      }
      if (!Array.isArray(selected) || selected.length === 0) {
        setSelected([val]);
        return;
      }
      toggleMulti(val, selected, setSelected, optionValues);
    };
    const filteredOptions = searchable && searchQuery.trim()
      ? options.filter((o) => {
          const lbl = typeof o === "string" ? o : o.label;
          return lbl.toLowerCase().includes(searchQuery.trim().toLowerCase());
        })
      : options;
    return {
      className: "col-filter-popover col-filter-popover-portal col-filter-popover-multi",
      contentKey: Array.isArray(selected) ? selected.join("|") : "ALL",
      content: (
        <>
          {searchable && (
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${allLabel.replace(/^All\s+/i, "").toLowerCase()}...`}
              className="multi-filter-search"
              aria-label={`Search ${allLabel}`}
            />
          )}
          <label className="status-option">
            <input
              type="checkbox"
              checked={isAll}
              onChange={() => {
                if (allMode === "all") {
                  setSelected(isAll ? [] : null);
                } else {
                  setSelected([]);
                }
              }}
            />
            <span>{allLabel}</span>
          </label>
          {filteredOptions.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lbl = typeof opt === "string" ? opt : opt.label;
            return (
              <label key={val} className="status-option">
                <input
                  type="checkbox"
                  checked={isAll || (Array.isArray(selected) && selected.includes(val))}
                  onChange={() => toggleOption(val)}
                />
                <span>{lbl}</span>
              </label>
            );
          })}
          {searchable && searchQuery.trim() && filteredOptions.length === 0 && (
            <div className="multi-filter-empty">No results</div>
          )}
          {Array.isArray(selected) && selected.length > 0 && (
            <button className="col-filter-clear" onClick={() => { setSelected(allMode === "all" ? null : []); closePopover(); }}>
              Clear
            </button>
          )}
        </>
      ),
    };
  };

  const popoverConfig = (() => {
    if (!activeFilterCol) return null;
    const col = columnsById.get(activeFilterCol);
    const filter = col?.filter;
    if (!filter) return null;

    if (filter.type === "select") {
      return makeSelectFilter(filter.value, filter.setValue, filter.options, filter.allLabel, filter.isActive);
    }
    if (filter.type === "multi") {
      return makeMultiFilter(
        filter.options, filter.value, filter.setValue,
        filter.allLabel, filter.allMode,
        filter.searchable ?? false,
        multiSearchQuery, setMultiSearchQuery
      );
    }
    if (filter.type === "text") {
      return makeTextFilter(filter.value, filter.setValue, filter.placeholder, filter.isActive);
    }
    if (filter.type === "numberRange") {
      return makeNumberRangeFilter(filter.filterKey, filter.isActive);
    }
    if (filter.type === "dateRange") {
      const from = filter.value?.from ?? "";
      const to = filter.value?.to ?? "";
      const parsedFrom = filter.parsedFrom;
      const parsedTo = filter.parsedTo;
      const parsedFromMs = parsedFrom ? parsedFrom.ms : null;
      const parsedToMs = parsedTo ? parsedTo.ms : null;
      const isInvalidRange = parsedFromMs !== null && parsedToMs !== null && parsedFromMs > parsedToMs;
      const isDateFilterActive = filter.isActive;
      const dateError = filter.error;
      const setDateError = filter.setError || (() => {});
      const setFrom = filter.setFrom || (() => {});
      const setTo = filter.setTo || (() => {});
      const handleDateBlur = () => {
        if ((from && parsedFromMs === null) || (to && parsedToMs === null)) {
          setDateError("Invalid date format.");
          return;
        }
        setDateError(isInvalidRange ? "The 'From' date cannot be later than the 'To' date." : null);
      };
      return {
        className: `col-filter-popover col-filter-popover-portal col-filter-popover-timestamp${isMobile ? " is-centered" : ""}`,
        contentKey: `${from}|${to}`,
        mode: isMobile ? "center" : "anchor",
        content: (
          <>
            <div className="timestamp-field">
              <label>From</label>
              <input
                autoFocus
                type="datetime-local"
                step="60"
                placeholder="YYYY-MM-DDThh:mm"
                value={from}
                min={DATE_MIN_DATETIME}
                max={DATE_MAX_DATETIME}
                onChange={(e) => setFrom(e.target.value)}
                onBlur={handleDateBlur}
                className={`timestamp-date-input ${dateError ? "is-invalid " : ""}${isDateFilterActive ? "filter-input-active" : ""}`}
                aria-invalid={!!dateError}
              />
            </div>
            <div className="timestamp-field">
              <label>To</label>
              <input
                type="datetime-local"
                step="60"
                placeholder="YYYY-MM-DDThh:mm"
                value={to}
                min={DATE_MIN_DATETIME}
                max={DATE_MAX_DATETIME}
                onChange={(e) => setTo(e.target.value)}
                onBlur={handleDateBlur}
                className={`timestamp-date-input ${dateError ? "is-invalid " : ""}${isDateFilterActive ? "filter-input-active" : ""}`}
                aria-invalid={!!dateError}
              />
            </div>
            {dateError && (
              <div className="timestamp-error" role="alert">{dateError}</div>
            )}
            {isMobile ? (
              <div className="timestamp-actions">
                {(from || to) && (
                  <button className="col-filter-clear" onClick={() => { setFrom(""); setTo(""); setDateError(null); }}>
                    Clear
                  </button>
                )}
                <button className="timestamp-done-btn" onClick={closePopover} disabled={!!dateError}>
                  Done
                </button>
              </div>
            ) : (
              (from || to) && (
                <button className="col-filter-clear" onClick={() => { setFrom(""); setTo(""); setDateError(null); }}>
                  Clear
                </button>
              )
            )}
          </>
        ),
      };
    }

    return null;
  })();

  return (
    <div className="score-details">
      <div className="admin-section-header">
        <div className="section-label">Details</div>
        <div className="admin-section-actions">
          <button
            className="xlsx-export-btn"
            onClick={() => {
              const exportSemesterLabel = Array.isArray(filterSemester)
                ? (filterSemester.length === 1 ? filterSemester[0] : (filterSemester.length === 0 ? "no-semester" : "multi-semesters"))
                : "all-semesters";
              void exportXLSX(rows, { semesterName: exportSemesterLabel, summaryData });
            }}
          >
            <DownloadIcon />
            <span className="export-label">Excel</span>
          </button>
        </div>
      </div>

      {(loading || hasAnyFilter || sortLabel) && (
        <div className="detail-table-toolbar">
          {loading && (
            <span className="detail-loading">Loading all semesters…</span>
          )}
          {(hasAnyFilter || sortLabel) && (
            <div className="filters-chip-row">
              {hasAnyFilter && (
                <button
                  type="button"
                  className="filter-chip filter-chip-clear-all"
                  onClick={resetFilters}
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  <span className="chip-label">Clear all</span>
                  <XIcon />
                </button>
              )}
              {sortLabel && (
                <button
                  type="button"
                  className="details-sort-indicator"
                  onClick={clearSort}
                  title="Clear sort"
                  aria-label="Clear sort"
                >
                  <span className="chip-label">Sorted By</span>
                  <span className="chip-value">{sortLabel}</span>
                  <span className="details-sort-close" aria-hidden="true">×</span>
                </button>
              )}
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className="filter-chip"
                  onClick={chip.onClear}
                  title={`Clear ${chip.label}`}
                  aria-label={`Clear ${chip.label}`}
                >
                  <span className="chip-label">{chip.label}</span>
                  {chip.value && <span className="chip-value">{chip.value}</span>}
                  <XIcon />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FilterPopoverPortal
        open={!!popoverConfig}
        anchorRect={anchorRect}
        anchorEl={anchorEl}
        onClose={closePopover}
        className={popoverConfig?.className}
        contentKey={popoverConfig?.contentKey}
        mode={popoverConfig?.mode}
        trapFocus
        id={activeFilterCol ? `filter-popover-${activeFilterCol}` : undefined}
      >
        {popoverConfig?.content}
      </FilterPopoverPortal>

      <div className="details-scroll-hint">
        <span className="details-scroll-icon" aria-hidden="true"><InfoIcon /></span>
        <span>Swipe to view more columns. Long text scrolls on touch.</span>
      </div>

      {/* Details table */}
      <div className="detail-table-scroll-top" ref={topScrollRef} aria-hidden="true">
        <div className="detail-table-scroll-top-inner" />
      </div>
      <div className="detail-table-wrap" ref={tableScrollRef}>
        <table className="detail-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <ColHeader
                  key={col.id}
                  label={col.label}
                  sk={col.sortKey}
                  filterCol={col.filter ? col.id : null}
                  isActive={!!col.filter?.isActive}
                  noFilter={!col.filter}
                  noSort={!col.sortKey}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                  onFilter={openFilterCol}
                  onFilterClick={col.filter ? (e) => { e.preventDefault(); e.stopPropagation(); openFilterCol(col.id, e); } : undefined}
                  sortIconNode={col.headerIcon}
                  thClassName={col.minWidthClass}
                  filterId={col.filter ? `filter-popover-${col.id}` : undefined}
                  isOpen={activeFilterCol === col.id}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                  No matching rows.
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => {
              return (
                <tr
                  key={`${rowKey(row)}-${row.projectId}`}
                  className={i % 2 === 1 ? "row-even" : ""}
                >
                  {columns.map((col) => {
                    const cellClassName = typeof col.cellClassName === "function" ? col.cellClassName(row) : col.cellClassName;
                    const content = col.renderCell
                      ? col.renderCell(row)
                      : (() => {
                          if (col.id === "semester") return row.semester ? row.semester : "—";
                          if (col.id === "groupNo") return row.groupNo ?? "—";
                          if (col.id === "projectTitle") return row.projectTitle || "—";
                          if (col.id === "students") return row.students || "—";
                          if (col.id === "juror") return row.juryName;
                          if (col.id === "dept") return row.juryDept;
                          if (col.id === "status") {
                            return <StatusBadge status={row.effectiveStatus} editingFlag={null} />;
                          }
                          if (col.id === "jurorStatus") {
                            return <StatusBadge status={row.jurorStatus} editingFlag={row.jurorStatus === "editing" ? "editing" : null} />;
                          }
                          return row[col.id] ?? "";
                        })();
                    const cellTitle = typeof col.cellTitle === "function" ? col.cellTitle(row) : undefined;
                    const isTextCell = ["semester", "groupNo", "projectTitle", "students", "juror", "dept"].includes(col.id);
                    return (
                      <td
                        key={`${col.id}-${row.projectId}`}
                        className={joinClass(col.className, col.minWidthClass, cellClassName)}
                        style={isTextCell ? { whiteSpace: "nowrap" } : undefined}
                        title={cellTitle}
                      >
                        {isTextCell ? (
                          <span {...cellScrollProps}>
                            <span className="detail-cell-scroll-inner">{content}</span>
                          </span>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRows={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
