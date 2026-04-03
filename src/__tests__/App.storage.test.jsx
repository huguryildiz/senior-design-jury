// src/__tests__/App.storage.test.jsx
// ============================================================
// Phase A safety tests — locks the App.jsx page resume/storage flow.
//
// Covers:
//   phaseA.app.01 — URL ?t= token routes to jury_gate
//   phaseA.app.02 — localStorage page restoration ("admin")
//   phaseA.app.03 — jury_gate is never written to localStorage
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { qaTest } from "../test/qaTest.js";

// ── Heavy mocks (all before any import of App) ────────────────
vi.mock("../jury/JuryFlow", () => ({ default: () => <div data-testid="jury-flow" /> }));
vi.mock("../AdminPanel", () => ({ default: () => <div data-testid="admin-panel" /> }));
vi.mock("../admin/layout/AdminLayout", () => ({ default: () => <div data-testid="admin-layout" /> }));
vi.mock("../jury/JuryGatePage", () => ({ default: () => <div data-testid="jury-gate" /> }));
vi.mock("../pages/LandingPage", () => ({
  LandingPage: ({ onAdmin }) => (
    <div data-testid="landing-page">
      <button onClick={onAdmin}>Admin Panel</button>
    </div>
  ),
}));
vi.mock("../shared/api", () => ({
  adminSecurityState: vi.fn().mockResolvedValue({ admin_password_set: true }),
  adminLogin: vi.fn().mockResolvedValue(false),
  adminBootstrapPassword: vi.fn(),
  submitAdminApplication: vi.fn(),
  listTenantsPublic: vi.fn().mockResolvedValue([]),
  getMyApplications: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));
vi.mock("../shared/scrollIndicators", () => ({ initScrollIndicators: () => () => {} }));
vi.mock("../shared/MinimalLoaderOverlay", () => ({ default: () => null }));
vi.mock("@/auth/screens/LoginScreen", () => ({
  default: ({ onLogin, onSwitchToRegister }) => (
    <div data-testid="login-form">
      <button onClick={onSwitchToRegister}>Apply for access</button>
      <button onClick={() => onLogin("test@test.com", "pass")}>Sign In</button>
    </div>
  ),
}));
vi.mock("@/auth/screens/ForgotPasswordScreen", () => ({ default: () => <div data-testid="forgot-form" /> }));
vi.mock("@/auth/screens/RegisterScreen", () => ({ default: () => <div data-testid="register-form" /> }));
vi.mock("@/auth/screens/PendingReviewScreen", () => ({ default: () => <div data-testid="pending-gate" /> }));
vi.mock("@/auth", () => ({
  AuthProvider: ({ children }) => children,
}));
// shared/Icons exports plain React SVG components — no mock needed.

// Import App AFTER all mocks are declared
import App from "../App";

// ── Helpers ───────────────────────────────────────────────────

/**
 * Override window.location.search and window.location.pathname for the
 * duration of a test, then restore afterwards.
 */
function mockLocation({ search = "", pathname = "/" } = {}) {
  const originalLocation = window.location;
  delete window.location;
  window.location = {
    ...originalLocation,
    search,
    pathname,
  };
  return () => {
    window.location = originalLocation;
  };
}

// ── Test suite ────────────────────────────────────────────────

describe("App page resume / storage flow", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  qaTest("phaseA.app.01", async () => {
    const restore = mockLocation({ search: "?t=abc123", pathname: "/" });
    try {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId("jury-gate")).toBeInTheDocument();
      });
    } finally {
      restore();
    }
  });

  qaTest("phaseA.app.02", () => {
    localStorage.setItem("vera_portal_page", "admin");
    const restore = mockLocation({ search: "", pathname: "/" });
    try {
      render(<App />);
      // page === "admin" restores from localStorage — AdminLayout should render.
      expect(screen.getByTestId("admin-layout")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  qaTest("phaseA.app.03", () => {
    const restore = mockLocation({ search: "?t=abc", pathname: "/" });
    try {
      render(<App />);
      // App is on jury_gate. The persistence useEffect must not write "jury_gate".
      const stored = localStorage.getItem("vera_portal_page");
      expect(stored).not.toBe("jury_gate");
    } finally {
      restore();
    }
  });

  it("does not route to email review page when URL has ?token", async () => {
    const restore = mockLocation({ search: "?token=abc123", pathname: "/" });
    try {
      render(<App />);
      await waitFor(() => {
        expect(screen.queryByTestId("jury-gate")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /admin panel/i })).toBeInTheDocument();
      });
    } finally {
      restore();
    }
  });
});
