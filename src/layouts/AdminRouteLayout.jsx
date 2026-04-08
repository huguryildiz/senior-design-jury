// src/layouts/AdminRouteLayout.jsx
// ============================================================
// Route-based admin layout. Replaces the old AdminLayout's
// conditional tab rendering with React Router <Outlet />.
//
// Responsibilities:
//   - Auth gate (login/register/forgot/reset screens)
//   - Profile completion gate
//   - Pending review gate
//   - Sidebar + Header chrome
//   - Data fetching (useAdminData)
//   - Renders child route via <Outlet />
// ============================================================

import { lazy, Suspense, useRef, useMemo, useState, useEffect, useCallback, Component } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { useAdminNav, getPageLabel } from "@/admin/hooks/useAdminNav";
import { useAdminData } from "@/admin/hooks/useAdminData";
import { useGlobalTableSort } from "@/admin/hooks/useGlobalTableSort";
import AdminSidebar from "@/admin/layout/AdminSidebar";
import AdminHeader from "@/admin/layout/AdminHeader";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import { setEnvironment } from "@/shared/lib/environment";

const LazyLoginForm            = lazy(() => import("@/auth/screens/LoginScreen"));
const LazyRegisterForm         = lazy(() => import("@/auth/screens/RegisterScreen"));
const LazyForgotPasswordForm   = lazy(() => import("@/auth/screens/ForgotPasswordScreen"));
const LazyResetPasswordForm    = lazy(() => import("@/auth/screens/ResetPasswordScreen"));
const LazyCompleteProfileForm  = lazy(() => import("@/auth/screens/CompleteProfileScreen"));
const LazyPendingReviewGate    = lazy(() => import("@/auth/screens/PendingReviewScreen"));

const DEMO_EMAIL    = import.meta.env.VITE_DEMO_ADMIN_EMAIL    || "";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "";

// ── Fallback login form ───────────────────────────────────────
function FallbackLoginForm({ onLogin, initialEmail = "", initialPassword = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email.trim(), password, false, "");
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#f8fafc" }}>
      <form onSubmit={handleSubmit} style={{ width: "360px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "0 0 24px" }}>Sign in to VERA</h1>
        {error && <p style={{ color: "#dc2626", fontSize: "14px", margin: "0 0 16px", padding: "10px 12px", background: "#fef2f2", borderRadius: "8px" }}>{error}</p>}
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Email</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" }}
        />
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", marginBottom: "24px", boxSizing: "border-box" }}
        />
        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "11px", background: "#2F56D6", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          <span className="btn-loading-content">
            <AsyncButtonContent loading={loading} loadingText="Signing in…">Sign in</AsyncButtonContent>
          </span>
        </button>
      </form>
    </div>
  );
}

class AuthFormErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return this.props.fallback || null;
    return this.props.children;
  }
}

export default function AdminRouteLayout() {
  useGlobalTableSort();

  const location = useLocation();
  const navigate = useNavigate();
  const settingsDirtyRef = useRef(false);
  const { currentPage, basePath, isDemo, navigateTo } = useAdminNav({ settingsDirtyRef });
  const isDemoMode = isDemo;

  // Force admin environment by route namespace to prevent cross-tenant token
  // generation when a stale sessionStorage demo flag leaks into /admin.
  useEffect(() => {
    setEnvironment(isDemo ? "demo" : "prod");
  }, [isDemo]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);

  const {
    user,
    loading: authLoading,
    activeOrganization,
    isPending,
    profileIncomplete,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    completeProfile,
  } = useAuth();

  const [authPage, setAuthPage] = useState(() => {
    // Check if coming from reset-password route
    if (location.pathname === "/reset-password") return "reset";
    try {
      const hash   = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const params = new URLSearchParams(window.location.search);
      if (
        hash.get("type") === "recovery" ||
        params.get("type") === "recovery" ||
        params.get("page") === "reset-password"
      ) return "reset";
    } catch {}
    return "login";
  });
  const [authError, setAuthError] = useState("");

  // Determine scores view from pathname (for backward compatibility with existing data hooks)
  const scoresView = useMemo(() => {
    const pageToView = { rankings: "rankings", analytics: "analytics", heatmap: "grid", reviews: "details" };
    return pageToView[currentPage] || "rankings";
  }, [currentPage]);

  const {
    rawScores,
    summaryData,
    allJurors,
    sortedPeriods,
    loading,
    loadError,
    lastRefresh,
    trendData,
    outcomeTrendData,
    outcomeTrendLoading,
    outcomeTrendError,
    trendPeriodIds,
    setTrendPeriodIds,
    fetchData,
  } = useAdminData({
    organizationId: activeOrganization?.id,
    selectedPeriodId,
    onSelectedPeriodChange: setSelectedPeriodId,
    scoresView,
  });

  const selectedPeriod = sortedPeriods.find((p) => p.id === selectedPeriodId) || null;

  // Fetch criteria + outcomes from snapshot tables
  const [criteriaConfig, setCriteriaConfig] = useState([]);
  const [outcomeConfig, setOutcomeConfig] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  useEffect(() => {
    if (!selectedPeriodId || !activeOrganization?.id) {
      setCriteriaConfig([]);
      setOutcomeConfig([]);
      setFrameworks([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { listPeriodCriteria, listPeriodOutcomes, listFrameworks } = await import("@/shared/api");
        const { getActiveCriteria } = await import("@/shared/criteria/criteriaHelpers");
        const [criteriaRows, outcomeRows, frameworkRows] = await Promise.all([
          listPeriodCriteria(selectedPeriodId),
          listPeriodOutcomes(selectedPeriodId),
          listFrameworks(activeOrganization.id),
        ]);
        if (!alive) return;
        const effectiveCriteria = criteriaRows.length > 0
          ? criteriaRows
          : (selectedPeriod?.criteria_config || []);
        setCriteriaConfig(getActiveCriteria(effectiveCriteria));
        setOutcomeConfig(outcomeRows.map((o) => ({
          id: o.id,
          code: o.code,
          desc_en: o.label || o.description || "",
          desc_tr: o.description || "",
        })));
        setFrameworks(frameworkRows);
      } catch {
        if (alive) { setCriteriaConfig([]); setOutcomeConfig([]); setFrameworks([]); }
      }
    })();
    return () => { alive = false; };
  }, [selectedPeriodId, activeOrganization?.id]);

  const reloadFrameworks = useCallback(async () => {
    if (!activeOrganization?.id) return;
    try {
      const { listFrameworks } = await import("@/shared/api");
      const rows = await listFrameworks(activeOrganization.id);
      setFrameworks(rows);
    } catch {}
  }, [activeOrganization?.id]);

  const onDirtyChange = useCallback((dirty) => { settingsDirtyRef.current = dirty; }, []);
  const onCurrentSemesterChange = useCallback((periodId) => {
    setSelectedPeriodId(periodId);
    fetchData(periodId);
  }, [fetchData]);

  const frameworkThreshold = frameworks[0]?.default_threshold ?? 70;

  // Groups derived from project summaries
  const groups = useMemo(
    () =>
      (summaryData || [])
        .map((p) => ({ id: p.id, group_no: p.group_no, title: p.title ?? "", members: p.members ?? "" }))
        .sort((a, b) => (a.group_no ?? 0) - (b.group_no ?? 0)),
    [summaryData]
  );

  // Jurors with key field matching lookup
  const matrixJurors = useMemo(() => {
    const seen = new Map();
    (allJurors || []).forEach((j) => {
      if (j.jurorId && !seen.has(j.jurorId)) {
        seen.set(j.jurorId, {
          key: j.jurorId,
          jurorId: j.jurorId,
          name: (j.juryName || "").trim(),
          dept: (j.affiliation || "").trim(),
          finalSubmitted: !!(j.finalSubmittedAt || j.final_submitted_at),
          finalSubmittedAt: j.finalSubmittedAt || j.final_submitted_at || "",
          editEnabled: j.editEnabled || false,
        });
      }
    });
    (rawScores || []).forEach((r) => {
      if (r.jurorId && !seen.has(r.jurorId)) {
        seen.set(r.jurorId, {
          key: r.jurorId,
          jurorId: r.jurorId,
          name: (r.juryName || "").trim(),
          dept: (r.affiliation || "").trim(),
          finalSubmitted: false,
        });
      }
    });
    const scoreKeys = new Set((rawScores || []).map((r) => r.jurorId).filter(Boolean));
    return [...seen.values()]
      .filter((j) => scoreKeys.has(j.jurorId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allJurors, rawScores]);

  // ── Auth gate ─────────────────────────────────────────────
  if (authLoading) return null;

  const loginHandler = async (email, password, rememberMe, captchaToken) => {
    setAuthError("");
    await signIn(email, password, rememberMe, captchaToken);
  };

  if (!user) {
    return (
      <AuthFormErrorBoundary
        fallback={
          <FallbackLoginForm
            onLogin={loginHandler}
            initialEmail={isDemoMode ? DEMO_EMAIL : ""}
            initialPassword={isDemoMode ? DEMO_PASSWORD : ""}
          />
        }
      >
        <Suspense fallback={null}>
          {authPage === "login" && (
            <LazyLoginForm
              onLogin={loginHandler}
              onGoogleLogin={signInWithGoogle}
              onSwitchToRegister={() => navigate("/register")}
              onForgotPassword={() => navigate("/forgot-password")}
              error={authError}
              initialEmail={isDemoMode ? DEMO_EMAIL : ""}
              initialPassword={isDemoMode ? DEMO_PASSWORD : ""}
              onReturnHome={() => navigate("/")}
            />
          )}
          {authPage === "register" && (
            <LazyRegisterForm
              onRegister={signUp}
              onSwitchToLogin={() => navigate("/login")}
            />
          )}
          {authPage === "forgot" && (
            <LazyForgotPasswordForm
              onResetPassword={resetPassword}
              onBackToLogin={() => navigate("/login")}
            />
          )}
          {authPage === "reset" && (
            <LazyResetPasswordForm
              onUpdatePassword={updatePassword}
              onBackToLogin={() => navigate("/login")}
            />
          )}
        </Suspense>
      </AuthFormErrorBoundary>
    );
  }

  if (profileIncomplete) {
    return (
      <AuthFormErrorBoundary>
        <Suspense fallback={null}>
          <LazyCompleteProfileForm
            user={user}
            onComplete={completeProfile}
            onSignOut={signOut}
          />
        </Suspense>
      </AuthFormErrorBoundary>
    );
  }

  if (isPending) {
    return (
      <AuthFormErrorBoundary>
        <Suspense fallback={null}>
          <LazyPendingReviewGate
            user={user}
            onSignOut={signOut}
            onBack={() => {}}
          />
        </Suspense>
      </AuthFormErrorBoundary>
    );
  }

  // Build context to pass to child routes via Outlet
  const adminContext = {
    rawScores,
    summaryData,
    allJurors,
    sortedPeriods,
    loading,
    loadError,
    lastRefresh,
    trendData,
    outcomeTrendData,
    outcomeTrendLoading,
    outcomeTrendError,
    trendPeriodIds,
    setTrendPeriodIds,
    fetchData,
    selectedPeriod,
    selectedPeriodId,
    setSelectedPeriodId,
    criteriaConfig,
    outcomeConfig,
    frameworks,
    reloadFrameworks,
    frameworkThreshold,
    groups,
    matrixJurors,
    activeOrganization,
    settingsDirtyRef,
    onDirtyChange,
    onCurrentSemesterChange,
    navigateTo,
    basePath,
    isDemo,
    isDemoMode,
    scoresView,
  };

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay${mobileOpen ? " show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <AdminSidebar
        currentPage={currentPage}
        basePath={basePath}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className={`admin-main${isDemoMode ? " has-demo-banner" : ""}`}>
        {isDemoMode && (
          <div className="demo-banner">
            <div className="demo-banner-inner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>You&apos;re viewing a <strong>live demo</strong> with sample data.</span>
            </div>
          </div>
        )}
        <AdminHeader
          currentPage={currentPage}
          onMobileMenuOpen={() => setMobileOpen(true)}
          sortedPeriods={sortedPeriods}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={(periodId) => { setSelectedPeriodId(periodId); fetchData(periodId); }}
          onRefresh={fetchData}
          refreshing={loading}
        />

        <div className="admin-content">
          <Outlet context={adminContext} />
        </div>
      </div>
    </div>
  );
}
