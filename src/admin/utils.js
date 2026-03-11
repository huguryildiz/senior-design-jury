// src/admin/utils.js
// ============================================================
// Pure utility functions shared across all admin tab modules.
// No React, no side-effects — safe to import anywhere.
// ============================================================

import { CRITERIA } from "../config";
import { getCellState } from "./scoreHelpers";

// ── Numeric coercion ──────────────────────────────────────────
// Strips surrounding quotes (Sheets sometimes wraps numbers in
// quotes) and converts to a finite number, defaulting to 0.
export function toNum(v) {
  const n = Number(
    String(v ?? "").trim().replace(/^"+|"+$/g, "").replace(",", ".")
  );
  return Number.isFinite(n) ? n : 0;
}

// ── Timestamp → milliseconds ──────────────────────────────────
// Priority order:
//   1. ISO 8601 / RFC 2822 — new rows use toISOString(), handled natively.
//   2. EU dot format: dd.mm.yyyy HH:mm[:ss]  ← current format
//   3. EU slash format: dd/mm/yyyy HH:mm[:ss] ← legacy rows
//   4. US format: mm/dd/yyyy [HH:mm[:ss] [AM|PM]]
// Legacy rows stored as locale strings are covered by the regex fallbacks.
export function tsToMillis(ts) {
  if (!ts) return 0;
  const s = String(ts).trim().replace(/\s*,\s*/g, ", ");

  // EU dot: dd.mm.yyyy HH:mm[:ss]
  const euDot = s.match(
    /^([0-3]?\d)\.([0-1]?\d)\.(\d{4}),?\s*([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/
  );
  if (euDot) {
    return new Date(+euDot[3], +euDot[2] - 1, +euDot[1], +euDot[4], +euDot[5], +(euDot[6] || 0)).getTime() || 0;
  }

  // EU slash: dd/mm/yyyy HH:mm[:ss] (legacy)
  const euSlash = s.match(
    /^([0-3]?\d)\/([0-1]?\d)\/(\d{4}),?\s*([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/
  );
  if (euSlash) {
    return new Date(+euSlash[3], +euSlash[2] - 1, +euSlash[1], +euSlash[4], +euSlash[5], +(euSlash[6] || 0)).getTime() || 0;
  }

  // US: mm/dd/yyyy [HH:mm[:ss] [AM|PM]]
  const us = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (us) {
    let h = +(us[4] || 0);
    const ap = (us[7] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return (
      new Date(+us[3], +us[1] - 1, +us[2], h, +(us[5] || 0), +(us[6] || 0)).getTime() || 0
    );
  }

  const native = Date.parse(s);
  if (Number.isFinite(native)) return native;
  return 0;
}

// ── Human-readable timestamp ──────────────────────────────────
// Sheet stores "DD.MM.YYYY HH:mm:ss" as text — return as-is so the
// displayed value always matches the sheet exactly.  Only parse/reformat
// for legacy ISO or slash-format inputs that predate the dot format.
export function formatTs(ts) {
  if (!ts) return "—";
  const s = String(ts).trim();
  // Already in DD.MM.YYYY HH:mm[:ss] — sheet is the source of truth.
  const stored = /^(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2})(?::\d{2})?$/.exec(s);
  if (stored) return stored[1];
  // Fallback for ISO / legacy slash-format rows.
  const ms = tsToMillis(s);
  if (!ms) return s;
  const d   = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Dashboard timestamp formatting ───────────────────────────
export function formatDashboardTs(date) {
  if (!date) return "—";
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).replace(",", " ·").replace(/\//g, ".");
}

// ── Generic comparator (number-aware) ────────────────────────
export function cmp(a, b) {
  const an = Number(a), bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a ?? "").toLowerCase() < String(b ?? "").toLowerCase() ? -1 : 1;
}

// ── Stable per-row key ───────────────────────────────────────
export const rowKey = (r) =>
  r.jurorId
    ? r.jurorId
    : `${(r.juryName || "").trim().toLowerCase()}__${(r.juryDept || "").trim().toLowerCase()}`;

// ── Deterministic pastel colour from a name string ───────────
function hashInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h  = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
      .toString(16).padStart(2, "0");
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const jurorBg  = (n) => hsl2hex(hashInt(n || "?") % 360, 55, 95);
export const jurorDot = (n) => hsl2hex(hashInt(n || "?") % 360, 65, 55);

// ── Excel (.xlsx) export ──────────────────────────────────────
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
  return `tedu-jury_${safeType}_${safeSem}_${yyyy}-${mm}-${dd}_${hh}${min}.${ext}`;
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
          status: "empty",
          editingFlag: "",
        });
      });
    });
  }

  const allRows = includeEmptyRows ? [...baseRows, ...generated] : baseRows;

  const headers = [
    "Semester",
    "Group No",
    "Project Title",
    "Students",
    "Juror",
    "Institution / Department",
    "Score Status",
    "Juror Status",
    "Technical /30",
    "Written /30",
    "Oral /30",
    "Teamwork /10",
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
    exportScoreValue(r.technical),
    exportScoreValue(r.design),    // written in DB
    exportScoreValue(r.delivery),  // oral in DB
    exportScoreValue(r.teamwork),
    exportScoreValue(r.total),
    formatExportTimestamp(r.updatedAt), // updated_at
    formatExportTimestamp(r.finalSubmittedAt), // final_submitted_at
    r.comments    ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  // Semester(A), Group No(B), Project Title(C), Students(D),
  // Juror(E), Institution / Department(F), Score Status(G), Juror Status(H),
  // Technical /30(I), Written /30(J), Oral /30(K), Teamwork /10(L), Total(M),
  // Updated At(N), Completed At(O), Comment(P)
  ws["!cols"] = [18, 8, 32, 42, 24, 26, 12, 14, 11, 9, 7, 11, 8, 24, 24, 32]
    .map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jury Evaluations");
  XLSX.writeFile(wb, buildExportFilename("details", semesterName));
}

// ── Grid (.xlsx) export ───────────────────────────────────────
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

// ── Completion % — mirrors countFilled / totalFields in useJuryState ─────────
// r[c.id] > 0 matches admin field names (technical/design/delivery/teamwork)
// which equal CRITERIA ids. 0 == not filled (toNum default).
const countAdminFilledCriteria = (rows) =>
  rows.reduce((t, r) => t + CRITERIA.filter((c) => r[c.id] > 0).length, 0);

export const adminCompletionPct = (rows, totalProjects) => {
  const total = (totalProjects || 0) * CRITERIA.length;
  return total === 0 ? 0 : Math.round((countAdminFilledCriteria(rows) / total) * 100);
};

// ── Row deduplication ─────────────────────────────────────────
// Keeps the single best row per (juror + dept + group) composite key.
// "Best" = latest activity (updated_at preferred), with status priority as tiebreaker.
export function dedupeAndSort(rows) {
  const priority = { all_submitted: 3, group_submitted: 2, in_progress: 1 };

  const cleaned = (rows || [])
    .filter((r) => r?.juryName || r?.projectName || (r?.total ?? 0) > 0)
    .map((r) => ({
      ...r,
      tsMs:
        (Number.isFinite(r?.updatedMs) ? r.updatedMs : 0) ||
        (Number.isFinite(r?.tsMs) ? r.tsMs : 0) ||
        tsToMillis(r?.updatedAt || r?.timestamp),
    }));

  const byKey = new Map();

  for (const r of cleaned) {
    const jur = String(r.juryName ?? "").trim().toLowerCase();
    const dep = String(r.juryDept ?? "").trim().toLowerCase();
    const grp = r.projectId
      ? String(r.projectId).trim()
      : String(r.projectName ?? "").trim().toLowerCase();

    if (!jur || !grp) continue;
    const key  = `${jur}__${dep}__${grp}`;
    const prev = byKey.get(key);

    if (!prev) { byKey.set(key, r); continue; }

    // Prefer newer timestamp.
    if ((r.tsMs || 0) > (prev.tsMs || 0)) { byKey.set(key, r); continue; }
    // Same timestamp: prefer higher-priority status.
    if (
      (r.tsMs || 0) === (prev.tsMs || 0) &&
      (priority[r.status] || 0) > (priority[prev.status] || 0)
    ) {
      byKey.set(key, r);
    }
  }

  return [...byKey.values()].sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
}

// ── Rankings export ───────────────────────────────────────────
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
