// src/Charts.jsx
// ============================================================
// All dashboard chart components used by AdminPanel.
// Pure functional components — no side effects, no fetching.
// All SVGs use viewBox + width:100% for mobile responsiveness.
//
// Exports:
//   OutcomeByGroupChart     – MÜDEK outcome achievement by group (normalized %)
//   OutcomeOverviewChart    – programme-level MÜDEK outcome averages (normalized %)
//   OutcomeTrendChart       – semester trend lines (normalized %)
//   CompetencyRadarChart    – competency profile per group (radar)
//   CriterionBoxPlotChart   – score distribution by criterion (boxplot)
//   JurorConsistencyHeatmap – juror consistency heatmap (CV)
//   RubricAchievementChart  – rubric achievement level distribution (100% stacked)
// ============================================================

import { useState, useEffect, useMemo, useRef } from "react";
import { CRITERIA, MUDEK_OUTCOMES, MUDEK_THRESHOLD } from "./config";
import LevelPill from "./shared/LevelPill";
import { GraduationCapIcon, ChevronDownIcon, SearchIcon, InfoIcon } from "./shared/Icons";
import { mean, stdDev, quantile, outcomeValues } from "./shared/stats";

// ── Per-chart MÜDEK outcome code lists ───────────────────────
// All charts use the same set per spec §3.
const CHART_OUTCOMES = ["9.1", "9.2", "1.2", "2", "3.1", "3.2", "8.1", "8.2"];

// ── Derive outcome list from CRITERIA (keeps Charts.jsx in sync with config) ─
// Order: delivery (9.1 Oral) · design (9.2 Written) · technical · teamwork
const OUTCOMES = CRITERIA.map((c) => ({
  key:   c.id,
  code:  c.mudek.join("/"),
  label: c.shortLabel,
  max:   c.max,
  color: c.color,
}));

export const CHART_COPY = {
  outcomeByGroup: {
    title: "Outcome Achievement by Group",
    note: "Compares each group's normalized score across all four MÜDEK-mapped criteria.",
  },
  programmeAverages: {
    title: "Programme-Level Outcome Averages",
    note: "Grand mean ±1 std. deviation (σ) normalized score per outcome across all groups and jurors.",
  },
  semesterTrend: {
    title: "Semester Trend",
    note: "Normalized averages across selected semesters.",
  },
  competencyProfile: {
    title: "Competency Profile per Group",
    note: "Shows whether a group's competency development is balanced or skewed across all four outcomes.",
  },
  scoreDistribution: {
    title: "Score Distribution by Criterion",
    note: "Reveals inter-juror spread for each criterion — evidence of measurement reliability.",
  },
  jurorConsistency: {
    title: "Juror Consistency Heatmap",
    note: "Identifies which group × criterion combinations have poor juror agreement, guiding rubric improvement.",
  },
  achievementDistribution: {
    title: "Achievement Level Distribution",
    note: "% of evaluations per rubric band — directly maps to MÜDEK continuous improvement evidence.",
  },
};

function parseOutcomeCode(code) {
  const [majorRaw, minorRaw] = String(code).split(".");
  const major = parseInt(majorRaw, 10);
  const minor = parseInt(minorRaw ?? "0", 10);
  return {
    major: Number.isFinite(major) ? major : 0,
    minor: Number.isFinite(minor) ? minor : 0,
  };
}

function compareOutcomeCodes(a, b) {
  const A = parseOutcomeCode(a);
  const B = parseOutcomeCode(b);
  if (A.major !== B.major) return A.major - B.major;
  if (A.minor !== B.minor) return A.minor - B.minor;
  return String(a).localeCompare(String(b));
}

function formatMudekCodes(code) {
  return String(code || "")
    .split("/")
    .map((c) => c.trim())
    .filter(Boolean)
    .join(" / ");
}

function outcomeCodeLine(code) {
  const formatted = formatMudekCodes(code);
  return formatted ? `(${formatted})` : "";
}

function OutcomeLegendLabel({ label, code }) {
  const codeLine = outcomeCodeLine(code);
  return (
    <span className="legend-label">
      <span className="legend-label-main">{label}</span>
      {codeLine ? <span className="legend-label-sub">{codeLine}</span> : null}
    </span>
  );
}

function OutcomeLabelSvg({
  x,
  y,
  label,
  code,
  anchor = "middle",
  mainSize = 9,
  subSize = 7,
  mainFill = "#475569",
  subFill = "#94a3b8",
  fontWeight = 600,
  lineGap = 11,
  mainClassName = "",
  subClassName = "",
}) {
  const codeLine = outcomeCodeLine(code);
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontSize={mainSize}
        fill={mainFill}
        fontWeight={fontWeight}
        className={mainClassName || undefined}
      >
        {label}
      </text>
      {codeLine ? (
        <text
          x={x}
          y={y + lineGap}
          textAnchor={anchor}
          fontSize={subSize}
          fill={subFill}
          className={subClassName || undefined}
        >
          {codeLine}
        </text>
      ) : null}
    </g>
  );
}

// ── Shared empty state ────────────────────────────────────────
function ChartEmpty({ msg }) {
  return <div className="chart-empty">{msg || "Not enough data yet."}</div>;
}

// ════════════════════════════════════════════════════════════
// MÜDEK BADGE — per-chart dropdown with two tabs
// Tab 1: MÜDEK outcome codes + EN descriptions (TR on hover)
// Tab 2: Rubric bands per criterion (from CRITERIA config)
// ════════════════════════════════════════════════════════════
function MudekOutcomesTab({ codes }) {
  const [lang, setLang] = useState("en");
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  ));
  const [expanded, setExpanded] = useState(() => !(
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  ));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.addEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    setExpanded(!isMobile);
  }, [isMobile]);

  const items = (codes || [])
    .map((code) => ({ code, ...(MUDEK_OUTCOMES[code] || {}) }))
    .filter((o) => o.code && (o.en || o.tr))
    .sort((a, b) => compareOutcomeCodes(a.code, b.code));

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? items
    : items.filter((o) => {
        const en = (o.en || "").toLowerCase();
        const tr = (o.tr || "").toLowerCase();
        const code = (o.code || "").toLowerCase();
        return code.includes(q) || en.includes(q) || tr.includes(q);
      });

  const renderOutcome = (o) => {
    const en = o.en || "";
    const tr = o.tr || "";
    if (lang === "tr") {
      return <div className="mudek-outcome-text">{tr || en}</div>;
    }
    return <div className="mudek-outcome-text">{en || tr}</div>;
  };

  return (
    <div className="mudek-outcomes">
      <div className="mudek-outcomes-controls">
        <label className="mudek-search" aria-label="Search outcomes">
          <span className="mudek-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code or text"
          />
        </label>
        <button
          type="button"
          className="mudek-lang-toggle"
          onClick={() => setLang((prev) => (prev === "en" ? "tr" : "en"))}
          aria-label={lang === "en" ? "Switch to Turkish" : "Switch to English"}
          title={lang === "en" ? "Türkçe" : "English"}
        >
          <span aria-hidden="true">{lang === "en" ? "🇬🇧" : "🇹🇷"}</span>
        </button>
        {q && (
          <span className="mudek-results-count">{filtered.length} results</span>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="mudek-empty">No outcomes match your search.</div>
      )}

      <div className="mudek-table-scroll">
        <div className={`mudek-outcomes-table${isMobile && !expanded ? " compact" : ""}${isMobile && expanded ? " expanded" : ""}`}>
          <div className="mudek-outcomes-head">
            <div className="mudek-col-code">{lang === "tr" ? "Kod" : "Code"}</div>
            <div className="mudek-col-outcome">
              {lang === "tr" ? "Çıktı" : "Outcome"}
            </div>
          </div>
          <div className="mudek-outcomes-body">
            {(isMobile && !expanded ? filtered.slice(0, 5) : filtered).map((o) => (
              <div key={o.code} className="mudek-outcomes-row">
                <div className="mudek-col-code">
                  <span className="mudek-code">{o.code}</span>
                </div>
                <div className="mudek-col-outcome">
                  {renderOutcome(o)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isMobile && filtered.length > 5 && (
        <button
          type="button"
          className="mudek-outcomes-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Collapse ↑" : "Show all outcomes ↓"}
        </button>
      )}
    </div>
  );
}

function MudekRubricTab() {
  return (
    <div className="mudek-rubric-list">
      {CRITERIA.map((c) => {
        return (
          <div key={c.id} className="mudek-rubric-criterion">
            <div className="mudek-rubric-criterion-title">
              {c.label}
              <span className="mudek-rubric-criterion-meta">
                ({c.mudek.join(", ")}) · max {c.max} pts
              </span>
            </div>
            <div className="mudek-table-scroll">
              <table className="mudek-table">
                <thead>
                  <tr>
                    <th>Range</th>
                    <th>Level</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rubric.map((band) => {
                    return (
                      <tr key={band.level}>
                        <td data-label="Range">{band.range}</td>
                        <td data-label="Level">
                          <LevelPill variant={band.level}>{band.level}</LevelPill>
                        </td>
                        <td data-label="Description">{band.desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MudekBadge({ outcomeCodes = CHART_OUTCOMES }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("outcomes");
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close on Escape, return focus to badge button
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mudek-badge-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        className="mudek-badge"
        onClick={() => setOpen((v) => !v)}
        aria-label="MÜDEK outcome mapping"
        aria-expanded={open}
      >
        <GraduationCapIcon />
        <span>MÜDEK</span>
        <span className={`mudek-chevron${open ? " open" : ""}`} aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div className="mudek-dropdown" role="dialog" aria-label="MÜDEK outcome mapping">
          <div className="mudek-dropdown-header">
            <span>MÜDEK Outcome Mapping</span>
            <button
              className="mudek-dropdown-close"
              onClick={() => { setOpen(false); btnRef.current?.focus(); }}
              aria-label="Close"
            >✕</button>
          </div>
          <div className="mudek-tabs">
            <button
              className={`mudek-tab-btn${tab === "outcomes" ? " active" : ""}`}
              onClick={() => setTab("outcomes")}
            >MÜDEK Outcomes</button>
            <button
              className={`mudek-tab-btn${tab === "rubric" ? " active" : ""}`}
              onClick={() => setTab("rubric")}
            >Rubric Bands</button>
          </div>
          <div className="mudek-dropdown-body">
            {tab === "outcomes" && <MudekOutcomesTab codes={outcomeCodes} />}
            {tab === "rubric"   && <MudekRubricTab />}
          </div>
          <div className="mudek-dropdown-footer">
            <span className="mudek-info-icon" aria-hidden="true"><InfoIcon /></span>
            <span>This chart provides evidence for the outcomes above.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 2 — Programme-Level MÜDEK Outcome Averages
// Vertical bars: one per criterion, grand mean ±1 SD whiskers,
// horizontal dashed 70% reference line
// ════════════════════════════════════════════════════════════
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

      <div className="chart-svg-fill">
        <svg
          className="chart-main-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", display: "block" }}
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
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 2b — Semester Trend (grouped bar chart)
// Shows normalized averages per criterion across selected semesters
// ════════════════════════════════════════════════════════════
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
// CHART 1 — Outcome Achievement by Group (MÜDEK)
// Each group = one cluster; each bar in cluster = one outcome (normalized %)
// ════════════════════════════════════════════════════════════
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
// CHART 3 — Competency Profile per Group (Radar)
// ════════════════════════════════════════════════════════════
export function CompetencyRadarChart({ stats }) {
  const available = stats.filter((s) => s.count > 0);
  const [selId, setSelId] = useState(available[0]?.id ?? null);
  if (!available.length) return <ChartEmpty />;

  const group = available.find((s) => s.id === (selId ?? available[0].id)) ?? available[0];
  const N = OUTCOMES.length;
  const cx = 130, cy = 120, R = 82;
  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const spoke = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });

  const vals    = OUTCOMES.map((o) => ((group.avg[o.key] || 0) / o.max) * 100);
  const avgVals = OUTCOMES.map((o) => {
    const v = available.map((s) => ((s.avg[o.key] || 0) / o.max) * 100);
    return mean(v);
  });

  const pts    = vals.map((v, i) => spoke(i, (v / 100) * R));
  const avgPts = avgVals.map((v, i) => spoke(i, (v / 100) * R));
  const path    = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  const avgPath = avgPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <div className="chart-card chart-fill-card">
      <div className="chart-title-row">
        <div>
          <div className="chart-title">{CHART_COPY.competencyProfile.title}</div>
          <div className="chart-note">{CHART_COPY.competencyProfile.note}</div>
        </div>
      </div>

      {available.length > 1 && (
        <select
          className="radar-group-select"
          value={selId ?? available[0].id}
          onChange={(e) => setSelId(e.target.value)}
        >
          {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      <div className="chart-svg-fill">
        <svg
          className="chart-main-svg"
          viewBox="0 0 260 240"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", maxWidth: 280, height: "100%", display: "block" }}
        >
          {[0.25, 0.5, 0.75, 1].map((r) => {
            const ring = OUTCOMES.map((_, i) => spoke(i, r * R));
            const rpath = ring.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
            return <path key={r} d={rpath} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
          })}
          {[0.25, 0.5, 0.75, 1].map((r) => {
            const p = spoke(0, r * R);
            return (
              <text
                key={`tick-${r}`}
                x={p.x.toFixed(1)}
                y={(p.y - 6).toFixed(1)}
                textAnchor="middle"
                fontSize="8"
                fill="#94a3b8"
              >
                {Math.round(r * 100)}%
              </text>
            );
          })}
          {OUTCOMES.map((_, i) => {
            const end = spoke(i, R);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={end.x.toFixed(1)}
                y2={end.y.toFixed(1)}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })}
          <path d={avgPath} fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4,3" />
          <path d={path} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth="2.2" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <title>{OUTCOMES[i].label}: {vals[i].toFixed(1)}%{"\n"}Cohort avg: {avgVals[i].toFixed(1)}%</title>
              <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.2" />
            </g>
          ))}
          {OUTCOMES.map((o, i) => {
            const lp = spoke(i, R + 28);
            return (
              <OutcomeLabelSvg
                key={o.key}
                x={lp.x}
                y={lp.y}
                label={o.label}
                code={o.code}
                mainSize={9}
                subSize={7}
                mainFill="#334155"
                subFill="#94a3b8"
                fontWeight={700}
                lineGap={9}
              />
            );
          })}
        </svg>
      </div>

      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#3b82f6" }} />
          {group.name}
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#9CA3AF" }} />
          Cohort Average (dashed)
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 3b — RadarPrintAll
// Print-only: renders one radar per group in a 4-column grid.
// Hidden on screen via .radar-all-print-section { display:none }.
// Shown in @media print.
// ════════════════════════════════════════════════════════════
export function RadarPrintAll({ stats }) {
  const available = stats.filter((s) => s.count > 0);
  if (!available.length) return null;

  const N = OUTCOMES.length;
  const cx = 130, cy = 120, R = 82;
  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const spoke  = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });
  const ringPath = (r) => {
    const pts = OUTCOMES.map((_, i) => spoke(i, r * R));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  };

  // Cohort average path (dashed reference line)
  const avgVals = OUTCOMES.map((o) => {
    const vs = available.map((s) => ((s.avg[o.key] || 0) / o.max) * 100);
    return mean(vs);
  });
  const avgPts  = avgVals.map((v, i) => spoke(i, (v / 100) * R));
  const avgPathD = avgPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <>
      {available.map((group) => {
        const vals = OUTCOMES.map((o) => ((group.avg[o.key] || 0) / o.max) * 100);
        const pts  = vals.map((v, i) => spoke(i, (v / 100) * R));
        const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        return (
          <section key={group.id} className="print-page report-chart radar-print-page">
            <h2 className="print-card-title">{CHART_COPY.competencyProfile.title}</h2>
            <div className="print-card-subtitle">{group.name}</div>
            <div className="print-card-note">{CHART_COPY.competencyProfile.note}</div>
            <div className="chart-wrapper">
              <div className="radar-print-card">
                <svg
                  viewBox="0 0 260 240"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ width: "100%", height: "auto", display: "block" }}
                >
                {[0.25, 0.5, 0.75, 1].map((r) => (
                  <path key={r} d={ringPath(r)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                ))}
                {[0.25, 0.5, 0.75, 1].map((r) => {
                  const p = spoke(0, r * R);
                  return (
                    <text
                      key={`tick-${r}`}
                      x={p.x.toFixed(1)}
                      y={(p.y - 6).toFixed(1)}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#94a3b8"
                    >
                      {Math.round(r * 100)}%
                    </text>
                  );
                })}
                {OUTCOMES.map((_, i) => {
                  const end = spoke(i, R);
                  return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#cbd5e1" strokeWidth="1" />;
                })}
                <path d={avgPathD} fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4,3" />
                <path d={pathD} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth="2.2" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.2" />
                ))}
                {OUTCOMES.map((o, i) => {
                  const lp = spoke(i, R + 28);
                  return (
                    <OutcomeLabelSvg
                      key={o.key}
                      x={lp.x}
                      y={lp.y}
                      label={o.label}
                      code={o.code}
                      mainSize={8.5}
                      subSize={6.8}
                      mainFill="#334155"
                      subFill="#94a3b8"
                      fontWeight={700}
                      lineGap={8}
                    />
                  );
                })}
                </svg>
              </div>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: "#3b82f6" }} />
                {group.name}
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: "#9CA3AF" }} />
                Cohort Average (dashed)
              </span>
            </div>
          </section>
        );
      })}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 5 — Score Distribution by Criterion (Boxplot)
// Normalized to 0–100% for comparability
// ════════════════════════════════════════════════════════════
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


      <div className="chart-svg-fill heatmap-svg-fill">
        <svg className="chart-main-svg" viewBox={`0 0 ${W} ${totalH}`} style={{ width: "100%", height: "100%", display: "block" }}>
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
// CHART 4 — Juror Consistency Heatmap (CV)
// CV = SD/mean × 100 per group × criterion
// ════════════════════════════════════════════════════════════
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
            <svg className="chart-main-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: W, maxWidth: "none", height: "100%", display: "block" }}>
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
// CHART 6 — Rubric Achievement Level Distribution (vertical 100% stacked)
// Vertical bars: one bar per criterion, stacked Excellent→Insufficient bottom-to-top
// Banding uses CRITERIA rubric min/max thresholds from config
// ════════════════════════════════════════════════════════════
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

      <div className="chart-svg-fill rubric-svg-fill">
        <svg className="chart-main-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
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
// PRINT-ONLY CHART COMPONENTS
// Hidden on screen (.print-report { display:none }) and shown
// only in @media print when the user clicks "Export PDF".
//
// Design rules vs the screen versions:
//  • Fixed viewBox — no ResizeObserver, no DOM measurements
//  • preserveAspectRatio="xMidYMid meet"
//  • Legends / labels embedded inside the SVG
//  • No scroll wrappers
// ════════════════════════════════════════════════════════════

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
