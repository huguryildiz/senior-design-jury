// src/charts/OutcomeOverviewChart.jsx
// ════════════════════════════════════════════════════════════
// CHART 2 — Programme-Level MÜDEK Outcome Averages
// Vertical bars: one per criterion, grand mean ±1 SD whiskers,
// horizontal dashed 70% reference line
// ════════════════════════════════════════════════════════════

import { MUDEK_THRESHOLD } from "../config";
import { mean, stdDev, outcomeValues } from "../shared/stats";
import {
  OUTCOMES,
  CHART_COPY,
  OutcomeLabelSvg,
  ChartEmpty,
  ChartDataTable,
} from "./chartUtils";

export function OutcomeOverviewChart({ data }) {
  const rows = data || [];
  if (!rows.length) return <ChartEmpty />;

  const items = OUTCOMES.map((o) => {
    const vals   = outcomeValues(rows, o.key);
    const avgRaw = vals.length ? mean(vals) : 0;
    const pct    = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
    const sd     = vals.length > 1 ? (stdDev(vals, true) / o.max) * 100 : 0;
    return { ...o, avgRaw, pct, sd, n: vals.length };
  });

  // Layout constants
  const barW    = 38;
  const barGap  = 22;
  const padL    = 34;   // room for y-axis labels
  const padR    = 8;
  const padTop  = 22;   // room for value labels above bars
  const padBot  = 32;   // room for x-axis labels + MÜDEK codes
  const chartH  = 160;  // height of the bar area

  const n    = items.length;                                 // 4
  const W    = padL + n * barW + (n - 1) * barGap + padR;  // total SVG width
  const H    = padTop + chartH + padBot;                     // total SVG height

  const barX  = (i) => padL + i * (barW + barGap);          // left edge of bar i
  const barCX = (i) => barX(i) + barW / 2;                  // centre x of bar i
  const pctY  = (pct) => padTop + chartH * (1 - Math.max(0, Math.min(100, pct)) / 100);

  const threshY = pctY(MUDEK_THRESHOLD);

  return (
    <div className="chart-card chart-compact-equal chart-fill-card dashboard-chart-card">
      <div className="chart-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.programmeAverages.title}</div>
          <div className="chart-note">{CHART_COPY.programmeAverages.note}</div>
        </div>
      </div>

      <div className="chart-svg-fill" style={{ overflowX: "auto" }}>
        <svg
          className="chart-main-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", display: "block" }}
          role="img"
          aria-label="Programme-Level Outcome Averages chart"
        >
          {/* Y-axis grid lines at 0 / 25 / 50 / 75 / 100 */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = pctY(v);
            return (
              <g key={v}>
                <line
                  x1={padL} y1={y} x2={W - padR} y2={y}
                  stroke={v === 0 ? "#cbd5e1" : "#e2e8f0"} strokeWidth={v === 0 ? 1.2 : 1}
                />
                <text className="chart-y-tick" x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="7" fill="#94a3b8">{v}</text>
              </g>
            );
          })}
          <text
            className="chart-y-label"
            x="10"
            y={padTop + chartH / 2}
            transform={`rotate(-90 10 ${padTop + chartH / 2})`}
            fontSize="8"
            fill="#94a3b8"
            textAnchor="middle"
          >
            Normalized (%)
          </text>

          {/* Bars */}
          {items.map((o, i) => {
            const x       = barX(i);
            const cx      = barCX(i);
            const topY    = pctY(o.pct);
            const barHpx  = chartH - (topY - padTop);   // pixel height of bar
            const sdHiY   = pctY(o.pct + o.sd);
            const sdLoY   = pctY(Math.max(0, o.pct - o.sd));
            return (
              <g key={o.key}>
                <title>{o.label} ({o.code}){"\n"}Grand mean: {o.pct.toFixed(1)}%{"\n"}Std. deviation (σ): ±{o.sd.toFixed(1)}%{"\n"}N evaluations: {o.n}</title>

                {/* Track (background) */}
                <rect x={x} y={padTop} width={barW} height={chartH} rx="3" fill="#f1f5f9" />

                {/* Bar */}
                {barHpx > 0 && (
                  <rect x={x} y={topY} width={barW} height={barHpx} rx="3" fill={o.color} />
                )}

                {/* ±1 SD whisker (vertical error bar above bar) */}
                {o.sd > 0 && (
                  <>
                    {/* Soft halo so caps are visible on bar color */}
                    <g stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" opacity="0.65">
                      <line x1={cx} y1={sdHiY} x2={cx} y2={sdLoY} />
                      <line x1={cx - 7} y1={sdHiY} x2={cx + 7} y2={sdHiY} />
                      <line x1={cx - 7} y1={sdLoY} x2={cx + 7} y2={sdLoY} />
                    </g>
                    <g stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" opacity="0.75">
                      {/* Vertical stem from pct-sd to pct+sd */}
                      <line x1={cx} y1={sdHiY} x2={cx} y2={sdLoY} />
                      {/* Horizontal caps */}
                      <line x1={cx - 7} y1={sdHiY} x2={cx + 7} y2={sdHiY} />
                      <line x1={cx - 7} y1={sdLoY} x2={cx + 7} y2={sdLoY} />
                      {/* End dots for a cleaner finish */}
                      <circle cx={cx} cy={sdHiY} r="1.6" fill="#6b7280" stroke="none" />
                      <circle cx={cx} cy={sdLoY} r="1.6" fill="#6b7280" stroke="none" />
                    </g>
                  </>
                )}

                {/* Value label inside bar (numeric only) */}
                <text
                  className="chart-bar-value"
                  x={cx}
                  y={topY + barHpx / 2 + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#ffffff"
                  stroke="rgba(15,23,42,0.35)"
                  strokeWidth="0.8"
                  fontWeight="700"
                  style={{ paintOrder: "stroke" }}
                >
                  {o.pct.toFixed(1)}
                </text>

                {/* X-axis label */}
                <OutcomeLabelSvg
                  x={cx}
                  y={padTop + chartH + 13}
                  label={o.label}
                  code={o.code}
                  mainSize={8.5}
                  subSize={7}
                  mainFill="#374151"
                  subFill="#94a3b8"
                  fontWeight={500}
                  lineGap={10}
                  mainClassName="chart-x-label"
                  subClassName="chart-x-label-sub"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <ChartDataTable
        caption="Programme-Level Outcome Averages"
        headers={["Criterion", "Code", "Mean (%)", "±SD (%)", "N"]}
        rows={items.map((o) => [o.label, o.code, o.pct.toFixed(1), o.sd.toFixed(1), o.n])}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 2-PRINT — Programme-Level Outcome Averages
// viewBox 340 × 210  (half-width card)
// ════════════════════════════════════════════════════════════
export function OutcomeOverviewChartPrint({ data }) {
  const rows = data || [];
  if (!rows.length) return null;

  const items = OUTCOMES.map((o) => {
    const vals   = outcomeValues(rows, o.key);
    const avgRaw = vals.length ? mean(vals) : 0;
    const pct    = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
    const sd     = vals.length > 1 ? (stdDev(vals, true) / o.max) * 100 : 0;
    return { ...o, avgRaw, pct, sd, n: vals.length };
  });

  const W       = 340;
  const barW    = 44;
  const barGap  = 28;
  const padL    = 36;
  const padR    = 10;
  const padTop  = 24;
  const padBot  = 38;   // x-label + code label + gap
  const chartH  = 140;
  const H       = padTop + chartH + padBot;

  const n          = items.length;
  const totalBarsW = n * barW + (n - 1) * barGap;
  const startX     = padL + (W - padL - padR - totalBarsW) / 2;
  const barX       = (i) => startX + i * (barW + barGap);
  const barCX      = (i) => barX(i) + barW / 2;
  const pctY       = (pct) => padTop + chartH * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const threshY    = pctY(MUDEK_THRESHOLD);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Y-axis grid + labels */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = pctY(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={v === 0 ? "#cbd5e1" : "#e2e8f0"} strokeWidth={v === 0 ? 1.2 : 1} />
            <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      <g transform={`translate(10, ${padTop + chartH / 2}) rotate(-90)`}>
        <text x="0" y="0" textAnchor="middle" fontSize="8" fill="#94a3b8">Normalized (%)</text>
      </g>

      {/* Threshold */}
      <line x1={padL} y1={threshY} x2={W - padR} y2={threshY}
        stroke="#6B7280" strokeWidth="1" strokeDasharray="4,3" />

      {/* Bars + whiskers + labels */}
      {items.map((o, i) => {
        const x      = barX(i);
        const cx     = barCX(i);
        const topY   = pctY(o.pct);
        const barHpx = chartH - (topY - padTop);
        const sdHiY  = pctY(o.pct + o.sd);
        const sdLoY  = pctY(Math.max(0, o.pct - o.sd));
        return (
          <g key={o.key}>
            {/* Track */}
            <rect x={x} y={padTop} width={barW} height={chartH} rx="3" fill="#f1f5f9" />
            {/* Bar */}
            {barHpx > 0 && (
              <rect x={x} y={topY} width={barW} height={barHpx} rx="3" fill={o.color} />
            )}
            {/* ±1 SD whisker */}
            {o.sd > 0 && (
              <>
                <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.65">
                  <line x1={cx} y1={sdHiY} x2={cx} y2={sdLoY} />
                  <line x1={cx - 7} y1={sdHiY} x2={cx + 7} y2={sdHiY} />
                  <line x1={cx - 7} y1={sdLoY} x2={cx + 7} y2={sdLoY} />
                </g>
                <g stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" opacity="0.75">
                  <line x1={cx} y1={sdHiY} x2={cx} y2={sdLoY} />
                  <line x1={cx - 7} y1={sdHiY} x2={cx + 7} y2={sdHiY} />
                  <line x1={cx - 7} y1={sdLoY} x2={cx + 7} y2={sdLoY} />
                  <circle cx={cx} cy={sdHiY} r="1.6" fill="#6b7280" stroke="none" />
                  <circle cx={cx} cy={sdLoY} r="1.6" fill="#6b7280" stroke="none" />
                </g>
              </>
            )}
            {/* Value label */}
            {barHpx > 14 && (
              <text
                x={cx} y={topY + barHpx / 2 + 4}
                textAnchor="middle" fontSize="10" fill="#ffffff"
                stroke="rgba(15,23,42,0.35)" strokeWidth="0.8" fontWeight="700"
                style={{ paintOrder: "stroke" }}
              >{o.pct.toFixed(1)}</text>
            )}
            {/* X-axis label */}
            <OutcomeLabelSvg
              x={cx}
              y={padTop + chartH + 14}
              label={o.label}
              code={o.code}
              mainSize={9.5}
              subSize={7.5}
              mainFill="#374151"
              subFill="#94a3b8"
              fontWeight={600}
              lineGap={12}
            />
          </g>
        );
      })}
    </svg>
  );
}
