import { useMemo, useState } from "react";
import CustomSelect from "@/shared/ui/CustomSelect";
import useCardSelection from "@/shared/hooks/useCardSelection";
import { sortMobileJurors, MOBILE_SORT_KEYS } from "./mobileSort.js";
import JurorHeatmapCard from "./JurorHeatmapCard.jsx";
import ProjectAveragesCard from "./ProjectAveragesCard.jsx";

function buildRows(juror, groups, lookup, activeTab, activeCriteria, getCellDisplay) {
  return groups.map(g => {
    const entry = lookup[juror.key]?.[g.id];
    const cell = getCellDisplay(entry, activeTab, activeCriteria);
    const label = g.group_no != null ? `P${g.group_no}` : (g.title || g.id);
    const title = g.title || g.id;
    if (!cell) {
      return { groupId: g.id, label, title, empty: true, partial: false, score: null, max: null };
    }
    return {
      groupId: g.id,
      label,
      title,
      empty: false,
      partial: !!cell.partial,
      score: cell.score,
      max: cell.max,
    };
  });
}

export default function HeatmapMobileList({
  visibleJurors,
  groups,
  lookup,
  activeTab,
  activeCriteria,
  tabLabel,
  tabMax,
  jurorRowAvgs,
  visibleAverages,
  overallAvg,
  jurorWorkflowMap,
  getCellDisplay,
}) {
  const [sortKey, setSortKey] = useState("avg_desc");
  const cardListRef = useCardSelection();

  const rowAvgMap = useMemo(() => {
    const m = new Map();
    visibleJurors.forEach((j, i) => m.set(j.key, jurorRowAvgs[i]));
    return m;
  }, [visibleJurors, jurorRowAvgs]);

  const sortedJurors = useMemo(
    () => sortMobileJurors(visibleJurors, sortKey, {
      rowAvgs: rowAvgMap,
      workflow: jurorWorkflowMap,
    }),
    [visibleJurors, sortKey, rowAvgMap, jurorWorkflowMap]
  );

  return (
    <section className="heatmap-mobile" aria-label="Juror scoring heatmap (mobile)">
      <div className="hm-mobile-actions">
        <CustomSelect
          value={sortKey}
          onChange={setSortKey}
          options={MOBILE_SORT_KEYS}
          ariaLabel="Sort jurors"
        />
      </div>

      {sortedJurors.length === 0 ? (
        <div className="hm-card hm-card-empty">No jurors to display.</div>
      ) : (
        <div className="hm-card-list" ref={cardListRef}>
          {sortedJurors.map(juror => {
            const originalIdx = visibleJurors.findIndex(j => j.key === juror.key);
            const rows = buildRows(juror, groups, lookup, activeTab, activeCriteria, getCellDisplay);
            return (
              <JurorHeatmapCard
                key={juror.key}
                juror={juror}
                avg={jurorRowAvgs[originalIdx]}
                tabMax={tabMax}
                tabLabel={tabLabel}
                status={jurorWorkflowMap?.get(juror.key)}
                rows={rows}
              />
            );
          })}
        </div>
      )}

      <ProjectAveragesCard
        groups={groups}
        averages={visibleAverages}
        overall={overallAvg}
        tabMax={tabMax}
      />
    </section>
  );
}
