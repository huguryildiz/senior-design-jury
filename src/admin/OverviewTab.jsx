// src/admin/OverviewTab.jsx

import { useMemo } from "react";
import JurorActivity from "./JurorActivity";

function StatCard({ value, label, kicker, sub, meta, metaLines, ring }) {
  return (
    <div className="stat-card stat-card--minimal">
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {kicker && <div className="stat-card-kicker">{kicker}</div>}
        <div className="stat-card-label">{label}</div>
        {sub && <div className="stat-card-sub">{sub}</div>}
        {Array.isArray(metaLines) && metaLines.length > 0 ? (
          <div className="stat-card-meta">
            {metaLines.map((line) => (
              <div key={line} className="stat-card-meta-line">{line}</div>
            ))}
          </div>
        ) : (
          meta && <div className="stat-card-meta">{meta}</div>
        )}
      </div>
      {ring && (
        <div
          className="stat-ring"
          style={{ "--ring-pct": ring.pct, "--ring-color": ring.color }}
        >
          {(() => {
            const label = ring.label === undefined ? `${ring.pct}%` : ring.label;
            return label ? <span>{label}</span> : null;
          })()}
        </div>
      )}
    </div>
  );
}

export default function OverviewTab({ jurorStats, groups, metrics }) {
  const totalJurors = metrics?.totalJurors ?? 0;
  const totalGroups = groups?.length ?? 0;
  const completedJurors = metrics?.completedJurors ?? 0;
  const inProgressJurors = metrics?.inProgressJurors ?? 0;
  const editingJurors = metrics?.editingJurors ?? 0;
  const readyToSubmitJurors = metrics?.readyToSubmitJurors ?? 0;
  const totalEvaluations = metrics?.totalEvaluations ?? 0;
  const scoredEvaluations = metrics?.scoredEvaluations ?? 0;

  const completedPct = totalJurors > 0 ? Math.round((completedJurors / totalJurors) * 100) : 0;
  const coveragePct = totalEvaluations > 0 ? Math.round((scoredEvaluations / totalEvaluations) * 100) : 0;
  const ringColor = (pct) => {
    if (pct === 0) return "#e2e8f0";
    if (pct <= 33) return "#f97316";
    if (pct <= 66) return "#eab308";
    if (pct < 100) return "#84cc16";
    return "#22c55e";
  };

  const completedMetaLines = useMemo(() => {
    const parts = [];
    const notStartedJurors = Math.max(
      0,
      totalJurors - completedJurors - inProgressJurors - readyToSubmitJurors - editingJurors
    );
    if (inProgressJurors > 0) parts.push(`${inProgressJurors} in progress`);
    if (readyToSubmitJurors > 0) parts.push(`${readyToSubmitJurors} ready to submit`);
    if (editingJurors > 0) parts.push(`${editingJurors} editing`);
    if (notStartedJurors > 0) parts.push(`${notStartedJurors} not started`);
    return parts;
  }, [completedJurors, editingJurors, inProgressJurors, readyToSubmitJurors, totalJurors]);

  const coverageSub = totalEvaluations > 0 ? `${coveragePct}% coverage` : "—";
  const coverageMeta = totalEvaluations > 0 ? `${totalEvaluations} total` : "";
  const coverageValue = totalEvaluations > 0 ? scoredEvaluations : "—";

  return (
    <div className="overview-tab">
      <div className="stat-card-cluster overview-stat-cards">
        <StatCard
          value={totalJurors}
          label="Jurors"
          sub="Total assigned"
        />
        <StatCard
          value={totalGroups}
          label="Groups"
          sub="Total groups"
        />
        <StatCard
          value={completedJurors || 0}
          label="Completed Jurors"
          sub={null}
          metaLines={completedMetaLines}
          ring={{ pct: completedPct, color: ringColor(completedPct) }}
        />
        <StatCard
          value={coverageValue}
          label="Evaluations"
          sub={null}
          meta={coverageMeta || ""}
          ring={{ pct: coveragePct, color: ringColor(coveragePct) }}
        />
      </div>

      <div className="admin-section-header overview-section-header">
        <div className="section-label">Juror Activity</div>
      </div>

      <JurorActivity jurorStats={jurorStats} groups={groups} />
    </div>
  );
}
