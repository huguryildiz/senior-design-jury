// src/components/auth/ResetPasswordCreateForm.jsx
// Phase 6: Create new password form with shadcn components.

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, Eye, EyeOff } from "lucide-react";
import AlertCard from "../../shared/AlertCard";

const isStrongPassword = (v) => {
  const s = String(v || "");
  return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};

export default function ResetPasswordCreateForm({ onUpdatePassword, onBackToLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) { setError("Password must be at least 10 characters with uppercase, lowercase, digit, and symbol."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try { await onUpdatePassword(password); setDone(true); }
    catch (err) { setError(err?.message || "Could not update password. Please try again."); }
    finally { setLoading(false); }
  }

  if (done) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-xl font-semibold">Password Updated</h2>
          <p className="text-sm text-muted-foreground">Your password has been updated. You can now sign in.</p>
          <Button onClick={onBackToLogin} className="w-full max-w-[200px]">
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  const PasswordField = ({ id, label, value, onChange, show, onToggle, placeholder }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete="new-password" disabled={loading} className="pr-10" />
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
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Create New Password</h2>
            <p className="text-sm text-muted-foreground">Set a new password for your admin account.</p>
          </div>

          {error && <AlertCard variant="error">{error}</AlertCard>}

          <PasswordField id="reset-pass" label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} show={showPass} onToggle={() => setShowPass((v) => !v)} placeholder="Min 10 chars, upper, lower, digit, symbol" />
          <PasswordField id="reset-confirm" label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirmPass} onToggle={() => setShowConfirmPass((v) => !v)} placeholder="Re-enter your new password" />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating\u2026" : "Update Password"}
          </Button>

          <div className="text-center">
            <button type="button" onClick={onBackToLogin} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              \u2190 Back to Sign In
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
