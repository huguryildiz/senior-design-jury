// src/admin/EvaluationGrid.jsx
// ── Juror × group evaluation grid ────────────────────────────
// - Column-based sorting (click group header: desc → asc → reset)
// - Sticky header + frozen first column
// - Juror column text filter
// - Scored-only averages (fully scored cells only)

import { useState, useMemo, useEffect, useRef } from "react";
import { cmp, rowKey, exportGridXLSX } from "./utils";
import { readSection, writeSection } from "./persist";
import { FilterPopoverPortal } from "./components";
import {
  getCellState,
  getPartialTotal,
  getJurorWorkflowState,
  jurorStatusMeta,
} from "./scoreHelpers";
import {
  FilterIcon,
  ArrowUpDownIcon,
  ArrowDown01Icon,
  ArrowDown10Icon,
  InfoIcon,
  DownloadIcon,
} from "../shared/Icons";

const readGridState = () => {
  const current = readSection("grid");
  return Object.keys(current).length ? current : readSection("matrix");
};

// ── Cell helpers ──────────────────────────────────────────────

const cellStyle = (state, isFinal = false) => {
  if (state === "scored") {
    // Final submitted → darker green (completed); scored only → light green
    return isFinal
      ? { background: "#dcfce7", color: "#166534", fontWeight: 700 }
      : { background: "#f0fdf4", color: "#16a34a", fontWeight: 600 };
  }
  if (state === "partial") return { background: "#fef9c3", color: "#92400e", fontWeight: 700 };
  return { background: "#f8fafc", color: "#94a3b8" }; // empty
};

const cellText = (state, entry) => {
  if (state === "scored")  return entry.total;
  if (state === "partial") return getPartialTotal(entry);
  return "—";
};

// ── Component ──────────────────────────────────────────────────

// Props:
//   data    – raw rows
//   jurors  – { key, name, dept }[]  (from AdminPanel uniqueJurors)
//   groups  – { id, label }[]
export default function EvaluationGrid({ data, jurors, groups, semesterName = "" }) {
  // Group column sort state
  const [sortGroupId,  setSortGroupId]  = useState(() => { const s = readGridState(); return (s.sortGroupId === null || typeof s.sortGroupId === "number") ? s.sortGroupId ?? null : null; });
  const [sortGroupDir, setSortGroupDir] = useState(() => { const s = readGridState(); return s.sortGroupDir === "asc" || s.sortGroupDir === "desc" ? s.sortGroupDir : "desc"; });
  const [sortJurorDir, setSortJurorDir] = useState(() => { const s = readGridState(); return s.sortJurorDir === "asc" || s.sortJurorDir === "desc" ? s.sortJurorDir : "asc"; });
  const [sortMode,     setSortMode]     = useState(() => { const s = readGridState(); return s.sortMode === "group" ? "group" : "juror"; });

  // Juror text filter
  const [jurorFilter, setJurorFilter] = useState(() => { const s = readGridState(); return typeof s.jurorFilter === "string" ? s.jurorFilter : ""; });

  useEffect(() => {
    writeSection("grid", { sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter });
  }, [sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter]);

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
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const [anchorEl,   setAnchorEl]   = useState(null);
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);

  const isJurorFilterActive = !!jurorFilter || activeFilterCol === "juror";
  const jurorFinalMap = useMemo(
    () => new Map(jurors.map((j) => [j.key, Boolean(j.finalSubmitted || j.finalSubmittedAt)])),
    [jurors]
  );

  // Completion set should mirror project summary logic:
  // juror final submitted AND not in edit mode.
  const completedJurorKeys = useMemo(
    () => new Set(jurors.filter((j) => (j.finalSubmitted || j.finalSubmittedAt) && !j.editEnabled).map((j) => j.key)),
    [jurors]
  );
  const completedJurors = useMemo(
    () => jurors.filter((j) => completedJurorKeys.has(j.key)),
    [jurors, completedJurorKeys]
  );

  function closePopover() {
    setActiveFilterCol(null);
    setAnchorRect(null);
    setAnchorEl(null);
  }

  function toggleFilterCol(colId, evt) {
    const rect = evt?.currentTarget?.getBoundingClientRect?.();
    const el = evt?.currentTarget ?? null;
    setActiveFilterCol((prev) => {
      const next = prev === colId ? null : colId;
      if (next && rect) { setAnchorRect(rect); setAnchorEl(el); }
      if (!next) { setAnchorRect(null); setAnchorEl(null); }
      return next;
    });
  }

  // Build lookup: jurorKey → { [projectId]: { total, status, editingFlag, technical, design, delivery, teamwork, finalSubmittedAt } }
  const lookup = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const key = rowKey(r);
      if (!map[key]) map[key] = {};
      map[key][r.projectId] = {
        total:       r.total,
        status:      r.status,
        editingFlag: r.editingFlag,
        technical:   r.technical,
        design:      r.design,
        delivery:    r.delivery,
        teamwork:    r.teamwork,
        finalSubmittedAt: r.finalSubmittedAt || "",
      };
    });
    return map;
  }, [data]);

  // Click-to-sort cycle on group columns: none → desc → asc → none
  function toggleGroupSort(gId) {
    if (sortGroupId !== gId) {
      setSortGroupId(gId);
      setSortGroupDir("desc");
      setSortMode("group");
    } else if (sortGroupDir === "desc") {
      setSortGroupDir("asc");
      setSortMode("group");
    } else {
      setSortGroupId(null);
      setSortGroupDir("desc");
      setSortMode("group");
    }
  }

  const groupSortIcon = (gId) => {
    if (sortMode !== "group" || sortGroupId !== gId) return <ArrowUpDownIcon />;
    return sortGroupDir === "desc" ? <ArrowDown10Icon /> : <ArrowDown01Icon />;
  };
  function toggleJurorSort() {
    if (sortMode !== "juror") {
      setSortMode("juror");
      setSortJurorDir("asc");
    } else {
      setSortJurorDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  const visibleJurors = useMemo(() => {
    let list = jurors.slice().sort((a, b) => cmp(a.name, b.name));

    // Apply juror name text filter.
    if (jurorFilter) {
      const q = jurorFilter.toLowerCase();
      list = list.filter((j) => j.name.toLowerCase().includes(q));
    }

    if (sortMode === "juror") {
      list = list.slice().sort((a, b) =>
        sortJurorDir === "asc" ? cmp(a.name, b.name) : cmp(b.name, a.name)
      );
    }
    // Sort by active group column (scored cells only; partial/empty → bottom).
    if (sortMode === "group" && sortGroupId !== null) {
      list = [...list].sort((a, b) => {
        const ea = lookup[a.key]?.[sortGroupId];
        const eb = lookup[b.key]?.[sortGroupId];
        const va = getCellState(ea) === "scored" ? Number(ea.total) : null;
        const vb = getCellState(eb) === "scored" ? Number(eb.total) : null;

        // Nulls always sink to bottom regardless of direction.
        if (va === null && vb === null) return cmp(a.name, b.name);
        if (va === null) return 1;
        if (vb === null) return -1;

        const diff = sortGroupDir === "desc" ? vb - va : va - vb;
        return diff !== 0 ? diff : cmp(a.name, b.name); // stable tie-breaker
      });
    }

    return list;
  }, [jurors, jurorFilter, sortGroupId, sortGroupDir, sortMode, sortJurorDir, lookup, jurorFinalMap]);

  // Average row: completed jurors only (finalSubmittedAt set), fully scored cells.
  const groupAverages = useMemo(() =>
    groups.map((g) => {
      const vals = completedJurors
        .map((j) => {
          const entry = lookup[j.key]?.[g.id];
          if (!entry?.finalSubmittedAt) return null;
          return getCellState(entry) === "scored" ? Number(entry.total) : null;
        })
        .filter((v) => Number.isFinite(v));
      return vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        : null;
    }),
  [completedJurors, groups, lookup]);

  function handleExport() {
    const exportRows = visibleJurors.map((juror) => {
      const wfState = getJurorWorkflowState(juror, groups, lookup, jurorFinalMap);
      const statusLabel = jurorStatusMeta[wfState]?.label ?? wfState;
      const scores = {};
      groups.forEach((g) => {
        const entry = lookup[juror.key]?.[g.id] ?? null;
        const state = getCellState(entry);
        scores[g.id] =
          state === "scored"  ? Number(entry.total) :
          state === "partial" ? getPartialTotal(entry) :
          null;
      });
      return { name: juror.name, dept: juror.dept ?? "", statusLabel, scores };
    });
    void exportGridXLSX(exportRows, groups, { semesterName });
  }

  if (!jurors.length) {
    return (
      <div className="matrix-wrap">
        <div className="admin-section-header">
          <div className="section-label">Evaluation Grid</div>
        </div>
        <div className="empty-msg">No data yet.</div>
      </div>
    );
  }

  return (
    <div className="matrix-wrap">
      <div className="admin-section-header">
        <div className="section-label">Evaluation Grid</div>
      </div>

      {/* Legend */}
      <div className="matrix-subtitle">
        {/* Cell state legend */}
        <div className="matrix-legend-row legend-scroll-row">
          <div className="matrix-legend-scroll" aria-label="Cell state legend">
            <span className="matrix-legend-label">Cells</span>
            <span className="matrix-legend-item"><span className="matrix-legend-dot scored-dot"/>Scored</span>
            <span className="matrix-legend-item"><span className="matrix-legend-dot partial-dot"/>Partial</span>
            <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Empty</span>
          </div>
        </div>
        {/* Juror workflow state legend */}
        <div className="matrix-legend-row matrix-icon-legend legend-scroll-row">
          <div className="matrix-legend-scroll" aria-label="Juror status legend">
            <span className="matrix-legend-label">Juror</span>
            {["completed", "ready_to_submit", "in_progress", "editing", "not_started"].map((key) => {
              const meta = jurorStatusMeta[key];
              const Icon = meta.icon;
              return (
                <span key={key} className="matrix-icon-legend-item">
                  <span className={`matrix-status-icon ${meta.colorClass}`}><Icon /></span>
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="matrix-legend-row matrix-toolbar-row">
          {visibleJurors.length < jurors.length && (
            <span className="matrix-legend-count">
              Showing {visibleJurors.length}/{jurors.length} jurors
            </span>
          )}
          <button className="xlsx-export-btn matrix-export-btn" onClick={handleExport}>
            <DownloadIcon />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="matrix-scroll-top" ref={topScrollRef} aria-hidden="true">
        <div className="matrix-scroll-top-inner" />
      </div>
      <div className="matrix-scroll-wrap">
        <div className="matrix-scroll" ref={tableScrollRef}>
          <table className="matrix-table">
            <thead>
              <tr>
                {/* Juror column — text filter only */}
                <th className="matrix-corner">
                  <div className="matrix-corner-head">
                    <span
                      className={`col-sort-label${isJurorFilterActive ? " filtered" : ""}`}
                      onClick={toggleJurorSort}
                    >
                      Juror / Group
                    </span>
                    <button
                      type="button"
                      className={`col-filter-hotspot${isJurorFilterActive ? " active filter-icon-active" : ""}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilterCol("juror", e); }}
                      title="Filter jurors"
                    ><FilterIcon /></button>
                  </div>
                </th>

              {/* Group columns — click-to-sort only, no filter */}
              {groups.map((g) => {
                const isActive = sortGroupId === g.id;
                return (
                  <th key={g.id}>
                    <button
                      className={`matrix-col-sort${isActive ? " active" : ""}`}
                      onClick={() => toggleGroupSort(g.id)}
                      title={`Sort by ${g.label}`}
                    >
                      <span>{g.groupNo ?? g.label}</span>
                      <span className="sort-icon">{groupSortIcon(g.id)}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleJurors.map((juror) => (
              <tr key={juror.key}>
                <td className="matrix-juror">
                  {(() => {
                    const wfState = getJurorWorkflowState(juror, groups, lookup, jurorFinalMap);
                    const meta = jurorStatusMeta[wfState] ?? jurorStatusMeta.not_started;
                    const Icon = meta.icon;
                    const fullName = juror.dept ? `${juror.name} (${juror.dept})` : juror.name;
                    return (
                      <>
                        <span
                          className={`matrix-status-icon ${meta.colorClass}`}
                          title={meta.label}
                          aria-hidden="true"
                        >
                          <Icon />
                        </span>
                        <span className="matrix-juror-name" title={fullName}>
                          <span className="matrix-juror-name-scroll">
                            {juror.name}
                            {juror.dept && <span className="matrix-juror-dept"> ({juror.dept})</span>}
                          </span>
                        </span>
                      </>
                    );
                  })()}
                </td>
                {groups.map((g) => {
                  const entry = lookup[juror.key]?.[g.id] ?? null;
                  const state = getCellState(entry);
                  const isFinal = jurorFinalMap.get(juror.key) && !juror.editEnabled;
                  return (
                    <td key={g.id} style={cellStyle(state, isFinal)}>{cellText(state, entry)}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="matrix-avg-row">
              <td className="matrix-juror matrix-avg-label">Average</td>
              {groupAverages.map((avg, i) => (
                <td key={groups[i].id} className="matrix-avg-cell">
                  {avg !== null ? avg : "—"}
                </td>
              ))}
            </tr>
          </tfoot>
          </table>
        </div>
      </div>

      {/* Info note */}
      <p className="matrix-info-note"><InfoIcon /> Averages include only completed jurors.</p>

      <FilterPopoverPortal
        open={activeFilterCol === "juror"}
        anchorRect={anchorRect}
        anchorEl={anchorEl}
        onClose={closePopover}
        className="col-filter-popover col-filter-popover-portal"
        contentKey={jurorFilter}
      >
        <input
          autoFocus
          placeholder="Filter juror name…"
          value={jurorFilter}
          onChange={(e) => setJurorFilter(e.target.value)}
          className={isJurorFilterActive ? "filter-input-active" : ""}
        />
        {jurorFilter && (
          <button className="col-filter-clear" onClick={() => { setJurorFilter(""); closePopover(); }}>
            Clear
          </button>
        )}
      </FilterPopoverPortal>
    </div>
  );
}
