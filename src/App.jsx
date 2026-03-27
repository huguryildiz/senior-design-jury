// src/App.jsx
// ============================================================
// Root component — manages top-level page routing.
//
// Pages: "home" | "jury_gate" | "jury" | "admin"
//
// Phase C: Admin auth moved to Supabase Auth + JWT/session.
// - Login: email + password via supabase.auth.signInWithPassword
// - Register: self-registration + tenant application
// - Pending gate: authenticated but no approved membership
// - Jury flow: completely unchanged (no tenant exposure)
// ============================================================

import { useEffect, useState } from "react";
import JuryForm from "./JuryForm";
import JuryGatePage from "./jury/JuryGatePage";
import AdminPanel from "./AdminPanel";
import ErrorBoundary from "./shared/ErrorBoundary";
import {
  ClipboardIcon,
  ShieldUserIcon,
} from "./shared/Icons";
import { submitAdminApplication } from "./shared/api";
import { initScrollIndicators } from "./shared/scrollIndicators";
import MinimalLoaderOverlay from "./shared/MinimalLoaderOverlay";
import { getPage, setPage as persistPage, getJuryAccess } from "./shared/storage";
import { AuthProvider, useAuth } from "./shared/auth";
import LoginForm from "./components/auth/LoginForm";
import ForgotPasswordForm from "./components/auth/ForgotPasswordForm";
import RegisterForm from "./components/auth/RegisterForm";
import CompleteProfileForm from "./components/auth/CompleteProfileForm";
import ResetPasswordCreateForm from "./components/auth/ResetPasswordCreateForm";
import PendingReviewGate from "./admin/components/PendingReviewGate";
// Phase 8: home.css and admin-auth.css removed — pages restyled with Tailwind in Phase 6

import veraLogoHome from "./assets/vera_logo.png";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const DEMO_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || "";
const DEMO_PASS = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "";
const DEMO_SUPER_EMAIL = import.meta.env.VITE_DEMO_SUPERADMIN_EMAIL || "";
const DEMO_SUPER_PASS = import.meta.env.VITE_DEMO_SUPERADMIN_PASSWORD || "";

// Wrapper: wraps the app in AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const auth = useAuth();

  const [page, setPage] = useState(() => {
    try {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("t");
      if (urlToken) return "jury_gate";
      const urlPage = params.get("page");
      if (urlPage === "admin") return "admin";
      if (pathname === "/jury-entry") {
        if (getJuryAccess()) return "jury";
        return "jury_gate";
      }
      const saved = getPage();
      if (saved === "admin") return "admin";
      if (saved === "jury") {
        if (DEMO_MODE) return "jury";
        if (getJuryAccess()) return "jury";
        return "home";
      }
    } catch { }
    return "home";
  });

  const [entryToken] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("t") || "";
    } catch { return ""; }
  });

  const [demoSuperMode] = useState(() => {
    try {
      return DEMO_MODE && new URLSearchParams(window.location.search).get("super") === "1";
    } catch { return false; }
  });

  // Admin auth sub-page: "login" | "register" | "forgot" | "reset"
  const [adminAuthPage, setAdminAuthPage] = useState("login");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminInitialLoading, setAdminInitialLoading] = useState(true);

  useEffect(() => {
    if (page === "jury_gate") return;
    persistPage(page);
  }, [page]);

  useEffect(() => initScrollIndicators(), []);

  // Failsafe: never keep admin initial overlay open forever.
  useEffect(() => {
    if (page !== "admin") return;
    if (auth.loading) return;
    if (!auth.user) return;
    if (!adminInitialLoading) return;

    const t = setTimeout(() => {
      setAdminInitialLoading(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [page, auth.loading, auth.user, adminInitialLoading]);

  useEffect(() => {
    try {
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const search = new URLSearchParams(window.location.search || "");
      const isRecovery =
        hash.get("type") === "recovery" ||
        search.get("type") === "recovery" ||
        search.get("page") === "reset-password";
      if (isRecovery) {
        setPage("admin");
        setAdminAuthPage("reset");
        setAdminAuthError("");
      }
    } catch {}
  }, []);


  async function handleLogin(email, password, rememberMe) {
    setAdminAuthError("");
    await auth.signIn(email, password, rememberMe);
  }

  async function handleGoogleLogin(rememberMe) {
    setAdminAuthError("");
    await auth.signInWithGoogle(rememberMe);
  }

  async function handleRegister(email, password, metadata) {
    setAdminAuthError("");
    // No auth.signUp — application is submitted as anon.
    // auth.users entry is created when super-admin approves.
    await submitAdminApplication({
      tenantId: metadata.tenantId,
      email,
      password,
      name: metadata.name,
      university: metadata.university,
      department: metadata.department,
    });
  }

  async function handleUpdatePassword(password) {
    setAdminAuthError("");
    await auth.updatePassword(password);
    try {
      const cleanUrl = `${window.location.pathname}?page=admin`;
      window.history.replaceState({}, "", cleanUrl);
    } catch {}
  }

  function handleAdminSignOut() {
    auth.signOut();
    setPage("home");
    setAdminAuthError("");
  }

  // ── Jury gate (QR/token verification) ────────────────────
  if (page === "jury_gate") {
    return (
      <ErrorBoundary>
        <div id="main-content">
          <JuryGatePage
            token={entryToken}
            onGranted={() => setPage("jury")}
            onBack={() => setPage("home")}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Jury form ─────────────────────────────────────────────
  if (page === "jury") {
    return (
      <ErrorBoundary>
        <div id="main-content">
          <JuryForm onBack={() => setPage("home")} />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Admin panel ───────────────────────────────────────────
  if (page === "admin") {
    // Still loading auth state
    if (auth.loading) {
      return <MinimalLoaderOverlay open minDuration={400} />;
    }

    // Password recovery flow: always show reset form first.
    if (adminAuthPage === "reset") {
      return (
        <div className="premium-screen">
          <div className="premium-card premium-card--auth-login">
            <ResetPasswordCreateForm
              onUpdatePassword={handleUpdatePassword}
              onBackToLogin={() => { setAdminAuthPage("login"); setAdminAuthError(""); }}
            />
          </div>
        </div>
      );
    }

    // Not authenticated — show login/register
    if (!auth.user) {
      return (
        <div className="premium-screen">
          <div className={`premium-card ${adminAuthPage === "register" ? "premium-card--auth-register" : "premium-card--auth-login"}`}>
            {adminAuthPage === "forgot" ? (
              <ForgotPasswordForm
                onResetPassword={auth.resetPassword}
                onBackToLogin={() => { setAdminAuthPage("login"); setAdminAuthError(""); }}
              />
            ) : adminAuthPage === "reset" ? (
              <ResetPasswordCreateForm
                onUpdatePassword={handleUpdatePassword}
                onBackToLogin={() => { setAdminAuthPage("login"); setAdminAuthError(""); }}
              />
            ) : adminAuthPage === "register" ? (
              <RegisterForm
                onRegister={handleRegister}
                onSwitchToLogin={() => { setAdminAuthPage("login"); setAdminAuthError(""); }}
                onReturnHome={() => {
                  setPage("home");
                  setAdminAuthError("");
                }}
                error={adminAuthError}
              />
            ) : (
              <LoginForm
                onLogin={handleLogin}
                onGoogleLogin={handleGoogleLogin}
                onSwitchToRegister={() => { setAdminAuthPage("register"); setAdminAuthError(""); }}
                onForgotPassword={() => { setAdminAuthPage("forgot"); setAdminAuthError(""); }}
                error={adminAuthError}
                initialEmail={DEMO_MODE ? (demoSuperMode ? DEMO_SUPER_EMAIL : DEMO_EMAIL) : ""}
                initialPassword={DEMO_MODE ? (demoSuperMode ? DEMO_SUPER_PASS : DEMO_PASS) : ""}
              />
            )}
            {adminAuthPage === "login" && (
              <button
                className="admin-auth-home-link"
                onClick={() => { setPage("home"); setAdminAuthError(""); }}
              >
                ← Return Home
              </button>
            )}
          </div>
        </div>
      );
    }

    // Google user needs to complete profile (check before isPending)
    if (auth.profileIncomplete) {
      return (
        <div className="premium-screen">
          <div className="premium-card premium-card--auth-register">
            <CompleteProfileForm
              user={auth.user}
              onComplete={auth.completeProfile}
              onSignOut={handleAdminSignOut}
            />
          </div>
        </div>
      );
    }

    // Authenticated but no approved membership — pending gate
    if (auth.isPending) {
      return (
        <PendingReviewGate
          user={auth.user}
          onSignOut={handleAdminSignOut}
          onBack={() => setPage("home")}
        />
      );
    }

    // Authenticated and approved — show admin panel
    return (
      <ErrorBoundary>
        <div id="main-content">
          {adminInitialLoading && (
            <MinimalLoaderOverlay open={adminInitialLoading} minDuration={400} />
          )}
          <AdminPanel
            isDemoMode={DEMO_MODE && !auth.demoBypass}
            onAuthError={() => handleAdminSignOut()}
            onInitialLoadDone={() => setAdminInitialLoading(false)}
            onBack={() => {
              setPage("home");
              setAdminInitialLoading(true);
            }}
            onLogout={handleAdminSignOut}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Home page ─────────────────────────────────────────────
  return (
    <div id="main-content" className="home flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="home-bg" />
      <div className="home-card relative z-10 flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-lg sm:p-10">
        <div className="home-logo-wrap">
          <img className="home-logo h-16 w-auto" src={veraLogoHome} alt="VERA" loading="eager" />
        </div>

        <div className="text-center">
          <p className="home-definition text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Verdict &amp; Evaluation Ranking Assistant
          </p>
          <p className="home-tagline mt-2 text-lg font-semibold text-foreground">
            A smarter way to evaluate and rank capstone projects
          </p>
        </div>

        {DEMO_MODE && (
          <p className="home-demo-desc rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-600">
            Live demo · Sample data · Resets daily
          </p>
        )}

        <div className="home-buttons flex w-full flex-col gap-3">
          <button
            className="btn-primary big home-primary-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            onClick={() => DEMO_MODE ? setPage("jury") : setPage("jury_gate")}
          >
            <span className="home-btn-icon" aria-hidden="true"><ClipboardIcon /></span>
            {DEMO_MODE ? "Try Jury Flow" : "Start Evaluation"}
          </button>
          <button
            className="btn-outline big home-secondary-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            onClick={() => setPage("admin")}
          >
            <span className="home-btn-icon" aria-hidden="true"><ShieldUserIcon /></span>
            {DEMO_MODE ? "Explore Admin Panel" : "Admin Panel"}
          </button>
        </div>

        <div className="home-footer flex flex-col items-center gap-2 pt-2 text-center text-xs text-muted-foreground">
          <span>
            &copy; 2026 VERA &nbsp;&middot;&nbsp; Developed by{" "}
            <a
              className="home-footer-link font-medium text-foreground hover:underline"
              href="https://huguryildiz.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Huseyin Ugur Yildiz
            </a>
            {" "}&middot; v1.0
          </span>
          {DEMO_MODE ? (
            <a
              className="home-footer-cta inline-flex items-center gap-1 font-medium text-foreground hover:underline"
              href="https://vera-eval.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="size-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Visit Production
            </a>
          ) : (
            <a
              className="home-footer-cta inline-flex items-center gap-1 font-medium text-foreground hover:underline"
              href="https://demo.vera-eval.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="size-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Try Live Demo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
