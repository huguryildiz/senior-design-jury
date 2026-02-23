// src/Charts.jsx
// ============================================================
// All dashboard chart components used by AdminPanel.
// Pure functional components — no side effects, no fetching.
// All SVGs use viewBox + width:100% for mobile responsiveness.
//
// Exports:
//   GroupBarChart         – horizontal bar: avg total + min/max range
//   ClusteredBarChart     – SVG clustered bars: criteria per group
//   RadarChart            – spider chart with per-group selector
//   JurorStrictnessChart  – horizontal bar: mean ± std dev per juror
//   ScoreDotPlot          – dot plot: score distribution
// ============================================================

import { useState } from "react";
import { CRITERIA, TOTAL_MAX } from "./config";

// Normalize CRITERIA from config
const CRITERIA_LIST = CRITERIA.map((c) => ({
  id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max,
}));

// One color per criterion — stable order
const CRIT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

// ── Standard deviation ────────────────────────────────────────
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

// ── Shared empty state ────────────────────────────────────────
function ChartEmpty({ msg }) {
  return <div className="chart-empty">{msg || "Not enough data yet."}</div>;
}

// ════════════════════════════════════════════════════════════
// CHART 1 — Group Average Total Score
// Horizontal bar per group: filled bar = average, ticks = min/max
// ════════════════════════════════════════════════════════════
export function GroupBarChart({ stats }) {
  const data = stats.filter((s) => s.count > 0);
  if (!data.length) return <ChartEmpty />;

  return (
    <div className="chart-card">
      <div className="chart-title">Group Average Total Score</div>
      <div className="chart-subtitle">Bar = average · Ticks = min / max range</div>

      {data.map((p) => {
        const pct    = (p.totalAvg / TOTAL_MAX) * 100;
        const pctMin = (p.totalMin / TOTAL_MAX) * 100;
        const pctMax = (p.totalMax / TOTAL_MAX) * 100;
        return (
          <div key={p.id} className="hbar-row">
            <span className="hbar-label" title={p.desc || p.name}>{p.name}</span>
            <div className="hbar-track">
              <div className="hbar-fill"  style={{ width: `${pct}%` }} />
              {/* Min–max range band */}
              <div className="hbar-range" style={{ left: `${pctMin}%`, width: `${Math.max(pctMax - pctMin, 1)}%` }} />
              <div className="hbar-tick"  style={{ left: `${pctMin}%` }} />
              <div className="hbar-tick"  style={{ left: `${pctMax}%` }} />
            </div>
            <span className="hbar-val">{p.totalAvg.toFixed(1)}</span>
          </div>
        );
      })}

      <div className="hbar-axis">
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => {
          const v = Math.round(TOTAL_MAX * k);
          return <span key={k} style={{ left: `${k * 100}%` }}>{v}</span>;
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 2 — Criterion-Based Clustered Bar Chart
// Each group = one cluster; each bar in cluster = one criterion (normalized %)
// Horizontally scrollable on narrow screens
// ════════════════════════════════════════════════════════════
export function ClusteredBarChart({ stats }) {
  const data = stats.filter((s) => s.count > 0);
  if (!data.length) return <ChartEmpty />;

  const barW   = 14; // px per individual bar
  const gap    = 4;  // px between bars in a cluster
  const groupW = CRITERIA_LIST.length * (barW + gap) + 12;
  const chartH = 130;
  const padL   = 28; // space for y-axis labels
  const totalW = data.length * groupW + padL + 10;

  return (
    <div className="chart-card">
      <div className="chart-title">Criterion Performance by Group</div>
      <div className="chart-subtitle">Normalized score as % of criterion max</div>

      {/* Horizontal scroll wrapper for narrow screens */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <svg
          viewBox={`0 0 ${totalW} ${chartH + 36}`}
          style={{ width: Math.max(totalW, 280), height: chartH + 36, display: "block" }}
        >
          {/* Y-axis grid lines at 0/25/50/75/100% */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = chartH - (v / 100) * chartH;
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={totalW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padL - 4} y={y + 4} fontSize="8" textAnchor="end" fill="#94a3b8">{v}</text>
              </g>
            );
          })}

          {/* One cluster per group */}
          {data.map((group, gi) => {
            const gx = padL + gi * groupW + 4;
            return (
              <g key={group.id}>
                {CRITERIA_LIST.map((c, ci) => {
                  const pct = ((group.avg[c.id] || 0) / c.max) * 100;
                  const h   = (pct / 100) * chartH;
                  const bx  = gx + ci * (barW + gap);
                  return (
                    <g key={c.id}>
                      <rect x={bx} y={chartH - h} width={barW} height={h}
                        fill={CRIT_COLORS[ci]} rx="2" opacity="0.85" />
                      <title>{group.name} · {c.shortLabel || c.label}: {pct.toFixed(1)}%</title>
                    </g>
                  );
                })}
                {/* Group label below each cluster */}
                <text
                  x={gx + (CRITERIA_LIST.length * (barW + gap)) / 2 - gap / 2}
                  y={chartH + 14}
                  fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600"
                >{group.name}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Color legend */}
      <div className="chart-legend">
        {CRITERIA_LIST.map((c, i) => (
          <span key={c.id} className="legend-item">
            <span className="legend-dot" style={{ background: CRIT_COLORS[i] }} />
            {c.shortLabel || c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 3 — Performance Radar (per-group dropdown)
// Spider chart with normalized axes (0–100% of criterion max)
// ════════════════════════════════════════════════════════════
export function RadarChart({ stats }) {
  const available = stats.filter((s) => s.count > 0);
  const [selId, setSelId] = useState(null);

  const N = CRITERIA_LIST.length;
  if (N < 3 || !available.length) return <ChartEmpty />;

  const group  = available.find((s) => s.id === (selId ?? available[0].id)) ?? available[0];
  const cx = 120, cy = 120, R = 85;
  const angle  = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const spoke  = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });

  // Normalize each criterion score to 0–100%
  const vals = CRITERIA_LIST.map((c) => ((group.avg[c.id] || 0) / c.max) * 100);
  const pts  = vals.map((v, i) => spoke(i, (v / 100) * R));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <div className="chart-card radar-chart-card">
      <div className="chart-title">Performance Radar</div>
      <div className="chart-subtitle">Normalized per criterion (% of max)</div>

      {/* Group selector dropdown — only shown when multiple groups have data */}
      {available.length > 1 && (
        <select
          className="radar-group-select"
          value={selId ?? available[0].id}
          onChange={(e) => setSelId(Number(e.target.value))}
        >
          {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* Responsive SVG: viewBox defines internal coords, CSS scales it */}
      <svg viewBox="0 0 240 240" style={{ width: "100%", maxWidth: 260, height: "auto" }}>
        {/* Grid rings at 25 / 50 / 75 / 100% */}
        {[0.25, 0.5, 0.75, 1].map((r) => {
          const ring  = CRITERIA_LIST.map((_, i) => spoke(i, r * R));
          const rpath = ring.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
          return <path key={r} d={rpath} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {/* Axis spokes */}
        {CRITERIA_LIST.map((_, i) => {
          const end = spoke(i, R);
          return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#cbd5e1" strokeWidth="1" />;
        })}
        {/* Data polygon */}
        <path d={path} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Data dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
        ))}
        {/* Criterion labels — pushed far enough to avoid clipping */}
        {CRITERIA_LIST.map((c, i) => {
          const lp = spoke(i, R + 24);
          return (
            <text key={i}
              x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="10" fill="#334155" fontWeight="700"
            >{c.shortLabel || c.label}</text>
          );
        })}
        {/* Percentage value labels next to each dot */}
        {pts.map((p, i) => (
          <text key={`v${i}`}
            x={(p.x + (p.x > cx ? 9 : p.x < cx - 2 ? -9 : 0)).toFixed(1)}
            y={(p.y + (p.y > cy ? 11 : -11)).toFixed(1)}
            textAnchor="middle" fontSize="8" fill="#1e40af" fontWeight="700"
          >{vals[i].toFixed(0)}%</text>
        ))}
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 4 — Juror Strictness: mean ± std dev horizontal bars
// Shows how lenient or strict each juror is vs the group mean
// ════════════════════════════════════════════════════════════
export function JurorStrictnessChart({ data }) {
  const submitted = data.filter((r) => r.status === "all_submitted");
  const jurors    = [...new Set(submitted.map((r) => r.juryName).filter(Boolean))];
  if (jurors.length < 2) return <ChartEmpty msg="Need at least 2 jurors with submitted evaluations." />;

  const globalMean = submitted.reduce((s, r) => s + r.total, 0) / submitted.length;

  const jurorStats = jurors.map((j) => {
    const vals = submitted.filter((r) => r.juryName === j).map((r) => r.total);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd   = stdDev(vals);
    return { name: j, mean, sd };
  }).sort((a, b) => b.mean - a.mean);

  return (
    <div className="chart-card">
      <div className="chart-title">Juror Scoring Tendencies</div>
      <div className="chart-subtitle">Avg total score · Bar = ±1 std dev · Dashed = overall mean</div>

      {jurorStats.map((j) => {
        const pct    = (j.mean / TOTAL_MAX) * 100;
        const pctMin = Math.max(0,   ((j.mean - j.sd) / TOTAL_MAX) * 100);
        const pctMax = Math.min(100, ((j.mean + j.sd) / TOTAL_MAX) * 100);
        const gmPct  = (globalMean / TOTAL_MAX) * 100;
        // Show only surname to keep label compact
        const shortName = j.name.trim().split(/\s+/).pop();
        return (
          <div key={j.name} className="hbar-row">
            <span className="hbar-label strictness-label" title={j.name}>{shortName}</span>
            <div className="hbar-track">
              <div className="hbar-fill strictness-fill" style={{ width: `${pct}%` }} />
              <div className="hbar-range" style={{ left: `${pctMin}%`, width: `${Math.max(pctMax - pctMin, 1)}%` }} />
              <div className="hbar-tick" style={{ left: `${pctMin}%` }} />
              <div className="hbar-tick" style={{ left: `${pctMax}%` }} />
              {/* Overall mean reference line */}
              <div className="hbar-mean-line" style={{ left: `${gmPct}%` }} />
            </div>
            <span className="hbar-val">
              {j.mean.toFixed(1)}
              <span style={{ fontSize: 9, color: "#94a3b8" }}>±{j.sd.toFixed(1)}</span>
            </span>
          </div>
        );
      })}

      <div className="hbar-axis">
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => {
          const v = Math.round(TOTAL_MAX * k);
          return <span key={k} style={{ left: `${k * 100}%` }}>{v}</span>;
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 5 — Score Distribution Dot Plot
// Each dot = one submitted evaluation; dots stack at same x position
// ════════════════════════════════════════════════════════════
export function ScoreDotPlot({ data }) {
  const submitted = data.filter((r) => r.status === "all_submitted");
  if (submitted.length < 3) return <ChartEmpty msg="Need at least 3 submitted evaluations." />;

  const W = 300, H = 90, PAD = 22;
  const mean  = submitted.reduce((s, r) => s + r.total, 0) / submitted.length;
  const meanX = PAD + (mean / TOTAL_MAX) * (W - PAD * 2);

  // Stack dots that land on the same pixel column vertically
  const stacks = {};
  const dots = submitted.map((r) => {
    const rawX = PAD + (r.total / TOTAL_MAX) * (W - PAD * 2);
    const col  = Math.round(rawX);
    stacks[col] = (stacks[col] || 0) + 1;
    return { x: rawX, y: H - 10 - (stacks[col] - 1) * 13, score: r.total, name: r.juryName, group: r.projectName };
  });

  return (
    <div className="chart-card">
      <div className="chart-title">Score Distribution</div>
      <div className="chart-subtitle">Each dot = one evaluation · Dashed = mean ({mean.toFixed(1)})</div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: "100%", minWidth: 240, height: "auto" }}>
          {/* X axis baseline */}
          <line x1={PAD} y1={H} x2={W - PAD} y2={H} stroke="#e2e8f0" strokeWidth="1" />
          {/* Axis tick marks and labels */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => {
            const v = Math.round(TOTAL_MAX * k);
            const x = PAD + (k) * (W - PAD * 2);
            return (
              <g key={v}>
                <line x1={x} y1={H - 2} x2={x} y2={H + 2} stroke="#94a3b8" strokeWidth="1" />
                <text x={x} y={H + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">{v}</text>
              </g>
            );
          })}
          {/* Mean reference line */}
          <line x1={meanX} y1={0} x2={meanX} y2={H} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" />
          {/* Data dots */}
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="5" fill="#3b82f6" opacity="0.75" stroke="#fff" strokeWidth="1.5">
              <title>{d.group} · {d.name} · {d.score}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}
