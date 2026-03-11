// src/admin/OverviewTab.jsx

import { FolderKanbanIcon, UserCheckIcon } from "../shared/Icons";
import StatCard from "../shared/StatCard";
import JurorActivity from "./JurorActivity";

function ringColor(pct) {
  if (pct === 0) return "var(--ring-empty)";
  if (pct <= 33) return "var(--ring-low)";
  if (pct <= 66) return "var(--ring-mid)";
  if (pct < 100) return "var(--ring-high)";
  return "var(--ring-full)";
}

function clampPct(value) {
  return Math.min(100, Math.max(0, value));
}

export default function OverviewTab({ jurorStats, groups, metrics }) {
  const {
    totalJurors = 0,
    completedJurors = 0,
    inProgressJurors = 0,
    editingJurors = 0,
    readyToSubmitJurors = 0,
    totalEvaluations = 0,
    scoredEvaluations = 0,
    partialEvaluations = 0,
    emptyEvaluations = 0,
  } = metrics ?? {};
  const totalGroups = groups?.length ?? 0;

  const completedPct = clampPct(
    totalJurors > 0 ? Math.round((completedJurors / totalJurors) * 100) : 0
  );
  const scoredPct = clampPct(
    totalEvaluations > 0 ? Math.round((scoredEvaluations / totalEvaluations) * 100) : 0
  );
  const completedHasData = totalJurors > 0;
  const scoredHasData = totalEvaluations > 0;

  const notStartedJurors = Math.max(
    0,
    totalJurors - completedJurors - inProgressJurors - readyToSubmitJurors - editingJurors
  );
  const completedMetaLines = [
    inProgressJurors > 0 && `${inProgressJurors} in progress`,
    readyToSubmitJurors > 0 && `${readyToSubmitJurors} ready to submit`,
    editingJurors > 0 && `${editingJurors} editing`,
    notStartedJurors > 0 && `${notStartedJurors} not started`,
  ].filter(Boolean);

  const scoredMetaLines = [
    partialEvaluations > 0 && `${partialEvaluations} partial`,
    emptyEvaluations > 0 && `${emptyEvaluations} empty`,
  ].filter(Boolean);

  // Show total count only when some evaluations are still unscored
  const scoredSub =
    totalEvaluations > 0 && scoredEvaluations < totalEvaluations
      ? `${totalEvaluations} total`
      : undefined;
  const scoredValue = scoredHasData ? scoredEvaluations : "—";
  const completedValue = completedHasData ? completedJurors : "—";


  return (
    <div className="overview-tab">
      <div className="stat-card-cluster overview-stat-cards">
        <StatCard
          value={totalJurors}
          label="Jurors"
          sub="Total assigned"
          icon={<UserCheckIcon className="overview-icon" />}
        />
        <StatCard
          value={totalGroups}
          label="Groups"
          sub="Total groups"
          icon={<FolderKanbanIcon className="overview-icon" />}
        />
        <StatCard
          value={completedValue}
          label="Completed Jurors"
          metaLines={completedMetaLines}
          ring={completedHasData ? { pct: completedPct, color: ringColor(completedPct) } : null}
        />
        <StatCard
          value={scoredValue}
          label="Scored Evaluations"
          sub={scoredSub}
          metaLines={scoredMetaLines}
          ring={scoredHasData ? { pct: scoredPct, color: ringColor(scoredPct) } : null}
        />
      </div>

      <div className="admin-section-header overview-section-header">
        <div className="section-label">Juror Activity</div>
      </div>

      <JurorActivity jurorStats={jurorStats} groups={groups} />
    </div>
  );
}
