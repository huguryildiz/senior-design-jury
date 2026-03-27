// src/components/auth/ForgotPasswordForm.jsx
// Phase 6: Forgot-password form with shadcn components.

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordForm({ onResetPassword, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    try { await onResetPassword(email.trim()); setSent(true); }
    catch (err) { setError(err?.message || "Failed to send reset link. Please try again."); }
    finally { setLoading(false); }
  }

  if (sent) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-xl font-semibold">Check Your Email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to <strong className="text-foreground">{email}</strong>.
            Check your inbox and follow the link to set a new password.
          </p>
          <Button onClick={onBackToLogin} className="w-full max-w-[200px]">
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="admin-auth-form space-y-4" noValidate>
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mail className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Reset Password</h2>
            <p className="text-center text-sm text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@university.edu" autoComplete="email" autoFocus disabled={loading} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending\u2026" : "Send Reset Link"}
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
