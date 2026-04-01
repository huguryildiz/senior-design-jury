// src/admin/RankingsTab.jsx
// ── Ranking view with medal badges ──

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeList as List } from "react-window";
import { APP_CONFIG, CRITERIA, TOTAL_MAX } from "../config";
import { InfoIcon, ChevronDownIcon, DownloadIcon, ArrowUpIcon, ArrowDownIcon, SearchIcon, FilterIcon } from "../shared/Icons";
import { GroupLabel, ProjectTitle, StudentNames } from "../components/EntityMeta";
import { readSection, writeSection } from "./persist";
import { exportRankingsXLSX } from "./xlsx/exportXLSX";
import { useAuth } from "../shared/auth";
import medalFirst from "../assets/1st-place-medal.svg";
import medalSecond from "../assets/2nd-place-medal.svg";
import medalThird from "../assets/3rd-place-medal.svg";

const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max, color: c.color }));
const MEDALS = [medalFirst, medalSecond, medalThird];
const SORT_OPTIONS = [
  { value: "totalAvg", label: "Total Avg" },
  { value: "groupNo", label: "Group No" },
  { value: "projectTitle", label: "Title" },
  ...CRITERIA_LIST.map((c) => ({ value: c.id, label: `${c.shortLabel || c.label} Avg` })),
];
const VIRTUAL_THRESHOLD = 40;
const ESTIMATED_ROW_HEIGHT = 220;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, [query]);
  return matches;
}

function getRankKey(p, fallback) {
  return p?.id ?? p?.groupNo ?? p?.name ?? fallback;
}

function formatScore(val, digits = 2) {
  if (!Number.isFinite(val)) return "—";
  return Number(val).toFixed(digits);
}

function buildSearchText(p) {
  const group = `group ${p?.groupNo ?? ""}`;
  const title = p?.name ?? "";
  const students = p?.students ?? "";
  return `${group} ${p?.groupNo ?? ""} ${title} ${students}`.toLowerCase();
}

// ── Sub-components (module level — stable identity across renders) ─────────

function RankCard({ p, index, rankMap, expandedGroups, onToggleGroup, criteriaList: critList = CRITERIA_LIST }) {
  const rankKey = getRankKey(p, index);
  const dr = rankMap.get(rankKey) ?? null;
  const groupLabel = `Group ${p.groupNo}`;
  const projectTitle = (p.name || "").trim();
  const showTitle = !!projectTitle && projectTitle !== groupLabel;
  const studentList = p.students
    ? p.students.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const hasDetails = showTitle || (APP_CONFIG.showStudents && studentList.length > 0);
  const groupKey = `summary-${p.id ?? index}`;
  const isExpanded = expandedGroups.has(groupKey);
  const hasScores = Number.isFinite(p.totalAvg);
  const isTop3 = hasScores && dr !== null && dr <= 3;
  const rankClass = isTop3 ? `rank-top${dr}` : "rank-rest";
  const panelId = `summary-group-panel-${groupKey}`;
  return (
    <div
      key={p.id ?? index}
      className={`rank-card ${rankClass}${isTop3 ? ` rank-${dr}` : ""}`}
    >
      {isTop3 && (
        <span className={`rank-accent rank-${dr}`} aria-hidden="true" />
      )}
      {isTop3 ? (
        <div className={`rank-badge rank-medal-wrap rank-${dr}`} aria-hidden="true">
          <span className="rank-medal-ring" aria-hidden="true" />
          <img className="rank-medal" src={MEDALS[dr - 1]} alt={`${dr} place medal`} />
        </div>
      ) : (
        <div className="rank-badge rank-num">{dr ?? "—"}</div>
      )}

      <div className="rank-info">
        <div className="group-card-wrap">
          <div className="group-card-header">
            <div className="group-card-left">
              <button
                className="group-card-toggle group-accordion-header"
                tabIndex={hasDetails ? 0 : -1}
                aria-expanded={hasDetails ? isExpanded : undefined}
                aria-controls={hasDetails ? panelId : undefined}
                type="button"
                onClick={() => { if (hasDetails) onToggleGroup(groupKey); }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && hasDetails) {
                    e.preventDefault();
                    onToggleGroup(groupKey);
                  }
                }}
                style={{ cursor: hasDetails ? "pointer" : "default" }}
              >
                <span className="group-card-name">
                  <GroupLabel text={groupLabel} shortText={`Group ${p.groupNo}`} />
                </span>
                {hasDetails && (
                  <span className={`group-accordion-chevron${isExpanded ? " open" : ""}`}>
                    <ChevronDownIcon />
                  </span>
                )}
              </button>
            </div>
            <div className="group-card-score">
              <small className="group-card-score-label">Avg /{TOTAL_MAX}</small>
              <span className="group-card-score-value avg-score">
                {hasScores ? formatScore(p.totalAvg) : "—"}
              </span>
            </div>
          </div>

          {!hasScores && (
            <div className="rank-meta">
              <span className="rank-empty-badge">No finalized evaluations</span>
            </div>
          )}

          <div
            id={panelId}
            className={`group-accordion-panel${isExpanded ? " open" : ""}`}
          >
            <div className="group-accordion-panel-inner group-card-accordion-inner">
              {showTitle && (
                <div className="group-card-full-title">
                  <ProjectTitle text={projectTitle} />
                </div>
              )}
              {APP_CONFIG.showStudents && studentList.length > 0 && (
                <div className="group-card-students">
                  <StudentNames names={studentList} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rank-bars">
          {critList.map((c) => {
            const val = p.avg?.[c.id];
            const hasVal = Number.isFinite(val) && c.max > 0;
            const pct = hasVal ? Math.min((val / c.max) * 100, 100) : 0;
            return (
              <div key={c.id} className="mini-bar-row">
                <span className="mini-label">{c.shortLabel}</span>
                <div className="mini-bar-track">
                  <div
                    className="mini-bar-fill"
                    style={{ width: `${pct}%`, background: c.color || "#3b82f6" }}
                  />
                </div>
                <span className="mini-val">
                  {hasVal ? `${formatScore(val)} / ${c.max}` : "—"}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

function Row({ index, style, data }) {
  const { items, onMeasure, rankMap, expandedGroups, onToggleGroup, criteriaList: rowCriteriaList } = data;
  const rowRef = useRef(null);

  useLayoutEffect(() => {
    if (!rowRef.current) return;
    onMeasure(index, rowRef.current.getBoundingClientRect().height);
  }, [index, onMeasure]);

  useLayoutEffect(() => {
    if (!rowRef.current || typeof ResizeObserver === "undefined") return;
    const el = rowRef.current;
    const ro = new ResizeObserver(() => {
      onMeasure(index, el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, onMeasure]);

  return (
    <div style={{ ...style, width: "100%", paddingBottom: 14 }}>
      <div ref={rowRef}>
        <RankCard
          p={items[index]}
          index={index}
          rankMap={rankMap}
          expandedGroups={expandedGroups}
          onToggleGroup={onToggleGroup}
          criteriaList={rowCriteriaList}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function RankingsTab({ ranked, semesterName = "", criteriaTemplate }) {
  const { activeTenant } = useAuth();
  const tenantCode = activeTenant?.code || "";
  const criteriaList = useMemo(
    () => (criteriaTemplate || CRITERIA_LIST).map((c) => ({
      id: c.id ?? c.key,
      label: c.label,
      shortLabel: c.shortLabel,
      max: c.max,
      color: c.color,
    })),
    [criteriaTemplate] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const sortOptions = useMemo(() => [
    { value: "totalAvg", label: "Total Avg" },
    { value: "groupNo", label: "Group No" },
    { value: "projectTitle", label: "Title" },
    ...criteriaList.map((c) => ({ value: c.id, label: `${c.shortLabel || c.label} Avg` })),
  ], [criteriaList]);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [search, setSearch] = useState(() => {
    const s = readSection("rankings");
    return typeof s.search === "string" ? s.search : "";
  });
  const [sortKey, setSortKey] = useState(() => {
    const s = readSection("rankings");
    const valid = SORT_OPTIONS.some((opt) => opt.value === s.sortKey);
    return valid ? s.sortKey : "totalAvg";
  });
  const [sortDir, setSortDir] = useState(() => {
    const s = readSection("rankings");
    return s.sortDir === "asc" || s.sortDir === "desc" ? s.sortDir : "desc";
  });
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const s = readSection("rankings");
    return typeof s.filtersOpen === "boolean" ? s.filtersOpen : true;
  });

  const isSmallMobile = useMediaQuery("(max-width: 500px)");

  const listRef = useRef(null);
  const sizeMapRef = useRef({});
  const virtualWrapRef = useRef(null);
  const [virtualHeight, setVirtualHeight] = useState(null);

  // Reset accordion state when the semester changes (ranked data replaced).
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [semesterName]);

  useEffect(() => {
    writeSection("rankings", { search, sortKey, sortDir, filtersOpen });
  }, [search, sortKey, sortDir, filtersOpen]);

  const finalized = useMemo(
    () => (ranked || []).filter((p) => Number.isFinite(p?.totalAvg)),
    [ranked]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return finalized.filter((p) => {
      if (!q) return true;
      return buildSearchText(p).includes(q);
    });
  }, [finalized, search]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    const dir = sortDir === "desc" ? -1 : 1;
    items.sort((a, b) => {
      let base = 0;
      if (sortKey === "projectTitle") {
        const aStr = String(a?.name ?? "").toLowerCase();
        const bStr = String(b?.name ?? "").toLowerCase();
        base = aStr.localeCompare(bStr, "tr", { numeric: true });
      } else if (sortKey === "groupNo") {
        const aVal = Number.isFinite(a?.groupNo) ? a.groupNo : null;
        const bVal = Number.isFinite(b?.groupNo) ? b.groupNo : null;
        if (aVal == null && bVal == null) base = 0;
        else if (aVal == null) base = 1;
        else if (bVal == null) base = -1;
        else base = aVal - bVal;
      } else {
        const aVal = sortKey === "totalAvg" ? a?.totalAvg : a?.avg?.[sortKey];
        const bVal = sortKey === "totalAvg" ? b?.totalAvg : b?.avg?.[sortKey];
        const aNum = Number.isFinite(aVal) ? aVal : null;
        const bNum = Number.isFinite(bVal) ? bVal : null;
        if (aNum == null && bNum == null) base = 0;
        else if (aNum == null) base = 1;
        else if (bNum == null) base = -1;
        else base = aNum - bNum;
      }

      if (base === 0) {
        const aGrp = Number.isFinite(a?.groupNo) ? a.groupNo : 0;
        const bGrp = Number.isFinite(b?.groupNo) ? b.groupNo : 0;
        base = aGrp - bGrp;
      }

      return base * dir;
    });
    return items;
  }, [filtered, sortKey, sortDir]);

  const useVirtual = sorted.length >= VIRTUAL_THRESHOLD;

  const rankMap = useMemo(() => {
    const scored = [...finalized].sort((a, b) => {
      const aVal = Number.isFinite(a?.totalAvg) ? a.totalAvg : -Infinity;
      const bVal = Number.isFinite(b?.totalAvg) ? b.totalAvg : -Infinity;
      return bVal - aVal;
    });
    const map = new Map();
    let scoredIndex = 0;
    let lastScore = null;
    let lastRank = 0;
    scored.forEach((p, i) => {
      const key = getRankKey(p, i);
      if (!Number.isFinite(p?.totalAvg)) {
        map.set(key, null);
        return;
      }
      scoredIndex += 1;
      if (lastScore === null || p.totalAvg !== lastScore) {
        lastRank = scoredIndex;
        lastScore = p.totalAvg;
      }
      map.set(key, lastRank);
    });
    return map;
  }, [finalized]);

  const setSize = useCallback((index, size) => {
    if (sizeMapRef.current[index] !== size) {
      sizeMapRef.current[index] = size;
      if (listRef.current) listRef.current.resetAfterIndex(index);
    }
  }, []);

  const getSize = useCallback(
    (index) => sizeMapRef.current[index] || ESTIMATED_ROW_HEIGHT,
    []
  );

  useEffect(() => {
    sizeMapRef.current = {};
    if (listRef.current) listRef.current.resetAfterIndex(0, true);
  }, [sorted.length, sortKey, sortDir, search]);

  const updateVirtualHeight = useCallback(() => {
    if (!virtualWrapRef.current) return;
    const rect = virtualWrapRef.current.getBoundingClientRect();
    const vh = typeof window !== "undefined" ? window.innerHeight : 0;
    if (!vh) return;
    const next = Math.max(240, Math.floor(vh - rect.top - 24));
    setVirtualHeight(next);
  }, []);

  useEffect(() => {
    if (!useVirtual) return;
    const raf = () => requestAnimationFrame(updateVirtualHeight);
    raf();
    window.addEventListener("resize", raf);
    window.addEventListener("orientationchange", raf);
    return () => {
      window.removeEventListener("resize", raf);
      window.removeEventListener("orientationchange", raf);
    };
  }, [useVirtual, updateVirtualHeight, filtersOpen]);

  function toggleGroup(groupKey) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      const isOpening = !next.has(groupKey);
      if (isOpening && isSmallMobile) {
        return new Set([groupKey]);
      }
      if (isOpening) next.add(groupKey);
      else next.delete(groupKey);
      return next;
    });
  }

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportRankingsXLSX(sorted, criteriaList, { semesterName, tenantCode });
    } finally {
      setIsExporting(false);
    }
  }

  // Guard: ranked may be undefined during initial render
  if (!finalized.length) {
    return <div className="empty-msg">No finalized evaluations yet.</div>;
  }

  return (
    <div className="rankings-page">
      <div className="admin-section-header">
        <div className="admin-section-actions">
          <span className="info-tooltip-wrap" aria-label="Ranking is based on finalized submissions only (Total Avg). Ties share the same rank (e.g., 1, 1, 3)">
            <InfoIcon />
            <span className="info-tooltip-bubble">
              Ranking is based on finalized submissions only (Total Avg). Ties share the same rank (e.g., 1, 1, 3).
            </span>
          </span>
          <button className="xlsx-export-btn" onClick={handleExport} disabled={isExporting}>
            <DownloadIcon />
            <span>{isExporting ? "Exporting…" : "Excel"}</span>
          </button>
        </div>
      </div>

      <div className="rankings-toolbar">
        <div className="rankings-toolbar-header">
          <span className="rankings-toolbar-title">
            <span className="rankings-toolbar-icon" aria-hidden="true"><FilterIcon /></span>
            Filters
          </span>
          <button
            type="button"
            className={`rankings-toolbar-toggle${filtersOpen ? " is-open" : ""}`}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "Collapse filters" : "Expand filters"}
          >
            <ChevronDownIcon />
          </button>
        </div>
        <div className={`rankings-toolbar-body${filtersOpen ? "" : " is-collapsed"}`}>
          <div className="rankings-toolbar-main">
            <label className="rankings-control rankings-search">
              <span className="rankings-label">Search</span>
              <div className="rankings-input-wrap">
                <span className="rankings-input-icon" aria-hidden="true"><SearchIcon /></span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groups, projects, or students"
                  aria-label="Search groups, projects, or students"
                />
              </div>
            </label>
            <label className="rankings-control">
              <span className="rankings-label">Sort</span>
              <div className="rankings-sort-row">
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort by">
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rankings-sort-dir"
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  aria-label={`Sort ${sortDir === "desc" ? "descending" : "ascending"}`}
                >
                  {sortDir === "desc" ? <ArrowDownIcon /> : <ArrowUpIcon />}
                </button>
              </div>
            </label>
          </div>
          <div className="rankings-toolbar-meta">
            Showing {sorted.length} of {finalized.length}
          </div>
        </div>
      </div>

      <div className={`rank-list${useVirtual ? " rank-list--virtual" : ""}`}>
        {sorted.length === 0 ? (
          <div className="empty-msg">No results for the current filters.</div>
        ) : useVirtual ? (
          <div
            className="rank-virtual-wrap"
            ref={virtualWrapRef}
            style={virtualHeight ? { height: virtualHeight } : undefined}
          >
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={listRef}
                  height={height}
                  width={width}
                  itemCount={sorted.length}
                  itemSize={getSize}
                  itemData={{ items: sorted, onMeasure: setSize, rankMap, expandedGroups, onToggleGroup: toggleGroup, criteriaList }}
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          </div>
        ) : (
          sorted.map((p, i) => <RankCard key={p.id ?? i} p={p} index={i} rankMap={rankMap} expandedGroups={expandedGroups} onToggleGroup={toggleGroup} criteriaList={criteriaList} />)
        )}
      </div>
    </div>
  );
}
