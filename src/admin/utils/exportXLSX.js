// src/admin/xlsx/exportXLSX.js
// ============================================================
// Async XLSX export functions for the admin panel.
//
// Extracted from src/admin/utils.js (Phase 5 — Final Decomposition).
// Heavy xlsx-js-style dependency is dynamically imported so it only
// loads when an export is triggered.
// ============================================================

import { getCellState } from "./scoreHelpers";
import { rowKey } from "./adminUtils";

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

function buildAuditExportFilename(filters = {}, search = "", tenantCode = "") {
  const parts = [];
  if (filters.startDate) parts.push(String(filters.startDate).split("T")[0]);
  if (filters.endDate) parts.push(String(filters.endDate).split("T")[0]);
  const searchTag = String(search || "").trim();
  if (searchTag) parts.push(searchTag.slice(0, 24));
  const tag = parts.length ? parts.join("_") : "all";
  return buildExportFilename("Audit", tag, "xlsx", tenantCode);
}

// ── Public API ────────────────────────────────────────────────

export function buildExportFilename(type, periodName, ext = "xlsx", tenantCode = "") {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");
  const safe = (s) => String(s || "").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  const parts = [
    "VERA",
    safe(type) || "Export",
    safe(tenantCode),
    safe(periodName),
    `${yyyy}-${mm}-${dd}`,
  ].filter(Boolean);
  return `${parts.join("_")}.${ext}`;
}

export async function exportAuditLogsXLSX(rows, { filters = {}, search = "", tenantCode = "" } = {}) {
  const { getActorInfo, formatActionLabel } = await import("./auditUtils");
  const XLSX = await import("xlsx-js-style");
  const headers = ["Timestamp", "Actor", "Role", "Action", "Resource Type"];
  const data = (rows || []).map((r) => {
    const actor = getActorInfo(r);
    return [
      formatExportTimestamp(r.created_at),
      actor.name,
      actor.role,
      formatActionLabel(r.action),
      r.resource_type ?? "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = [22, 28, 18, 36, 20].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
  XLSX.writeFile(wb, buildAuditExportFilename(filters, search, tenantCode));
}

export async function exportXLSX(rows, { periodName = "", summaryData = [], jurors = [], includeEmptyRows = false, criteria, tenantCode = "" } = {}) {
  const activeCriteria = criteria || [];
  const XLSX = await import("xlsx-js-style");

  // Build projectId → members lookup from summaryData
  const studentsMap = new Map(
    (summaryData || []).map((p) => [p.id, p.students ?? p.members ?? ""])
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
      const affiliation = String(j.affiliation ?? j.affiliation ?? "").trim();
      if (!jurorId && !juryName) return;
      const jurorKey = rowKey({ jurorId, juryName, affiliation });
      projectList.forEach((p) => {
        const projectId = p.id ?? p.projectId;
        if (!projectId) return;
        const key = `${jurorKey}__${projectId}`;
        if (existingKeys.has(key)) return;
        generated.push({
          jurorId,
          juryName,
          affiliation,
          projectId,
          groupNo: p.groupNo ?? p.group_no ?? null,
          projectName: String(p.name ?? p.title ?? "").trim(),
          students: p.students ?? p.members ?? "",
          ...Object.fromEntries(activeCriteria.map((c) => [c.id, null])),
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

  const criteriaHeaders = activeCriteria.map((c) => `${c.shortLabel || c.label} (${c.max})`);
  const headers = [
    "Juror",
    "No",
    "Project",
    "Team Members",
    ...criteriaHeaders,
    `Total (${activeCriteria.reduce((s, c) => s + (c.max || 0), 0)})`,
    "Status",
    "Progress",
    "Comment",
    "Submitted",
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
    const affiliation = j.affiliation ?? j.affiliation ?? "";
    const key = rowKey({ jurorId, juryName, affiliation });
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
      ?? (["scored", "partial", "empty"].includes(row.status) ? row.status : getCellState(row, activeCriteria));
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
      ?? (["scored", "partial", "empty"].includes(r.status) ? r.status : getCellState(r, activeCriteria));
    const jurorKey = rowKey(r);
    const jurorStatus = r.jurorStatus
      ?? jurorStatusMap.get(jurorKey)
      ?? normalizeJurorStatus(r.status);
    return [
    r.juryName    ?? "",
    r.groupNo     ?? "",
    r.projectName ?? "",
    studentsMap.get(r.projectId) ?? "",
    ...activeCriteria.map((c) => exportScoreValue(r[c.id])),
    exportScoreValue(r.total),
    cellStatus ?? "",
    jurorStatus ?? "",
    r.comments    ?? "",
    formatExportTimestamp(r.finalSubmittedAt),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const criteriaWidths = activeCriteria.map(() => 10);
  ws["!cols"] = [24, 8, 32, 42, ...criteriaWidths, 8, 12, 12, 32, 24]
    .map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reviews");
  XLSX.writeFile(wb, buildExportFilename("Reviews", periodName, "xlsx", tenantCode));
}

// exportRows: { name, dept, statusLabel, scores: { [groupId]: number|null } }[]
// groups:     { id, label, groupNo }[]
// criterionTabs: [{ id, label, rows: { name, dept, scores: {[gid]: number|null} } }] (optional)
export async function exportGridXLSX(exportRows, groups, { periodName = "", tenantCode = "", criterionTabs = [] } = {}) {
  const XLSX = await import("xlsx-js-style");

  const groupHeaders = groups.map((g) => (g.groupNo ?? g.group_no) != null ? `P${g.groupNo ?? g.group_no}` : (g.label || g.title || g.id));
  const colWidths = [28, 28, 18, ...groups.map(() => 10)];

  function makeSheet(rows, includeStatus = true) {
    const headers = ["Juror", "Affiliation", ...(includeStatus ? ["Status"] : []), ...groupHeaders];
    const data = rows.map((r) => [
      r.name,
      r.dept ?? "",
      ...(includeStatus ? [r.statusLabel ?? ""] : []),
      ...groups.map((g) => {
        const v = r.scores[g.id];
        return v !== null && v !== undefined ? v : "";
      }),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = (includeStatus ? colWidths : [28, 28, ...groups.map(() => 10)]).map((w) => ({ wch: w }));
    return ws;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(exportRows), "All Criteria");
  criterionTabs.forEach((tab) => {
    const safeName = tab.label.replace(/[\/\\*?\[\]:]/g, "-").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, makeSheet(tab.rows, false), safeName);
  });
  XLSX.writeFile(wb, buildExportFilename("Heatmap", periodName, "xlsx", tenantCode));
}

export async function exportRankingsXLSX(ranked, criteria, { periodName = "", tenantCode = "", consensusMap = {} } = {}) {
  const XLSX = await import("xlsx-js-style");
  const fmtMembers = (m) => {
    if (!m) return "";
    if (Array.isArray(m)) return m.map((e) => (e?.name || e || "").toString().trim()).filter(Boolean).join("; ");
    return String(m).split(/,/).map((s) => s.trim()).filter(Boolean).join("; ");
  };
  const totalMax = criteria.reduce((s, c) => s + (c.max || 0), 0);
  const headers = [
    "Rank",
    "Project Title",
    "Team Members",
    ...criteria.map((c) => `${c.shortLabel || c.label} (${c.max})`),
    `Average (${totalMax})`,
    "Consensus",
    "Jurors Evaluated",
  ];
  let scoredIndex = 0, lastScore = null, lastRank = 0;
  const dataRows = (ranked || []).map((p) => {
    if (Number.isFinite(p?.totalAvg)) {
      scoredIndex += 1;
      if (lastScore === null || p.totalAvg !== lastScore) { lastRank = scoredIndex; lastScore = p.totalAvg; }
    }
    const consensus = consensusMap?.[p.id];
    const consensusLabel = consensus
      ? `${consensus.level === "high" ? "High" : consensus.level === "moderate" ? "Moderate" : "Disputed"} (σ=${consensus.sigma})`
      : "";
    return [
      Number.isFinite(p?.totalAvg) ? lastRank : "",
      p.title || p.name || "",
      fmtMembers(p.members || p.students),
      ...criteria.map((c) => Number.isFinite(p.avg?.[c.id]) ? Number(p.avg[c.id].toFixed(2)) : ""),
      Number.isFinite(p.totalAvg) ? Number(p.totalAvg.toFixed(2)) : "",
      consensusLabel,
      p.count ?? "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = [6, 36, 32, ...criteria.map(() => 14), 12, 18, 10].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rankings");
  XLSX.writeFile(wb, buildExportFilename("Rankings", periodName, "xlsx", tenantCode));
}
