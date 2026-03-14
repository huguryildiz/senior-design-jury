// src/charts/OutcomeByGroupChart.jsx
// ════════════════════════════════════════════════════════════
// CHART 1 — Outcome Achievement by Group (MÜDEK)
// Each group = one cluster; each bar in cluster = one outcome (normalized %)
// ════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { MUDEK_THRESHOLD } from "../config";
import {
  OUTCOMES,
  CHART_COPY,
  OutcomeLegendLabel,
  OutcomeLabelSvg,
  ChartEmpty,
  ChartDataTable,
} from "./chartUtils";

export function OutcomeByGroupChart({ stats }) {
  const data = stats.filter((s) => s.count > 0);
  if (!data.length) return <ChartEmpty />;

  const scrollRef = useRef(null);
  const [wrapW, setWrapW] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = (w) => setWrapW(Math.max(0, Math.round(w || 0)));
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width);
    });
    ro.observe(el);
    update(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const barW   = 14;
  const gap    = 4;
  const baseGroupW = OUTCOMES.length * (barW + gap) + 12;
  const chartPadTop = 8;
  const chartH = 130;
  const padL   = 28;
  const baseTotalW = data.length * baseGroupW + padL + 10;
  const safePad = 28; // matches .chart-scroll-wrap horizontal padding (14px * 2)
  const targetW = Math.max(baseTotalW, wrapW ? Math.max(wrapW - safePad, 0) : 0);
  const groupW = Math.max(baseGroupW, (targetW - padL - 10) / data.length);
  const totalW = data.length * groupW + padL + 10;
  const totalH = chartH + chartPadTop;
  const threshY = chartPadTop + (chartH - (MUDEK_THRESHOLD / 100) * chartH);
  const needsScroll = wrapW > 0 && totalW > Math.max(wrapW - safePad, 0);

  return (
    <div className="chart-card chart-compact-equal">
      <div className="chart-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.outcomeByGroup.title}</div>
          <div className="chart-note">{CHART_COPY.outcomeByGroup.note}</div>
        </div>
      </div>

      <div
        className={`chart-scroll-wrap chart-scroll-wrap--outcome${needsScroll ? " is-overflowing" : ""}`}
        ref={scrollRef}
      >
        <div className="chart-scroll-inner" style={{ minWidth: totalW }}>
          <div className="chart-svg-wrap">
            <svg
              className="chart-main-svg"
              viewBox={`0 0 ${totalW} ${totalH + 36}`}
              style={{ width: totalW, maxWidth: "none", height: "auto", display: "block" }}
              role="img"
              aria-label="Outcome Achievement by Group chart"
            >
          <text
            x="10"
            y={chartPadTop + chartH / 2}
            transform={`rotate(-90 10 ${chartPadTop + chartH / 2})`}
            fontSize="8" fill="#94a3b8" textAnchor="middle"
          >
            Normalized (%)
          </text>

          {/* Y-axis grid lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = chartPadTop + (chartH - (v / 100) * chartH);
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={totalW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padL - 4} y={y + 4} fontSize="8" textAnchor="end" fill="#94a3b8">{v}</text>
              </g>
            );
          })}

          {/* Reference threshold line */}
          <g>
            <line x1={padL} y1={threshY} x2={totalW} y2={threshY} stroke="#6B7280" strokeWidth="1" strokeDasharray="3,3" />
          </g>

          {/* One cluster per group */}
          {data.map((group, gi) => {
            const gx = padL + gi * groupW + 4;
            return (
              <g key={group.id}>
                {OUTCOMES.map((o, oi) => {
                  const pct = ((group.avg[o.key] || 0) / o.max) * 100;
                  const h   = (pct / 100) * chartH;
                  const bx  = gx + oi * (barW + gap);
                  return (
                    <g key={o.key}>
                      <title>{group.name} · {o.label}: {pct.toFixed(1)}%</title>
                      <rect
                        x={bx} y={chartPadTop + (chartH - h)}
                        width={barW} height={h}
                        fill={o.color} rx="2" opacity="0.85"
                      />
                    </g>
                  );
                })}
                <text
                  x={gx + (OUTCOMES.length * (barW + gap)) / 2 - gap / 2}
                  y={chartPadTop + chartH + 14}
                  fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600"
                >{group.name}</text>
              </g>
            );
          })}
            </svg>
          </div>
        </div>
      </div>

      <ChartDataTable
        caption="Outcome Achievement by Group"
        headers={["Group", ...OUTCOMES.map((o) => o.label), "N"]}
        rows={data.map((group) => [
          group.name,
          ...OUTCOMES.map((o) => (((group.avg[o.key] || 0) / o.max) * 100).toFixed(1) + "%"),
          group.count,
        ])}
      />

      <div className="chart-legend">
        {OUTCOMES.map((o) => (
          <span key={o.key} className="legend-item legend-item--stacked">
            <span className="legend-dot" style={{ background: o.color }} />
            <OutcomeLegendLabel label={o.label} code={o.code} />
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-line" aria-hidden="true" />
          Reference ({MUDEK_THRESHOLD}%)
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 1-PRINT — Outcome Achievement by Group (clustered bars)
// viewBox 700 × 205  (full-width card)
// ════════════════════════════════════════════════════════════
export function OutcomeByGroupChartPrint({ stats }) {
  const data = stats.filter((s) => s.count > 0);
  if (!data.length) return null;

  const W           = 700;
  const padL        = 36;
  const padR        = 12;
  const chartPadTop = 14;
  const chartH      = 148;
  const padBot      = 54;   // group names + two-line legend + gap
  const H           = chartPadTop + chartH + padBot;

  const chartW   = W - padL - padR;
  const groupGap = Math.max(6, Math.min(12, chartW * 0.02));
  const groupW   = (chartW - groupGap * (data.length - 1)) / data.length;
  const barW     = Math.min(12, groupW / (OUTCOMES.length + 1.8));
  const gap      = Math.max(1, Math.min(3, barW * 0.28));
  const cluster  = OUTCOMES.length * (barW + gap) - gap;

  const threshY     = chartPadTop + chartH - (MUDEK_THRESHOLD / 100) * chartH;
  const yv          = (pct) => chartPadTop + chartH - (Math.max(0, Math.min(100, pct)) / 100) * chartH;
  const legendY     = H - 20;
  const legendItemW = Math.min(130, chartW / OUTCOMES.length);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: W, maxWidth: "100%", height: "auto", display: "block" }}
    >
      {/* Y-axis grid + labels */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = yv(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={v === 0 ? "#cbd5e1" : "#e2e8f0"} strokeWidth={v === 0 ? 1.2 : 1} />
            <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      <g transform={`translate(10, ${chartPadTop + chartH / 2}) rotate(-90)`}>
        <text x="0" y="0" textAnchor="middle" fontSize="8" fill="#94a3b8">Normalized (%)</text>
      </g>

      {/* Threshold line */}
      <line x1={padL} y1={threshY} x2={W - padR} y2={threshY}
        stroke="#6B7280" strokeWidth="1" strokeDasharray="3,3" />

      {/* One cluster per group */}
      {data.map((group, gi) => {
        const groupX   = padL + gi * (groupW + groupGap);
        const cx       = groupX + groupW / 2;
        const clusterX = cx - cluster / 2;
        return (
          <g key={group.id}>
            {OUTCOMES.map((o, oi) => {
              const pct = ((group.avg[o.key] || 0) / o.max) * 100;
              const h   = Math.max(1, (pct / 100) * chartH);
              const bx  = clusterX + oi * (barW + gap);
              return (
                <rect key={o.key}
                  x={bx} y={chartPadTop + chartH - h}
                  width={barW} height={h}
                  fill={o.color} rx="2" opacity="0.85"
                />
              );
            })}
            <text
              x={cx} y={chartPadTop + chartH + 13}
              textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600"
            >{group.name}</text>
          </g>
        );
      })}

      {/* Outcome legend */}
      {OUTCOMES.map((o, i) => (
        <g key={o.key}>
          <rect x={padL + i * legendItemW} y={legendY - 8} width={10} height={10} fill={o.color} rx="2" />
          <OutcomeLabelSvg
            x={padL + i * legendItemW + 13}
            y={legendY}
            label={o.label}
            code={o.code}
            anchor="start"
            mainSize={8.5}
            subSize={7}
            mainFill="#475569"
            subFill="#94a3b8"
            fontWeight={600}
            lineGap={9}
          />
        </g>
      ))}
      {/* Threshold legend item */}
      <line
        x1={padL + OUTCOMES.length * legendItemW} y1={legendY - 3}
        x2={padL + OUTCOMES.length * legendItemW + 16} y2={legendY - 3}
        stroke="#6B7280" strokeWidth="1.5" strokeDasharray="3,3"
      />
      <text x={padL + OUTCOMES.length * legendItemW + 19} y={legendY} fontSize="8.5" fill="#6B7280">
        Reference ({MUDEK_THRESHOLD}%)
      </text>
    </svg>
  );
}
