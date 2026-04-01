// src/admin/overview/NeedsAttentionCard.jsx
// Needs Attention card — highlights stale jurors and incomplete projects.
// Auto-detected issues from overview data; action buttons are stubs.

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NeedsAttentionCard({
  staleJurors = [],
  incompleteProjects = [],
  onViewDetails,
}) {
  const isEmpty = staleJurors.length === 0 && incompleteProjects.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {!isEmpty && <AlertTriangle className="size-5 text-amber-600" />}
          <div>
            <CardTitle className="text-base font-semibold">Needs Attention</CardTitle>
            <CardDescription>Auto-detected issues requiring follow-up</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground">All caught up! No issues detected.</p>
          </div>
        ) : (
          <>
            {/* Stale Jurors Section */}
            {staleJurors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {staleJurors.length} Juror{staleJurors.length !== 1 ? "s" : ""} Not Started
                  </h3>
                </div>
                <div className="space-y-2">
                  {staleJurors.map((juror) => (
                    <div
                      key={juror.key}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{juror.name || "Unknown"}</p>
                        {juror.dept && (
                          <p className="text-xs text-muted-foreground">{juror.dept}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Not Started
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incomplete Projects Section */}
            {incompleteProjects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {incompleteProjects.length} Project{incompleteProjects.length !== 1 ? "s" : ""} Incomplete
                  </h3>
                </div>
                <div className="space-y-2">
                  {incompleteProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-lg bg-muted/50 p-3"
                    >
                      <p className="text-sm font-medium">{project.title || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.completedEvals || 0} of {project.totalJurors || "?"} evaluations completed
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  console.log("[stub] Send Reminder clicked");
                }}
                disabled
              >
                Send Reminder
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewDetails?.()}
              >
                View Details
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
