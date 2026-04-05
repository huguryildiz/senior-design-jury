// src/admin/layout/AdminLayout.jsx — Phase 2
// Wires useAuth + useAdminData. Renders OverviewPage when adminTab === "overview".
// Period dropdown in AdminHeader is now fully live.
import { lazy, Suspense, useRef, useMemo, useState, useEffect, useCallback, Component } from "react";
import { useAuth } from "@/auth";
import { useAdminTabs } from "../hooks/useAdminTabs";
import { useAdminData } from "../hooks/useAdminData";
import { useGlobalTableSort } from "../hooks/useGlobalTableSort";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import OverviewPage from "../pages/OverviewPage";
import RankingsPage from "../pages/RankingsPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import HeatmapPage from "../pages/HeatmapPage";
import ReviewsPage from "../pages/ReviewsPage";
import JurorsPage from "../pages/JurorsPage";
import ProjectsPage from "../pages/ProjectsPage";
import PeriodsPage from "../pages/PeriodsPage";
import EntryControlPage from "../pages/EntryControlPage";
import PinBlockingPage from "../pages/PinBlockingPage";
import AuditLogPage from "../pages/AuditLogPage";
import SettingsPage from "../pages/SettingsPage";
import ExportPage from "../pages/ExportPage";
import CriteriaPage from "../pages/CriteriaPage";
import OutcomesPage from "../pages/OutcomesPage";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

const LazyLoginForm            = lazy(() => import("@/auth/screens/LoginScreen"));
const LazyRegisterForm         = lazy(() => import("@/auth/screens/RegisterScreen"));
const LazyForgotPasswordForm   = lazy(() => import("@/auth/screens/ForgotPasswordScreen"));
const LazyResetPasswordForm    = lazy(() => import("@/auth/screens/ResetPasswordScreen"));
const LazyCompleteProfileForm  = lazy(() => import("@/auth/screens/CompleteProfileScreen"));
const LazyPendingReviewGate    = lazy(() => import("@/auth/screens/PendingReviewScreen"));

const DEMO_EMAIL    = import.meta.env.VITE_DEMO_ADMIN_EMAIL    || "";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "";

// ── Fallback login form (no UI library deps) ──────────────────
// Used when the fancy auth forms fail to load (e.g. Phase 12 not done yet).
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

import { DEMO_MODE as isDemoMode } from "@/shared/lib/demoMode";

export default function AdminLayout({ onReturnHome }) {
  useGlobalTableSort();

  const settingsDirtyRef = useRef(false);
  const { adminTab, setAdminTab, scoresView, switchScoresView } = useAdminTabs({
    settingsDirtyRef,
    isDemoMode,
  });

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

  // Fetch criteria + outcomes from snapshot tables (not from period row)
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
        const { listPeriodCriteria, listPeriodOutcomes, listFrameworks } = await import("../../shared/api");
        const { getActiveCriteria } = await import("../../shared/criteria/criteriaHelpers");
        const [criteriaRows, outcomeRows, frameworkRows] = await Promise.all([
          listPeriodCriteria(selectedPeriodId),
          listPeriodOutcomes(selectedPeriodId),
          listFrameworks(activeOrganization.id),
        ]);
        if (!alive) return;
        // Fall back to JSONB criteria_config on the period row for periods
        // created before the period_criteria snapshot table was introduced.
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
      const { listFrameworks } = await import("../../shared/api");
      const rows = await listFrameworks(activeOrganization.id);
      setFrameworks(rows);
    } catch {}
  }, [activeOrganization?.id]);

  const frameworkThreshold = frameworks[0]?.default_threshold ?? 70;

  // Groups derived from project summaries (used by HeatmapPage)
  const groups = useMemo(
    () =>
      (summaryData || [])
        .map((p) => ({ id: p.id, group_no: p.group_no, title: p.title ?? "", members: p.members ?? "" }))
        .sort((a, b) => (a.group_no ?? 0) - (b.group_no ?? 0)),
    [summaryData]
  );

  // Jurors with key field matching lookup (used by HeatmapPage)
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

  function handleNavigate(tab) {
    setAdminTab(tab);
  }

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
              onSwitchToRegister={() => setAuthPage("register")}
              onForgotPassword={() => setAuthPage("forgot")}
              error={authError}
              initialEmail={isDemoMode ? DEMO_EMAIL : ""}
              initialPassword={isDemoMode ? DEMO_PASSWORD : ""}
              onReturnHome={onReturnHome}
            />
          )}
          {authPage === "register" && (
            <LazyRegisterForm
              onRegister={signUp}
              onSwitchToLogin={() => setAuthPage("login")}
            />
          )}
          {authPage === "forgot" && (
            <LazyForgotPasswordForm
              onResetPassword={resetPassword}
              onBackToLogin={() => setAuthPage("login")}
            />
          )}
          {authPage === "reset" && (
            <LazyResetPasswordForm
              onUpdatePassword={updatePassword}
              onBackToLogin={() => setAuthPage("login")}
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

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay${mobileOpen ? " show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <AdminSidebar
        adminTab={adminTab}
        scoresView={scoresView}
        setAdminTab={setAdminTab}
        switchScoresView={switchScoresView}
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
          adminTab={adminTab}
          scoresView={scoresView}
          onMobileMenuOpen={() => setMobileOpen(true)}
          sortedPeriods={sortedPeriods}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={(periodId) => { setSelectedPeriodId(periodId); fetchData(periodId); }}
          onRefresh={fetchData}
          refreshing={loading}
        />

        <div className="admin-content">
          {adminTab === "overview" && (
            <OverviewPage
              rawScores={rawScores}
              summaryData={summaryData}
              allJurors={allJurors}
              selectedPeriod={selectedPeriod}
              criteriaConfig={criteriaConfig}
              loading={loading}
              onNavigate={handleNavigate}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "scores" && scoresView === "rankings" && (
            <RankingsPage
              summaryData={summaryData}
              rawScores={rawScores}
              allJurors={allJurors}
              selectedPeriod={selectedPeriod}
              criteriaConfig={criteriaConfig}
              loading={loading}
            />
          )}
          {adminTab === "scores" && scoresView === "analytics" && (
            <AnalyticsPage
              dashboardStats={summaryData}
              submittedData={rawScores}
              loading={loading}
              error={loadError}
              periodName={selectedPeriod?.name || selectedPeriod?.semester_name || ""}
              selectedPeriodId={selectedPeriodId}
              lastRefresh={lastRefresh}
              semesterOptions={sortedPeriods}
              trendSemesterIds={trendPeriodIds}
              onTrendSelectionChange={setTrendPeriodIds}
              trendData={trendData}
              outcomeTrendData={outcomeTrendData}
              outcomeTrendLoading={outcomeTrendLoading}
              outcomeTrendError={outcomeTrendError}
              criteriaConfig={criteriaConfig}
              outcomeConfig={outcomeConfig}
              threshold={frameworkThreshold}
            />
          )}
          {adminTab === "scores" && scoresView === "grid" && (
            <HeatmapPage
              data={rawScores}
              jurors={matrixJurors}
              groups={groups}
              periodName={selectedPeriod?.name || selectedPeriod?.semester_name || selectedPeriod?.period_name || ""}
              organization={activeOrganization?.name || ""}
              criteriaConfig={criteriaConfig}
            />
          )}
          {adminTab === "scores" && scoresView === "details" && (
            <ReviewsPage
              data={rawScores}
              jurors={allJurors}
              assignedJurors={matrixJurors}
              groups={groups}
              periodName={selectedPeriod?.name || selectedPeriod?.semester_name || selectedPeriod?.period_name || ""}
              summaryData={summaryData}
              criteriaConfig={criteriaConfig}
              loading={loading}
            />
          )}
          {adminTab === "jurors" && (
            <JurorsPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onCurrentSemesterChange={(periodId) => {
                setSelectedPeriodId(periodId);
                fetchData();
              }}
              onViewReviews={() => {
                setAdminTab("scores");
                switchScoresView("details");
              }}
            />
          )}
          {adminTab === "projects" && (
            <ProjectsPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onCurrentSemesterChange={(periodId) => {
                setSelectedPeriodId(periodId);
                fetchData();
              }}
            />
          )}
          {adminTab === "periods" && (
            <PeriodsPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onCurrentSemesterChange={(periodId) => {
                setSelectedPeriodId(periodId);
                fetchData();
              }}
            />
          )}
          {adminTab === "entry-control" && (
            <EntryControlPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              selectedPeriod={selectedPeriod}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "pin-lock" && (
            <PinBlockingPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
            />
          )}
          {adminTab === "audit-log" && (
            <AuditLogPage
              organizationId={activeOrganization?.id}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "settings" && (
            <SettingsPage
              organizationId={activeOrganization?.id}
            />
          )}
          {adminTab === "export" && (
            <ExportPage
              organizationId={activeOrganization?.id}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "criteria" && (
            <CriteriaPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "outcomes" && (
            <OutcomesPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              frameworks={frameworks}
              onFrameworksChange={reloadFrameworks}
            />
          )}
        </div>
      </div>
    </div>
  );
}
