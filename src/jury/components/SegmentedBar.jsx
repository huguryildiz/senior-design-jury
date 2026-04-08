// src/jury/components/SegmentedBar.jsx
// Segmented progress bar — one segment per project, color-coded by status.
import { getProjectStatus } from "../utils/scoreState";

export default function SegmentedBar({ projects, scores, criteria, current, onNavigate }) {
  if (!projects.length) return null;

  let scoredCount = 0;
  let partialCount = 0;
  let emptyCount = 0;

  const statuses = projects.map((p, i) => {
    const status = i === current ? "active" : getProjectStatus(scores, p.project_id, criteria);
    if (status === "active") {
      // Count the underlying status for legend
      const realStatus = getProjectStatus(scores, p.project_id, criteria);
      if (realStatus === "scored") scoredCount++;
      else if (realStatus === "partial") partialCount++;
      else emptyCount++;
    } else if (status === "scored") scoredCount++;
    else if (status === "partial") partialCount++;
    else emptyCount++;
    return status;
  });

  return (
    <div className="dj-seg-progress-row" style={{ padding: "1px 0 4px", marginBottom: 4 }}>
      <div className="dj-seg-bar">
        {statuses.map((status, i) => (
          <div
            key={projects[i].project_id}
            className={`dj-seg ${status}`}
            title={`P${i + 1} — ${projects[i].title}`}
            onClick={() => onNavigate(i)}
          />
        ))}
      </div>
      <div className="dj-seg-legend">
        <span className="dj-seg-legend-item" style={{ color: "#22c55e" }}>
          <span className="dj-seg-legend-dot" style={{ background: "#22c55e" }} />
          {scoredCount} scored
        </span>
        <span className="dj-seg-legend-item" style={{ color: "#f59e0b" }}>
          <span className="dj-seg-legend-dot" style={{ background: "#f59e0b" }} />
          {partialCount} partial
        </span>
        <span className="dj-seg-legend-item" style={{ color: "#94a3b8" }}>
          <span className="dj-seg-legend-dot" style={{ background: "#94a3b8" }} />
          {emptyCount} empty
        </span>
      </div>
    </div>
  );
}
