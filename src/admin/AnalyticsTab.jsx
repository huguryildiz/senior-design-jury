// src/admin/AnalyticsTab.jsx
// ── Charts dashboard ─────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { formatDashboardTs, buildExportFilename } from "./utils";
import { CRITERIA, MUDEK_OUTCOMES } from "../config";
import { ChevronDownIcon, DownloadIcon, LoaderIcon, CircleXLucideIcon, SearchIcon } from "../shared/Icons";
import { mean, stdDev, outcomeValues, fmt1, fmt2, buildBoxplotStats } from "../shared/stats";
import {
  OutcomeByGroupChart,
  OutcomeOverviewChart,
  OutcomeTrendChart,
  CompetencyRadarChart,
  CriterionBoxPlotChart,
  JurorConsistencyHeatmap,
  RubricAchievementChart,
  RadarPrintAll,
  MudekBadge,
  CHART_COPY,
  OutcomeByGroupChartPrint,
  OutcomeOverviewChartPrint,
  OutcomeTrendChartPrint,
  JurorConsistencyHeatmapPrint,
  CriterionBoxPlotChartPrint,
  RubricAchievementChartPrint,
} from "../Charts";

// ── Export helpers ───────────────────────────────────────────
const OUTCOMES = CRITERIA.map((c) => ({
  key: c.id,
  label: c.shortLabel || c.label,
  max: c.max,
  rubric: c.rubric || [],
  code: (c.mudek || []).join("/"),
}));

const getCriterionColor = (id, fallback) =>
  CRITERIA.find((c) => c.id === id)?.color || fallback;

const formatMudekCodes = (code) =>
  String(code || "")
    .split("/")
    .map((c) => c.trim())
    .filter(Boolean)
    .join(" / ");

const outcomeCodeLine = (code) => {
  const formatted = formatMudekCodes(code);
  return formatted ? `(${formatted})` : "";
};

const TREND_LEGEND = [
  {
    key: "technical",
    label: OUTCOMES.find((o) => o.key === "technical")?.label || "Technical",
    code: OUTCOMES.find((o) => o.key === "technical")?.code || "1.2/2/3.1/3.2",
    color: getCriterionColor("technical", "#f59e0b"),
  },
  {
    key: "design",
    label: OUTCOMES.find((o) => o.key === "design")?.label || "Written",
    code: OUTCOMES.find((o) => o.key === "design")?.code || "9.2",
    color: getCriterionColor("design", "#22c55e"),
  },
  {
    key: "delivery",
    label: OUTCOMES.find((o) => o.key === "delivery")?.label || "Oral",
    code: OUTCOMES.find((o) => o.key === "delivery")?.code || "9.1",
    color: getCriterionColor("delivery", "#3b82f6"),
  },
  {
    key: "teamwork",
    label: OUTCOMES.find((o) => o.key === "teamwork")?.label || "Teamwork",
    code: OUTCOMES.find((o) => o.key === "teamwork")?.code || "8.1/8.2",
    color: getCriterionColor("teamwork", "#ef4444"),
  },
];

function addTableSheet(wb, name, title, headers, rows, extraSections = [], note = "", merges = [], alignments = []) {
  const aoa = [
    [title],
    ...(note ? [[note]] : []),
    [],
    headers,
    ...rows,
  ];
  extraSections.forEach((section) => {
    if (!section) return;
    aoa.push([], [section.title], ...(section.note ? [[section.note]] : []), section.headers, ...section.rows);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges.length) {
    const headerRowIndex = 1 + (note ? 1 : 0) + 1;
    const dataStartRow = headerRowIndex + 1;
    const sheetMerges = merges.map((m) => ({
      s: { r: dataStartRow + m.start, c: m.col },
      e: { r: dataStartRow + m.end, c: m.col },
    }));
    ws["!merges"] = [...(ws["!merges"] || []), ...sheetMerges];
    if (alignments.length) {
      alignments.forEach((a) => {
        for (let r = a.start; r <= a.end; r += 1) {
          const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + r, c: a.col });
          const cell = ws[cellRef];
          if (!cell) continue;
          cell.s = cell.s || {};
          cell.s.alignment = {
            ...(cell.s.alignment || {}),
            vertical: a.valign || "center",
            horizontal: a.halign || "left",
          };
        }
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ── Derived stat helpers ─────────────────────────────────────
// Overall normalized average (%) across all criteria and all submission rows.
function computeOverallAvg(submittedData) {
  const rows = submittedData || [];
  if (!rows.length) return null;
  const allPcts = rows.flatMap((r) =>
    OUTCOMES.map((o) => {
      const v = Number(r[o.key]);
      return o.max > 0 && Number.isFinite(v) ? (v / o.max) * 100 : null;
    }).filter((v) => v !== null)
  );
  return allPcts.length ? fmt1(mean(allPcts)) : null;
}

// ── Dataset builder pure functions ───────────────────────────
// All builders are pure functions (no component closure) — safe to call
// outside the component and easy to unit test independently.

function buildOutcomeByGroupDataset(dashboardStats) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const headers = [
    "Group",
    ...OUTCOMES.flatMap((o) => [`${o.label} Avg`, `${o.label} (%)`]),
  ];
  const rows = groups.map((g) => {
    const cells = OUTCOMES.flatMap((o) => {
      const avgRaw = Number(g.avg?.[o.key] ?? 0);
      const pct = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
      return [fmt2(avgRaw), fmt1(pct)];
    });
    return [g.name, ...cells];
  });
  return {
    sheet: "Outcome Group",
    title: CHART_COPY.outcomeByGroup.title,
    note: CHART_COPY.outcomeByGroup.note,
    headers,
    rows,
  };
}

function buildProgrammeAveragesDataset(submittedData) {
  const rows = submittedData || [];
  const headers = ["Outcome", "Max", "Avg (raw)", "Avg (%)", "Std. deviation (σ) (%) [sample]", "N"];
  const dataRows = OUTCOMES.map((o) => {
    const vals   = outcomeValues(rows, o.key);
    const avgRaw = vals.length ? mean(vals) : 0;
    const pct    = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
    const sd     = vals.length > 1 ? (stdDev(vals, true) / o.max) * 100 : 0;
    return [o.label, o.max, fmt2(avgRaw), fmt1(pct), fmt1(sd), vals.length];
  });
  return {
    sheet: "Programme Avg",
    title: CHART_COPY.programmeAverages.title,
    note: CHART_COPY.programmeAverages.note,
    headers,
    rows: dataRows,
  };
}

function buildTrendDataset(trendData, semesterOptions, selectedIds) {
  const headers = ["Semester", "N", "Technical (%)", "Written (%)", "Oral (%)", "Teamwork (%)"];
  const dataMap = new Map((trendData || []).map((row) => [row.semesterId, row]));
  const orderIndex = new Map((semesterOptions || []).map((s, i) => [s.id, i]));
  const ordered = (semesterOptions || [])
    .filter((s) => (selectedIds || []).includes(s.id))
    .sort((a, b) => (orderIndex.get(b.id) ?? 0) - (orderIndex.get(a.id) ?? 0));

  const maxByKey = {
    technical: OUTCOMES.find((o) => o.key === "technical")?.max || 1,
    design:    OUTCOMES.find((o) => o.key === "design")?.max || 1,
    delivery:  OUTCOMES.find((o) => o.key === "delivery")?.max || 1,
    teamwork:  OUTCOMES.find((o) => o.key === "teamwork")?.max || 1,
  };
  const pct = (raw, max) => (Number.isFinite(raw) && max > 0 ? fmt1((raw / max) * 100) : null);

  const rows = ordered.map((s) => {
    const row = dataMap.get(s.id);
    return [
      s.name || row?.semesterName || "—",
      row?.nEvals ?? 0,
      pct(row?.avgTechnical, maxByKey.technical),
      pct(row?.avgWritten, maxByKey.design),
      pct(row?.avgOral, maxByKey.delivery),
      pct(row?.avgTeamwork, maxByKey.teamwork),
    ];
  });
  return {
    sheet: "Semester Trend",
    title: CHART_COPY.semesterTrend.title,
    note: CHART_COPY.semesterTrend.note,
    headers,
    rows,
  };
}

function buildCompetencyProfilesDataset(dashboardStats) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const headers = ["Group", ...OUTCOMES.map((o) => `${o.label} (%)`)];
  const rows = groups.map((g) => {
    const vals = OUTCOMES.map((o) => {
      const avgRaw = Number(g.avg?.[o.key] ?? 0);
      const pct = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
      return fmt1(pct);
    });
    return [g.name, ...vals];
  });
  const cohort = OUTCOMES.map((o) => {
    const vals = groups.map((g) => {
      const avgRaw = Number(g.avg?.[o.key] ?? 0);
      return o.max > 0 ? (avgRaw / o.max) * 100 : 0;
    });
    return fmt1(mean(vals));
  });
  if (rows.length) rows.push(["Cohort Average", ...cohort]);
  return {
    sheet: "Competency",
    title: CHART_COPY.competencyProfile.title,
    note: CHART_COPY.competencyProfile.note,
    headers,
    rows,
  };
}

function buildJurorConsistencyDataset(dashboardStats, submittedData) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const rows   = submittedData || [];
  const headers = ["Group", ...OUTCOMES.map((o) => o.label)];

  const buildMatrix = (metric) =>
    groups.map((g) => {
      const cells = OUTCOMES.map((o) => {
        const vals = rows
          .filter((r) => r.projectId === g.id)
          .map((r) => Number(r[o.key]))
          .filter((v) => Number.isFinite(v));
        if (!vals.length) return null;
        const m = mean(vals);
        if (metric === "n") return vals.length;
        if (metric === "mean") return fmt1(o.max > 0 ? (m / o.max) * 100 : 0);
        if (metric === "sd") return fmt2(stdDev(vals, true));
        if (metric === "cv") {
          if (vals.length < 2 || !m) return null;
          return fmt1((stdDev(vals, true) / m) * 100);
        }
        return null;
      });
      return [g.name, ...cells];
    });

  return {
    sheet: "Juror CV",
    title: CHART_COPY.jurorConsistency.title,
    note: CHART_COPY.jurorConsistency.note,
    headers,
    rows: buildMatrix("cv"),
    extra: [
      { title: "Mean (%) by Group x Criterion", headers, rows: buildMatrix("mean") },
      { title: "Std. deviation (σ) by Group x Criterion", headers, rows: buildMatrix("sd") },
      { title: "N (Juror Count) by Group x Criterion", headers, rows: buildMatrix("n") },
    ],
  };
}

function buildCriterionBoxplotDataset(submittedData) {
  const rows = submittedData || [];
  const headers = [
    "Outcome",
    "Q1 (%)",
    "Median (%)",
    "Q3 (%)",
    "Whisker Min (%)",
    "Whisker Max (%)",
    "Outliers (count)",
    "N",
  ];
  const dataRows = OUTCOMES.map((o) => {
    const vals = rows
      .map((r) => Number(r[o.key]))
      .filter((v) => Number.isFinite(v))   // 0 is a valid score — not excluded
      .map((v) => (v / o.max) * 100)
      .sort((a, b) => a - b);
    const bp = buildBoxplotStats(vals);
    if (!bp) return [o.label, null, null, null, null, null, 0, 0];
    return [
      o.label,
      fmt1(bp.q1),
      fmt1(bp.med),
      fmt1(bp.q3),
      fmt1(bp.whiskerMin),
      fmt1(bp.whiskerMax),
      bp.outliers.length,
      vals.length,
    ];
  });
  return {
    sheet: "Boxplot",
    title: CHART_COPY.scoreDistribution.title,
    note: CHART_COPY.scoreDistribution.note,
    headers,
    rows: dataRows,
  };
}

function buildRubricAchievementDataset(submittedData) {
  const rows = submittedData || [];
  const classify = (v, rubric) => {
    if (!Number.isFinite(v)) return null;
    for (const band of rubric) {
      if (v >= band.min && v <= band.max) return band.level.toLowerCase();
    }
    return null;
  };
  const headers = [
    "Outcome",
    "Total",
    "Excellent (count)",
    "Excellent (%)",
    "Good (count)",
    "Good (%)",
    "Developing (count)",
    "Developing (%)",
    "Insufficient (count)",
    "Insufficient (%)",
  ];
  const dataRows = OUTCOMES.map((o) => {
    const criterion = CRITERIA.find((c) => c.id === o.key);
    const rubric = criterion?.rubric || [];
    // Derive band keys from config — not hardcoded — so renaming a level auto-adapts.
    const bandKeys = rubric.map((b) => b.level.toLowerCase());
    const vals = rows.map((r) => Number(r[o.key])).filter((v) => Number.isFinite(v));
    const counts = Object.fromEntries(bandKeys.map((k) => [k, 0]));
    vals.forEach((v) => {
      const k = classify(v, rubric);
      if (k && k in counts) counts[k] += 1;
    });
    const total = vals.length || 0;
    const pct = (n) => (total ? (n / total) * 100 : 0);
    // Always output in fixed band order for Excel column consistency
    const excellent   = counts["excellent"]   ?? 0;
    const good        = counts["good"]        ?? 0;
    const developing  = counts["developing"]  ?? 0;
    const insufficient = counts["insufficient"] ?? 0;
    return [
      o.label,
      total,
      excellent,
      fmt1(pct(excellent)),
      good,
      fmt1(pct(good)),
      developing,
      fmt1(pct(developing)),
      insufficient,
      fmt1(pct(insufficient)),
    ];
  });

  return {
    sheet: "Rubric Dist",
    title: CHART_COPY.achievementDistribution.title,
    note: CHART_COPY.achievementDistribution.note,
    headers,
    rows: dataRows,
  };
}

function buildMudekMappingDataset() {
  const headers = ["Criteria", "MÜDEK Code(s)", "MÜDEK Outcome(s)"];
  const rows = [];
  const merges = [];
  const alignments = [];
  let rowIndex = 0;
  CRITERIA.forEach((c) => {
    const codes = (c.mudek || []).filter(Boolean);
    const label = c.shortLabel || c.label;
    const count = Math.max(1, codes.length);
    if (!codes.length) {
      rows.push([label, "—", "—"]);
      alignments.push({ start: rowIndex, end: rowIndex, col: 0, valign: "center" });
    } else {
      codes.forEach((code, idx) => {
        const text = MUDEK_OUTCOMES[code]?.en || MUDEK_OUTCOMES[code]?.tr || "—";
        rows.push([idx === 0 ? label : "", code, text]);
        if (idx === 0) {
          alignments.push({ start: rowIndex, end: rowIndex + count - 1, col: 0, valign: "center" });
        }
      });
    }
    if (count > 1) {
      merges.push({ start: rowIndex, end: rowIndex + count - 1, col: 0 });
    }
    rowIndex += count;
  });
  return {
    sheet: "MÜDEK Mapping",
    title: "MÜDEK Outcome Mapping",
    note: "Criteria-to-MÜDEK outcome references used in analytics.",
    headers,
    rows,
    merges,
    alignments,
  };
}

// ── Loading skeleton ──────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="dashboard-loading">
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card skeleton-wide" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card skeleton-wide" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────
function DashboardError({ message }) {
  return (
    <div className="premium-error-banner is-critical" role="alert">
      <CircleXLucideIcon />
      <div>
        <div className="premium-error-title">Could not load analytics data</div>
        <div className="premium-error-detail">
          {message || "An unexpected error occurred. Please refresh the page."}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function DashboardEmpty() {
  return (
    <div className="dashboard-state-card">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
      <p className="dashboard-state-title">No data available</p>
      <span className="dashboard-state-sub">Evaluations will appear here once jurors submit their scores.</span>
    </div>
  );
}

// ── KPI summary strip ─────────────────────────────────────────
function KpiCard({ label, value, sub, valueClassName }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-label">{label}</div>
      <div className={`kpi-card-value${valueClassName ? ` ${valueClassName}` : ""}`}>{value}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  );
}

function TrendSemesterSelect({ semesters, selectedIds, onChange, loading }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapRef = useRef(null);
  const allCheckboxRef = useRef(null);
  const semesterList = useMemo(() => {
    if (Array.isArray(semesters)) return semesters;
    if (semesters && typeof semesters === "object") return Object.values(semesters);
    return [];
  }, [semesters]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSemesterList = useMemo(() => {
    if (!normalizedSearch) return semesterList;
    return semesterList.filter((s) =>
      String(s?.name || "").toLowerCase().includes(normalizedSearch)
    );
  }, [semesterList, normalizedSearch]);

  useEffect(() => {
    if (!open) setSearchTerm("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const allSelected = semesterList.length > 0 && selectedSet.size === semesterList.length;
  const partiallySelected = selectedSet.size > 0 && !allSelected;

  useEffect(() => {
    if (!allCheckboxRef.current) return;
    allCheckboxRef.current.indeterminate = partiallySelected;
  }, [partiallySelected, open]);

  const toggleAll = () => {
    if (loading) return;
    if (allSelected) {
      onChange([]);
      return;
    }
    onChange(semesterList.map((s) => s.id));
  };

  const toggle = (id) => {
    if (selectedSet.has(id)) {
      onChange((selectedIds || []).filter((x) => x !== id));
      return;
    }
    onChange([...(selectedIds || []), id]);
  };

  return (
    <div className={`trend-select${open ? " open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="trend-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Select semesters for trend chart"
        aria-haspopup="dialog"
      >
        <span className="trend-select-label">
          <span>Semesters</span>
          <span className="trend-select-count">{(selectedIds || []).length}</span>
        </span>
        <span className={`trend-select-chevron${open ? " open" : ""}`} aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div className="trend-select-panel" role="dialog" aria-label="Trend semester selection">
          <div className="trend-select-list">
            <div className="trend-select-search-wrap">
              <span className="trend-select-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                type="text"
                className="trend-select-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search semesters"
                aria-label="Search semesters"
              />
            </div>
            {semesterList.length === 0 && (
              <div className="trend-select-empty">No semesters available.</div>
            )}
            {semesterList.length > 0 && (
              <>
                <label className="trend-select-option trend-select-option-all">
                  <input
                    ref={allCheckboxRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={loading}
                  />
                  <span>All Semesters</span>
                </label>
                {filteredSemesterList.length === 0 ? (
                  <div className="trend-select-empty">No matching semesters.</div>
                ) : (
                  filteredSemesterList.map((s) => (
                    <label key={s.id} className="trend-select-option">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(s.id)}
                        onChange={() => toggle(s.id)}
                        disabled={loading}
                      />
                      <span>{s.name || "—"}</span>
                    </label>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function AnalyticsTab({
  dashboardStats,
  submittedData,
  overviewMetrics,
  lastRefresh,
  loading,
  error,
  semesterName = "",
  semesterOptions = [],
  trendSemesterIds = [],
  onTrendSelectionChange = () => {},
  trendData = [],
  trendLoading = false,
  trendError = "",
}) {
  const restoreRef   = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // ── PDF export ─────────────────────────────────────────────
  // The .print-report section is always in the DOM (just display:none on screen).
  // All print-only SVGs are already rendered and computed, so window.print()
  // sees them immediately — no DOM measuring or resize loops needed.
  async function handleExportPdf() {
    if (exporting) return;
    setExporting(true);

    let done = false;
    const originalTitle = document.title;
    document.title = buildExportFilename("report", semesterName, "pdf");

    const restore = () => {
      if (done) return;
      done = true;
      document.title = originalTitle;
      clearTimeout(safariTimer);
      window.removeEventListener("afterprint", restore);
      printMq.removeEventListener("change", onMqChange);
      restoreRef.current = null;
      setExporting(false);
    };
    restoreRef.current = restore;

    // Chrome / Firefox: afterprint fires reliably on dialog close
    window.addEventListener("afterprint", restore, { once: true });

    // Safari: afterprint is unreliable — watch media query change instead
    const printMq = window.matchMedia("print");
    const onMqChange = (e) => { if (!e.matches) restore(); };
    printMq.addEventListener("change", onMqChange);

    // Hard fallback: 60 s if user leaves print dialog open
    const safariTimer = setTimeout(restore, 60_000);

    // Wait for fonts + two layout passes
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    window.print();
  }

  // Clean up on unmount (e.g. tab switch while dialog is open)
  useEffect(() => () => { restoreRef.current?.(); }, []);
  useEffect(() => {
    const handleBeforePrint = () => {
      window.dispatchEvent(new Event("resize"));
    };
    const mq = window.matchMedia?.("print");
    const onMqChange = (e) => {
      if (e.matches) window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    if (mq?.addEventListener) mq.addEventListener("change", onMqChange);
    else if (mq?.addListener) mq.addListener(onMqChange);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      if (mq?.removeEventListener) mq.removeEventListener("change", onMqChange);
      else if (mq?.removeListener) mq.removeListener(onMqChange);
    };
  }, []);

  // ── Excel export ───────────────────────────────────────────
  function exportExcelAll() {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      const wb = XLSX.utils.book_new();
      const datasets = [
        buildOutcomeByGroupDataset(dashboardStats),
        buildProgrammeAveragesDataset(submittedData),
        buildTrendDataset(trendData, semesterOptions, trendSemesterIds),
        buildCompetencyProfilesDataset(dashboardStats),
        buildJurorConsistencyDataset(dashboardStats, submittedData),
        buildCriterionBoxplotDataset(submittedData),
        buildRubricAchievementDataset(submittedData),
        buildMudekMappingDataset(),
      ];
      datasets.forEach((ds) => {
        addTableSheet(wb, ds.sheet, ds.title, ds.headers, ds.rows, ds.extra, ds.note, ds.merges, ds.alignments);
      });
      XLSX.writeFile(wb, buildExportFilename("analytics", semesterName));
    } finally {
      setExportingExcel(false);
    }
  }

  // ── Derived metrics ──────────────────────────────────────────
  const showPrint = formatDashboardTs(lastRefresh);
  const lastRefreshDate = (() => {
    if (!lastRefresh) return "—";
    const dt = new Date(lastRefresh);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt
      .toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
      .replace(/\//g, ".");
  })();
  const lastRefreshTime = (() => {
    if (!lastRefresh) return "—";
    const dt = new Date(lastRefresh);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
  })();
  const lastRefreshValue =
    lastRefreshDate !== "—" && lastRefreshTime !== "—"
      ? (
        <span className="kpi-date-stack">
          <span className="kpi-date">{lastRefreshDate}</span>
          <span className="kpi-time">{lastRefreshTime}</span>
        </span>
      )
      : "—";
  const printDate = (() => {
    const dt = lastRefresh ? new Date(lastRefresh) : new Date();
    if (Number.isNaN(dt.getTime())) return showPrint;
    const datePart = dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timePart = dt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} · ${timePart}`;
  })();
  const semesterLabel = semesterName ? `${semesterName} Semester` : "Semester";
  const totalJurors = overviewMetrics?.totalJurors ?? 0;
  const completedJurors = overviewMetrics?.completedJurors ?? 0;
  const totalGroups = dashboardStats?.length ?? 0;
  const scoredEvaluations = overviewMetrics?.scoredEvaluations ?? (submittedData?.length ?? 0);
  const totalEvaluations =
    overviewMetrics?.totalEvaluations ?? totalJurors * totalGroups;
  const completedPct = totalJurors > 0 ? Math.round((completedJurors / totalJurors) * 100) : 0;
  const scoredPct = totalEvaluations > 0 ? Math.round((scoredEvaluations / totalEvaluations) * 100) : 0;
  const jurorLabel = `${totalJurors} Juror${totalJurors === 1 ? "" : "s"}`;
  const groupLabel = `${totalGroups} Group${totalGroups === 1 ? "" : "s"}`;
  const completedLabel = `${completedJurors}/${totalJurors} (${completedPct}%) Completed Juror${totalJurors === 1 ? "" : "s"}`;
  const scoredLabel = `${scoredEvaluations}/${totalEvaluations} (${scoredPct}%) Scored Evaluation${totalEvaluations === 1 ? "" : "s"}`;
  const summaryLabel = `${jurorLabel} · ${groupLabel} · ${completedLabel} · ${scoredLabel}`;

  const overallAvg = computeOverallAvg(submittedData);
  const hasSubmitted = (submittedData || []).length > 0;
  const trendSelectedCount = (trendSemesterIds || []).length;
  const trendTooMany = trendSelectedCount > 8;
  const appendixRows = useMemo(() => {
    const normalizeStudents = (value) => {
      if (Array.isArray(value)) {
        return value.map((s) => String(s || "").trim()).filter(Boolean);
      }
      return String(value || "")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    };
    const rows = (dashboardStats || []).map((p) => ({
      groupNo: Number.isFinite(p.groupNo) ? p.groupNo : null,
      groupLabel: p.name || (Number.isFinite(p.groupNo) ? `Group ${p.groupNo}` : "Group —"),
      projectTitle: String(p.projectTitle || "").trim(),
      students: normalizeStudents(p.students),
    }));
    return rows.sort((a, b) => {
      if (a.groupNo == null && b.groupNo == null) return 0;
      if (a.groupNo == null) return 1;
      if (b.groupNo == null) return -1;
      return a.groupNo - b.groupNo;
    });
  }, [dashboardStats]);

  const mudekMappingRows = useMemo(() => {
    const rows = [];
    CRITERIA.forEach((c) => {
      const codes = (c.mudek || []).filter(Boolean);
      const label = c.shortLabel || c.label;
      const count = Math.max(1, codes.length);
      if (!codes.length) {
        rows.push({ criteria: label, code: "—", text: "—", rowSpan: 1, showCriteria: true });
        return;
      }
      codes.forEach((code, idx) => {
        rows.push({
          criteria: label,
          code,
          text: MUDEK_OUTCOMES[code]?.en || MUDEK_OUTCOMES[code]?.tr || "—",
          rowSpan: idx === 0 ? count : 0,
          showCriteria: idx === 0,
        });
      });
    });
    return rows;
  }, []);

  // ── Render states ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardError message={error} />
      </div>
    );
  }

  if (!hasSubmitted && trendSelectedCount === 0 && !trendLoading && !trendError) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardEmpty />
      </div>
    );
  }

  return (
    <div className="dashboard-print-wrap">
      {/* ═══════════════════════════════════════════════════════
          SCREEN CHARTS — hidden in print, replaced by .print-report
          ═══════════════════════════════════════════════════════ */}
      <div className="screen-charts">
        {/* KPI summary strip */}
        <div className="analytics-kpi-strip">
          <KpiCard
            label="Jurors"
            value={`${completedJurors}/${totalJurors}`}
            sub={`${completedPct}% completed`}
          />
          <KpiCard
            label="Evaluations"
            value={`${scoredEvaluations}/${totalEvaluations}`}
            sub={`${scoredPct}% scored`}
          />
          <KpiCard
            label="Overall Avg"
            value={overallAvg !== null ? `${overallAvg}%` : "—"}
            sub="across all criteria"
          />
          <KpiCard
            label="Last Refresh"
            value={lastRefreshValue}
            valueClassName="kpi-card-value--stack"
            sub=""
          />
        </div>

        {/* Toolbar: MÜDEK badge + export buttons */}
        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar-left">
            <MudekBadge />
          </div>
          <span className="dashboard-toolbar-divider" aria-hidden="true" />
          <button
            className="pdf-export-btn"
            onClick={handleExportPdf}
            disabled={exporting}
            aria-label={exporting ? "Preparing PDF export" : "Export PDF"}
            title={exporting ? "Preparing PDF…" : 'Export PDF — In the print dialog, uncheck "Headers and footers" to remove the browser URL from the report'}
          >
            {exporting ? <span className="spin-icon"><LoaderIcon /></span> : <DownloadIcon />}
            {exporting ? "Exporting…" : "PDF"}
          </button>
          <button
            className="xlsx-export-btn"
            onClick={exportExcelAll}
            disabled={exportingExcel}
            aria-label={exportingExcel ? "Preparing Excel export" : "Export Excel"}
            title={exportingExcel ? "Preparing Excel…" : "Export Excel"}
          >
            {exportingExcel ? <span className="spin-icon"><LoaderIcon /></span> : <DownloadIcon />}
            {exportingExcel ? "Exporting…" : "Excel"}
          </button>
        </div>

        {hasSubmitted ? (
          <>
            {/* Row 1: Outcome by Group — full width */}
            <div className="dashboard-section-label" lang="en">Outcome Distribution</div>
            <div className="dashboard-grid dashboard-row" data-row="1">
              <div className="chart-span-2 chart-card dashboard-card" id="chart-1">
                <OutcomeByGroupChart stats={dashboardStats} />
              </div>
            </div>

            {/* Row 2: Programme Averages (left) + Radar (right) */}
            <div className="dashboard-section-label" lang="en">Programme Overview</div>
            <div className="dashboard-grid dashboard-row" data-row="2">
              <div className="chart-card dashboard-card" id="chart-2">
                <OutcomeOverviewChart data={submittedData} />
              </div>
              <div className="chart-card dashboard-card" id="chart-3">
                <CompetencyRadarChart stats={dashboardStats} />
              </div>
            </div>
          </>
        ) : (
          <DashboardEmpty />
        )}

        {/* Semester Trend */}
        <div className="dashboard-section-label" lang="en">Semester Trend</div>
        <div className="dashboard-grid dashboard-row" data-row="2b">
          <div className="chart-span-2 chart-card dashboard-card" id="chart-trend">
            <OutcomeTrendChart
              data={trendData}
              semesters={semesterOptions}
              selectedIds={trendSemesterIds}
              loading={trendLoading}
              error={trendError}
              headerRight={(
                <TrendSemesterSelect
                  semesters={semesterOptions}
                  selectedIds={trendSemesterIds}
                  onChange={onTrendSelectionChange}
                  loading={trendLoading}
                />
              )}
              hint={trendTooMany ? "Many semesters selected — scroll horizontally to compare." : ""}
            />
          </div>
        </div>

        {hasSubmitted && (
          <>
            {/* Row 3: Juror Consistency Heatmap — full width */}
            <div className="dashboard-section-label" lang="en">Juror Consistency</div>
            <div className="dashboard-grid dashboard-row" data-row="3">
              <div className="chart-span-2 chart-card dashboard-card" id="chart-4">
                <JurorConsistencyHeatmap stats={dashboardStats} data={submittedData} />
              </div>
            </div>

            {/* Row 4: Boxplot (left) + Rubric Achievement (right) */}
            <div className="dashboard-section-label" lang="en">Criterion Analytics</div>
            <div className="dashboard-grid dashboard-row" data-row="4">
              <div className="chart-card dashboard-card" id="chart-5">
                <CriterionBoxPlotChart data={submittedData} />
              </div>
              <div className="chart-card dashboard-card" id="chart-6">
                <RubricAchievementChart data={submittedData} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          PRINT REPORT — mounted only during export (display:none on screen).
          Uses dedicated print-only SVG components with fixed viewBox
          and no ResizeObserver / scroll wrappers.

          Layout (A4 landscape, one chart per page):
          Page 1:   Outcome by Group
          Page 2:   Programme-Level Outcome Averages
          Page 3:   Semester Trend (selected terms)
          Page 4+N: Competency Profiles (one per group, RadarPrintAll)
          Page 5+N: Juror Consistency Heatmap
          Page 6+N: Score Distribution by Criterion (Boxplot)
          Page 7+N: Achievement Level Distribution (Rubric)
          ═══════════════════════════════════════════════════════ */}
      <div className="print-report">
        {/* Print-only header — appears above page 1 */}
        <div className="print-header">
          <div className="print-header-title">TED University — Department of Electrical &amp; Electronics Engineering</div>
          <div className="print-header-sub">EE 492 — Senior Project II · Poster Jury Evaluation Report · {semesterLabel} </div>
          <div className="print-header-meta">
            <div>Report Generated: {printDate}</div>
            <div className="print-header-summary">{summaryLabel}</div>
          </div>
        </div>

        {/* Page 1: Outcome by Group */}
        <section className="print-page report-chart page-chart">
          <h2 className="print-card-title">{CHART_COPY.outcomeByGroup.title}</h2>
          <div className="print-card-note">{CHART_COPY.outcomeByGroup.note}</div>
          <div className="chart-wrapper">
            <OutcomeByGroupChartPrint stats={dashboardStats} />
          </div>
        </section>

        {/* Page 2: Programme Averages */}
        <section className="print-page report-chart page-chart">
          <h2 className="print-card-title">{CHART_COPY.programmeAverages.title}</h2>
          <div className="print-card-note">{CHART_COPY.programmeAverages.note}</div>
          <div className="chart-wrapper">
            <OutcomeOverviewChartPrint data={submittedData} />
          </div>
        </section>

        {/* Page 3: Semester Trend */}
        {trendSemesterIds.length > 0 && (
          <section className="print-page report-chart page-chart">
            <h2 className="print-card-title">{CHART_COPY.semesterTrend.title}</h2>
            <div className="print-card-note">{CHART_COPY.semesterTrend.note}</div>
            <div className="chart-wrapper">
              <OutcomeTrendChartPrint
                data={trendData}
                semesters={semesterOptions}
                selectedIds={trendSemesterIds}
              />
            </div>
            <div className="print-chart-legend">
              {TREND_LEGEND.map((item) => (
                <span key={item.key} className="legend-item legend-item--stacked">
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span className="legend-label">
                    <span className="legend-label-main">{item.label}</span>
                    <span className="legend-label-sub">{outcomeCodeLine(item.code)}</span>
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Page 3+N: Competency Radar (one page per group) */}
        <RadarPrintAll stats={dashboardStats} />

        {/* Page 4+N: Juror Consistency Heatmap */}
        <section className="print-page report-chart page-chart">
          <h2 className="print-card-title">{CHART_COPY.jurorConsistency.title}</h2>
          <div className="print-card-note">{CHART_COPY.jurorConsistency.note}</div>
          <div className="cv-formula-block">
            <span className="cv-formula-pill" aria-label="CV equals sigma divided by x bar times 100">
              <math xmlns="http://www.w3.org/1998/Math/MathML" className="cv-formula-math">
                <mrow>
                  <mi>CV</mi>
                  <mo>=</mo>
                  <mrow>
                    <mo>(</mo>
                    <mfrac>
                      <mi>σ</mi>
                      <mi>μ</mi>
                    </mfrac>
                    <mo>)</mo>
                  </mrow>
                  <mo>×</mo>
                  <mn>100</mn>
                </mrow>
              </math>
            </span>
            <span className="cv-formula-legend">
              σ = std. deviation &nbsp;·&nbsp; μ = mean score &nbsp;·&nbsp; CV = juror disagreement %
            </span>
          </div>
          <div className="chart-wrapper">
            <JurorConsistencyHeatmapPrint stats={dashboardStats} data={submittedData} />
          </div>
        </section>

        {/* Page 5+N: Score Distribution by Criterion */}
        <section className="print-page report-chart page-chart">
          <h2 className="print-card-title">{CHART_COPY.scoreDistribution.title}</h2>
          <div className="print-card-note">{CHART_COPY.scoreDistribution.note}</div>
          <div className="chart-wrapper">
            <CriterionBoxPlotChartPrint data={submittedData} />
          </div>
        </section>

        {/* Page 6+N: Achievement Level Distribution */}
        <section className="print-page report-chart page-chart">
          <h2 className="print-card-title">{CHART_COPY.achievementDistribution.title}</h2>
          <div className="print-card-note">{CHART_COPY.achievementDistribution.note}</div>
          <div className="chart-wrapper">
            <RubricAchievementChartPrint data={submittedData} />
          </div>
        </section>

        {/* MÜDEK Outcome Mapping (new page) */}
        <section className="print-page print-appendix">
          <h2 className="print-card-title">MÜDEK Outcome Mapping</h2>
          <div className="print-card-note">
            Criteria-to-MÜDEK outcome references used in analytics.
          </div>
          <table className="print-appendix-table print-mudek-table">
            <thead>
              <tr>
                <th>Criteria</th>
                <th>MÜDEK Code(s)</th>
                <th>MÜDEK Outcome(s)</th>
              </tr>
            </thead>
            <tbody>
              {mudekMappingRows.map((row, idx) => (
                <tr key={`${row.code}-${idx}`}>
                  {row.showCriteria ? (
                    <td className="print-mudek-cell-criteria" rowSpan={row.rowSpan}>{row.criteria}</td>
                  ) : null}
                  <td className="print-mudek-cell-code">{row.code}</td>
                  <td className="print-mudek-cell-outcome">{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Final page: Group details */}
        <section className="print-page print-appendix">
          <h2 className="print-card-title">Group Details</h2>
          <div className="print-card-note">Group names, project titles, and student lists.</div>
          <table className="print-appendix-table print-group-details-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Project Title</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {appendixRows.map((row, idx) => (
                <tr key={`${row.groupLabel}-${idx}`}>
                  <td>{row.groupLabel}</td>
                  <td>{row.projectTitle || "—"}</td>
                  <td>{row.students.length ? row.students.join(" · ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
