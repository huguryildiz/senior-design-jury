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

const LandingPage = lazy(() =>
  import("./landing/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const JuryGatePage = lazy(() => import("./jury/JuryGatePage"));

const DEMO_ENTRY_TOKEN = import.meta.env.VITE_DEMO_ENTRY_TOKEN;

function readInitialPage() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("eval")) return "jury_gate";
    if (params.has("explore")) return "demo_login";
    if (params.has("admin")) return "admin";
    const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    const isRecovery =
      hash.get("type") === "recovery" ||
      params.get("type") === "recovery" ||
      params.get("page") === "reset-password";
    if (isRecovery) return "admin";
    if (getJuryAccess()) return "jury";
    const saved = getPage();
    if (saved === "jury") return saved;
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

  useEffect(() => {
    if (page === "jury_gate") return;
    savePage(page);
    // Clean URL params when returning to landing page
    if (page === "home" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [page]);

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

  if (page === "admin") return <AdminLayout />;

  if (page === "demo_login") {
    return <DemoAdminLoader onComplete={() => setPage("admin")} />;
  }

  return (
    <Suspense fallback={null}>
      <LandingPage
        onStartJury={() => setPage("jury_gate")}
        onAdmin={() => { window.location.href = window.location.origin + "?explore"; }}
        onSignIn={() => setPage("admin")}
        isDemoMode={DEMO_MODE}
      />
    </Suspense>
  );
}
