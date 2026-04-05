// src/App.jsx — Phase 14
// Clean route switch: home | jury_gate | jury | admin
// AuthProvider + ThemeProvider live in main.jsx.
import { lazy, Suspense, useEffect, useState } from "react";
import AdminLayout from "./admin/layout/AdminLayout";
import JuryFlow from "./jury/JuryFlow";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";
import { getPage, setPage as savePage, getJuryAccess } from "./shared/storage";
import DemoAdminLoader from "@/shared/ui/DemoAdminLoader";
import { DEMO_MODE } from "@/shared/lib/demoMode";
import { setEnvironment, clearEnvironment } from "@/shared/lib/environment";
import { useAuth } from "./auth/useAuth";
import { getMaintenanceStatus } from "./shared/api/admin/maintenance";
import MaintenancePage from "./components/MaintenancePage";

const LandingPage = lazy(() =>
  import("./landing/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const JuryGatePage = lazy(() => import("./jury/JuryGatePage"));

const DEMO_ENTRY_TOKEN = import.meta.env.VITE_DEMO_ENTRY_TOKEN;

function readInitialPage() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("demo-jury")) { setEnvironment("demo"); return "jury"; }
    if (params.get("eval") || params.get("t")) return "jury_gate";
    if (params.has("explore")) { setEnvironment("demo"); return "demo_login"; }
    if (params.has("admin")) return "admin";
    const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    const isRecovery =
      hash.get("type") === "recovery" ||
      params.get("type") === "recovery" ||
      params.get("page") === "reset-password";
    if (isRecovery) return "admin";
    if (getJuryAccess()) return "jury";
    const saved = getPage();
    if (saved === "jury" || saved === "admin") return saved;
  } catch {}
  return "home";
}

function readToken() {
  try {
    return (
      new URLSearchParams(window.location.search).get("t") ||
      (DEMO_MODE ? DEMO_ENTRY_TOKEN : null)
    );
  } catch {
    return null;
  }
}

export default function App() {
  const [page, setPage] = useState(readInitialPage);
  const token = readToken();
  const { user, isSuper, loading: authLoading } = useAuth();

  // Track whether we've ever had a logged-in user this session.
  // Only redirect to home if auth was previously established and then cleared
  // (i.e. logout), not when navigating to /admin without a session yet.
  const [hadUser, setHadUser] = useState(false);
  useEffect(() => {
    if (user) setHadUser(true);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user && hadUser && page === "admin") {
      setHadUser(false);
      setPage("home");
    }
  }, [user, authLoading, hadUser, page]);
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    if (DEMO_MODE) return;
    getMaintenanceStatus()
      .then(setMaintenance)
      .catch(() => {}); // silently ignore — never block the app on this
  }, []);

  useEffect(() => {
    if (page === "jury_gate") return;
    if (page === "home") {
      // Clear demo env when navigating back to landing (SPA navigation, no reload).
      // environment.js already clears it on fresh page loads without demo params.
      clearEnvironment();
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }
    if (DEMO_MODE) return;
    savePage(page);
  }, [page]);

  // Maintenance gate — super admins pass through; everyone else sees the page.
  // Wait for auth to resolve so super admins don't briefly see the gate.
  if (maintenance?.is_active && !DEMO_MODE) {
    if (authLoading) return null;
    if (!isSuper) {
      return <MaintenancePage message={maintenance.message} endTime={maintenance.end_time} />;
    }
  }

  if (page === "jury_gate") {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <JuryGatePage
            token={token}
            onGranted={() => setPage("jury")}
            onBack={() => setPage("home")}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (page === "jury") {
    return (
      <ErrorBoundary>
        <JuryFlow onBack={() => setPage("home")} />
      </ErrorBoundary>
    );
  }

  if (page === "admin") return <AdminLayout onReturnHome={() => setPage("home")} />;

  if (page === "demo_login") {
    return <DemoAdminLoader onComplete={() => setPage("admin")} />;
  }

  return (
    <Suspense fallback={null}>
      <LandingPage
        onStartJury={() => { setEnvironment("demo"); window.location.href = window.location.origin + "?demo-jury"; }}
        onAdmin={() => { setEnvironment("demo"); window.location.href = window.location.origin + "?explore"; }}
        onSignIn={() => { setEnvironment("prod"); setPage("admin"); }}
        isDemoMode={DEMO_MODE}
      />
    </Suspense>
  );
}
