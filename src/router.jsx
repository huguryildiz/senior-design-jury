// src/router.jsx
// ============================================================
// Central route definitions for VERA — React Router v6.
// Environment is determined purely by pathname:
//   /demo/* → demo Supabase
//   everything else → prod Supabase
// ============================================================

import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import RootLayout from "./layouts/RootLayout";
import AdminRouteLayout from "./layouts/AdminRouteLayout";
import DemoLayout from "./layouts/DemoLayout";
import AuthRouteLayout from "./layouts/AuthRouteLayout";
import JuryGuard from "./guards/JuryGuard";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";

// ── Lazy-loaded page components ───────────────────────────────

const LandingPage = lazy(() =>
  import("./landing/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const JuryGatePage = lazy(() => import("./jury/JuryGatePage"));
const JuryFlow = lazy(() => import("./jury/JuryFlow"));
const DemoAdminLoader = lazy(() => import("@/shared/ui/DemoAdminLoader"));

// Auth screens (standalone routes)
const LoginScreen = lazy(() => import("@/auth/screens/LoginScreen"));
const RegisterScreen = lazy(() => import("@/auth/screens/RegisterScreen"));
const ForgotPasswordScreen = lazy(() => import("@/auth/screens/ForgotPasswordScreen"));
const ResetPasswordScreen = lazy(() => import("@/auth/screens/ResetPasswordScreen"));
const InviteAcceptScreen = lazy(() => import("@/auth/screens/InviteAcceptScreen"));

// Admin pages
const OverviewPage = lazy(() => import("@/admin/pages/OverviewPage"));
const SetupWizardPage = lazy(() => import("@/admin/pages/SetupWizardPage"));
const RankingsPage = lazy(() => import("@/admin/pages/RankingsPage"));
const AnalyticsPage = lazy(() => import("@/admin/pages/AnalyticsPage"));
const HeatmapPage = lazy(() => import("@/admin/pages/HeatmapPage"));
const ReviewsPage = lazy(() => import("@/admin/pages/ReviewsPage"));
const JurorsPage = lazy(() => import("@/admin/pages/JurorsPage"));
const ProjectsPage = lazy(() => import("@/admin/pages/ProjectsPage"));
const PeriodsPage = lazy(() => import("@/admin/pages/PeriodsPage"));
const CriteriaPage = lazy(() => import("@/admin/pages/CriteriaPage"));
const OutcomesPage = lazy(() => import("@/admin/pages/OutcomesPage"));
const EntryControlPage = lazy(() => import("@/admin/pages/EntryControlPage"));
const PinBlockingPage = lazy(() => import("@/admin/pages/PinBlockingPage"));
const AuditLogPage = lazy(() => import("@/admin/pages/AuditLogPage"));
const OrganizationsPage = lazy(() => import("@/admin/pages/OrganizationsPage"));
const UnlockRequestsPage = lazy(() => import("@/admin/pages/UnlockRequestsPage"));
const SettingsPage = lazy(() => import("@/admin/pages/SettingsPage"));

// ── Suspense wrapper ──────────────────────────────────────────
function SuspenseWrap({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

// ── Jury flow child routes (shared between /jury and /demo/jury) ─
const juryFlowRoute = {
  element: (
    <ErrorBoundary>
      <SuspenseWrap><JuryFlow /></SuspenseWrap>
    </ErrorBoundary>
  ),
  children: [
    { index: true, element: <Navigate to="identity" replace /> },
    { path: "identity",   element: null },
    { path: "period",     element: null },
    { path: "pin",        element: null },
    { path: "pin-reveal", element: null },
    { path: "locked",     element: null },
    { path: "progress",   element: null },
    { path: "evaluate",   element: null },
    { path: "complete",   element: null },
  ],
};

// ── Admin child routes (shared between /admin and /demo/admin) ─
const adminChildRoutes = [
  { index: true, element: <Navigate to="overview" replace /> },
  { path: "overview",      element: <SuspenseWrap><OverviewPage /></SuspenseWrap> },
  { path: "setup",         element: <SuspenseWrap><SetupWizardPage /></SuspenseWrap> },
  { path: "rankings",      element: <SuspenseWrap><RankingsPage /></SuspenseWrap> },
  { path: "analytics",     element: <SuspenseWrap><AnalyticsPage /></SuspenseWrap> },
  { path: "heatmap",       element: <SuspenseWrap><HeatmapPage /></SuspenseWrap> },
  { path: "reviews",       element: <SuspenseWrap><ReviewsPage /></SuspenseWrap> },
  { path: "jurors",        element: <SuspenseWrap><JurorsPage /></SuspenseWrap> },
  { path: "projects",      element: <SuspenseWrap><ProjectsPage /></SuspenseWrap> },
  { path: "periods",       element: <SuspenseWrap><PeriodsPage /></SuspenseWrap> },
  { path: "criteria",      element: <SuspenseWrap><CriteriaPage /></SuspenseWrap> },
  { path: "outcomes",      element: <SuspenseWrap><OutcomesPage /></SuspenseWrap> },
  { path: "entry-control", element: <SuspenseWrap><EntryControlPage /></SuspenseWrap> },
  { path: "pin-blocking",  element: <SuspenseWrap><PinBlockingPage /></SuspenseWrap> },
  { path: "audit-log",     element: <SuspenseWrap><AuditLogPage /></SuspenseWrap> },
  { path: "organizations",    element: <SuspenseWrap><OrganizationsPage /></SuspenseWrap> },
  { path: "unlock-requests",  element: <SuspenseWrap><UnlockRequestsPage /></SuspenseWrap> },
  { path: "settings",         element: <SuspenseWrap><SettingsPage /></SuspenseWrap> },
];

// ── Router ────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Landing
      {
        path: "/",
        element: <SuspenseWrap><LandingPage /></SuspenseWrap>,
      },

      // Auth routes (standalone, always prod)
      {
        element: <AuthRouteLayout />,
        children: [
          { path: "/login",           element: <SuspenseWrap><LoginScreen /></SuspenseWrap> },
          { path: "/register",        element: <SuspenseWrap><RegisterScreen /></SuspenseWrap> },
          { path: "/forgot-password", element: <SuspenseWrap><ForgotPasswordScreen /></SuspenseWrap> },
          { path: "/reset-password",  element: <SuspenseWrap><ResetPasswordScreen /></SuspenseWrap> },
          { path: "/invite/accept",   element: <SuspenseWrap><InviteAcceptScreen /></SuspenseWrap> },
        ],
      },

      // Prod jury gate
      {
        path: "/eval",
        element: (
          <ErrorBoundary>
            <SuspenseWrap><JuryGatePage /></SuspenseWrap>
          </ErrorBoundary>
        ),
      },

      // Prod jury flow (guarded by jury session)
      {
        path: "/jury",
        element: <JuryGuard />,
        children: [juryFlowRoute],
      },

      // Prod admin panel
      {
        path: "/admin",
        element: <AdminRouteLayout />,
        children: adminChildRoutes,
      },

      // ── Demo namespace (/demo/*) ──────────────────────────────
      // Everything under /demo uses the demo Supabase instance.
      {
        path: "/demo",
        element: <DemoLayout />,
        children: [
          // /demo → DemoAdminLoader (auto-login → /demo/admin)
          {
            index: true,
            element: <SuspenseWrap><DemoAdminLoader /></SuspenseWrap>,
          },
          // /demo/login, /demo/register, etc. — auth screens against demo DB
          {
            path: "login",           element: <SuspenseWrap><LoginScreen /></SuspenseWrap>,
          },
          {
            path: "register",        element: <SuspenseWrap><RegisterScreen /></SuspenseWrap>,
          },
          {
            path: "forgot-password", element: <SuspenseWrap><ForgotPasswordScreen /></SuspenseWrap>,
          },
          {
            path: "reset-password",  element: <SuspenseWrap><ResetPasswordScreen /></SuspenseWrap>,
          },
          {
            path: "invite/accept",   element: <SuspenseWrap><InviteAcceptScreen /></SuspenseWrap>,
          },
          // /demo/eval → jury gate (demo DB)
          {
            path: "eval",
            element: (
              <ErrorBoundary>
                <SuspenseWrap><JuryGatePage /></SuspenseWrap>
              </ErrorBoundary>
            ),
          },
          // /demo/jury/* → jury flow (demo DB, guarded)
          {
            path: "jury",
            element: <JuryGuard />,
            children: [juryFlowRoute],
          },
          // /demo/admin/* → admin panel (demo DB)
          {
            path: "admin",
            element: <AdminRouteLayout />,
            children: adminChildRoutes,
          },
        ],
      },

      // Legacy redirects
      { path: "/jury-entry", element: <Navigate to="/jury" replace /> },

      // Catch-all → landing
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
