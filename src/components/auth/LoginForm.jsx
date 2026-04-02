// src/components/auth/LoginForm.jsx
// Phase C.4 / Phase 6: Admin email/password login form.

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { GoogleIcon } from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";
import { KEYS } from "../../shared/storage/keys";

export default function LoginForm({ onLogin, onGoogleLogin, onSwitchToRegister, onForgotPassword, error: externalError, loading: externalLoading, initialEmail = "", initialPassword = "" }) {
  const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
  const requiresCaptcha = !!turnstileSiteKey;
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(!requiresCaptcha);
  const widgetContainerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const scriptId = "cf-turnstile-script";
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem(KEYS.ADMIN_REMEMBER_ME) === "true"; }
    catch { return false; }
  });

  const isLoading = loading || externalLoading;
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const normalizeLoginError = (raw) => {
    const msg = String(raw || "").toLowerCase().trim();
    if (!msg) return "Login failed. Please try again.";
    if (msg.includes("captcha verification process failed")) return "Captcha verification failed. Please complete the captcha and try again.";
    if (msg.includes("captcha")) return "Captcha is required to sign in. Please complete the captcha.";
    if (msg.includes("invalid login credentials")) return "Invalid email or password.";
    if (msg.includes("email not confirmed")) return "Your email is not confirmed yet. Please check your inbox.";
    if (msg.includes("database error querying schema")) return "Could not sign in right now. Please try again in a moment.";
    if (msg.includes("already registered")) return "This email is already registered. Please sign in.";
    return String(raw);
  };

  const extractErrorText = (err) => {
    if (!err) return "";
    const parts = [err.message, err.details, err.hint, err.code ? `code:${err.code}` : ""].filter(Boolean);
    return parts.join(" | ");
  };

  const resetCaptcha = () => {
    if (!requiresCaptcha) return;
    setCaptchaToken("");
    if (typeof window === "undefined") return;
    if (!window.turnstile || widgetIdRef.current == null) return;
    try {
      window.turnstile.reset(widgetIdRef.current);
    } catch {}
  };

  useEffect(() => {
    if (!requiresCaptcha) return undefined;
    if (typeof window === "undefined") return undefined;

    const onReady = () => {
      setCaptchaReady(true);
    };

    if (window.turnstile) {
      onReady();
      return undefined;
    }

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
    return () => {
      script?.removeEventListener("load", onReady);
    };
  }, [requiresCaptcha]);

  useEffect(() => {
    if (!requiresCaptcha || !captchaReady || !widgetContainerRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;
    if (widgetIdRef.current != null) return;

    widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token) => {
        setCaptchaToken(String(token || ""));
      },
      "error-callback": () => {
        setCaptchaToken("");
      },
      "expired-callback": () => {
        setCaptchaToken("");
      },
      "timeout-callback": () => {
        setCaptchaToken("");
      },
    });
  }, [captchaReady, requiresCaptcha, turnstileSiteKey]);

  const isSubmitDisabled = useMemo(() => {
    if (isLoading) return true;
    if (!requiresCaptcha) return false;
    return !captchaToken;
  }, [captchaToken, isLoading, requiresCaptcha]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    if (!isValidEmail(email)) { setError("A valid email is required."); return; }
    if (requiresCaptcha && !captchaToken) { setError("Please complete the captcha challenge."); return; }
    setError("");
    setLoading(true);
    try { await onLogin(email.trim(), password, rememberMe, captchaToken); }
    catch (err) {
      setError(normalizeLoginError(extractErrorText(err) || "Login failed. Please try again."));
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
  const displayError = rawDisplayError ? normalizeLoginError(rawDisplayError) : "";

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="admin-auth-form space-y-4" noValidate>
          {/* Header */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">Sign in to manage your department.</p>
          </div>

          {displayError && <AlertCard variant="error">{displayError}</AlertCard>}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@university.edu"
              autoComplete="email"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="admin-auth-remember flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                setRememberMe(e.target.checked);
                try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(e.target.checked)); } catch {}
              }}
              disabled={isLoading}
              className="size-4 rounded border-border"
            />
            <span>Remember me</span>
            <span className="text-xs text-muted-foreground">Session stays active for 30 days</span>
          </label>

          {requiresCaptcha && (
            <div className="space-y-2">
              <div ref={widgetContainerRef} className="min-h-[65px]" />
              {!captchaToken && (
                <p className="text-xs text-muted-foreground">Complete captcha verification before signing in.</p>
              )}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isSubmitDisabled} className="w-full">
            {isLoading ? "Signing in\u2026" : "Sign In"}
          </Button>

          {/* Divider */}
          <div className="relative py-1">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="admin-auth-google w-full gap-2"
          >
            <GoogleIcon />
            Sign in with Google
          </Button>

          {/* Forgot password */}
          {onForgotPassword && (
            <div className="text-center">
              <button type="button" onClick={onForgotPassword} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                Forgot your password?
              </button>
            </div>
          )}

          {/* Switch to register */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button type="button" onClick={onSwitchToRegister} className="font-medium text-foreground hover:underline">
              Apply for access
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
