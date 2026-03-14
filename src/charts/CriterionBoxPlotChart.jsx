// src/charts/CriterionBoxPlotChart.jsx
// ════════════════════════════════════════════════════════════
// CHART 5 — Score Distribution by Criterion (Boxplot)
// Normalized to 0–100% for comparability
// ════════════════════════════════════════════════════════════

import { quantile } from "../shared/stats";
import {
  OUTCOMES,
  CHART_COPY,
  OutcomeLabelSvg,
  ChartEmpty,
  ChartDataTable,
} from "./chartUtils";

export function CriterionBoxPlotChart({ data }) {
  const rows = data || [];
  if (!rows.length) return <ChartEmpty />;

  const boxes = OUTCOMES.map((o) => {
    const vals = rows
      .map((r) => Number(r[o.key]))
      .filter((v) => Number.isFinite(v))
      .map((v) => (v / o.max) * 100)
      .sort((a, b) => a - b);
    if (!vals.length) return { ...o, empty: true };
    const q1 = quantile(vals, 0.25);
    const med = quantile(vals, 0.5);
    const q3  = quantile(vals, 0.75);
    const iqr = q3 - q1;
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;
    const whiskerMin = vals.find((v) => v >= low) ?? vals[0];
    const whiskerMax = [...vals].reverse().find((v) => v <= high) ?? vals[vals.length - 1];
    const outliers   = vals.filter((v) => v < low || v > high);
    return { ...o, q1, med, q3, whiskerMin, whiskerMax, outliers };
  });

  const W = 320;
  const padL = 36;
  const padR = 10;
  const chartPadTop = 6;
  const chartH = 160;
  const totalH = chartH + chartPadTop + 32;
  const groupW = (W - padL - padR) / boxes.length;
  const bandW = 18;
  const allVals = boxes.flatMap((b) =>
    b.empty ? [] : [b.whiskerMin, b.whiskerMax, ...b.outliers]
  );
  const rawMin = allVals.length ? Math.min(...allVals) : 0;
  const rawMax = allVals.length ? Math.max(...allVals) : 100;
  const range = Math.max(5, rawMax - rawMin);
  const pad = Math.min(10, range * 0.12);
  const scaleMin = Math.max(0, rawMin - pad);
  const scaleMax = Math.min(100, rawMax + pad);
  const yv = (v) =>
    chartPadTop + (chartH - ((v - scaleMin) / Math.max(1, scaleMax - scaleMin)) * chartH);

  const step =
    range <= 10 ? 2 :
    range <= 20 ? 5 :
    range <= 40 ? 10 :
    range <= 70 ? 20 : 25;
  const tickStart = Math.ceil(scaleMin / step) * step;
  const tickEnd = Math.floor(scaleMax / step) * step;
  const ticks = [];
  for (let t = tickStart; t <= tickEnd; t += step) ticks.push(t);
  if (ticks.length < 2) {
    ticks.length = 0;
    ticks.push(Math.round(scaleMin), Math.round((scaleMin + scaleMax) / 2), Math.round(scaleMax));
  }

  return (
    <div className="chart-card chart-equal-bottom dashboard-chart-card">
      <div className="chart-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.scoreDistribution.title}</div>
          <div className="chart-note">{CHART_COPY.scoreDistribution.note}</div>
        </div>
      </div>


      <div className="chart-svg-fill heatmap-svg-fill" style={{ overflowX: "auto" }}>
        <svg className="chart-main-svg" viewBox={`0 0 ${W} ${totalH}`} style={{ width: "100%", height: "100%", display: "block" }} role="img" aria-label="Score Distribution by Criterion chart">
          {ticks.map((v) => {
            const yy = yv(v);
            return (
              <g key={v}>
                <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padL - 4} y={yy + 4} fontSize="8" textAnchor="end" fill="#94a3b8">{Math.round(v)}</text>
              </g>
            );
          })}
          <line x1={padL} y1={chartPadTop} x2={padL} y2={chartPadTop + chartH} stroke="#e2e8f0" strokeWidth="1" />
          <text
            x="10"
            y={chartPadTop + chartH / 2}
            transform={`rotate(-90 10 ${chartPadTop + chartH / 2})`}
            fontSize="8"
            fill="#94a3b8"
            textAnchor="middle"
          >
            Normalized (%)
          </text>

          {boxes.map((b, i) => {
            const bx = padL + i * groupW + groupW / 2;
            if (b.empty) {
              return (
                <OutcomeLabelSvg
                  key={b.key}
                  x={bx}
                  y={chartPadTop + chartH + 14}
                  label={b.label}
                  code={b.code}
                  mainSize={9}
                  subSize={7}
                  mainFill="#94a3b8"
                  subFill="#94a3b8"
                  fontWeight={600}
                  lineGap={10}
                />
              );
            }
            const yQ1  = yv(b.q1);
            const yQ3  = yv(b.q3);
            const yMed = yv(b.med);
            return (
              <g key={b.key}>
                <rect
                  x={bx - bandW / 2} y={yQ3}
                  width={bandW} height={Math.max(2, yQ1 - yQ3)}
                  fill="rgba(59,130,246,0.18)" stroke={b.color} strokeWidth="1.6"
                />
                <line x1={bx - bandW / 2} y1={yMed} x2={bx + bandW / 2} y2={yMed} stroke={b.color} strokeWidth="2.2" />
                <OutcomeLabelSvg
                  x={bx}
                  y={chartPadTop + chartH + 14}
                  label={b.label}
                  code={b.code}
                  mainSize={9}
                  subSize={7}
                  mainFill="#475569"
                  subFill="#94a3b8"
                  fontWeight={600}
                  lineGap={10}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <ChartDataTable
        caption="Score Distribution by Criterion"
        headers={["Criterion", "Min", "Q1", "Median", "Q3", "Max", "N"]}
        rows={boxes
          .filter((b) => !b.empty)
          .map((b) => [
            b.label,
            b.whiskerMin.toFixed(1) + "%",
            b.q1.toFixed(1) + "%",
            b.med.toFixed(1) + "%",
            b.q3.toFixed(1) + "%",
            b.whiskerMax.toFixed(1) + "%",
            rows.filter((r) => Number.isFinite(Number(r[b.key]))).length,
          ])}
      />

      <div className="chart-legend boxplot-legend">
        <span className="legend-item">
          <span className="boxplot-legend-box" />
          IQR band (Q1–Q3)
        </span>
        <span className="legend-item">
          <span className="boxplot-legend-median" />
          Median
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 5-PRINT — Score Distribution by Criterion (boxplot)
// viewBox 340 × 215  (half-width card)
// ════════════════════════════════════════════════════════════
export function CriterionBoxPlotChartPrint({ data }) {
  const rows = data || [];
  if (!rows.length) return null;

  const boxes = OUTCOMES.map((o) => {
    const vals = rows
      .map((r) => Number(r[o.key]))
      .filter((v) => Number.isFinite(v))
      .map((v) => (v / o.max) * 100)
      .sort((a, b) => a - b);
    if (!vals.length) return { ...o, empty: true };
    const q1  = quantile(vals, 0.25);
    const med = quantile(vals, 0.5);
    const q3  = quantile(vals, 0.75);
    const iqr = q3 - q1;
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;
    const whiskerMin = vals.find((v) => v >= low) ?? vals[0];
    const whiskerMax = [...vals].reverse().find((v) => v <= high) ?? vals[vals.length - 1];
    const outliers   = vals.filter((v) => v < low || v > high);
    return { ...o, q1, med, q3, whiskerMin, whiskerMax, outliers };
  });

  const W           = 340;
  const padL        = 36;
  const padR        = 10;
  const chartPadTop = 8;
  const chartH      = 152;
  const padBot      = 52;   // x-label + MÜDEK codes + legend
  const H           = chartPadTop + chartH + padBot;
  const groupW      = (W - padL - padR) / boxes.length;
  const bandW       = 20;

  const allVals  = boxes.flatMap((b) => b.empty ? [] : [b.whiskerMin, b.whiskerMax, ...b.outliers]);
  const rawMin   = allVals.length ? Math.min(...allVals) : 0;
  const rawMax   = allVals.length ? Math.max(...allVals) : 100;
  const range    = Math.max(5, rawMax - rawMin);
  const pad      = Math.min(10, range * 0.12);
  const scaleMin = Math.max(0, rawMin - pad);
  const scaleMax = Math.min(100, rawMax + pad);
  const yv       = (v) => chartPadTop + (chartH - ((v - scaleMin) / Math.max(1, scaleMax - scaleMin)) * chartH);

  const step = range <= 10 ? 2 : range <= 20 ? 5 : range <= 40 ? 10 : range <= 70 ? 20 : 25;
  const ticks = [];
  for (let t = Math.ceil(scaleMin / step) * step; t <= scaleMax; t += step) ticks.push(t);
  if (ticks.length < 2) ticks.push(Math.round(scaleMin), Math.round(scaleMax));

  const legendY = H - 8;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Y-axis grid */}
      {ticks.map((v) => {
        const y = yv(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} fontSize="7.5" textAnchor="end" fill="#94a3b8">{Math.round(v)}</text>
          </g>
        );
      })}
      <line x1={padL} y1={chartPadTop} x2={padL} y2={chartPadTop + chartH} stroke="#e2e8f0" strokeWidth="1" />
      <g transform={`translate(10, ${chartPadTop + chartH / 2}) rotate(-90)`}>
        <text x="0" y="0" textAnchor="middle" fontSize="8" fill="#94a3b8">Normalized (%)</text>
      </g>

      {/* Boxes */}
      {boxes.map((b, i) => {
        const bx = padL + i * groupW + groupW / 2;
        if (b.empty) {
          return (
            <OutcomeLabelSvg
              key={b.key}
              x={bx}
              y={chartPadTop + chartH + 12}
              label={b.label}
              code={b.code}
              mainSize={9}
              subSize={7}
              mainFill="#94a3b8"
              subFill="#94a3b8"
              fontWeight={600}
              lineGap={10}
            />
          );
        }
        const yQ1  = yv(b.q1);
        const yQ3  = yv(b.q3);
        const yMed = yv(b.med);
        const yWhi = yv(b.whiskerMin);
        const yWha = yv(b.whiskerMax);
        return (
          <g key={b.key}>
            {/* Whisker stems */}
            <line x1={bx} y1={yWha} x2={bx} y2={yQ3}
              stroke={b.color} strokeWidth="1.2" strokeDasharray="2,1" opacity="0.6" />
            <line x1={bx} y1={yQ1} x2={bx} y2={yWhi}
              stroke={b.color} strokeWidth="1.2" strokeDasharray="2,1" opacity="0.6" />
            {/* Whisker caps */}
            <line x1={bx - 6} y1={yWha} x2={bx + 6} y2={yWha}
              stroke={b.color} strokeWidth="1.2" opacity="0.6" />
            <line x1={bx - 6} y1={yWhi} x2={bx + 6} y2={yWhi}
              stroke={b.color} strokeWidth="1.2" opacity="0.6" />
            {/* IQR box */}
            <rect
              x={bx - bandW / 2} y={yQ3}
              width={bandW} height={Math.max(2, yQ1 - yQ3)}
              fill="rgba(59,130,246,0.18)" stroke={b.color} strokeWidth="1.6"
            />
            {/* Median */}
            <line x1={bx - bandW / 2} y1={yMed} x2={bx + bandW / 2} y2={yMed}
              stroke={b.color} strokeWidth="2.2" />
            {/* Outliers */}
            {b.outliers.map((ov, oi) => (
              <circle key={oi} cx={bx} cy={yv(ov)} r="2.5"
                fill="none" stroke={b.color} strokeWidth="1.2" opacity="0.6" />
            ))}
            {/* X label */}
            <OutcomeLabelSvg
              x={bx}
              y={chartPadTop + chartH + 12}
              label={b.label}
              code={b.code}
              mainSize={9}
              subSize={7}
              mainFill="#475569"
              subFill="#94a3b8"
              fontWeight={600}
              lineGap={10}
            />
          </g>
        );
      })}

      {/* Legend */}
      <rect x={padL} y={legendY - 8} width={10} height={10}
        fill="rgba(59,130,246,0.18)" stroke="#4080c0" strokeWidth="1.4" />
      <text x={padL + 13} y={legendY} fontSize="8" fill="#475569">IQR (Q1–Q3)</text>
      <line x1={padL + 84} y1={legendY - 3} x2={padL + 104} y2={legendY - 3}
        stroke="#4080c0" strokeWidth="2.2" />
      <text x={padL + 107} y={legendY} fontSize="8" fill="#475569">Median</text>
      <circle cx={padL + 164} cy={legendY - 3} r="2.5"
        fill="none" stroke="#9ca3af" strokeWidth="1.2" />
      <text x={padL + 169} y={legendY} fontSize="8" fill="#475569">Outlier</text>
    </svg>
  );
}
