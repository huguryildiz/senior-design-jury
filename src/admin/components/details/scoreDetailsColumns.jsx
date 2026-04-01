// src/admin/components/details/scoreDetailsColumns.jsx
// ============================================================
// Column definitions builder for the Score Details table.
// Filter-config factories live in scoreDetailsFilterConfigs.jsx.
// ============================================================

import { formatTs } from "../../utils";
import { displayScore } from "./ScoreDetailsTable";
import {
  STATUS_OPTIONS,
  JUROR_STATUS_OPTIONS,
  hasActiveValidNumberRange,
} from "../../hooks/useScoreDetailsFilters";

// Re-export filter config utilities so ScoreDetails.jsx can
// import everything from a single module if desired.
export { buildPopoverConfig } from "./scoreDetailsFilterConfigs.jsx";

// ── Column definitions builder ───────────────────────────────

export function buildColumns({
  scoreCols,
  scoreFilters,
  activeFilterCol,
  groupNoOptions,
  // filter state
  filterGroupNo, setFilterGroupNo,
  filterProjectTitle, setFilterProjectTitle,
  filterStudents, setFilterStudents,
  filterJuror, setFilterJuror,
  filterDept, setFilterDept,
  filterStatus, setFilterStatus,
  filterJurorStatus, setFilterJurorStatus,
  filterComment, setFilterComment,
  setScoreFilters,
  // dates
  updatedFrom, updatedTo,
  completedFrom, completedTo,
  updatedParsedFrom, updatedParsedTo,
  completedParsedFrom, completedParsedTo,
  updatedDateError, completedDateError,
  setUpdatedFrom, setUpdatedTo, setUpdatedDateError,
  setCompletedFrom, setCompletedTo, setCompletedDateError,
  // active states
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
}) {
  const updatedDateFilterValue = { from: updatedFrom, to: updatedTo };
  const completedDateFilterValue = { from: completedFrom, to: completedTo };
  const base = [
    {
      id: "groupNo",
      label: "Group No",
      sortKey: "groupNo",
      filter: {
        type: "multi",
        value: filterGroupNo,
        setValue: setFilterGroupNo,
        options: groupNoOptions.map((l) => ({ value: l, label: l })),
        allLabel: "All Groups",
        allMode: "all",
        isActive: isGroupNoFilterActive,
        clear: () => setFilterGroupNo(null),
        searchable: true,
      },
      className: "cell-group-no",
    },
    {
      id: "projectTitle",
      label: "Title",
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
      label: "Students",
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
      label: "Affiliation",
      sortKey: "juryDept",
      filter: {
        type: "text",
        value: filterDept,
        setValue: setFilterDept,
        placeholder: "Search Affiliation",
        isActive: isDeptFilterActive,
        clear: () => setFilterDept(""),
      },
      className: "cell-dept",
      minWidthClass: "col-dept",
    },
    {
      id: "status",
      label: "Score Status",
      sortKey: "effectiveStatus",
      filter: {
        type: "multi",
        value: filterStatus,
        setValue: setFilterStatus,
        options: STATUS_OPTIONS,
        allLabel: "All Statuses",
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
        allLabel: "All Statuses",
        allMode: "all",
        isActive: isJurorStatusFilterActive,
        clear: () => setFilterJurorStatus(null),
      },
      className: "cell-juror-status",
    },
  ];

  const scores = scoreCols.map(({ key: col, label }) => {
    const filterValue = scoreFilters[col] || { min: "", max: "" };
    const isActive = hasActiveValidNumberRange(filterValue) || activeFilterCol === col;
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
}
