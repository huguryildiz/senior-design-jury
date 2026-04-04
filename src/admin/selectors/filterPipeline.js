// src/admin/selectors/filterPipeline.js
// ============================================================
// Pure selector functions extracted from the Reviews page pipeline.
//
// No React. No useMemo. No side effects.
// All functions are safe to import and unit-test in isolation.
// ============================================================

import { rowKey } from "../utils/adminUtils";
import { getCellState } from "../utils/scoreHelpers";
import {
  buildDateRange,
  toFiniteNumber,
  hasActiveValidNumberRange,
  isMissing,
} from "../hooks/useReviewsFilters";
import { cmp, tsToMillis } from "../utils/adminUtils";

// ── buildProjectMetaMap ──────────────────────────────────────
// Builds a Map from summaryData: projectId -> { title, students }
//
// @param {Array} summaryData
// @returns {Map<string, { title: string, students: string }>}
export function buildProjectMetaMap(summaryData) {
  return new Map(
    (summaryData || []).map((p) => [
      p.id,
      { title: p?.title ?? p?.name ?? "", students: p?.members ?? p?.students ?? "" },
    ])
  );
}

// ── buildJurorEditMap ────────────────────────────────────────
// Builds a Map keyed by jurorId, key, and name+dept compound key
// to boolean indicating whether edit mode is enabled.
//
// @param {Array} jurors
// @returns {Map<string, boolean>}
export function buildJurorEditMap(jurors) {
  const map = new Map();
  (jurors || []).forEach((j) => {
    const editEnabled = !!(j.editEnabled ?? j.edit_enabled);
    if (j.jurorId) map.set(j.jurorId, editEnabled);
    if (j.key) map.set(j.key, editEnabled);
    const name = String(j.name ?? j.juryName ?? "")
      .trim()
      .toLowerCase();
    const dept = String(j.dept ?? j.affiliation ?? "")
      .trim()
      .toLowerCase();
    if (name || dept) map.set(`${name}__${dept}`, editEnabled);
  });
  return map;
}

// ── buildJurorFinalMap ───────────────────────────────────────
// Builds a Map keyed by jurorId, key, and name+dept compound key
// to the finalSubmittedAt timestamp string (empty string = not final).
// A non-empty string is truthy, so callers can still use it as a boolean.
// Source: listJurorsSummary() rows (finalSubmittedAt / finalSubmitted).
//
// @param {Array} jurors
// @returns {Map<string, string>}
export function buildJurorFinalMap(jurors) {
  const map = new Map();
  (jurors || []).forEach((j) => {
    const ts =
      (typeof j.finalSubmittedAt === "string" && j.finalSubmittedAt) ||
      (typeof j.final_submitted_at === "string" && j.final_submitted_at) ||
      "";
    if (j.jurorId) map.set(j.jurorId, ts);
    if (j.key) map.set(j.key, ts);
    const name = String(j.name ?? j.juryName ?? "")
      .trim()
      .toLowerCase();
    const dept = String(j.dept ?? j.affiliation ?? "")
      .trim()
      .toLowerCase();
    if (name || dept) map.set(`${name}__${dept}`, ts);
  });
  return map;
}

// ── deriveGroupNoOptions ─────────────────────────────────────
// Extracts unique group numbers from data, sorted by Turkish
// locale with numeric collation.
//
// @param {Array} data - score rows
// @returns {string[]}
export function deriveGroupNoOptions(data) {
  const map = new Map();
  (data || []).forEach((row) => {
    const label = String(row?.groupNo ?? "").trim();
    if (!label) return;
    map.set(label.toLowerCase(), label);
  });
  return Array.from(map.entries())
    .sort((a, b) => a[1].localeCompare(b[1], "tr", { numeric: true }))
    .map(([, label]) => label);
}

// ── generateMissingRows ──────────────────────────────────────
// Creates placeholder rows for juror x project combinations
// not present in the existing data.
//
// @param {Array}  assignedJurors - jurors to cross-join with groups
// @param {Array}  groups         - project/group list
// @param {Array}  existingData   - actual score rows from DB
// @param {Map}    projectMeta    - output of buildProjectMetaMap
// @returns {Array}
export function generateMissingRows(
  assignedJurors,
  groups,
  existingData,
  projectMeta
) {
  const assignedList =
    Array.isArray(assignedJurors) && assignedJurors.length
      ? assignedJurors
      : [];
  const groupList = Array.isArray(groups) ? groups : [];

  const existingKeys = new Set();
  (existingData || []).forEach((row) => {
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
      const affiliation = String(j.dept ?? j.affiliation ?? "").trim();
      if (!jurorId && !juryName) return;
      const jurorKey = rowKey({ jurorId, juryName, affiliation });
      groupList.forEach((g) => {
        const projectId = g.id ?? g.projectId;
        if (!projectId) return;
        const key = `${jurorKey}__${projectId}`;
        if (existingKeys.has(key)) return;
        const meta = projectMeta.get(projectId);
        generated.push({
          jurorId,
          juryName,
          affiliation,
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

  return generated;
}

// ── enrichRows ───────────────────────────────────────────────
// Adds derived fields to combined rows: title, students,
// isEditing, effectiveStatus, jurorStatus.
//
// @param {Array}  rows          - combined data + generated rows
// @param {Map}    projectMeta   - output of buildProjectMetaMap
// @param {Map}    jurorEditMap  - output of buildJurorEditMap
// @param {Array}  groups        - project/group list (for totalGroups count)
// @param {string} periodName  - current period name
// @returns {Array}
export function enrichRows(rows, projectMeta, jurorEditMap, groups, periodName, jurorFinalMap = new Map(), criteria = []) {
  const groupList = Array.isArray(groups) ? groups : [];
  const totalGroups = groupList.length;

  // Build juror aggregate map for jurorStatus computation
  const jurorAgg = new Map();
  rows.forEach((row) => {
    const key = rowKey(row);
    if (!key) return;
    const cellSt = getCellState(row, criteria);
    const prev = jurorAgg.get(key) || {
      scored: 0,
      started: 0,
      isFinal: false,
      jurorId: row.jurorId,
    };
    if (cellSt === "scored") prev.scored += 1;
    if (cellSt !== "empty") prev.started += 1;
    if (
      row.finalSubmittedAt ||
      row.finalSubmittedMs ||
      jurorFinalMap.get(row.jurorId) ||
      jurorFinalMap.get(key)
    ) prev.isFinal = true;
    jurorAgg.set(key, prev);
  });

  // Derive per-juror workflow status
  const jurorStatusMap = new Map();
  jurorAgg.forEach((agg, key) => {
    const isEditing = !!(
      jurorEditMap.get(agg.jurorId) || jurorEditMap.get(key)
    );
    if (isEditing) {
      jurorStatusMap.set(key, "editing");
      return;
    }
    if (agg.isFinal) {
      jurorStatusMap.set(key, "completed");
      return;
    }
    if (totalGroups > 0 && agg.scored >= totalGroups) {
      jurorStatusMap.set(key, "ready_to_submit");
      return;
    }
    if (agg.started > 0) {
      jurorStatusMap.set(key, "in_progress");
      return;
    }
    jurorStatusMap.set(key, "not_started");
  });

  return rows.map((row) => {
    const meta = projectMeta.get(row.projectId);
    const title = String(row.projectName ?? meta?.title ?? "").trim();
    const studentsRaw = row.students ?? meta?.students ?? "";
    const students = Array.isArray(studentsRaw)
      ? studentsRaw
          .map((s) => String(s).trim())
          .filter(Boolean)
          .join(", ")
      : String(studentsRaw).trim();
    const jurorKey = rowKey(row);
    const isEditing = !!(
      jurorEditMap.get(row.jurorId) || jurorEditMap.get(jurorKey)
    );
    const finalTs =
      row.finalSubmittedAt ||
      jurorFinalMap.get(row.jurorId) ||
      jurorFinalMap.get(jurorKey) ||
      "";
    return {
      ...row,
      period: row.period ?? periodName ?? "",
      title,
      students,
      isEditing,
      finalSubmittedAt: finalTs,
      effectiveStatus: getCellState(row, criteria),
      jurorStatus: jurorStatusMap.get(jurorKey) || "not_started",
    };
  });
}

// ── applyFilters ─────────────────────────────────────────────
// Applies all filter predicates in sequence.
//
// @param {Array}  rows         - enriched rows
// @param {object} filterState  - encapsulates all filter values
// @returns {Array}
export function applyFilters(rows, filterState) {
  const {
    periodName,
    filterGroupNo,
    filterJuror,
    filterDept,
    filterStatus,
    filterJurorStatus,
    filterProjectTitle,
    filterStudents,
    updatedFrom,
    updatedTo,
    updatedParsedFrom,
    updatedParsedTo,
    updatedParsedFromMs,
    updatedParsedToMs,
    isUpdatedInvalidRange,
    completedFrom,
    completedTo,
    completedParsedFrom,
    completedParsedTo,
    completedParsedFromMs,
    completedParsedToMs,
    isCompletedInvalidRange,
    scoreFilters,
    scoreKeys,
    filterComment,
  } = filterState;

  let list = rows;

  if (periodName) {
    const q = String(periodName).trim().toLowerCase();
    list = list.filter(
      (r) => String(r.period || "").trim().toLowerCase() === q
    );
  }
  if (Array.isArray(filterGroupNo)) {
    if (filterGroupNo.length === 0) return [];
    const set = new Set(
      filterGroupNo.map((v) => String(v).trim().toLowerCase())
    );
    list = list.filter((r) =>
      set.has(String(r.groupNo ?? "").trim().toLowerCase())
    );
  }
  if (filterJuror) {
    const q = filterJuror.toLowerCase();
    list = list.filter((r) =>
      `${r.juryName ?? ""} ${r.affiliation ?? ""}`.toLowerCase().includes(q)
    );
  }
  if (filterDept) {
    const q = filterDept.toLowerCase();
    list = list.filter((r) =>
      String(r.affiliation ?? "")
        .toLowerCase()
        .includes(q)
    );
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
    list = list.filter((r) =>
      (r.title || "").toLowerCase().includes(q)
    );
  }
  if (filterStudents) {
    const q = filterStudents.toLowerCase();
    list = list.filter((r) => (r.students || "").toLowerCase().includes(q));
  }

  // Updated date range filter
  const canApplyUpdated =
    updatedFrom &&
    updatedParsedFromMs !== null &&
    (!updatedTo || updatedParsedToMs !== null) &&
    !isUpdatedInvalidRange;
  if ((updatedFrom || updatedTo) && canApplyUpdated) {
    const { fromMs: updatedFromMs, toMs: updatedToMs } = buildDateRange(
      updatedParsedFrom,
      updatedParsedTo
    );
    list = list.filter((r) => {
      const ms = r.updatedMs || tsToMillis(r.updatedAt);
      return ms >= updatedFromMs && ms <= updatedToMs;
    });
  }

  // Completed date range filter
  const canApplyCompleted =
    completedFrom &&
    completedParsedFromMs !== null &&
    (!completedTo || completedParsedToMs !== null) &&
    !isCompletedInvalidRange;
  if ((completedFrom || completedTo) && canApplyCompleted) {
    const { fromMs: completedFromMs, toMs: completedToMs } = buildDateRange(
      completedParsedFrom,
      completedParsedTo
    );
    list = list.filter((r) => {
      const ms = r.finalSubmittedMs || tsToMillis(r.finalSubmittedAt);
      return ms >= completedFromMs && ms <= completedToMs;
    });
  }

  // Score range filters
  const activeScoreFilters = (scoreKeys || []).filter((key) => {
    const filter = scoreFilters[key];
    return (filter?.min ?? "") !== "" || (filter?.max ?? "") !== "";
  });
  if (activeScoreFilters.length > 0) {
    list = list.filter((r) => {
      for (const key of activeScoreFilters) {
        const filter = scoreFilters[key];
        let min = toFiniteNumber(filter?.min);
        let max = toFiniteNumber(filter?.max);
        if (min !== null && max !== null && min > max) {
          continue;
        }
        const value = toFiniteNumber(r[key]);
        if (value === null) return false;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
      }
      return true;
    });
  }

  // Comment filter
  if (filterComment) {
    const q = filterComment.toLowerCase();
    list = list.filter((r) => (r.comments || "").toLowerCase().includes(q));
  }

  return list;
}

// ── sortRows ─────────────────────────────────────────────────
// Applies sort to rows using the same comparator as the original.
//
// @param {Array}  rows    - filtered rows
// @param {string|null} sortKey
// @param {string} sortDir - "asc" | "desc"
// @returns {Array}
export function sortRows(rows, sortKey, sortDir) {
  if (!sortKey) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = a[sortKey],
      bv = b[sortKey];
    const aMiss = isMissing(av);
    const bMiss = isMissing(bv);
    if (aMiss && bMiss) return 0;
    if (aMiss) return 1;
    if (bMiss) return -1;
    return sortDir === "asc" ? cmp(av, bv) : cmp(bv, av);
  });
  return sorted;
}

// ── computeActiveFilterCount ─────────────────────────────────
// Counts the number of active filters (excluding sort).
//
// @param {object} filterState
// @returns {number}
export function computeActiveFilterCount(filterState) {
  const {
    filterGroupNo,
    filterJuror,
    filterDept,
    filterStatus,
    filterJurorStatus,
    filterProjectTitle,
    filterStudents,
    isUpdatedDateFilterValid,
    isCompletedDateFilterValid,
    scoreFilters,
    scoreKeys,
    filterComment,
  } = filterState;

  let count = 0;
  if (Array.isArray(filterGroupNo)) count += 1;
  if (filterJuror) count += 1;
  if (filterDept) count += 1;
  if (Array.isArray(filterStatus)) count += 1;
  if (Array.isArray(filterJurorStatus)) count += 1;
  if (filterProjectTitle) count += 1;
  if (filterStudents) count += 1;
  if (isUpdatedDateFilterValid) count += 1;
  if (isCompletedDateFilterValid) count += 1;
  (scoreKeys || []).forEach((key) => {
    const f = scoreFilters[key];
    if (hasActiveValidNumberRange(f)) count += 1;
  });
  if (filterComment) count += 1;
  return count;
}
