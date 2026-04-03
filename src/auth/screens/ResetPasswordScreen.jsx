// src/auth/ResetPasswordScreen.jsx — Phase 12
// Create-new-password form with strength validation and done state, using vera.css design tokens.
// Replaces src/components/auth/ResetPasswordCreateForm.jsx.

import { useState } from "react";

const isStrongPassword = (v) => {
  const s = String(v || "");
  return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};

const EYE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EYE_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function ResetPasswordScreen({ onUpdatePassword, onBackToLogin }) {
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
    if (!isStrongPassword(password)) {
      setError("Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.");
      return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await onUpdatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err?.message || "Could not update password. Please try again.");
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div className="login-title">Create New Password</div>
            <div className="login-sub">Set a new password for your admin account.</div>
          </div>

          {!done ? (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="fb-alert fba-danger" style={{ marginBottom: "16px" }}>
                  <div className="fb-alert-body">
                    <div className="fb-alert-desc">{error}</div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="reset-pass">New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reset-pass"
                    className="form-input"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 10 chars, upper, lower, digit, symbol"
                    autoComplete="new-password"
                    disabled={loading}
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      color: "var(--text-tertiary)", display: "flex", alignItems: "center",
                    }}
                  >
                    {showPass ? EYE_OFF_ICON : EYE_ICON}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm">Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reset-confirm"
                    className="form-input"
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    disabled={loading}
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPass((v) => !v)}
                    aria-label={showConfirmPass ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      color: "var(--text-tertiary)", display: "flex", alignItems: "center",
                    }}
                  >
                    {showConfirmPass ? EYE_OFF_ICON : EYE_ICON}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                background: "rgba(22,163,74,0.1)", display: "inline-grid",
                placeItems: "center", marginBottom: "14px",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="auth-state-title">Password Updated</div>
              <div className="auth-state-desc">Your password has been updated. You can now sign in.</div>
              <button type="button" className="btn btn-primary" style={{ marginTop: "16px" }} onClick={onBackToLogin}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {!done && (
          <div className="login-footer">
            <button type="button" onClick={onBackToLogin} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
