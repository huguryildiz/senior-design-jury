// src/admin/components/details/ScoreDetailsTable.jsx
// ============================================================
// Presentational component: scroll-synced table with thead,
// tbody, ColHeader, and TablePagination.
// topScrollRef and tableScrollRef are passed as regular props.
// ============================================================

import { FilterIcon } from "../../../shared/Icons";
import { StatusBadge } from "../../components";
import { rowKey } from "../../utils";

// ── Pure utility functions ─────────────────────────────────

// Show "" for null/undefined/empty/NaN. 0 is a valid score.
export function displayScore(val) {
  if (val === "" || val === null || val === undefined) return "";
  if (typeof val === "string" && val.trim() === "") return "";
  const n = Number(val);
  if (!Number.isFinite(n)) return "";
  return n;
}

export function formatDateOnlyFromMs(ms) {
  if (!Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export const SWIPE_ACTIVATION_PX = 6;

export function enableCellScroll(evt) {
  const el = evt.currentTarget;
  if (!el || !el.classList) return;
  if (typeof el.matches === "function" && !el.matches(":focus-visible")) return;
  el.classList.add("is-scrollable");
}
export function disableCellScroll(evt) {
  const el = evt.currentTarget;
  if (!el || !el.classList) return;
  el.classList.remove("is-scrollable");
  const inner = el.firstElementChild;
  if (inner) { inner.style.transition = ""; inner.style.transform = ""; }
  delete el.dataset.currentTranslate;
}
export function handleCellTouchStart(evt) {
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
export function handleCellTouchMove(evt) {
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

  const maxScroll     = Number(el.dataset.maxScroll ?? "0");
  const baseTranslate = Number(el.dataset.baseTranslate ?? "0");
  const newTranslate  = Math.min(0, Math.max(-maxScroll, baseTranslate + rawDx));
  inner.style.transform = `translateX(${newTranslate}px)`;
  el.dataset.currentTranslate = String(newTranslate);
}
export function handleCellTouchEnd(evt) {
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
export const CELL_SCROLL_PROPS = {
  className: "detail-cell-scroll",
  tabIndex: 0,
  onFocus: enableCellScroll,
  onBlur: disableCellScroll,
  onTouchStart: handleCellTouchStart,
  onTouchMove: handleCellTouchMove,
  onTouchEnd: handleCellTouchEnd,
  onTouchCancel: handleCellTouchEnd,
};
export function updateNativeCellScrollState(el) {
  if (!el || !el.classList) return;
  const isOverflowing = el.scrollWidth > el.clientWidth + 1;
  el.classList.toggle("is-overflowing", isOverflowing);
  el.classList.toggle("is-scrolled", el.scrollLeft > 0);
}
export function handleNativeCellScroll(evt) {
  updateNativeCellScrollState(evt.currentTarget);
}
export function setNativeCellScrollRef(el) {
  updateNativeCellScrollState(el);
}
export const CELL_SCROLL_NATIVE_PROPS = {
  className: "detail-cell-scroll is-native-scroll",
  onScroll: handleNativeCellScroll,
  ref: setNativeCellScrollRef,
};

export function buildPageTokens(current, total) {
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

export const joinClass = (...parts) => parts.filter(Boolean).join(" ");

// ── TablePagination ────────────────────────────────────────
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

// ── ScoreDetailsTable ──────────────────────────────────────
/**
 * Props:
 *   rows          — all filtered + sorted rows (for empty state)
 *   pageRows      — current page slice of rows
 *   columns       — column definitions
 *   sortKey, sortDir, onSort
 *   openFilterCol — handler for filter icon clicks
 *   activeFilterCol
 *   cellScrollProps — CELL_SCROLL_PROPS or CELL_SCROLL_NATIVE_PROPS
 *   topScrollRef  — ref for the fake top scrollbar div
 *   tableScrollRef — ref for the table wrapper div
 *   currentPage, totalPages, pageSize, onPageChange, onPageSizeChange
 */
export default function ScoreDetailsTable({
  rows,
  pageRows,
  columns,
  sortKey,
  sortDir,
  onSort,
  openFilterCol,
  activeFilterCol,
  cellScrollProps,
  topScrollRef,
  tableScrollRef,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  return (
    <>
      <div className="details-scroll-hint">
        <span className="details-scroll-icon" aria-hidden="true"><FilterIcon /></span>
        <span>Swipe to view more columns. Long text scrolls on touch.</span>
        <span title="Click a column header to sort. Use the filter inputs to narrow results." style={{cursor:'help', opacity:0.6, fontSize:12, marginLeft:6}}>ⓘ</span>
      </div>

      {/* Top scroll sync bar */}
      <div className="detail-table-scroll-top" ref={topScrollRef} aria-hidden="true">
        <div className="detail-table-scroll-top-inner" />
      </div>

      {/* Main table */}
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
                  onSort={onSort}
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
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRows={rows.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
