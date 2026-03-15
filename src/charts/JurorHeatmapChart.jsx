// src/charts/JurorHeatmapChart.jsx
// ════════════════════════════════════════════════════════════
// CHART 4 — Juror Consistency Heatmap (CV)
// CV = SD/mean × 100 per group × criterion
// ════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { mean, stdDev } from "../shared/stats";
import {
  OUTCOMES,
  CHART_COPY,
  OutcomeLabelSvg,
  ChartEmpty,
  ChartDataTable,
} from "./chartUtils";

export function JurorConsistencyHeatmap({ stats, data }) {
  const groups = stats.filter((s) => s.count > 0);
  const rows   = data || [];
  if (!groups.length || !rows.length) return <ChartEmpty />;

  const rowsByProject = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  }, [rows]);

  const cellData = useMemo(() => (
    OUTCOMES.map((o) =>
      groups.map((g) => {
        const groupRows = rowsByProject.get(g.id) || [];
        const vals = groupRows
          .map((r) => Number(r[o.key]))
          .filter((v) => Number.isFinite(v));
        if (vals.length < 2) return { cv: null, m: null, sd: null, n: vals.length };
        const m  = mean(vals);
        if (!m) return { cv: null, m, sd: null, n: vals.length };
        const sd = stdDev(vals, true);
        return { cv: (sd / m) * 100, m, sd, n: vals.length };
      })
    )
  ), [groups, rowsByProject]);

  const cvBand = (v) => {
    if (v === null) return { fill: "#f1f5f9", text: "#94a3b8" };
    if (v < 10)    return { fill: "#dcfce7", text: "#166534" };
    if (v < 15)    return { fill: "#bbf7d0", text: "#166534" };
    if (v < 25)    return { fill: "#fef08a", text: "#92400e" };
    return               { fill: "#fecaca", text: "#991b1b" };
  };

  const leftW = 100;
  const topH  = 26;
  const cellW = 96;
  const cellH = 48;
  const W = leftW + groups.length * cellW;
  const H = topH + OUTCOMES.length * cellH + 10;

  return (
    <div className="chart-card chart-fill-card">
      <div className="chart-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.jurorConsistency.title}</div>
          <div className="chart-note">{CHART_COPY.jurorConsistency.note}</div>
        </div>
      </div>

      {/* CV formula with variable legend */}
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

      <div className="chart-scroll-wrap">
        <div className="chart-scroll-inner" style={{ minWidth: W }}>
          <div className="chart-svg-fill heatmap-svg-fill">
            <svg className="chart-main-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: W, maxWidth: "none", height: "100%", display: "block" }} role="img" aria-label="Juror Consistency Heatmap chart">
          {groups.map((g, i) => (
            <text key={g.id} x={leftW + i * cellW + cellW / 2} y={16}
              textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600"
            >
              {g.name}
            </text>
          ))}
          {OUTCOMES.map((o, i) => (
            <g key={o.key}>
              <OutcomeLabelSvg
                x={leftW - 10}
                y={topH + i * cellH + cellH / 2 - 4}
                label={o.label}
                code={o.code}
                anchor="end"
                mainSize={11}
                subSize={8.5}
                mainFill="#475569"
                subFill="#94a3b8"
                fontWeight={600}
                lineGap={9}
              />
              {groups.map((g, j) => {
                const cell = cellData[i][j];
                const v    = cell.cv;
                const x    = leftW + j * cellW;
                const y    = topH + i * cellH;
                const band = cvBand(v);
                const tooltipLines = [
                  `${g.name} · ${o.label}`,
                  `CV: ${v === null ? "N/A" : Math.round(v) + "%"}`,
                  cell.m !== null ? `Mean: ${((cell.m / o.max) * 100).toFixed(1)}%` : "",
                  cell.sd !== null ? `SD: ${cell.sd.toFixed(2)}` : "",
                  `N jurors: ${cell.n}`,
                ].filter(Boolean).join("\n");
                return (
                  <g key={`${o.key}-${g.id}`}>
                    <title>{tooltipLines}</title>
                    <rect x={x + 3} y={y + 3} width={cellW - 6} height={cellH - 6} rx="12" fill={band.fill} stroke="rgba(148,163,184,0.25)" />
                    <text x={x + cellW / 2} y={y + cellH / 2 + 6}
                      textAnchor="middle" fontSize="12" fill={band.text} fontWeight="700"
                    >
                      {v === null ? "N/A" : `${Math.round(v)}%`}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
            </svg>
          </div>
        </div>
      </div>

      <ChartDataTable
        caption="Juror Consistency Heatmap (CV %)"
        headers={["Criterion", "Group", "CV (%)", "Mean (%)", "N"]}
        rows={OUTCOMES.flatMap((o, i) =>
          groups.map((g, j) => {
            const cell = cellData[i][j];
            return [
              o.label,
              g.name,
              cell.cv !== null ? Math.round(cell.cv) + "%" : "N/A",
              cell.m !== null ? ((cell.m / o.max) * 100).toFixed(1) + "%" : "N/A",
              cell.n,
            ];
          })
        )}
      />

      <div className="heatmap-legend">
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch" style={{ background: "#dcfce7", borderColor: "#bbf7d0" }} />
          &lt;10% CV (excellent)
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch" style={{ background: "#bbf7d0", borderColor: "#86efac" }} />
          10–15% CV
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch" style={{ background: "#fef08a", borderColor: "#fde047" }} />
          15–25% CV
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch" style={{ background: "#fecaca", borderColor: "#fca5a5" }} />
          &gt;25% CV (poor)
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 4-PRINT — Juror Consistency Heatmap (CV grid)
// viewBox dynamic × dynamic  (full-width card)
// ════════════════════════════════════════════════════════════
export function JurorConsistencyHeatmapPrint({ stats, data }) {
  const groups = stats.filter((s) => s.count > 0);
  const rows   = data || [];
  if (!groups.length || !rows.length) return null;

  const rowsByProject = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  }, [rows]);

  const cellData = useMemo(() => (
    OUTCOMES.map((o) =>
      groups.map((g) => {
        const groupRows = rowsByProject.get(g.id) || [];
        const vals = groupRows
          .map((r) => Number(r[o.key]))
          .filter((v) => Number.isFinite(v));
        if (vals.length < 2) return { cv: null, n: vals.length };
        const m = mean(vals);
        if (!m) return { cv: null, n: vals.length };
        return { cv: (stdDev(vals, true) / m) * 100, n: vals.length };
      })
    )
  ), [groups, rowsByProject]);

  const cvBand = (v) => {
    if (v === null) return { fill: "#f1f5f9", text: "#94a3b8" };
    if (v < 10)    return { fill: "#dcfce7", text: "#166534" };
    if (v < 15)    return { fill: "#bbf7d0", text: "#166534" };
    if (v < 25)    return { fill: "#fef08a", text: "#92400e" };
    return               { fill: "#fecaca", text: "#991b1b" };
  };

  const leftW = 88;
  const topH  = 26;
  const cellH = 44;
  const maxW  = 700;
  const cellW = Math.min(100, Math.floor((maxW - leftW) / groups.length));
  const W     = leftW + groups.length * cellW;
  const legH  = 26;
  const H     = topH + OUTCOMES.length * cellH + legH;

  const legendColors = [
    { fill: "#dcfce7", label: "<10% CV (excellent)" },
    { fill: "#bbf7d0", label: "10–15% CV" },
    { fill: "#fef08a", label: "15–25% CV" },
    { fill: "#fecaca", label: ">25% CV (poor)" },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Column headers */}
      {groups.map((g, i) => (
        <text key={g.id}
          x={leftW + i * cellW + cellW / 2} y={17}
          textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600"
        >{g.name}</text>
      ))}

      {/* Rows */}
      {OUTCOMES.map((o, i) => (
        <g key={o.key}>
          <OutcomeLabelSvg
            x={leftW - 8}
            y={topH + i * cellH + cellH / 2 - 4}
            label={o.label}
            code={o.code}
            anchor="end"
            mainSize={10.5}
            subSize={8}
            mainFill="#475569"
            subFill="#94a3b8"
            fontWeight={600}
            lineGap={8}
          />
          {groups.map((g, j) => {
            const cv   = cellData[i][j].cv;
            const x    = leftW + j * cellW;
            const y    = topH + i * cellH;
            const band = cvBand(cv);
            return (
              <g key={`${o.key}-${g.id}`}>
                <rect x={x + 3} y={y + 3} width={cellW - 6} height={cellH - 6}
                  rx="9" fill={band.fill} stroke="rgba(148,163,184,0.25)" />
                <text x={x + cellW / 2} y={y + cellH / 2 + 5}
                  textAnchor="middle" fontSize="11" fill={band.text} fontWeight="700"
                >{cv === null ? "N/A" : `${Math.round(cv)}%`}</text>
              </g>
            );
          })}
        </g>
      ))}

      {/* Legend */}
      {legendColors.map((lc, i) => {
        const lx = leftW + i * Math.floor((W - leftW) / 4);
        const ly = topH + OUTCOMES.length * cellH + 6;
        return (
          <g key={lc.label}>
            <rect x={lx} y={ly} width={12} height={12} rx="3" fill={lc.fill}
              stroke="rgba(148,163,184,0.4)" />
            <text x={lx + 15} y={ly + 10} fontSize="8.5" fill="#6b7280">{lc.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
