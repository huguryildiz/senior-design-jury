// src/components/auth/CompleteProfileForm.jsx
// Phase 6: Profile completion form for first-time Google OAuth users.

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import AlertCard from "../../shared/AlertCard";
import TenantSearchDropdown from "./TenantSearchDropdown";
import { listTenantsPublic } from "../../shared/api";

export default function CompleteProfileForm({ user, onComplete, onSignOut }) {
  const [fullName, setFullName] = useState(user?.name || "");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    listTenantsPublic()
      .then((data) => { if (active) setTenants(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setTenantsLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!tenantId) { setError("Please select a department to apply to."); return; }
    setLoading(true);
    try { await onComplete({ name: fullName.trim(), university: university.trim(), department: department.trim(), tenantId }); }
    catch (err) { setError(String(err?.message || "Failed to complete profile. Please try again.")); }
    finally { setLoading(false); }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="admin-auth-form space-y-4" noValidate>
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Complete Your Profile</h2>
            <p className="text-sm text-muted-foreground">One more step before you can start managing your department.</p>
          </div>

          {error && <AlertCard variant="error">{error}</AlertCard>}

          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{user?.email}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input id="profile-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" disabled={loading} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-uni">University</Label>
            <Input id="profile-uni" type="text" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Your university" disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-dept">Department</Label>
            <Input id="profile-dept" type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Your department" disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label>Apply to Department</Label>
            <TenantSearchDropdown tenants={tenants} value={tenantId} onChange={setTenantId} loading={tenantsLoading} disabled={loading} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting\u2026" : "Submit Application"}
          </Button>

          <div className="text-center">
            <button type="button" onClick={onSignOut} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Sign out
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
