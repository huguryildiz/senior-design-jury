// src/admin/components/PendingReviewGate.jsx
// Phase 6: Full-screen "pending approval" message with shadcn components.

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { getMyApplications } from "../../shared/api";

export default function PendingReviewGate({ user, onSignOut, onBack }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then((data) => { if (active) setApplications(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter((a) => a.status === "rejected");

  return (
    <div className="pending-gate flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-xl font-semibold">Application Pending</h2>
          <p className="text-sm text-muted-foreground">
            Your account <strong className="text-foreground">{user?.email}</strong> is not yet approved for admin access.
          </p>

          {!loading && pending.length > 0 && (
            <div className="w-full space-y-2 text-left">
              <h3 className="text-sm font-medium">Pending Applications</h3>
              {pending.map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">{app.tenant_name}</span>
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[11px]">
                    Pending review
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {!loading && rejected.length > 0 && (
            <div className="w-full space-y-2 text-left">
              <h3 className="text-sm font-medium">Rejected Applications</h3>
              {rejected.map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">{app.tenant_name}</span>
                  <Badge variant="destructive" className="text-[11px]">
                    Not approved
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button onClick={onBack} className="gap-2">
              <Home className="size-4" />
              Return Home
            </Button>
            <button type="button" onClick={onSignOut} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Sign Out
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
