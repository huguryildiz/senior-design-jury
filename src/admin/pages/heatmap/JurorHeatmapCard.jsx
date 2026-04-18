import { useState, useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import JurorBadge from "../../components/JurorBadge.jsx";
import JurorStatusPill from "../../components/JurorStatusPill.jsx";
import AvgDonut from "./AvgDonut.jsx";

function bgVar(score, max) {
  if (score == null || max <= 0) return null;
  const pct = (score / max) * 100;
  if (pct >= 90) return "var(--score-excellent-bg)";
  if (pct >= 80) return "var(--score-high-bg)";
  if (pct >= 75) return "var(--score-good-bg)";
  if (pct >= 70) return "var(--score-adequate-bg)";
  if (pct >= 60) return "var(--score-low-bg)";
  return "var(--score-poor-bg)";
}

function SparkDot({ row }) {
  if (row.empty) {
    return <span className="hm-sparkdot hm-sparkdot-empty" aria-hidden="true" />;
  }
  const bg = row.partial ? "var(--score-partial-bg)" : bgVar(row.score, row.max);
  return (
    <span
      className="hm-sparkdot"
      aria-hidden="true"
      style={{ background: bg || "var(--border-subtle)" }}
    />
  );
}

function RowItem({ row, tabLabel }) {
  if (row.empty) {
    return (
      <li className="hm-row" aria-label={`${row.title}: not scored`}>
        <span className="hm-row-code">{row.label}</span>
        <span className="hm-row-title">{row.title}</span>
        <span className="hm-score-pill hm-score-pill-empty">\u2014</span>
      </li>
    );
  }
  const bg = row.partial ? "var(--score-partial-bg)" : bgVar(row.score, row.max);
  const aria = row.partial
    ? `${row.title}: partial ${row.score}`
    : `${row.title}: ${row.score}`;
  return (
    <li className="hm-row" aria-label={aria}>
      <span className="hm-row-code">{row.label}</span>
      <span className="hm-row-title">{row.title}</span>
      <span className="hm-score-pill" style={{ background: bg }}>
        {row.score}
        {row.partial && <span className="m-flag" aria-hidden="true">!</span>}
        <span className="m-cell-tip">
          {row.partial ? "Partial" : tabLabel} · {row.score} / {row.max}
        </span>
      </span>
    </li>
  );
}

export default function JurorHeatmapCard({
  juror,
  avg,
  tabMax,
  tabLabel = "Total",
  status,
  rows,
}) {
  const [expanded, setExpanded] = useState(false);
  const rowsId = useId();
  const projectCount = rows.length;
  const label = expanded ? "Collapse juror card" : "Expand juror card";

  return (
    <article className={`hm-card${expanded ? " is-expanded" : ""}`}>
      <button
        type="button"
        className="hm-card-toggle"
        aria-expanded={expanded}
        aria-controls={rowsId}
        aria-label={label}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="hm-card-head">
          <div className="hm-card-head-left">
            <JurorBadge
              name={juror.name || juror.juror_name}
              affiliation={juror.dept || juror.affiliation}
              size="sm"
            />
            <JurorStatusPill status={status} />
          </div>
          <AvgDonut value={avg} max={tabMax} />
        </div>
        <div className="hm-card-summary">
          <span className="hm-card-summary-text">
            {projectCount} projects
          </span>
          <span className="hm-card-spark">
            {rows.map((row, i) => (
              <SparkDot key={row.groupId ?? i} row={row} />
            ))}
          </span>
          <span className="hm-card-chev">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </button>
      {expanded && (
        <ul className="hm-card-rows" id={rowsId}>
          {rows.map((row, i) => (
            <RowItem key={row.groupId ?? i} row={row} tabLabel={tabLabel} />
          ))}
        </ul>
      )}
    </article>
  );
}
