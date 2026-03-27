// src/components/auth/LoginForm.jsx
// ============================================================
// Phase C.4: Admin email/password login form.
// Replaces the old single-password admin login.
// ============================================================

import { useState } from "react";
import { EyeIcon, EyeOffIcon, ShieldUserIcon, GoogleIcon } from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";
import { KEYS } from "../../shared/storage/keys";

export default function LoginForm({ onLogin, onGoogleLogin, onSwitchToRegister, onForgotPassword, error: externalError, loading: externalLoading, initialEmail = "", initialPassword = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem(KEYS.ADMIN_REMEMBER_ME) === "true"; }
    catch { return false; }
  });

  const isLoading = loading || externalLoading;
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const normalizeLoginError = (raw) => {
    const msg = String(raw || "").toLowerCase().trim();
    if (!msg) return "Login failed. Please try again.";
    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (msg.includes("email not confirmed")) {
      return "Your email is not confirmed yet. Please check your inbox.";
    }
    if (msg.includes("database error querying schema")) {
      return "Could not sign in right now. Please try again in a moment.";
    }
    if (msg.includes("already registered")) {
      return "This email is already registered. Please sign in.";
    }
    return String(raw);
  };

  const extractErrorText = (err) => {
    if (!err) return "";
    const parts = [
      err.message,
      err.details,
      err.hint,
      err.code ? `code:${err.code}` : "",
    ].filter(Boolean);
    return parts.join(" | ");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("A valid email is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onLogin(email.trim(), password, rememberMe);
    } catch (err) {
      const raw = extractErrorText(err);
      setError(normalizeLoginError(raw || "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      // Persist remember-me preference before redirect
      try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); }
      catch {}
      await onGoogleLogin(rememberMe);
    } catch (err) {
      const raw = extractErrorText(err);
      setError(raw || "Google sign-in failed. Please try again.");
    }
  }

  const rawDisplayError = (externalError || error || "").trim();
  const displayError = rawDisplayError ? normalizeLoginError(rawDisplayError) : "";

  return (
    <form onSubmit={handleSubmit} className="admin-auth-form" noValidate>
      <div className="admin-auth-header">
        <div className="premium-icon-square" aria-hidden="true"><ShieldUserIcon /></div>
        <h2 className="admin-auth-title">Admin Panel</h2>
        <p className="admin-auth-subtitle">Sign in to manage your department.</p>
      </div>

      {displayError && (
        <AlertCard variant="error">{displayError}</AlertCard>
      )}

      <label className="admin-auth-label">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@university.edu"
          autoComplete="email"
          autoFocus
          disabled={isLoading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Password
        <div className="admin-auth-pass-wrap">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLoading}
            className="admin-auth-input"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="admin-auth-toggle-pass"
            tabIndex={-1}
          >
            {showPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </label>

      <label className="admin-auth-remember">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => {
            setRememberMe(e.target.checked);
            try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(e.target.checked)); }
            catch {}
          }}
          disabled={isLoading}
        />
        <span>Remember me</span>
        <span className="admin-auth-remember-hint">Session stays active for 30 days</span>
      </label>

      <button type="submit" disabled={isLoading} className="admin-auth-submit">
        {isLoading ? "Signing in…" : "Sign In"}
      </button>

      <div className="admin-auth-divider"><span>or</span></div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="admin-auth-google"
      >
        <GoogleIcon />
        Sign in with Google
      </button>

      {onForgotPassword && (
        <div className="admin-auth-forgot">
          <button type="button" onClick={onForgotPassword} className="admin-auth-link">
            Forgot your password?
          </button>
        </div>
      )}

      <p className="admin-auth-switch">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={onSwitchToRegister} className="admin-auth-link">
          Apply for access
        </button>
      </p>
    </form>
  );
}
