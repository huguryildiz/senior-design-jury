// src/auth/ForgotPasswordScreen.jsx — Phase 12
// Forgot-password form with sent-confirmation state, using vera.css design tokens.
// Replaces src/components/auth/ForgotPasswordForm.jsx.

import { useState } from "react";
import FbAlert from "@/shared/ui/FbAlert";

export default function ForgotPasswordScreen({ onResetPassword, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    try {
      await onResetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div style={{ width: "400px", maxWidth: "92vw" }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <div className="login-title">Forgot your password?</div>
            <div className="login-sub">No worries, we&apos;ll help you get back in.</div>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <FbAlert variant="danger" style={{ marginBottom: "16px" }}>
                  {error}
                </FbAlert>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                background: "rgba(22,163,74,0.1)", display: "inline-grid",
                placeItems: "center", marginBottom: "14px",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 2-7 20-4-9-9-4z"/>
                  <path d="m22 2-11 11"/>
                </svg>
              </div>
              <div className="auth-state-title">Check your inbox</div>
              <div className="auth-state-desc">
                We&apos;ve sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.
              </div>
            </div>
          )}
        </div>

        <div className="login-footer">
          <button type="button" onClick={onBackToLogin} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
