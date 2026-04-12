// src/auth/ResetPasswordScreen.jsx — Phase 12
// Create-new-password form with strength validation and done state, using vera.css design tokens.
// Replaces src/components/auth/ResetPasswordCreateForm.jsx.

import { useContext, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FbAlert from "@/shared/ui/FbAlert";
import { AuthContext } from "@/auth/AuthProvider";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import {
  isStrongPassword,
  PASSWORD_POLICY_ERROR_TEXT,
  PASSWORD_POLICY_PLACEHOLDER,
} from "@/shared/passwordPolicy";

import { Icon } from "lucide-react";

const EYE_ICON = (
  <Icon
    iconNode={[]}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </Icon>
);
const EYE_OFF_ICON = (
  <Icon
    iconNode={[]}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </Icon>
);

export default function ResetPasswordScreen({ onUpdatePassword, onBackToLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/demo") ? "/demo" : "";
  const auth = useContext(AuthContext);
  const doUpdatePassword = onUpdatePassword || auth?.updatePassword || (async () => {
    throw new Error("Password update is not configured in this screen context.");
  });
  const goLogin = onBackToLogin || (() => navigate(`${base}/login`));
  const goForgotPassword = () => navigate(`${base}/forgot-password`);

  // Capture the URL hash on first render — Supabase clears it after processing,
  // so we must read it before it disappears.
  const hasRecoveryToken = useRef(
    typeof window !== "undefined" &&
    (window.location.hash.includes("type=recovery") ||
      new URLSearchParams(window.location.search).get("type") === "recovery")
  );
  // Also valid if the user already has an active session (e.g. they reloaded after
  // Supabase established the recovery session). Defer the check until auth is done loading
  // to avoid a false "invalid" flash while the session bootstraps.
  const authLoading = !!auth?.loading;
  const hasSession = !!auth?.session;
  const isValidAccess = authLoading || hasRecoveryToken.current || hasSession;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const submitBtnRef = useShakeOnError(error);

  const isValidPassword = isStrongPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isValidPassword(password)) {
      setError(PASSWORD_POLICY_ERROR_TEXT);
      return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await doUpdatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err?.message || "Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isValidAccess) {
    return (
      <div className="login-screen">
        <div style={{ width: "400px", maxWidth: "92vw" }}>
          <div className="login-card">
            <div className="login-header">
              <div className="login-icon-wrap" style={{ background: "rgba(239,68,68,0.12)" }}>
                <Icon
                  iconNode={[]}
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--fb-danger-text, #ef4444)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </Icon>
              </div>
              <div className="login-title">Invalid Reset Link</div>
              <div className="login-sub">This password reset link is invalid or has already expired.</div>
            </div>
            <FbAlert variant="warning" style={{ marginBottom: "20px" }}>
              Reset links expire after a short period and can only be used once. Request a new one to continue.
            </FbAlert>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={goForgotPassword}>
              Request a New Reset Link
            </button>
          </div>
          <div className="login-footer">
            <button type="button" onClick={goLogin} className="form-link">
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div style={{ width: "400px", maxWidth: "92vw" }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrap">
              <Icon
                iconNode={[]}
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </Icon>
            </div>
            <div className="login-title">Create New Password</div>
            <div className="login-sub">Set a new password for your admin account.</div>
          </div>

          {!done ? (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <FbAlert variant="danger" style={{ marginBottom: "16px" }}>
                  {error}
                </FbAlert>
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
                    placeholder={PASSWORD_POLICY_PLACEHOLDER}
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

              <button ref={submitBtnRef} type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
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
                <Icon
                  iconNode={[]}
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </Icon>
              </div>
              <div className="auth-state-title">Password Updated</div>
              <div className="auth-state-desc">Your password has been updated. You can now sign in.</div>
              <button type="button" className="btn btn-primary" style={{ marginTop: "16px" }} onClick={goLogin}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {!done && (
          <div className="login-footer">
            <button type="button" onClick={goLogin} className="form-link">
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
