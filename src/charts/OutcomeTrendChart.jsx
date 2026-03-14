// src/charts/OutcomeTrendChart.jsx
// ════════════════════════════════════════════════════════════
// CHART 2b — Semester Trend (grouped bar chart)
// Shows normalized averages per criterion across selected semesters
// ════════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  OUTCOMES,
  CHART_COPY,
  OutcomeLegendLabel,
  ChartEmpty,
  ChartDataTable,
} from "./chartUtils";

export function OutcomeTrendChart({
  data = [],
  semesters = [],
  selectedIds = [],
  loading = false,
  error = "",
  headerRight = null,
  hint = "",
}) {
  const outcomeByKey = useMemo(
    () => Object.fromEntries(OUTCOMES.map((o) => [o.key, o])),
    []
  );

  const series = [
    {
      key: "technical",
      label: outcomeByKey.technical?.label || "Technical",
      code: outcomeByKey.technical?.code || "1.2/2/3.1/3.2",
      color: outcomeByKey.technical?.color || "#f59e0b",
      max: outcomeByKey.technical?.max ?? 0,
      field: "avgTechnical",
    },
    {
      key: "design",
      label: outcomeByKey.design?.label || "Written",
      code: outcomeByKey.design?.code || "9.2",
      color: outcomeByKey.design?.color || "#22c55e",
      max: outcomeByKey.design?.max ?? 0,
      field: "avgWritten",
    },
    {
      key: "delivery",
      label: outcomeByKey.delivery?.label || "Oral",
      code: outcomeByKey.delivery?.code || "9.1",
      color: outcomeByKey.delivery?.color || "#3b82f6",
      max: outcomeByKey.delivery?.max ?? 0,
      field: "avgOral",
    },
    {
      key: "teamwork",
      label: outcomeByKey.teamwork?.label || "Teamwork",
      code: outcomeByKey.teamwork?.code || "8.1/8.2",
      color: outcomeByKey.teamwork?.color || "#ef4444",
      max: outcomeByKey.teamwork?.max ?? 0,
      field: "avgTeamwork",
    },
  ];

  const orderedSemesters = useMemo(() => {
    const orderIndex = new Map((semesters || []).map((s, i) => [s.id, i]));
    const selected = (semesters || []).filter((s) => (selectedIds || []).includes(s.id));
    return selected.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  }, [semesters, selectedIds]);

  const dataMap = useMemo(
    () => new Map((data || []).map((row) => [row.semesterId, row])),
    [data]
  );

  const points = orderedSemesters.map((s) => {
    const row = dataMap.get(s.id);
    const n = row?.nEvals ?? 0;
    const vals = Object.fromEntries(series.map((ser) => {
      const raw = row ? row[ser.field] : null;
      const hasData = row && Number(row.nEvals || 0) > 0;
      const pct = hasData && Number.isFinite(raw) && ser.max > 0
        ? (raw / ser.max) * 100
        : null;
      return [ser.key, pct];
    }));
    return {
      id: s.id,
      label: row?.semesterName || s.name || "—",
      n,
      values: vals,
    };
  });

  const padL = 34;
  const padR = 18;
  const padTop = 18;
  const padBot = 46;
  const chartH = 220;
  const barW = 16;
  const barGap = 4;
  const groupGap = 40;
  const clusterW = series.length * barW + (series.length - 1) * barGap;
  const groupW = clusterW + groupGap;
  const baseTotalW = padL + points.length * groupW + padR;
  const minInnerW = 640;
  const innerW = Math.max(baseTotalW, minInnerW);
  const extraPerGroup = points.length ? (innerW - baseTotalW) / points.length : 0;
  const groupWAdj = groupW + extraPerGroup;
  const W = padL + points.length * groupWAdj + padR;
  const H = padTop + chartH + padBot;

  const scaleMin = 0;
  const scaleMax = 100;
  const range = 100;
  const ticks = [0, 25, 50, 75, 100];

  const xFor = (i) => padL + i * groupWAdj;
  const yFor = (pct) =>
    padTop + chartH * (1 - (Math.max(scaleMin, Math.min(scaleMax, pct)) - scaleMin) / range);

  const hasValues = points.some((p) =>
    series.some((ser) => Number.isFinite(p.values[ser.key]))
  );

  const renderBody = () => {
    if (loading) return <ChartEmpty msg="Loading trend…" />;
    if (error) return <ChartEmpty msg={error} />;
    if (!points.length) return <ChartEmpty msg="Select at least one semester." />;
    if (!hasValues) return <ChartEmpty msg="No completed evaluations for selected semesters." />;

    return (
      <div className="chart-scroll-wrap trend-scroll-wrap">
        <div className="chart-scroll-inner" style={{ minWidth: W }}>
          <div className="chart-svg-wrap">
            <svg
              className="chart-main-svg"
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: "100%", minWidth: W, maxWidth: "none", height: "auto", display: "block" }}
              role="img"
              aria-label="Semester Trend chart"
            >
              {/* Y-axis grid lines */}
              {ticks.map((v) => {
                const y = yFor(v);
                return (
                  <g key={v}>
                    <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={padL - 4} y={y + 4} fontSize="8" textAnchor="end" fill="#94a3b8">{v}</text>
                  </g>
                );
              })}
              <text
                x="10"
                y={padTop + chartH / 2}
                transform={`rotate(-90 10 ${padTop + chartH / 2})`}
                fontSize="8"
                fill="#94a3b8"
                textAnchor="middle"
              >
                Normalized (%)
              </text>

              {/* Grouped bars */}
              {points.map((p, i) => {
                const gx = xFor(i);
                return (
                  <g key={p.id}>
                    {series.map((ser, si) => {
                      const v = p.values[ser.key];
                      if (!Number.isFinite(v)) return null;
                      const h = (v / 100) * chartH;
                      const x = gx + si * (barW + barGap);
                      const y = padTop + (chartH - h);
                      return (
                        <g key={ser.key}>
                          <title>{`${p.label} · ${ser.label}\n${v.toFixed(1)}% · N=${p.n ? p.n : "N/A"}`}</title>
                          <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={h}
                            rx="3"
                            fill={ser.color}
                            opacity="0.85"
                          />
                        </g>
                      );
                    })}

                    {/* X-axis label */}
                    <text
                      x={gx + clusterW / 2}
                      y={padTop + chartH + 20}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#475569"
                      fontWeight="600"
                    >
                      <title>{`${p.label}\nN=${p.n ? p.n : "N/A"}`}</title>
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chart-card chart-fill-card dashboard-chart-card">
      <div className="chart-title-row trend-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.semesterTrend.title}</div>
          <div className="chart-note">{CHART_COPY.semesterTrend.note}</div>
        </div>
        {headerRight}
      </div>
      {hint ? <div className="trend-hint">{hint}</div> : null}
      {renderBody()}
      {hasValues && (
        <ChartDataTable
          caption="Semester Trend"
          headers={["Semester", ...series.map((s) => s.label), "N"]}
          rows={points
            .filter((p) => series.some((s) => Number.isFinite(p.values[s.key])))
            .map((p) => [
              p.label,
              ...series.map((s) =>
                Number.isFinite(p.values[s.key]) ? p.values[s.key].toFixed(1) + "%" : "—"
              ),
              p.n || "—",
            ])}
        />
      )}
      <div className="chart-legend trend-legend">
        {series.map((ser) => (
          <span key={ser.key} className="legend-item legend-item--stacked">
            <span className="legend-dot" style={{ background: ser.color }} />
            <OutcomeLegendLabel label={ser.label} code={ser.code} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 2b-PRINT — Semester Trend (grouped bars)
// viewBox dynamic × dynamic
// ════════════════════════════════════════════════════════════
export function OutcomeTrendChartPrint({ data = [], semesters = [], selectedIds = [] }) {
  const series = [
    { key: "technical", label: OUTCOMES.find((o) => o.key === "technical")?.label || "Technical", color: "#f59e0b", max: OUTCOMES.find((o) => o.key === "technical")?.max || 1, field: "avgTechnical" },
    { key: "design", label: OUTCOMES.find((o) => o.key === "design")?.label || "Written", color: "#22c55e", max: OUTCOMES.find((o) => o.key === "design")?.max || 1, field: "avgWritten" },
    { key: "delivery", label: OUTCOMES.find((o) => o.key === "delivery")?.label || "Oral", color: "#3b82f6", max: OUTCOMES.find((o) => o.key === "delivery")?.max || 1, field: "avgOral" },
    { key: "teamwork", label: OUTCOMES.find((o) => o.key === "teamwork")?.label || "Teamwork", color: "#ef4444", max: OUTCOMES.find((o) => o.key === "teamwork")?.max || 1, field: "avgTeamwork" },
  ];

  const orderIndex = new Map((semesters || []).map((s, i) => [s.id, i]));
  const ordered = (semesters || [])
    .filter((s) => (selectedIds || []).includes(s.id))
    .sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  const dataMap = new Map((data || []).map((row) => [row.semesterId, row]));

  const points = ordered.map((s) => {
    const row = dataMap.get(s.id);
    const n = row?.nEvals ?? 0;
    const values = Object.fromEntries(series.map((ser) => {
      const raw = row ? row[ser.field] : null;
      const hasData = row && Number(row.nEvals || 0) > 0;
      const pct = hasData && Number.isFinite(raw) && ser.max > 0
        ? (raw / ser.max) * 100
        : null;
      return [ser.key, pct];
    }));
    return {
      id: s.id,
      label: row?.semesterName || s.name || "—",
      n,
      values,
    };
  });

  const allValues = points.flatMap((p) =>
    series.map((ser) => p.values[ser.key]).filter((v) => Number.isFinite(v))
  );
  if (!points.length || !allValues.length) return null;

  const scaleMin = 0;
  const scaleMax = 100;
  const range = 100;
  const ticks = [0, 25, 50, 75, 100];

  const padL = 38;
  const padR = 12;
  const padTop = 12;
  const padBot = 30;
  const chartH = 140;
  const barW = 10;
  const barGap = 3;
  const groupGap = 28;
  const clusterW = series.length * barW + (series.length - 1) * barGap;
  const groupW = clusterW + groupGap;
  const baseW = padL + points.length * groupW + padR;
  const W = Math.max(680, baseW);
  const extraPerGroup = points.length ? (W - baseW) / points.length : 0;
  const groupWAdj = groupW + extraPerGroup;
  const H = padTop + chartH + padBot;
  const xFor = (i) => padL + i * groupWAdj;
  const yFor = (pct) =>
    padTop + chartH * (1 - (Math.max(scaleMin, Math.min(scaleMax, pct)) - scaleMin) / range);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Y-axis grid lines */}
      {ticks.map((v) => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="7.5" textAnchor="end" fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      <g transform={`translate(12, ${padTop + chartH / 2}) rotate(-90)`}>
        <text x="0" y="0" textAnchor="middle" fontSize="7.5" fill="#94a3b8">Normalized (%)</text>
      </g>

      {/* Grouped bars */}
      {points.map((p, i) => {
        const gx = xFor(i);
        return (
          <g key={p.id}>
            {series.map((ser, si) => {
              const v = p.values[ser.key];
              if (!Number.isFinite(v)) return null;
              const h = (v / 100) * chartH;
              const x = gx + si * (barW + barGap);
              const y = padTop + (chartH - h);
              return (
                <rect
                  key={`${p.id}-${ser.key}`}
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx="2"
                  fill={ser.color}
                  opacity="0.85"
                />
              );
            })}
            <text
              x={gx + clusterW / 2}
              y={padTop + chartH + 18}
              textAnchor="middle"
              fontSize="8"
              fill="#475569"
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
