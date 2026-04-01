// src/admin/OverviewTab.jsx
// Overview dashboard following shadcn-studio dashboard-shell-01 layout pattern.

import { useMemo } from "react";
import { Users, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import KpiCard from "./overview/KpiCard";
import KpiGrid from "./overview/KpiGrid";
import JurorActivityTable from "./overview/JurorActivityTable";
import CriteriaProgress from "./overview/CriteriaProgress";
import NeedsAttentionCard from "./overview/NeedsAttentionCard";
import PeriodSnapshotCard from "./overview/PeriodSnapshotCard";
import { computeNeedsAttention } from "./selectors/overviewMetrics";

export default function OverviewTab({
  jurorStats,
  groups,
  metrics,
  rawScores,
  criteriaTemplate,
  semester,
  onGoToSettings,
}) {
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

  // Compute needs attention items
  const enrichedJurorStats = useMemo(() => {
    return (jurorStats ?? []).map((stat) => ({
      ...stat,
      progress: stat.rows?.filter((r) => r.total != null).length ?? 0,
    }));
  }, [jurorStats]);

  const enrichedGroups = useMemo(() => {
    return (groups ?? []).map((group) => ({
      ...group,
      completedEvals: rawScores?.filter(
        (score) => score.projectId === group.id && score.total != null
      ).length ?? 0,
      totalJurors,
    }));
  }, [groups, rawScores, totalJurors]);

  const needsAttention = useMemo(
    () => computeNeedsAttention(enrichedJurorStats, enrichedGroups, metrics),
    [enrichedJurorStats, enrichedGroups, metrics]
  );

  const clamp = (v) => Math.min(100, Math.max(0, v));
  const completedPct = clamp(
    totalJurors > 0 ? Math.round((completedJurors / totalJurors) * 100) : 0
  );
  const scoredPct = clamp(
    totalEvaluations > 0
      ? Math.round((scoredEvaluations / totalEvaluations) * 100)
      : 0
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

  const scoredSub =
    totalEvaluations > 0 && scoredEvaluations < totalEvaluations
      ? `${totalEvaluations} total`
      : undefined;

  const scoredValue = scoredHasData ? scoredEvaluations : "\u2014";
  const completedValue = completedHasData ? completedJurors : "\u2014";
  const isEmpty = totalJurors === 0 && totalGroups === 0;

  return (
    <div className="space-y-6">
      {/* Empty state */}
      {isEmpty && (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-3 text-sm text-muted-foreground" role="status">
              No data yet. Add jurors and groups to get started.
            </p>
            <Button variant="outline" size="sm" onClick={() => onGoToSettings?.()}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard
          value={totalJurors}
          label="Jurors"
          sub="Total assigned"
          icon={<Users className="size-4" />}
          iconClassName="bg-blue-500/10 text-blue-600"
        />
        <KpiCard
          value={totalGroups}
          label="Groups"
          sub="Total groups"
          icon={<FolderKanban className="size-4" />}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          value={completedValue}
          label="Completed Jurors"
          tooltip="Jurors who have completed scoring for all assigned groups and submitted their evaluations."
          metaLines={completedMetaLines}
          ring={completedHasData ? { pct: completedPct } : null}
        />
        <KpiCard
          value={scoredValue}
          label="Scored Evaluations"
          tooltip="Total group\u00d7juror score rows with at least one criterion filled"
          sub={scoredSub}
          metaLines={scoredMetaLines}
          ring={scoredHasData ? { pct: scoredPct } : null}
        />
      </KpiGrid>

      {/* Criteria Progress + Needs Attention + Period Snapshot */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CriteriaProgress rawScores={rawScores} criteriaTemplate={criteriaTemplate} />
        <NeedsAttentionCard
          staleJurors={needsAttention.staleJurors}
          incompleteProjects={needsAttention.incompleteProjects}
          onViewDetails={() => {
            // Stub for now — could scroll or navigate to details view
            console.log("[stub] View Details clicked");
          }}
        />
        <PeriodSnapshotCard
          semester={semester}
          metrics={metrics}
          criteriaTemplate={criteriaTemplate}
        />
      </div>

      {/* Juror Activity */}
      <Card className="py-0">
        <JurorActivityTable jurorStats={jurorStats} groups={groups} />
      </Card>
    </div>
  );
}
