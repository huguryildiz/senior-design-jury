// src/admin/modals/CompareProjectsModal.jsx
// Compare Projects modal — two-project radar chart + stats side-by-side.
// Prototype reference: docs/concepts/vera-premium-prototype.html
//
// Props:
//   open          — boolean
//   onClose       — () => void
//   projects      — summaryData[] — must have { id, title, avg, totalAvg }
//   criteriaConfig — Criterion[] — { id, label, shortLabel, max }
//   rawScores     — raw juror score rows for sigma computation

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronDown, X } from "lucide-react";
import Modal from "@/shared/ui/Modal";

// Compute σ of per-juror total scores for one project.
// Returns a formatted string like "2.67", or null if < 2 jurors.
function computeSigma(projectId, rawScores, criteriaConfig) {
  const projScores = rawScores.filter(
    (s) => (s.projectId ?? s.project_id) === projectId
  );
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
  if (totals.length < 2) return null;
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance =
    totals.reduce((s, v) => s + (v - mean) ** 2, 0) / totals.length;
  return Math.sqrt(variance).toFixed(2);
}

function CompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: 6,
        padding: "8px 12px",
        border: "1px solid var(--border)",
        fontSize: 12,
        lineHeight: 1.6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          color: "var(--text-tertiary)",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.stroke }}>
          {p.name}: {Number(p.value).toFixed(0)}%
        </div>
      ))}
    </div>
  );
}

export default function CompareProjectsModal({
  open,
  onClose,
  projects = [],
  criteriaConfig = [],
  rawScores = [],
}) {
  const [aId, setAId] = useState(() => projects[0]?.id ?? "");
  const [bId, setBId] = useState(() => projects[1]?.id ?? "");
  const [openDropdown, setOpenDropdown] = useState(null);
  const selectorsRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const hasA = projects.some((p) => p.id === aId);
    const hasB = projects.some((p) => p.id === bId);
    if (!hasA) setAId(projects[0]?.id ?? "");
    if (!hasB) setBId(projects[1]?.id ?? projects[0]?.id ?? "");
  }, [open, projects, aId, bId]);

  useEffect(() => {
    if (!openDropdown) return;
    function handleOutside(e) {
      if (selectorsRef.current?.contains(e.target)) return;
      setOpenDropdown(null);
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpenDropdown(null);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdown]);

  const projectA = useMemo(
    () => projects.find((p) => p.id === aId) ?? projects[0],
    [projects, aId]
  );
  const projectB = useMemo(
    () => projects.find((p) => p.id === bId) ?? projects[1],
    [projects, bId]
  );

  const sigmaA = useMemo(
    () => (projectA ? computeSigma(projectA.id, rawScores, criteriaConfig) : null),
    [projectA, rawScores, criteriaConfig]
  );
  const sigmaB = useMemo(
    () => (projectB ? computeSigma(projectB.id, rawScores, criteriaConfig) : null),
    [projectB, rawScores, criteriaConfig]
  );

  // Radar data: one entry per criterion, values normalized 0–100
  const radarData = useMemo(() => {
    if (!projectA || !projectB || !criteriaConfig.length) return [];
    return criteriaConfig.map((c) => ({
      axis: c.shortLabel || c.label,
      a:
        projectA.avg?.[c.id] != null
          ? (projectA.avg[c.id] / c.max) * 100
          : 0,
      b:
        projectB.avg?.[c.id] != null
          ? (projectB.avg[c.id] / c.max) * 100
          : 0,
    }));
  }, [projectA, projectB, criteriaConfig]);

  if (!projectA || !projectB) return null;

  const nameA = projectA.title || projectA.name || "Project A";
  const nameB = projectB.title || projectB.name || "Project B";

  return (
    <Modal open={open} onClose={onClose} size="compare">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="fs-modal-header">
        <div className="fs-modal-header-row">
          <div className="fs-title-group">
            <div className="fs-title">Compare Projects</div>
          </div>
          <button
            className="fs-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="fs-modal-body">
        {/* Project selectors */}
        <div className="compare-selectors" ref={selectorsRef}>
          <div className="compare-select-wrap">
            <button
              type="button"
              className={`filter-dropdown-trigger compare-select${openDropdown === "a" ? " open" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={openDropdown === "a"}
              aria-label="Project A"
              onClick={() => setOpenDropdown((v) => (v === "a" ? null : "a"))}
            >
              <span className="compare-select-value">{nameA}</span>
              <ChevronDown size={16} />
            </button>
            <div className={`filter-dropdown-menu compare-select-menu${openDropdown === "a" ? " show" : ""}`} role="listbox" aria-label="Project A">
              {projects.map((p) => {
                const label = p.title || p.name;
                const selected = p.id === aId;
                return (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={selected}
                    className={`filter-dropdown-option${selected ? " selected" : ""}`}
                    onClick={() => {
                      setAId(p.id);
                      setOpenDropdown(null);
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
          <span className="compare-vs">vs</span>
          <div className="compare-select-wrap">
            <button
              type="button"
              className={`filter-dropdown-trigger compare-select${openDropdown === "b" ? " open" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={openDropdown === "b"}
              aria-label="Project B"
              onClick={() => setOpenDropdown((v) => (v === "b" ? null : "b"))}
            >
              <span className="compare-select-value">{nameB}</span>
              <ChevronDown size={16} />
            </button>
            <div className={`filter-dropdown-menu compare-select-menu${openDropdown === "b" ? " show" : ""}`} role="listbox" aria-label="Project B">
              {projects.map((p) => {
                const label = p.title || p.name;
                const selected = p.id === bId;
                return (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={selected}
                    className={`filter-dropdown-option${selected ? " selected" : ""}`}
                    onClick={() => {
                      setBId(p.id);
                      setOpenDropdown(null);
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="compare-legend">
          <div className="compare-legend-item">
            <div className="compare-legend-dot compare-legend-a" />
            <span>{nameA}</span>
          </div>
          <div className="compare-legend-item">
            <div className="compare-legend-dot compare-legend-b" />
            <span>{nameB}</span>
          </div>
        </div>

        {/* Chart + Stats */}
        <div className="compare-grid">
          {/* Radar chart */}
          <div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid
                  gridType="polygon"
                  stroke="rgba(0,0,0,0.06)"
                />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: "var(--text-secondary, #475569)",
                  }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name={nameA}
                  dataKey="a"
                  stroke="rgba(59,130,246,0.7)"
                  fill="rgba(59,130,246,0.12)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Radar
                  name={nameB}
                  dataKey="b"
                  stroke="rgba(139,92,246,0.7)"
                  fill="rgba(139,92,246,0.10)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Tooltip content={<CompareTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats grid */}
          <div className="compare-stats">
            {criteriaConfig.map((c) => (
              <div key={c.id} className="compare-stat">
                <div className="compare-stat-label">
                  {(c.shortLabel || c.label).toUpperCase()} /{c.max}
                </div>
                <div className="compare-stat-values">
                  <span className="compare-stat-val compare-val-a">
                    {projectA.avg?.[c.id] != null
                      ? projectA.avg[c.id].toFixed(1)
                      : "—"}
                  </span>
                  <span className="compare-stat-val compare-val-b">
                    {projectB.avg?.[c.id] != null
                      ? projectB.avg[c.id].toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>
            ))}

            {/* Average row */}
            <div className="compare-stat">
              <div className="compare-stat-label">AVERAGE</div>
              <div className="compare-stat-values">
                <span className="compare-stat-val compare-val-a">
                  {projectA.totalAvg != null
                    ? projectA.totalAvg.toFixed(1)
                    : "—"}
                </span>
                <span className="compare-stat-val compare-val-b">
                  {projectB.totalAvg != null
                    ? projectB.totalAvg.toFixed(1)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Consensus row */}
            <div className="compare-stat">
              <div className="compare-stat-label">CONSENSUS</div>
              <div className="compare-stat-values">
                <span className="compare-stat-val compare-val-a">
                  {sigmaA != null ? `σ${sigmaA}` : "—"}
                </span>
                <span className="compare-stat-val compare-val-b">
                  {sigmaB != null ? `σ${sigmaB}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
