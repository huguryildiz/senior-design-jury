// src/charts/RubricAchievementChart.jsx
// ════════════════════════════════════════════════════════════
// CHART 6 — Rubric Achievement Level Distribution (vertical 100% stacked)
// Vertical bars: one bar per criterion, stacked Excellent→Insufficient bottom-to-top
// Banding uses CRITERIA rubric min/max thresholds from config
// ════════════════════════════════════════════════════════════

import { CRITERIA } from "../config";
import {
  OUTCOMES,
  CHART_COPY,
  OutcomeLabelSvg,
  ChartEmpty,
  ChartDataTable,
} from "./chartUtils";

export function RubricAchievementChart({ data }) {
  const rows = data || [];
  if (!rows.length) return <ChartEmpty />;

  // Stacked from bottom to top: Insufficient → Developing → Good → Excellent
  // So "better" results are higher on the chart.
  const bands = [
    { key: "insufficient", label: "Insufficient", color: "#ef4444" },
    { key: "developing",   label: "Developing",   color: "#f59e0b" },
    { key: "good",         label: "Good",         color: "#a3e635" },
    { key: "excellent",    label: "Excellent",    color: "#22c55e" },
  ];

  const classify = (v, rubric) => {
    if (!Number.isFinite(v)) return null;
    for (const band of rubric) {
      if (v >= band.min && v <= band.max) return band.level.toLowerCase();
    }
    return null;
  };

  const stacks = OUTCOMES.map((o) => {
    const criterion = CRITERIA.find((c) => c.id === o.key);
    const vals = rows.map((r) => Number(r[o.key])).filter((v) => Number.isFinite(v));
    const counts = { excellent: 0, good: 0, developing: 0, insufficient: 0 };
    vals.forEach((v) => {
      const k = classify(v, criterion.rubric);
      if (k) counts[k] += 1;
    });
    const total = vals.length || 1;
    const pct = bands.map((b) => ({ ...b, pct: (counts[b.key] / total) * 100, count: counts[b.key] }));
    return { ...o, pct, total: vals.length };
  });

  const bandPresence = bands.map((b) => ({
    ...b,
    anyPresent: stacks.some((c) => c.pct.find((p) => p.key === b.key)?.pct > 0),
  }));

  // Vertical layout
  const W       = 340;
  const padL    = 32;  // y-axis labels
  const padR    = 10;
  const padT    = 8;
  const padB    = 40;  // x-axis labels + MÜDEK codes
  const chartH  = 180;
  const H       = padT + chartH + padB;
  const groupW  = (W - padL - padR) / stacks.length;
  const barW    = Math.min(44, groupW * 0.65);
  const yScale  = (pct) => (pct / 100) * chartH;

  return (
    <div className="chart-card chart-equal-bottom dashboard-chart-card">
      <div className="chart-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.achievementDistribution.title}</div>
          <div className="chart-note">{CHART_COPY.achievementDistribution.note}</div>
        </div>
      </div>

      <div className="chart-svg-fill rubric-svg-fill" style={{ overflowX: "auto" }}>
        <svg className="chart-main-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Achievement Level Distribution chart">
          {/* Y-axis grid lines and labels */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = padT + chartH - yScale(v);
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padL - 4} y={y + 4} fontSize="8" textAnchor="end" fill="#94a3b8">{v}%</text>
              </g>
            );
          })}

          {/* One vertical 100%-stacked bar per criterion */}
          {stacks.map((c, i) => {
            const cx = padL + i * groupW + groupW / 2;
            const x  = cx - barW / 2;
            let cursorFromBottom = 0;
            return (
              <g key={c.key}>
                {c.pct.map((b) => {
                  if (b.pct <= 0) return null;
                  const segH = yScale(b.pct);
                  const y    = padT + chartH - cursorFromBottom - segH;
                  cursorFromBottom += segH;
                  const showLabel = segH >= 16;
                  return (
                    <g key={b.key}>
                      <title>{c.label} · {b.label}{"\n"}Count: {b.count} evaluation{b.count !== 1 ? "s" : ""}{"\n"}Share: {b.pct.toFixed(0)}%</title>
                      <rect x={x} y={y} width={barW} height={segH} fill={b.color} />
                      {showLabel && (
                        <text x={cx} y={y + segH / 2 + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
                          {b.pct.toFixed(0)}%
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* Criterion label below bar */}
                <OutcomeLabelSvg
                  x={cx}
                  y={padT + chartH + 14}
                  label={c.label}
                  code={c.code}
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
        caption="Achievement Level Distribution"
        headers={["Criterion", "Band", "%"]}
        rows={stacks.flatMap((c) =>
          c.pct.map((b) => [c.label, b.label, b.pct.toFixed(1) + "%"])
        )}
      />

      <div className="chart-legend rubric-legend">
        {[...bandPresence].reverse().map((b) => (
          <span
            key={b.key}
            className="legend-item"
            style={b.anyPresent ? undefined : { opacity: 0.35, textDecoration: "line-through" }}
          >
            <span className="legend-dot" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 6-PRINT — Achievement Level Distribution (100% stacked)
// viewBox 340 × 220  (half-width card)
// ════════════════════════════════════════════════════════════
export function RubricAchievementChartPrint({ data }) {
  const rows = data || [];
  if (!rows.length) return null;

  const bands = [
    { key: "insufficient", label: "Insufficient", color: "#ef4444" },
    { key: "developing",   label: "Developing",   color: "#f59e0b" },
    { key: "good",         label: "Good",         color: "#a3e635" },
    { key: "excellent",    label: "Excellent",    color: "#22c55e" },
  ];

  const classify = (v, rubric) => {
    if (!Number.isFinite(v)) return null;
    for (const band of rubric) {
      if (v >= band.min && v <= band.max) return band.level.toLowerCase();
    }
    return null;
  };

  const stacks = OUTCOMES.map((o) => {
    const criterion = CRITERIA.find((c) => c.id === o.key);
    const vals      = rows.map((r) => Number(r[o.key])).filter((v) => Number.isFinite(v));
    const counts    = { excellent: 0, good: 0, developing: 0, insufficient: 0 };
    vals.forEach((v) => {
      const k = classify(v, criterion.rubric);
      if (k) counts[k] += 1;
    });
    const total = vals.length || 1;
    const pct   = bands.map((b) => ({ ...b, pct: (counts[b.key] / total) * 100, count: counts[b.key] }));
    return { ...o, pct };
  });

  const bandPresence = bands.map((b) => ({
    ...b,
    anyPresent: stacks.some((c) => c.pct.find((p) => p.key === b.key)?.pct > 0),
  }));

  const W      = 340;
  const padL   = 32;
  const padR   = 10;
  const padT   = 8;
  const padB   = 54;   // x-labels + MÜDEK codes + legend
  const chartH = 160;
  const H      = padT + chartH + padB;
  const groupW = (W - padL - padR) / stacks.length;
  const barW   = Math.min(44, groupW * 0.65);
  const yScale = (pct) => (pct / 100) * chartH;
  const legendY = H - 8;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Y-axis grid */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padT + chartH - yScale(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} fontSize="7.5" textAnchor="end" fill="#94a3b8">{v}%</text>
          </g>
        );
      })}

      {/* Stacked bars */}
      {stacks.map((c, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const x  = cx - barW / 2;
        let cursorFromBottom = 0;
        return (
          <g key={c.key}>
            {c.pct.map((b) => {
              if (b.pct <= 0) return null;
              const segH = yScale(b.pct);
              const y    = padT + chartH - cursorFromBottom - segH;
              cursorFromBottom += segH;
              const showLabel = segH >= 14;
              return (
                <g key={b.key}>
                  <rect x={x} y={y} width={barW} height={segH} fill={b.color} />
                  {showLabel && (
                    <text x={cx} y={y + segH / 2 + 4}
                      textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700"
                    >{b.pct.toFixed(0)}%</text>
                  )}
                </g>
              );
            })}
            <OutcomeLabelSvg
              x={cx}
              y={padT + chartH + 12}
              label={c.label}
              code={c.code}
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
      {[...bandPresence].reverse().map((b, i) => {
        const lx = padL + i * 74;
        return (
          <g key={b.key} opacity={b.anyPresent ? 1 : 0.4}>
            <rect x={lx} y={legendY - 8} width={10} height={10} fill={b.color} rx="2" />
            <text x={lx + 13} y={legendY} fontSize="8.5" fill="#475569">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
