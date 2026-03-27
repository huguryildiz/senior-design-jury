// src/admin/overview/CriteriaProgress.jsx
// Horizontal progress bars showing average score per criterion.

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRITERIA } from "../../config";
import { getActiveCriteria } from "../../shared/criteriaHelpers";

/**
 * Compute average score per criterion from raw score rows.
 * Only counts rows that have a non-null value for each criterion.
 */
function computeCriteriaAverages(rawScores, criteria) {
  return criteria.map((c) => {
    let sum = 0;
    let count = 0;
    for (const row of rawScores) {
      const val = row[c.id];
      if (typeof val === "number" && Number.isFinite(val)) {
        sum += val;
        count++;
      }
    }
    return {
      id: c.id,
      label: c.shortLabel || c.label,
      color: c.color,
      max: c.max,
      avg: count > 0 ? sum / count : 0,
      count,
    };
  });
}

/**
 * @param {object[]} rawScores  Raw score rows from adminGetScores
 * @param {object[]} [criteriaTemplate]  Active semester criteria (falls back to CRITERIA)
 */
export default function CriteriaProgress({ rawScores = [], criteriaTemplate }) {
  const criteria = getActiveCriteria(criteriaTemplate) || CRITERIA;

  const averages = useMemo(
    () => computeCriteriaAverages(rawScores, criteria),
    [rawScores, criteria]
  );

  if (averages.every((a) => a.count === 0)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criteria Averages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {averages.map((item) => {
            const pct = item.max > 0 ? (item.avg / item.max) * 100 : 0;
            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums text-foreground">
                    {item.avg.toFixed(1)}
                    <span className="text-muted-foreground font-normal"> / {item.max}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
