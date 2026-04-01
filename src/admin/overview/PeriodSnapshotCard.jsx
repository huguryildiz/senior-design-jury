// src/admin/overview/PeriodSnapshotCard.jsx
// Period Snapshot summary card — displays key semester metadata.
// Shows period name, criteria count, total points, evaluation status, and last submission.

import { Lock, Unlock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PeriodSnapshotCard({
  semester,
  metrics,
  criteriaTemplate,
}) {
  // Derive period name
  const periodName = semester?.semester_name || "—";

  // Derive period dates if available
  const startDate = semester?.start_date;
  const endDate = semester?.end_date;
  const dateRange = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${new Date(endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`
    : "—";

  // Count criteria from template
  const criteriaCount = criteriaTemplate?.length ?? 0;

  // Calculate total points from criteria template
  const totalPoints = (criteriaTemplate ?? []).reduce(
    (sum, c) => sum + (Number(c.max) || 0),
    0
  );

  // Derive evaluation status (locked/open)
  const isLocked = !!semester?.is_locked;
  const statusLabel = isLocked ? "Locked" : "Open";
  const statusIcon = isLocked ? (
    <Lock className="size-4" />
  ) : (
    <Unlock className="size-4" />
  );
  const statusVariant = isLocked ? "secondary" : "outline";

  // Derive last submission timestamp from metrics
  const lastSubmission = metrics?.lastSubmission || metrics?.lastSubmittedAt;
  const lastSubmissionText = lastSubmission
    ? new Date(lastSubmission).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base font-semibold">Period Snapshot</CardTitle>
          <CardDescription>Key evaluation period metadata</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Period and Date Range */}
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Period
              </p>
              <p className="mt-1 text-sm font-medium">{periodName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Date Range
              </p>
              <p className="mt-1 text-sm font-medium">{dateRange}</p>
            </div>
          </div>

          {/* Criteria Count and Total Points */}
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Criteria
              </p>
              <p className="mt-1 text-sm font-medium">
                {criteriaCount} {criteriaCount === 1 ? "criterion" : "criteria"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Points
              </p>
              <p className="mt-1 text-sm font-medium">{totalPoints}</p>
            </div>
          </div>

          {/* Status and Last Submission */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <div className="mt-1">
                <Badge variant={statusVariant} className="inline-flex gap-1">
                  {statusIcon}
                  {statusLabel}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last Submission
              </p>
              <p className="mt-1 text-sm font-medium">{lastSubmissionText}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
