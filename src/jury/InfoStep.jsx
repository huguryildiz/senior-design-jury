// src/jury/InfoStep.jsx
// Step 1 — Juror identity form. Presentation-only restyle (Phase 7).

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserCheck, Info, AlertCircle, Landmark, GraduationCap, CalendarDays, FolderKanban } from "lucide-react";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export default function InfoStep({
  juryName, setJuryName,
  juryDept, setJuryDept,
  currentSemester,
  activeProjectCount,
  onStart,
  onBack,
  error,
}) {
  const canStart = juryName.trim().length > 0 && juryDept.trim().length > 0;
  const formatLongDate = (value) => {
    if (!value) return "\u2014";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const semesterLabel = currentSemester?.semester_name || "-";
  const infoDate = currentSemester?.poster_date;
  const infoDateLabel = infoDate ? formatLongDate(infoDate) : "-";
  const projectCountLabel =
    typeof activeProjectCount === "number"
      ? `${activeProjectCount} Project Group${activeProjectCount === 1 ? "" : "s"}`
      : "-";

  return (
    <div className="premium-screen flex min-h-dvh items-center justify-center p-4">
      <Card className="premium-card w-full max-w-lg">
        <CardContent className="space-y-5 pt-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UserCheck className="size-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Jury Information</h1>
            {(currentSemester?.university || currentSemester?.department) && (
              <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                {currentSemester?.university && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="size-4" />
                    {currentSemester.university}
                  </span>
                )}
                {currentSemester?.department && (
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark className="size-4" />
                    {currentSemester.department}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-label="Jury schedule summary">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {semesterLabel}
              </span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>{infoDateLabel}</span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span className="inline-flex items-center gap-1">
                <FolderKanban className="size-3.5" />
                {projectCountLabel}
              </span>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>Name and institution / department cannot be changed once evaluation starts.</span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-medium">Could not continue</div>
                <div className="mt-0.5 text-destructive/80">{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="jury-name">Full Name</Label>
              <Input
                id="jury-name"
                value={juryName}
                onChange={(e) => setJuryName(e.target.value)}
                placeholder="e.g. Jane Smith"
                autoComplete="name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jury-dept">Institution / Department</Label>
              <Input
                id="jury-dept"
                value={juryDept}
                onChange={(e) => setJuryDept(e.target.value)}
                placeholder="e.g. TED University / EE"
                onKeyDown={(e) => { if (e.key === "Enter" && canStart) onStart(); }}
              />
            </div>
          </div>

          {isDemoMode && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>In production, jurors enter their real name and institution / department.</span>
            </div>
          )}

          {/* Actions */}
          <Button className="w-full" disabled={!canStart} onClick={onStart}>
            Start Evaluation \u2192
          </Button>
          <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={onBack}>
            \u2190 Return Home
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
