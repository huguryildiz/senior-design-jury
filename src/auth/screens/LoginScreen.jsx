// src/auth/LoginScreen.jsx — Phase 12
// Glassmorphic login screen using vera.css design tokens.
// Replaces src/components/auth/LoginForm.jsx.

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleX, Eye, EyeOff, ShieldCheck } from "lucide-react";
import FbAlert from "@/shared/ui/FbAlert";
import { KEYS } from "@/shared/storage/keys";

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const EYE_ICON = (
  <Eye width="16" height="16" strokeWidth="1.8" aria-hidden="true" />
);

const EYE_OFF_ICON = (
  <EyeOff width="16" height="16" strokeWidth="1.8" aria-hidden="true" />
);

const normalizeError = (raw) => {
  const msg = String(raw || "").toLowerCase().trim();
  if (!msg) return "Login failed. Please try again.";
  if (msg.includes("captcha verification process failed")) return "Captcha verification failed. Please complete the captcha and try again.";
  if (msg.includes("captcha")) return "Captcha is required to sign in. Please complete the captcha.";
  if (msg.includes("invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("email not confirmed")) return "Your email is not confirmed yet. Please check your inbox.";
  if (msg.includes("database error querying schema")) return "Could not sign in right now. Please try again in a moment.";
  return String(raw);
};

const extractErrorText = (err) => {
  if (!err) return "";
  return [err.message, err.details, err.hint, err.code ? `code:${err.code}` : ""].filter(Boolean).join(" | ");
};

export default function LoginScreen({
  onLogin,
  onGoogleLogin,
  onSwitchToRegister,
  onForgotPassword,
  onReturnHome,
  error: externalError,
  initialEmail = "",
  initialPassword = "",
}) {
  const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
  const requiresCaptcha = !!turnstileSiteKey;

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(!requiresCaptcha);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem(KEYS.ADMIN_REMEMBER_ME) === "true"; } catch { return false; }
  });

  const widgetContainerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const scriptId = "cf-turnstile-script";

  useEffect(() => {
    if (!requiresCaptcha) return undefined;
    const onReady = () => setCaptchaReady(true);
    if (window.turnstile) { onReady(); return undefined; }
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", onReady);
    return () => script?.removeEventListener("load", onReady);
  }, [requiresCaptcha]);

  useEffect(() => {
    if (!requiresCaptcha || !captchaReady || !widgetContainerRef.current) return;
    if (!window.turnstile || widgetIdRef.current != null) return;
    widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token) => setCaptchaToken(String(token || "")),
      "error-callback": () => setCaptchaToken(""),
      "expired-callback": () => setCaptchaToken(""),
      "timeout-callback": () => setCaptchaToken(""),
    });
  }, [captchaReady, requiresCaptcha, turnstileSiteKey]);

  const resetCaptcha = () => {
    if (!requiresCaptcha || !window.turnstile || widgetIdRef.current == null) return;
    setCaptchaToken("");
    try { window.turnstile.reset(widgetIdRef.current); } catch {}
  };

  const isSubmitDisabled = useMemo(
    () => loading || (requiresCaptcha && !captchaToken),
    [loading, requiresCaptcha, captchaToken]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    if (requiresCaptcha && !captchaToken) { setError("Please complete the captcha challenge."); return; }
    setError("");
    setLoading(true);
    try { await onLogin(email.trim(), password, rememberMe, captchaToken); }
    catch (err) {
      setError(normalizeError(extractErrorText(err) || "Login failed. Please try again."));
      resetCaptcha();
    }
    finally { setLoading(false); }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); } catch {}
      await onGoogleLogin(rememberMe);
    } catch (err) { setError(extractErrorText(err) || "Google sign-in failed. Please try again."); }
  }

  const rawDisplayError = (externalError || error || "").trim();
  const displayError = rawDisplayError ? normalizeError(rawDisplayError) : "";

  return (
    <div className="login-screen">
      <div style={{ width: "400px", maxWidth: "92vw" }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrap">
              <ShieldCheck width="26" height="26" strokeWidth="1.5" aria-hidden="true" />
            </div>
            <div className="login-title">Welcome back</div>
            <div className="login-sub">Access your evaluation workspace</div>
          </div>

          {displayError && (
            <FbAlert variant="danger" style={{ marginBottom: "16px", padding: "12px 14px" }}>
              {displayError}
            </FbAlert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@university.edu"
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                {onForgotPassword && (
                  <button type="button" onClick={onForgotPassword} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    Forgot?
                  </button>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: "var(--text-tertiary)", display: "flex", alignItems: "center",
                  }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? EYE_OFF_ICON : EYE_ICON}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(e.target.checked)); } catch {}
                  }}
                  disabled={loading}
                />
                {" "}Remember me
              </label>
            </div>

            {requiresCaptcha && (
              <div style={{ marginBottom: "16px" }}>
                <div ref={widgetContainerRef} style={{ minHeight: "65px" }} />
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isSubmitDisabled} style={{ width: "100%", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="login-divider">or</div>

          <button
            type="button"
            className="btn btn-google"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%" }}
          >
            {GOOGLE_ICON}
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="login-footer">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onSwitchToRegister} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            Apply for access
          </button>
        </div>
        {onReturnHome && (
          <div className="login-footer" style={{ marginTop: "8px" }}>
            <button type="button" onClick={onReturnHome} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              ← Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
