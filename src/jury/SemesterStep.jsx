// src/jury/SemesterStep.jsx
// Semester selection step. Phase 7 restyle.

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function SemesterStep({ semesters, onSelect, onBack }) {
  useEffect(() => {
    if (semesters.length === 0) return;
    const active = semesters.filter((s) => s.is_current);
    if (active.length === 1) onSelect(active[0]);
  }, [semesters]); // eslint-disable-line react-hooks/exhaustive-deps

  if (semesters.length === 0) {
    return (
      <div className="premium-screen flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Clock className="size-6" />
            </div>
            <h1 className="text-xl font-semibold">No Semesters Available</h1>
            <p className="text-sm text-muted-foreground">Please contact the administrator.</p>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={onBack}>
              &larr; Return Home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="premium-screen flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Clock className="size-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Select Semester</h1>
            <p className="text-sm text-muted-foreground">Choose the evaluation period to continue.</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {semesters.map((s) => (
              <Button
                key={s.id}
                variant={s.is_current ? "default" : "outline"}
                className="w-full justify-center"
                onClick={() => onSelect(s)}
              >
                {s.semester_name}
                {s.is_current && (
                  <span className="ml-2 text-xs opacity-75">(Current)</span>
                )}
              </Button>
            ))}
          </div>

          <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={onBack}>
            &larr; Return Home
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
