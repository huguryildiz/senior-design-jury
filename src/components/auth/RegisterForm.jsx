// src/components/auth/RegisterForm.jsx
// Phase C.4 / Phase 6: Admin self-registration + tenant application form.

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { listTenantsPublic } from "../../shared/api";
import AlertCard from "../../shared/AlertCard";
import TenantSearchDropdown from "./TenantSearchDropdown";

export default function RegisterForm({ onRegister, onSwitchToLogin, onReturnHome, error: externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listTenantsPublic()
      .then((data) => { if (active) setTenants(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setTenantsLoading(false); });
    return () => { active = false; };
  }, []);

  const isStrongPassword = (v) => {
    const s = String(v || "");
    return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
  };

  const normalizeRegisterError = (raw) => {
    const msg = String(raw || "").toLowerCase().trim();
    if (!msg) return "Registration failed. Please try again.";
    if (msg.includes("email_already_registered")) return "This email is already registered. Please sign in or use a different email.";
    if (msg.includes("password_too_short")) return "Password must be at least 10 characters.";
    if (msg.includes("email_required")) return "Email is required.";
    if (msg.includes("name_required")) return "Full name is required.";
    if (msg.includes("tenant_not_found")) return "Selected department was not found. Please try again.";
    if (msg.includes("application_already_pending")) return "You already have a pending application for this department.";
    if (msg.includes("duplicate") || msg.includes("already")) return "An application with this information already exists.";
    return raw;
  };

  const extractErrorText = (err) => {
    if (!err) return "";
    return [err.message, err.details, err.hint, err.code ? `code:${err.code}` : ""].filter(Boolean).join(" | ");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!isStrongPassword(password)) { setError("Password must be at least 10 characters with uppercase, lowercase, digit, and symbol."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!tenantId) { setError("Please select a department to apply to."); return; }
    setLoading(true);
    try {
      await onRegister(email.trim(), password, { name: fullName.trim(), university: university.trim(), department: department.trim(), tenantId });
      setSubmitted(true);
    } catch (err) { setError(normalizeRegisterError(extractErrorText(err) || "Registration failed. Please try again.")); }
    finally { setLoading(false); }
  }

  const rawDisplayError = (error || externalError || "").trim();
  const displayError = rawDisplayError ? normalizeRegisterError(rawDisplayError) : "";

  if (submitted) {
    const selectedTenant = tenants.find((t) => t.id === tenantId);
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="text-xl font-semibold">Application Submitted</h2>
          <p className="text-sm text-muted-foreground">
            Your application for <strong className="text-foreground">{selectedTenant?.university || selectedTenant?.name || "the selected department"}</strong>
            {selectedTenant?.department && <> · <strong className="text-foreground">{selectedTenant.department}</strong></>} has been submitted.
            You&apos;ll be able to sign in once an administrator approves your request.
          </p>
          <Button onClick={onSwitchToLogin} className="w-full max-w-[200px]">
            Back to Sign In
          </Button>
          <button type="button" onClick={onReturnHome} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            \u2190 Return Home
          </button>
        </CardContent>
      </Card>
    );
  }

  const PasswordField = ({ id, label, value, onChange, show, onToggle, placeholder, autoComplete }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} disabled={loading} className="pr-10" />
        <button type="button" onClick={onToggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="admin-auth-form space-y-4" noValidate>
          <h2 className="text-center text-xl font-semibold tracking-tight">Apply for Admin Access</h2>

          {displayError && <AlertCard variant="error">{displayError}</AlertCard>}

          <div className="space-y-1.5">
            <Label htmlFor="reg-name">Full Name</Label>
            <Input id="reg-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Doe" disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Institutional Email</Label>
            <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane.doe@university.edu" autoComplete="email" disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-uni">University</Label>
            <Input id="reg-uni" type="text" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. TED University" disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-dept">Department</Label>
            <Input id="reg-dept" type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Electrical Engineering" disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label>Apply to Department</Label>
            <TenantSearchDropdown tenants={tenants} value={tenantId} onChange={setTenantId} disabled={loading || tenantsLoading} />
          </div>

          <PasswordField id="reg-pass" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} show={showPass} onToggle={() => setShowPass(!showPass)} placeholder="Min 10 chars, upper, lower, digit, symbol" autoComplete="new-password" />
          <PasswordField id="reg-confirm" label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirmPass} onToggle={() => setShowConfirmPass(!showConfirmPass)} placeholder="Re-enter password" autoComplete="new-password" />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Registering\u2026" : "Register"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={onSwitchToLogin} className="font-medium text-foreground hover:underline">Sign in</button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
