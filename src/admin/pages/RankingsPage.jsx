// src/admin/RankingsPage.jsx — Phase 3
// Rankings page: KPI strip, filter panel, export panel, sortable table with heat cells + consensus badges.
// Prototype reference: vera-premium-prototype.html lines 11985–12197.
import { useMemo, useState, useRef, useEffect } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { exportRankingsXLSX } from "../utils/exportXLSX";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import SendReportModal from "@/admin/modals/SendReportModal";
import { GitCompare, Filter, Icon } from "lucide-react";
import CompareProjectsModal from "@/admin/modals/CompareProjectsModal";
import { StudentNames } from "@/shared/ui/EntityMeta";
import CustomSelect from "@/shared/ui/CustomSelect";
import { FilterButton } from "../../shared/ui/FilterButton.jsx";
import Pagination from "@/shared/ui/Pagination";

// ── Competition ranking ──────────────────────────────────────────
// Tied scores share the same rank; next rank skips (1,1,3,4,…).
function computeRanks(sortedRows) {
  const map = {};
  let rank = 1;
  for (let i = 0; i < sortedRows.length; i++) {
    if (i > 0 && sortedRows[i].totalAvg < sortedRows[i - 1].totalAvg) {
      rank = i + 1;
    }
    map[sortedRows[i].id] = rank;
  }
  return map;
}

// ── Export data builder — matches UI column names exactly ────────
function buildRankingsExportData(rankedRows, criteriaConfig, consensusMap, fmtMembers) {
  const totalMax = criteriaConfig.reduce((s, c) => s + (c.max || 0), 0);
  const header = [
    "Rank",
    "Project Title",
    "Team Members",
    ...criteriaConfig.map((c) => `${c.shortLabel || c.label} (${c.max})`),
    `Average (${totalMax})`,
    "Consensus",
    "Jurors Evaluated",
  ];
  let rank = 0, lastScore = null, idx = 0;
  const rows = rankedRows.map((p) => {
    idx += 1;
    if (Number.isFinite(p?.totalAvg) && p.totalAvg !== lastScore) { rank = idx; lastScore = p.totalAvg; }
    const consensus = consensusMap?.[p.id];
    const consensusLabel = consensus
      ? `${consensus.level === "high" ? "High" : consensus.level === "moderate" ? "Moderate" : "Disputed"} (σ=${consensus.sigma})`
      : "";
    return [
      Number.isFinite(p?.totalAvg) ? rank : "",
      p.title || p.name || "",
      fmtMembers(p.members || p.students),
      ...criteriaConfig.map((c) => Number.isFinite(p.avg?.[c.id]) ? Number(p.avg[c.id].toFixed(2)) : ""),
      Number.isFinite(p.totalAvg) ? Number(p.totalAvg.toFixed(2)) : "",
      consensusLabel,
      p.count ?? "",
    ];
  });
  return { header, rows };
}

// ── Per-project juror consensus (σ of per-juror totals) ─────────
function buildConsensusMap(summaryData, rawScores, criteriaConfig) {
  const map = {};
  if (!rawScores || !rawScores.length) return map;

  for (const proj of summaryData) {
    if (proj.totalAvg == null) continue;
    const projScores = rawScores.filter((s) => (s.projectId ?? s.project_id) === proj.id);
    if (!projScores.length) continue;

    const byJuror = {};
    for (const s of projScores) {
      const jid = s.jurorId ?? s.juror_id;
      if (!byJuror[jid]) byJuror[jid] = 0;
      for (const c of criteriaConfig) {
        const v = s[c.id];
        if (typeof v === "number") byJuror[jid] += v;
      }
    }

    const totals = Object.values(byJuror);
    if (totals.length < 2) continue;

    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((s, v) => s + (v - mean) ** 2, 0) / totals.length;
    const sigma = Math.sqrt(variance);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const level = sigma < 3 ? "high" : sigma <= 5 ? "moderate" : "disputed";

    map[proj.id] = { level, sigma: +sigma.toFixed(2), min: Math.round(min), max: Math.round(max) };
  }

  return map;
}

// ── Sub-components ───────────────────────────────────────────────

function HeatCell({ value, max, color, label }) {
  if (value == null) {
    return (
      <td className="heat-cell">
        <span className="heat-val">—</span>
      </td>
    );
  }
  const pct = Math.round((value / max) * 100);
  return (
    <td className="heat-cell">
      <span className="heat-val">{value.toFixed(1)}</span>
      <div className="heat-bar" style={{ background: color, width: `calc((${value}/${max})*100% - 28px)` }} />
      <span className="heat-tip">
        {label}: {value.toFixed(1)} / {max} ({pct}%)
      </span>
    </td>
  );
}

function ConsensusBadge({ consensus }) {
  if (!consensus) return null;
  const { level, sigma, min, max } = consensus;
  const label = level === "high" ? "High" : level === "moderate" ? "Moderate" : "Disputed";
  return (
    <>
      <span className={`consensus-badge consensus-${level}`}>{label}</span>
      <span className={`consensus-sub consensus-sub-${level}`}>
        <span className="consensus-sub-sigma">σ = {sigma}</span>
        <span className="consensus-sub-sep" />
        <span className="consensus-sub-range">range {min}–{max}</span>
      </span>
    </>
  );
}

function MedalCell({ rank }) {
  if (rank === 1)
    return (
      <div className="ranking-medal-cell">
        <span
          className="ranking-medal"
          role="img"
          aria-label="1st place"
          alt="1st place"
          title="1st Place"
        >
          🥇
        </span>
      </div>
    );
  if (rank === 2)
    return (
      <div className="ranking-medal-cell">
        <span
          className="ranking-medal"
          role="img"
          aria-label="2nd place"
          alt="2nd place"
          title="2nd Place"
        >
          🥈
        </span>
      </div>
    );
  if (rank === 3)
    return (
      <div className="ranking-medal-cell">
        <span
          className="ranking-medal"
          role="img"
          aria-label="3rd place"
          alt="3rd place"
          title="3rd Place"
        >
          🥉
        </span>
      </div>
    );
  return <span className="ranking-num">{rank}</span>;
}

// ── Icons ────────────────────────────────────────────────────────
const DownloadIcon = ({ size = 14, style }) => (
  <Icon
    iconNode={[]}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) {
    return <span className="sort-icon sort-icon-inactive">▲</span>;
  }
  return (
    <span className="sort-icon sort-icon-active">
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function RankingsPage() {
  const {
    summaryData = [],
    rawScores = [],
    allJurors = [],
    selectedPeriod = null,
    periodName: periodNameProp = "",
    criteriaConfig = [],
    loading = false,
  } = useAdminContext();
  const _toast = useToast();
  const { activeOrganization } = useAuth();
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [consensusFilter, setConsensusFilter] = useState("all");
  const [minAvg, setMinAvg] = useState("");
  const [maxAvg, setMaxAvg] = useState("");
  const [criterionFilter, setCriterionFilter] = useState("all");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [sendOpen, setSendOpen] = useState(false);
  const [sortField, setSortField] = useState("avg");
  const [sortDir, setSortDir] = useState("desc");
  const [consensusPopoverOpen, setConsensusPopoverOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [consensusPopoverPos, setConsensusPopoverPos] = useState({ top: 0, left: 0 });
  const consensusIconRef = useRef(null);
  const consensusPopoverRef = useRef(null);

  const activeFilterCount =
    (searchText ? 1 : 0) +
    (consensusFilter !== "all" ? 1 : 0) +
    (minAvg !== "" || maxAvg !== "" ? 1 : 0) +
    (criterionFilter !== "all" ? 1 : 0);

  function openConsensusPopover(e) {
    e.stopPropagation();
    if (consensusPopoverOpen) { setConsensusPopoverOpen(false); return; }
    const rect = consensusIconRef.current?.getBoundingClientRect();
    if (rect) {
      const popoverWidth = 280;
      let left = rect.right - popoverWidth;
      if (left < 8) left = 8;
      if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
      setConsensusPopoverPos({ top: rect.bottom + 6, left });
    }
    setConsensusPopoverOpen(true);
  }

  useEffect(() => {
    if (!consensusPopoverOpen) return;
    function handleClick(e) {
      if (
        consensusPopoverRef.current && !consensusPopoverRef.current.contains(e.target) &&
        consensusIconRef.current && !consensusIconRef.current.contains(e.target)
      ) {
        setConsensusPopoverOpen(false);
      }
    }
    const close = () => setConsensusPopoverOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [consensusPopoverOpen]);

  const periodName = periodNameProp || selectedPeriod?.name || selectedPeriod?.semester_name || "";

  // Sorted by totalAvg desc, nulls excluded — used for rank computation
  const rankedRows = useMemo(
    () =>
      [...summaryData]
        .filter((p) => p.totalAvg != null)
        .sort((a, b) => b.totalAvg - a.totalAvg),
    [summaryData]
  );

  const ranksMap = useMemo(() => computeRanks(rankedRows), [rankedRows]);

  const consensusMap = useMemo(
    () => buildConsensusMap(summaryData, rawScores, criteriaConfig),
    [summaryData, rawScores, criteriaConfig]
  );

  // ── KPIs ───────────────────────────────────────────────────────
  const totalProjects = rankedRows.length;
  const totalJurors = allJurors.length;

  // Average: only completed jurors (finalSubmitted, not in edit mode) — consistent with Overview
  const completedJurorIds = useMemo(() => new Set(
    allJurors.filter((j) => (j.finalSubmitted || j.finalSubmittedAt) && !j.editEnabled).map((j) => j.jurorId ?? j.id)
  ), [allJurors]);
  const completedRawScores = useMemo(
    () => rawScores.filter((r) => r.total != null && completedJurorIds.has(r.jurorId ?? r.juror_id)),
    [rawScores, completedJurorIds]
  );
  const avgScore = completedRawScores.length
    ? (completedRawScores.reduce((s, r) => s + r.total, 0) / completedRawScores.length).toFixed(1)
    : "—";

  const topScore = totalProjects ? rankedRows[0].totalAvg.toFixed(1) : "—";
  const actualCoverage = rankedRows.reduce((s, p) => s + (p.count || 0), 0);
  const maxPossible = totalProjects * totalJurors;

  // ── Filter criterion thresholds ────────────────────────────────
  const criterionThresholds = useMemo(() => {
    const t = {};
    for (const c of criteriaConfig) {
      t[c.id] = c.max === 10 ? 8 : 25;
    }
    return t;
  }, [criteriaConfig]);

  // ── Filtered + sorted display rows ────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = rankedRows;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (p) =>
          (p.title || p.name || "").toLowerCase().includes(q) ||
          (p.members || p.students || "").toLowerCase().includes(q)
      );
    }

    if (consensusFilter !== "all") {
      rows = rows.filter((p) => consensusMap[p.id]?.level === consensusFilter);
    }

    if (minAvg !== "") rows = rows.filter((p) => p.totalAvg >= +minAvg);
    if (maxAvg !== "") rows = rows.filter((p) => p.totalAvg <= +maxAvg);

    if (criterionFilter !== "all") {
      const threshold = criterionThresholds[criterionFilter] ?? 0;
      rows = rows.filter((p) => (p.avg?.[criterionFilter] ?? 0) >= threshold);
    }

    // Re-sort if user picked a non-default sort
    if (sortField !== "avg" || sortDir !== "desc") {
      rows = [...rows].sort((a, b) => {
        let va, vb;
        if (sortField === "rank") {
          va = ranksMap[a.id] ?? 9999;
          vb = ranksMap[b.id] ?? 9999;
        } else if (sortField === "avg") {
          va = a.totalAvg;
          vb = b.totalAvg;
        } else if (sortField === "project") {
          va = a.title || a.name || "";
          vb = b.title || b.name || "";
        } else if (sortField === "consensus") {
          const lvl = { high: 0, moderate: 1, disputed: 2 };
          va = lvl[consensusMap[a.id]?.level] ?? 3;
          vb = lvl[consensusMap[b.id]?.level] ?? 3;
        } else if (sortField === "jurors") {
          va = a.count ?? 0;
          vb = b.count ?? 0;
        } else {
          va = a.avg?.[sortField] ?? 0;
          vb = b.avg?.[sortField] ?? 0;
        }
        if (typeof va === "string")
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === "asc" ? va - vb : vb - va;
      });
    }

    return rows;
  }, [
    rankedRows,
    ranksMap,
    searchText,
    consensusFilter,
    minAvg,
    maxAvg,
    criterionFilter,
    sortField,
    sortDir,
    consensusMap,
    criterionThresholds,
  ]);

  const hasActiveFilters =
    searchText.trim() ||
    consensusFilter !== "all" ||
    minAvg !== "" ||
    maxAvg !== "" ||
    criterionFilter !== "all";

  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "project" || field === "rank" ? "asc" : "desc");
    }
  }

  function clearFilters() {
    setSearchText("");
    setConsensusFilter("all");
    setMinAvg("");
    setMaxAvg("");
    setCriterionFilter("all");
  }

  async function handleExport() {
    try {
      await logExportInitiated({
        action: "export.rankings",
        organizationId: activeOrganization?.id || null,
        resourceType: "score_sheets",
        details: {
          format: exportFormat,
          period_name: periodName || null,
          row_count: filteredRows.length,
        },
      });

      const tc = activeOrganization?.code || "";
      const fmtMembers = (m) => {
        if (!m) return "";
        if (Array.isArray(m)) return m.map((e) => (e?.name || e || "").toString().trim()).filter(Boolean).join("; ");
        return String(m).split(/,/).map((s) => s.trim()).filter(Boolean).join("; ");
      };
      const { header, rows } = buildRankingsExportData(filteredRows, criteriaConfig, consensusMap, fmtMembers);
      if (exportFormat === "xlsx") {
        await exportRankingsXLSX(filteredRows, criteriaConfig, { periodName, tenantCode: tc, consensusMap });
      } else {
        await downloadTable(exportFormat, {
          filenameType: "Rankings",
          sheetName: "Rankings",
          periodName,
          tenantCode: tc,
          organization: activeOrganization?.name || "",
          department: activeOrganization?.institution || "",
          pdfTitle: "VERA — Rankings",
          pdfSubtitle: `${periodName || "All Periods"} · ${filteredRows.length} projects`,
          header,
          rows,
        });
      }
      setExportPanelOpen(false);
      _toast.success("Rankings exported");
    } catch (e) {
      _toast.error(e?.message || "Export failed");
    }
  }

  const exportLabels = {
    xlsx: "Excel (.xlsx)",
    csv: "CSV (.csv)",
    pdf: "PDF Report",
  };

  return (
    <>
      <div className="rankings-page">
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="scores-header">
          <div className="scores-header-left">
            <div className="page-title">Rankings</div>
            <div className="page-desc">Project rankings by weighted average score.</div>
          </div>
          <div className="scores-header-actions">
            {summaryData.length >= 2 && (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCompareOpen(true)}
                >
                  <GitCompare size={14} style={{ verticalAlign: "-1px" }} /> Compare
                </button>
                <div className="scores-action-sep" />
              </>
            )}
            <FilterButton
              activeCount={activeFilterCount}
              isOpen={filterPanelOpen}
              onClick={() => setFilterPanelOpen((o) => !o)}
            />
            <div className="scores-action-sep" />
            <button
              className={`btn btn-outline btn-sm${exportPanelOpen ? " active" : ""}`}
              onClick={() => setExportPanelOpen((o) => !o)}
            >
              <DownloadIcon style={{ verticalAlign: "-1px" }} /> Export
            </button>
          </div>
        </div>

        {/* ── KPI Strip ────────────────────────────────────────── */}
        <div className="scores-kpi-strip">
          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">{totalProjects}</div>
            <div className="scores-kpi-item-label">Projects</div>
          </div>
          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">{totalJurors}</div>
            <div className="scores-kpi-item-label">Jurors</div>
          </div>
          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">{avgScore}</div>
            <div className="scores-kpi-item-label">Avg. Score</div>
          </div>
          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">
              <span className="accent">{topScore}</span>
            </div>
            <div className="scores-kpi-item-label">Top Score</div>
          </div>
          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">
              <span className="success">
                {actualCoverage} / {maxPossible}
              </span>
            </div>
            <div className="scores-kpi-item-label">Full Coverage</div>
          </div>
        </div>

        {/* ── Filter Panel (always in DOM, toggled via CSS class) ─ */}
        <div className={`filter-panel${filterPanelOpen ? " show" : ""}`}>
          <div className="filter-panel-header">
            <div>
              <h4 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Filter size={14} />
                Filter Scores
              </h4>
              <div className="filter-panel-sub">
                Narrow rankings by consensus level, score range, and evaluation coverage.
              </div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterPanelOpen(false)}>
              &#215;
            </button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Consensus</label>
              <CustomSelect
                value={consensusFilter}
                onChange={(v) => setConsensusFilter(v)}
                options={[
                  { value: "all", label: "All levels" },
                  { value: "high", label: "High only" },
                  { value: "moderate", label: "Moderate only" },
                  { value: "disputed", label: "Disputed only" },
                ]}
                ariaLabel="Consensus"
              />
            </div>
            <div className="filter-group">
              <label>Average Range</label>
              <div style={{ display: "flex", gap: 0 }}>
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  max="100"
                  value={minAvg}
                  onChange={(e) => setMinAvg(e.target.value)}
                  style={{ borderRadius: "10px 0 0 10px", borderRight: "none", width: 90 }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  max="100"
                  value={maxAvg}
                  onChange={(e) => setMaxAvg(e.target.value)}
                  style={{ borderRadius: "0 10px 10px 0", width: 90 }}
                />
              </div>
            </div>
            <div className="filter-group">
              <label>Criterion</label>
              <CustomSelect
                value={criterionFilter}
                onChange={(v) => setCriterionFilter(v)}
                options={[
                  { value: "all", label: "All criteria" },
                  ...criteriaConfig.map((c) => ({
                    value: c.id,
                    label: `${c.shortLabel || c.label} ≥ ${criterionThresholds[c.id]}`,
                  })),
                ]}
                ariaLabel="Criterion"
              />
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={clearFilters}>
              <Icon
                iconNode={[]}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.5 }}>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </Icon>{" "}
              Clear all
            </button>
          </div>
          <div className="filter-tags" />
        </div>

        {/* ── Active Filters Bar ───────────────────────────────── */}
        {hasActiveFilters && (
          <div className="active-filters-bar">
            <Icon
              iconNode={[]}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </Icon>
            <span>
              Filtered · {filteredRows.length} of {totalProjects} projects
            </span>
            <span className="clear-link" onClick={clearFilters}>
              Clear filters
            </span>
          </div>
        )}

        {/* ── Export Panel (always in DOM, toggled via CSS class) ─ */}
        <div className={`export-panel${exportPanelOpen ? " show" : ""}`}>
          <div className="export-panel-header">
            <div>
              <h4>
                <DownloadIcon size={14} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                Export Score Rankings
              </h4>
              <div className="export-panel-sub">
                Download rankings, averages, and per-juror breakdowns for the active evaluation
                period.
              </div>
            </div>
            <button className="export-panel-close" onClick={() => setExportPanelOpen(false)}>
              &#215;
            </button>
          </div>
          <div className="export-options">
            {[
              {
                id: "xlsx",
                label: "Excel (.xlsx)",
                fileLabel: "XLS",
                desc: "Rankings, averages, and per-juror breakdown",
                hint: "Best for sharing",
              },
              {
                id: "csv",
                label: "CSV (.csv)",
                fileLabel: "CSV",
                desc: "Raw scores for custom analysis pipelines",
                hint: "Best for analysis",
              },
              {
                id: "pdf",
                label: "PDF Report",
                fileLabel: "PDF",
                desc: "Formatted report with charts and context",
                hint: "Best for archival",
              },
            ].map((opt) => (
              <div
                key={opt.id}
                className={`export-option${exportFormat === opt.id ? " selected" : ""}`}
                onClick={() => setExportFormat(opt.id)}
              >
                <span className="export-option-selected-pill">Selected</span>
                <div className={`export-option-icon export-option-icon--${opt.id}`}>
                  <span className="file-icon">
                    <span className="file-icon-label">{opt.fileLabel}</span>
                  </span>
                </div>
                <div className="export-option-title">{opt.label}</div>
                <div className="export-option-desc">{opt.desc}</div>
                <div className="export-option-hint">{opt.hint}</div>
              </div>
            ))}
          </div>
          <div className="export-footer">
            <div className="export-footer-info">
              <div className="export-footer-format">
                {exportLabels[exportFormat]} · Score Rankings
              </div>
              <div className="export-footer-meta">
                {totalProjects} projects · {totalJurors} jurors
                {periodName ? ` · ${periodName}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSendOpen(true)} title="Send report via email" style={{ borderRadius: 999, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon
                  iconNode={[]}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" /></Icon>
                {" "}Send
              </button>
              <button
                className="btn btn-primary btn-sm export-download-btn"
                onClick={handleExport}
              >
                <DownloadIcon size={14} />
                {exportFormat === "xlsx"
                  ? "Download Excel"
                  : exportFormat === "csv"
                  ? "Download CSV"
                  : "Download PDF"}
              </button>
            </div>
          </div>
        </div>

        <SendReportModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          format={exportFormat}
          formatLabel={`${exportLabels[exportFormat]} · Score Rankings`}
          meta={`${totalProjects} projects · ${totalJurors} jurors${periodName ? ` · ${periodName}` : ""}`}
          reportTitle="Score Rankings"
          periodName={periodName}
          organization={activeOrganization?.name || ""}
          department={activeOrganization?.institution || ""}
          generateFile={async (fmt) => {
            const fmtMembers = (m) => {
              if (!m) return "";
              if (Array.isArray(m)) return m.map((e) => (e?.name || e || "").toString().trim()).filter(Boolean).join("; ");
              return String(m).split(/,/).map((s) => s.trim()).filter(Boolean).join("; ");
            };
            const { header, rows } = buildRankingsExportData(filteredRows, criteriaConfig, consensusMap, fmtMembers);
            return generateTableBlob(fmt, {
              filenameType: "Rankings", sheetName: "Rankings", periodName,
              tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
              department: activeOrganization?.institution || "", pdfTitle: "VERA — Rankings",
              header, rows,
            });
          }}
        />

        {compareOpen && (
          <CompareProjectsModal
            open={true}
            onClose={() => setCompareOpen(false)}
            projects={summaryData}
            criteriaConfig={criteriaConfig}
            rawScores={rawScores}
          />
        )}

        {/* ── Rankings Table ───────────────────────────────────── */}
        <div id="sub-rankings">
          <div className="table-wrap">
            <table className="ranking-table">
              <colgroup>
                <col style={{ width: 42 }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "14%" }} />
                {criteriaConfig.map((c) => (
                  <col key={c.id} style={{ width: "8%" }} />
                ))}
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className={`col-rank sortable${sortField === "rank" ? " sorted" : ""}`}
                    onClick={() => handleSort("rank")}
                  >
                    Rank
                    <SortIcon field="rank" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className={`sortable${sortField === "project" ? " sorted" : ""}`}
                    onClick={() => handleSort("project")}
                  >
                    Project Title
                    <SortIcon field="project" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th>Team Members</th>
                  {criteriaConfig.map((c) => (
                    <th
                      key={c.id}
                      className={`sortable text-right col-criteria-th${sortField === c.id ? " sorted" : ""}`}
                      onClick={() => handleSort(c.id)}
                    >
                      {c.shortLabel || c.label} ({c.max})
                      <SortIcon field={c.id} sortField={sortField} sortDir={sortDir} />
                    </th>
                  ))}
                  <th
                    className={`sortable text-right${sortField === "avg" ? " sorted" : ""}`}
                    style={{ paddingRight: 18 }}
                    onClick={() => handleSort("avg")}
                  >
                    Average ({criteriaConfig.reduce((s, c) => s + (c.max || 0), 0)})
                    <SortIcon field="avg" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className={`sortable text-center${sortField === "consensus" ? " sorted" : ""}`}
                    onClick={() => handleSort("consensus")}
                  >
                    <div className="col-info">
                      Consensus
                      <SortIcon field="consensus" sortField={sortField} sortDir={sortDir} />
                      <span
                        ref={consensusIconRef}
                        className="col-info-icon"
                        onClick={openConsensusPopover}
                      >?</span>
                    </div>
                  </th>
                  <th
                    className={`sortable text-right${sortField === "jurors" ? " sorted" : ""}`}
                    onClick={() => handleSort("jurors")}
                  >
                    Jurors Evaluated
                    <SortIcon field="jurors" sortField={sortField} sortDir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={3 + criteriaConfig.length + 3}
                      style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)" }}
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  pagedRows.map((proj) => {
                    const rank = ranksMap[proj.id];
                    const consensus = consensusMap[proj.id];
                    const title = proj.title || proj.name || "";
                    const members = proj.members || proj.students || "";

                    return (
                      <tr key={proj.id} className={rank <= 3 ? "ranking-highlight" : ""}>
                        <td className="col-rank" data-label="Rank">
                          <MedalCell rank={rank} />
                        </td>
                        <td className="col-project" data-label="Project Title">{title}</td>
                        <td className="col-students" data-label="Team Members"><StudentNames names={members} /></td>
                        {criteriaConfig.map((c) => (
                          <HeatCell
                            key={c.id}
                            value={proj.avg?.[c.id]}
                            max={c.max}
                            color={c.color}
                            label={c.shortLabel || c.label}
                          />
                        ))}
                        <td
                          className="col-avg"
                          data-label="Average"
                          style={rank === 1 ? { color: "var(--accent)" } : undefined}
                        >
                          {proj.totalAvg.toFixed(1)}
                        </td>
                        <td className="text-center consensus-cell" data-label="Consensus">
                          <ConsensusBadge consensus={consensus} />
                        </td>
                        <td className="col-jurors" data-label="Jurors">{proj.count ?? "—"}</td>
                      </tr>
                    );
                  })}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={3 + criteriaConfig.length + 3}
                      style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)" }}
                    >
                      {totalProjects === 0
                        ? "No scores available for this period."
                        : "No projects match the current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRows.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            itemLabel="projects"
          />
        </div>
      </div>
      {consensusPopoverOpen && (
        <div
          ref={consensusPopoverRef}
          className="col-info-popover show"
          style={{ position: "fixed", top: consensusPopoverPos.top, left: consensusPopoverPos.left, zIndex: 9999 }}
        >
          <h5>Juror Consensus</h5>
          <p>Measures how much jurors agree on a project&apos;s score. Based on the standard deviation (σ) of total scores across all jurors.</p>
          <div className="consensus-info-rows">
            <div className="consensus-info-row">
              <span className="consensus-badge consensus-high">High</span>
              <span className="consensus-info-desc">σ &lt; 3.0 — Jurors closely agree</span>
            </div>
            <div className="consensus-info-row">
              <span className="consensus-badge consensus-moderate">Moderate</span>
              <span className="consensus-info-desc">σ 3.0–5.0 — Some variation</span>
            </div>
            <div className="consensus-info-row">
              <span className="consensus-badge consensus-disputed">Disputed</span>
              <span className="consensus-info-desc">σ &gt; 5.0 — Significant disagreement</span>
            </div>
          </div>
          <p style={{ marginTop: 8, fontSize: 10, color: "var(--text-tertiary)" }}>
            Hover each badge to see the exact σ value and score range.
          </p>
        </div>
      )}
    </>
  );
}
