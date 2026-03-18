// src/admin/xlsx/exportXLSX.js
// ============================================================
// Async XLSX export functions for the admin panel.
//
// Extracted from src/admin/utils.js (Phase 5 — Final Decomposition).
// Heavy xlsx-js-style dependency is dynamically imported so it only
// loads when an export is triggered.
// ============================================================

import { CRITERIA } from "../../config";
import { getCellState } from "../scoreHelpers";
import { rowKey } from "../utils";

// ── Private helpers ───────────────────────────────────────────

function exportScoreValue(v) {
  if (v === "" || v === null || v === undefined) return "";
  if (typeof v === "string" && v.trim() === "") return "";
  if (typeof v === "number" && !Number.isFinite(v)) return "";
  return v;
}

function formatExportTimestamp(value) {
  if (!value) return "";
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
}

function buildAuditExportFilename(filters = {}, search = "") {
  const parts = [];
  if (filters.startDate) parts.push(String(filters.startDate).split("T")[0]);
  if (filters.endDate) parts.push(String(filters.endDate).split("T")[0]);
  const searchTag = String(search || "").trim();
  if (searchTag) parts.push(searchTag.slice(0, 24));
  const tag = parts.length ? parts.join("_") : "all";
  return buildExportFilename("audit-log", tag);
}

// ── Public API ────────────────────────────────────────────────

export function buildExportFilename(type, semesterName, ext = "xlsx") {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");
  const hh   = String(now.getHours()).padStart(2, "0");
  const min  = String(now.getMinutes()).padStart(2, "0");
  const safeSem  = String(semesterName || "semester").trim().toLowerCase()
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const safeType = String(type || "export").trim().toLowerCase()
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `vera_${safeType}_${safeSem}_${yyyy}-${mm}-${dd}_${hh}${min}.${ext}`;
}

export async function exportAuditLogsXLSX(rows, { filters = {}, search = "" } = {}) {
  const XLSX = await import("xlsx-js-style");
  const headers = [
    "created_at",
    "actor_type",
    "action",
    "entity_type",
    "message",
    "actor_id",
    "entity_id",
    "metadata",
  ];
  const data = (rows || []).map((r) => [
    formatExportTimestamp(r.created_at),
    r.actor_type ?? "",
    r.action ?? "",
    r.entity_type ?? "",
    r.message ?? "",
    r.actor_id ?? "",
    r.entity_id ?? "",
    r.metadata ? JSON.stringify(r.metadata) : "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = [22, 12, 18, 16, 48, 36, 36, 60].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
  XLSX.writeFile(wb, buildAuditExportFilename(filters, search));
}

export async function exportXLSX(rows, { semesterName = "", summaryData = [], jurors = [], includeEmptyRows = false } = {}) {
  const XLSX = await import("xlsx-js-style");

  // Build projectId → group_students lookup from summaryData
  const studentsMap = new Map(
    (summaryData || []).map((p) => [p.id, p.students ?? p.group_students ?? ""])
  );

  const projectList = Array.isArray(summaryData) ? summaryData : [];
  const baseRows = Array.isArray(rows) ? rows : [];
  const existingKeys = new Set();
  baseRows.forEach((row) => {
    if (!row?.projectId) return;
    const key = rowKey(row);
    if (!key) return;
    existingKeys.add(`${key}__${row.projectId}`);
  });

  const generated = [];
  if (includeEmptyRows && jurors.length && projectList.length) {
    jurors.forEach((j) => {
      const jurorId = j.jurorId ?? j.juror_id;
      const juryName = String(j.juryName ?? j.juror_name ?? "").trim();
      const juryDept = String(j.juryDept ?? j.juror_inst ?? "").trim();
      if (!jurorId && !juryName) return;
      const jurorKey = rowKey({ jurorId, juryName, juryDept });
      projectList.forEach((p) => {
        const projectId = p.id ?? p.projectId;
        if (!projectId) return;
        const key = `${jurorKey}__${projectId}`;
        if (existingKeys.has(key)) return;
        generated.push({
          jurorId,
          juryName,
          juryDept,
          projectId,
          groupNo: p.groupNo ?? p.group_no ?? null,
          projectName: String(p.name ?? p.project_title ?? "").trim(),
          students: p.students ?? p.group_students ?? "",
          ...Object.fromEntries(CRITERIA.map((c) => [c.id, null])),
          total: null,
          comments: "",
          updatedAt: "",
          updatedMs: null,
          finalSubmittedAt: "",
          finalSubmittedMs: null,
          status: "empty",
          editingFlag: "",
        });
      });
    });
  }

  const allRows = includeEmptyRows ? [...baseRows, ...generated] : baseRows;

  const criteriaHeaders = CRITERIA.map((c) => `${c.shortLabel || c.label} /${c.max}`);
  const headers = [
    "Semester",
    "Group No",
    "Project Title",
    "Students",
    "Juror",
    "Institution / Department",
    "Score Status",
    "Juror Status",
    ...criteriaHeaders,
    "Total",
    "Updated At",
    "Completed At",
    "Comment",
  ];

  const totalGroups =
    projectList.length
      ? projectList.length
      : new Set(allRows.map((r) => r?.projectId).filter(Boolean)).size;
  const jurorAgg = new Map();
  const jurorEditMap = new Map();

  (jurors || []).forEach((j) => {
    const jurorId = j.jurorId ?? j.juror_id;
    const juryName = j.juryName ?? j.juror_name ?? "";
    const juryDept = j.juryDept ?? j.juror_inst ?? "";
    const key = rowKey({ jurorId, juryName, juryDept });
    const enabled = j.editEnabled ?? j.edit_enabled;
    const isEditing = enabled === true || String(enabled).toLowerCase() === "true";
    if (jurorId) jurorEditMap.set(jurorId, isEditing);
    if (key) jurorEditMap.set(key, isEditing);
  });

  allRows.forEach((row) => {
    if (!row) return;
    const key = rowKey(row);
    if (!key) return;
    const editingFromMap =
      jurorEditMap.get(row.jurorId)
      ?? jurorEditMap.get(key)
      ?? false;
    const rowEditing =
      row.isEditing === true ||
      row.jurorStatus === "editing" ||
      row.editingFlag === "editing" ||
      row.status === "editing" ||
      row.edit_enabled === true ||
      editingFromMap === true;
    const cellState = row.effectiveStatus
      ?? (["scored", "partial", "empty"].includes(row.status) ? row.status : getCellState(row));
    const prev = jurorAgg.get(key) || { scored: 0, started: 0, isFinal: false, isEditing: false };
    if (cellState === "scored") prev.scored += 1;
    if (cellState !== "empty") prev.started += 1;
    if (row.finalSubmittedAt || row.finalSubmittedMs || row.final_submitted_at) prev.isFinal = true;
    if (rowEditing) prev.isEditing = true;
    jurorAgg.set(key, prev);
  });

  const jurorStatusMap = new Map();
  jurorAgg.forEach((agg, key) => {
    if (agg.isEditing) { jurorStatusMap.set(key, "editing"); return; }
    if (agg.isFinal) { jurorStatusMap.set(key, "completed"); return; }
    if (totalGroups > 0 && agg.scored >= totalGroups) { jurorStatusMap.set(key, "ready_to_submit"); return; }
    if (agg.started > 0) { jurorStatusMap.set(key, "in_progress"); return; }
    jurorStatusMap.set(key, "not_started");
  });

  const normalizeJurorStatus = (status) => {
    if (!status) return "";
    if (status === "submitted") return "ready_to_submit";
    if (["completed", "ready_to_submit", "in_progress", "not_started", "editing"].includes(status)) return status;
    return "";
  };

  const data = allRows.map((r) => {
    const cellStatus = r.effectiveStatus
      ?? (["scored", "partial", "empty"].includes(r.status) ? r.status : getCellState(r));
    const jurorKey = rowKey(r);
    const jurorStatus = r.jurorStatus
      ?? jurorStatusMap.get(jurorKey)
      ?? normalizeJurorStatus(r.status);
    return [
    r.semester ?? semesterName ?? "",
    r.groupNo     ?? "",
    r.projectName ?? "",
    studentsMap.get(r.projectId) ?? "",
    r.juryName    ?? "",
    r.juryDept    ?? "",
    cellStatus ?? "",
    jurorStatus ?? "",
    ...CRITERIA.map((c) => exportScoreValue(r[c.id])),
    exportScoreValue(r.total),
    formatExportTimestamp(r.updatedAt), // updated_at
    formatExportTimestamp(r.finalSubmittedAt), // final_submitted_at
    r.comments    ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const criteriaWidths = CRITERIA.map(() => 10);
  ws["!cols"] = [18, 8, 32, 42, 24, 26, 12, 14, ...criteriaWidths, 8, 24, 24, 32]
    .map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jury Evaluations");
  XLSX.writeFile(wb, buildExportFilename("details", semesterName));
}

// exportRows: { name, dept, statusLabel, scores: { [groupId]: number|null } }[]
// groups:     { id, label, groupNo }[]
export async function exportGridXLSX(exportRows, groups, { semesterName = "" } = {}) {
  const XLSX = await import("xlsx-js-style");

  const groupHeaders = groups.map((g) => g.groupNo != null ? `Group ${g.groupNo}` : g.label);
  const headers = ["Juror", "Institution / Department", "Status", ...groupHeaders];

  const data = exportRows.map((r) => [
    r.name,
    r.dept ?? "",
    r.statusLabel,
    ...groups.map((g) => {
      const v = r.scores[g.id];
      return v !== null && v !== undefined ? v : "";
    }),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const colWidths = [28, 28, 18, ...groups.map(() => 10)];
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Evaluation Grid");
  XLSX.writeFile(wb, buildExportFilename("grid", semesterName));
}

export async function exportRankingsXLSX(ranked, criteria, { semesterName = "" } = {}) {
  const XLSX = await import("xlsx-js-style");
  const headers = [
    "Rank", "Group", "Project Title", "Students",
    ...criteria.flatMap((c) => [`${c.label} Avg`, `${c.label} Max`]),
    "Total Avg",
  ];
  const displayRanks = [];
  let scoredIndex = 0;
  let lastScore = null;
  let lastRank = 0;
  (ranked || []).forEach((p) => {
    if (!Number.isFinite(p?.totalAvg)) {
      displayRanks.push("");
      return;
    }
    scoredIndex += 1;
    if (lastScore === null || p.totalAvg !== lastScore) {
      lastRank = scoredIndex;
      lastScore = p.totalAvg;
    }
    displayRanks.push(lastRank);
  });
  const dataRows = (ranked || []).map((p, i) => {
    const criteriaVals = criteria.flatMap((c) => [
      Number.isFinite(p.avg?.[c.id]) ? Number(p.avg[c.id].toFixed(2)) : "",
      c.max,
    ]);
    return [
      displayRanks[i],
      `Group ${p.groupNo}`,
      p.name ?? "",
      p.students ?? "",
      ...criteriaVals,
      Number.isFinite(p.totalAvg) ? Number(p.totalAvg.toFixed(2)) : "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = [6, 10, 36, 32, ...criteria.flatMap(() => [10, 8]), 10].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rankings");
  XLSX.writeFile(wb, buildExportFilename("rankings", semesterName));
}
