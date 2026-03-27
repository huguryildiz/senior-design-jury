// src/admin/ScoreDetails.jsx
// ============================================================
// Sortable details table with Excel-style column header filters.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { exportXLSX } from "./xlsx/exportXLSX";
import {
  FilterPanelActions,
} from "./components";
import { getActiveCriteria } from "../shared/criteriaHelpers";
import { SearchIcon } from "../shared/Icons";
import { useAuth } from "../shared/auth";

import {
  useScoreDetailsFilters,
  DEFAULT_SORT_DIR,
} from "./hooks/useScoreDetailsFilters";

import {
  buildProjectMetaMap,
  buildJurorEditMap,
  deriveGroupNoOptions,
  generateMissingRows,
  enrichRows,
  applyFilters,
  sortRows,
  computeActiveFilterCount,
} from "./selectors/filterPipeline";

import { useScrollSync } from "./useScrollSync";

import ScoreDetailsFilters from "./components/details/ScoreDetailsFilters";
import ScoreDetailsTable, {
  CELL_SCROLL_PROPS,
  CELL_SCROLL_NATIVE_PROPS,
} from "./components/details/ScoreDetailsTable";

import ScoreDetailsHeader from "./components/details/ScoreDetailsHeader";
import { buildColumns, buildPopoverConfig } from "./components/details/scoreDetailsColumns.jsx";
import { toggleMulti as toggleMultiFn, buildSortLabel, buildActiveFilterChips } from "./components/details/scoreDetailsHelpers.js";

// jurors prop: { key, name, dept }[]
export default function ScoreDetails({
  data,
  jurors,
  assignedJurors = null,
  groups = [],
  semesterName = "",
  summaryData = [],
  loading = false,
  criteriaTemplate,
}) {
  const { activeTenant } = useAuth();
  const tenantCode = activeTenant?.code || "";
  const activeCriteria = useMemo(
    () => getActiveCriteria(criteriaTemplate),
    [criteriaTemplate]
  );
  const {
    scoreCols,
    scoreKeys,
    scoreMaxByKey,
    updateScoreFilter,
    buildEmptyFilters,
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
    updatedDateError, setUpdatedDateError,
    completedDateError, setCompletedDateError,
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
    sortKey, setSortKey,
    sortDir, setSortDir,
    pageSize, setPageSize,
    currentPage, setCurrentPage,
    activeFilterCol, setActiveFilterCol,
    anchorRect, setAnchorRect,
    anchorEl, setAnchorEl,
    multiSearchQuery, setMultiSearchQuery,
    showStatusLegend, setShowStatusLegend,
    filterPresentation,
  } = useScoreDetailsFilters(activeCriteria);

  const scoreFilterMax = scoreMaxByKey.total;

  const useSheetFilters = filterPresentation.mode === "sheet";

  const [isTouchInput, setIsTouchInput] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches
  ));

  // Scroll sync refs — must stay in ScoreDetails
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const cellScrollProps = isTouchInput ? CELL_SCROLL_NATIVE_PROPS : CELL_SCROLL_PROPS;

  const projectMetaById = useMemo(
    () => buildProjectMetaMap(summaryData),
    [summaryData]
  );

  const groupNoOptions = useMemo(() => deriveGroupNoOptions(data), [data]);

  const jurorEditMap = useMemo(() => buildJurorEditMap(jurors), [jurors]);

  // Touch detection effect
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

  // Scroll sync — delegates to shared hook
  useScrollSync(topScrollRef, tableScrollRef);

  const isUpdatedDateFilterValid = useMemo(() => (
    !!updatedFrom
    && updatedParsedFromMs !== null
    && (!updatedTo || updatedParsedToMs !== null)
    && !isUpdatedInvalidRange
  ), [updatedFrom, updatedTo, updatedParsedFromMs, updatedParsedToMs, isUpdatedInvalidRange]);

  const isCompletedDateFilterValid = useMemo(() => (
    !!completedFrom
    && completedParsedFromMs !== null
    && (!completedTo || completedParsedToMs !== null)
    && !isCompletedInvalidRange
  ), [completedFrom, completedTo, completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange]);

  const activeFilterCount = useMemo(() => computeActiveFilterCount({
    filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus,
    filterProjectTitle, filterStudents, isUpdatedDateFilterValid, isCompletedDateFilterValid,
    scoreFilters, scoreKeys, filterComment,
  }), [filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle, filterStudents, isUpdatedDateFilterValid, isCompletedDateFilterValid, scoreFilters, filterComment]);

  const hasAnyFilter = activeFilterCount > 0;
  const isGroupNoFilterActive = Array.isArray(filterGroupNo) || activeFilterCol === "groupNo";
  const isJurorFilterActive = !!filterJuror || activeFilterCol === "juror";
  const isDeptFilterActive = !!filterDept || activeFilterCol === "dept";
  const isStatusFilterActive = Array.isArray(filterStatus) || activeFilterCol === "status";
  const isJurorStatusFilterActive = Array.isArray(filterJurorStatus) || activeFilterCol === "jurorStatus";
  const isProjectTitleFilterActive = !!filterProjectTitle || activeFilterCol === "projectTitle";
  const isStudentsFilterActive = !!filterStudents || activeFilterCol === "students";
  const isUpdatedDateFilterActive = isUpdatedDateFilterValid || activeFilterCol === "updatedAt";
  const isCompletedDateFilterActive = isCompletedDateFilterValid || activeFilterCol === "completedAt";
  const isCommentFilterActive = !!filterComment || activeFilterCol === "comment";

  function resetFilters() {
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
    setScoreFilters(buildEmptyFilters());
    setFilterComment("");
    setSortKey(null);
    setSortDir(DEFAULT_SORT_DIR);
    setActiveFilterCol(null);
    setAnchorRect(null);
  }

  function closePopover() {
    setActiveFilterCol(null);
    setAnchorRect(null);
    setAnchorEl(null);
    setMultiSearchQuery("");
  }

  const toggleMulti = toggleMultiFn;

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

  // ── Rows computation ────────────────────────────────────
  const filteredData = useMemo(() => {
    const assignedList = Array.isArray(assignedJurors) && assignedJurors.length
      ? assignedJurors
      : (Array.isArray(jurors) ? jurors : []);

    const generated = generateMissingRows(assignedList, groups, data, projectMetaById);
    const combinedRows = [...data, ...generated];
    const enriched = enrichRows(combinedRows, projectMetaById, jurorEditMap, groups, semesterName);

    const filtered = applyFilters(enriched, {
      semesterName, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus,
      filterProjectTitle, filterStudents,
      updatedFrom, updatedTo, updatedParsedFrom, updatedParsedTo,
      updatedParsedFromMs, updatedParsedToMs, isUpdatedInvalidRange,
      completedFrom, completedTo, completedParsedFrom, completedParsedTo,
      completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange,
      scoreFilters, scoreKeys, filterComment,
    });

    return sortRows(filtered, sortKey, sortDir);
  }, [data, projectMetaById, semesterName, filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle, filterStudents,
      updatedFrom, updatedTo, completedFrom, completedTo, updatedParsedFrom, updatedParsedTo, completedParsedFrom, completedParsedTo,
      updatedParsedFromMs, updatedParsedToMs, completedParsedFromMs, completedParsedToMs, isUpdatedInvalidRange, isCompletedInvalidRange,
      scoreFilters, filterComment, sortKey, sortDir, jurorEditMap, assignedJurors, jurors, groups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus,
      filterProjectTitle, filterStudents, updatedFrom, updatedTo, completedFrom, completedTo, scoreFilters, filterComment,
      sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage   = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageRows   = filteredData.slice(pageStart, pageStart + pageSize);

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

  // ── Columns definition ──────────────────────────────────
  const columns = useMemo(() => buildColumns({
    scoreCols,
    scoreFilters,
    activeFilterCol,
    groupNoOptions,
    filterGroupNo, setFilterGroupNo,
    filterProjectTitle, setFilterProjectTitle,
    filterStudents, setFilterStudents,
    filterJuror, setFilterJuror,
    filterDept, setFilterDept,
    filterStatus, setFilterStatus,
    filterJurorStatus, setFilterJurorStatus,
    filterComment, setFilterComment,
    setScoreFilters,
    updatedFrom, updatedTo,
    completedFrom, completedTo,
    updatedParsedFrom, updatedParsedTo,
    completedParsedFrom, completedParsedTo,
    updatedDateError, completedDateError,
    setUpdatedFrom, setUpdatedTo, setUpdatedDateError,
    setCompletedFrom, setCompletedTo, setCompletedDateError,
    isGroupNoFilterActive,
    isJurorFilterActive,
    isDeptFilterActive,
    isStatusFilterActive,
    isJurorStatusFilterActive,
    isProjectTitleFilterActive,
    isStudentsFilterActive,
    isUpdatedDateFilterActive,
    isCompletedDateFilterActive,
    isCommentFilterActive,
  }), [
    filterGroupNo, filterJuror, filterDept, filterStatus, filterJurorStatus, filterProjectTitle,
    filterStudents, filterComment, updatedFrom, updatedTo, completedFrom, completedTo, updatedParsedFrom, updatedParsedTo,
    completedParsedFrom, completedParsedTo, updatedDateError, completedDateError, scoreFilters, activeFilterCol,
    groupNoOptions,
    isGroupNoFilterActive, isJurorFilterActive, isDeptFilterActive, isStatusFilterActive,
    isJurorStatusFilterActive, isProjectTitleFilterActive, isStudentsFilterActive, isUpdatedDateFilterActive,
    isCompletedDateFilterActive, isCommentFilterActive, sortKey, sortDir,
  ]);

  const columnsById = useMemo(() => new Map(columns.map((col) => [col.id, col])), [columns]);

  const sortLabel = useMemo(
    () => buildSortLabel(columns, sortKey, sortDir),
    [columns, sortKey, sortDir]
  );

  function clearSort() {
    setSortKey(null);
    setSortDir(DEFAULT_SORT_DIR);
  }

  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(columns),
    [columns]
  );

  const openFilterCol = (colId, evt) => {
    const col = columnsById.get(colId);
    col?.filter?.onOpen?.();
    setMultiSearchQuery("");
    toggleFilterCol(colId, evt);
  };

  // ── Popover config ─────────────────────────────────────────
  const popoverConfig = buildPopoverConfig(activeFilterCol, columnsById, {
    useSheetFilters,
    closePopover,
    toggleMulti,
    multiSearchQuery,
    setMultiSearchQuery,
    scoreFilters,
    scoreMaxByKey,
    scoreFilterMax,
    updateScoreFilter,
    setScoreFilters,
    SearchIcon,
    FilterPanelActions,
  });

  return (
    <div className="score-details">
      <ScoreDetailsHeader
        filteredCount={filteredData.length}
        onExport={() => {
          exportXLSX(filteredData, {
            semesterName: semesterName || "VERA",
            criteria: activeCriteria,
            summaryData,
            tenantCode,
          });
        }}
      />

      <ScoreDetailsFilters
        showStatusLegend={showStatusLegend}
        setShowStatusLegend={setShowStatusLegend}
        loading={loading}
        hasAnyFilter={hasAnyFilter}
        sortLabel={sortLabel}
        activeFilterChips={activeFilterChips}
        onResetFilters={resetFilters}
        onClearSort={clearSort}
        popoverConfig={popoverConfig}
        anchorRect={anchorRect}
        anchorEl={anchorEl}
        activeFilterCol={activeFilterCol}
        onClosePopover={closePopover}
      />

      <ScoreDetailsTable
        rows={filteredData}
        pageRows={pageRows}
        columns={columns}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={setSort}
        openFilterCol={openFilterCol}
        activeFilterCol={activeFilterCol}
        cellScrollProps={cellScrollProps}
        topScrollRef={topScrollRef}
        tableScrollRef={tableScrollRef}
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
