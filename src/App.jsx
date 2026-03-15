// src/App.jsx
// ============================================================
// Root component — manages top-level page routing.
//
// Pages: "home" | "jury" | "admin"
//
// Security: admin password is stored in a useRef (not useState)
// so it is never serialised into the React DevTools component
// tree as readable plaintext. Cleared when leaving admin.
//
// Home "Resume" banner removed in v5 — draft continuity is now
// handled inside the jury flow after PIN verification.
// Note: sessionStorage is used for admin re-auth within the same tab.
// localStorage is used only for non-sensitive UI state (page, juror_id).
// ============================================================

import { useEffect, useRef, useState } from "react";
import JuryForm      from "./JuryForm";
import AdminPanel    from "./AdminPanel";
import ErrorBoundary from "./shared/ErrorBoundary";
import {
  ClipboardIcon,
  InfoIcon,
  ShieldUserIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
} from "./shared/Icons";
import { adminBootstrapPassword, adminLogin, adminSecurityState } from "./shared/api";
import { initScrollIndicators } from "./shared/scrollIndicators";
import MinimalLoaderOverlay from "./shared/MinimalLoaderOverlay";
import "./styles/home.css";

import teduLogo from "./assets/tedu-logo.png";

export default function App() {
  const ADMIN_PASS_KEY = "ee492_admin_pass";
  const [page,           setPage]          = useState(() => {
    try {
      const saved = localStorage.getItem("tedu_portal_page");
      if (saved === "home" || saved === "jury" || saved === "admin") return saved;
    } catch {}
    return "home";
  });
  const adminPassRef     = useRef("");
  const [adminUnlocked,  setAdminUnlocked]  = useState(false);
  const [adminChecking,  setAdminChecking]  = useState(false);
  const [adminInput,     setAdminInput]     = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminShowPass,  setAdminShowPass]  = useState(false);
  const [adminSetupPass, setAdminSetupPass] = useState("");
  const [adminSetupConfirm, setAdminSetupConfirm] = useState("");
  const [adminSetupError, setAdminSetupError] = useState("");
  const [adminSetupLoading, setAdminSetupLoading] = useState(false);
  const [adminSetupShowPass, setAdminSetupShowPass] = useState(false);
  const [adminSecurityLoading, setAdminSecurityLoading] = useState(false);
  const [adminPasswordSet, setAdminPasswordSet] = useState(null);
  const autoLoginAttemptedRef = useRef(false);
  const autoLoginCancelRef = useRef(null);

  const isStrongPassword = (value) => {
    const v = String(value || "");
    return (
      v.length >= 10
      && /[a-z]/.test(v)
      && /[A-Z]/.test(v)
      && /\d/.test(v)
      && /[^A-Za-z0-9]/.test(v)
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem("tedu_portal_page", page);
    } catch {}
  }, [page]);

  useEffect(() => initScrollIndicators(), []);

  useEffect(() => {
    if (page !== "admin" || adminUnlocked) return;
    let active = true;
    setAdminSecurityLoading(true);
    adminSecurityState()
      .then((state) => {
        if (!active) return;
        setAdminPasswordSet(!!state?.admin_password_set);
      })
      .catch(() => {
        if (!active) return;
        setAdminPasswordSet(true);
        setAdminAuthError("Could not check admin setup. Please try again.");
      })
      .finally(() => {
        if (!active) return;
        setAdminSecurityLoading(false);
      });
    return () => { active = false; };
  }, [page, adminUnlocked]);

  useEffect(() => {
    if (page !== "admin" || adminUnlocked) return;
    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;
    let active = true;
    let didLogin = false;
    autoLoginCancelRef.current = () => { active = false; };
    let saved = "";
    try { saved = sessionStorage.getItem(ADMIN_PASS_KEY) || ""; } catch {}
    if (!saved) return;
    adminLogin(saved)
      .then((valid) => {
        if (!active) return;
        if (valid) {
          adminPassRef.current = saved;
          didLogin = true;
          setAdminChecking(true);
          setAdminUnlocked(true);
          setAdminAuthError("");
          setAdminInput("");
        } else {
          try { sessionStorage.removeItem(ADMIN_PASS_KEY); } catch {}
        }
      })
      .catch((e) => {
        if (!active) return;
        if (e?.adminLocked) return; // locked: let user try manually
        setAdminAuthError("Connection error — try again.");
      })
      .finally(() => {
        if (!active) return;
        if (!didLogin) setAdminChecking(false);
      });
    return () => { active = false; };
  }, [page, adminUnlocked]);
  
  async function handleAdminLogin() {
    const pass = adminInput.trim();
    if (!pass) { setAdminAuthError("Please enter the admin password."); return; }
    setAdminAuthError("");
    setAdminChecking(true);
    try {
      const valid = await adminLogin(pass);
      if (!valid) {
        setAdminAuthError("Invalid password.");
        setAdminChecking(false);
        return;
      }
      adminPassRef.current = pass;
      try { sessionStorage.setItem(ADMIN_PASS_KEY, pass); } catch {}
      setAdminInput("");
      setAdminUnlocked(true);
    } catch (e) {
      if (e?.adminLocked) {
        const t = e.lockedUntil
          ? new Date(e.lockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        setAdminAuthError(`Too many failed attempts. Try again after ${t}.`);
      } else {
        setAdminAuthError("Connection error — try again.");
      }
      setAdminChecking(false);
    }
  }

  async function handleAdminSetup() {
    const pass = adminSetupPass.trim();
    const confirm = adminSetupConfirm.trim();
    if (!pass) {
      setAdminSetupError("Admin password is required.");
      return;
    }
    if (!isStrongPassword(pass)) {
      setAdminSetupError("Use at least 10 characters, including an uppercase letter (A-Z), a lowercase letter (a-z), a number (0-9), and a symbol (e.g. !@#$%^&*).");
      return;
    }
    if (pass !== confirm) {
      setAdminSetupError("Passwords do not match.");
      return;
    }
    setAdminSetupError("");
    setAdminSetupLoading(true);
    try {
      await adminBootstrapPassword(pass);
      adminPassRef.current = pass;
      try { sessionStorage.setItem(ADMIN_PASS_KEY, pass); } catch {}
      setAdminSetupPass("");
      setAdminSetupConfirm("");
      setAdminPasswordSet(true);
      setAdminChecking(true);
      setAdminUnlocked(true);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("already_initialized")) {
        setAdminPasswordSet(true);
        setAdminSetupError("Admin password is already set. Please log in.");
      } else {
        setAdminSetupError("Could not set admin password. Please try again.");
      }
    } finally {
      setAdminSetupLoading(false);
    }
  }

  function handleAuthFail(msg) {
    setAdminUnlocked(false);
    setAdminChecking(false);
    adminPassRef.current = "";
    try { sessionStorage.removeItem(ADMIN_PASS_KEY); } catch {}
    setAdminAuthError(msg || "Authentication failed.");
  }

  

  // ── Jury form ─────────────────────────────────────────────
  if (page === "jury") {
    return (
      <ErrorBoundary>
        <div id="main-content">
          <JuryForm
            onBack={() => setPage("home")}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Admin panel ───────────────────────────────────────────
  if (page === "admin") {
    if (!adminUnlocked) {
      if (adminPasswordSet === false) {
        return (
          <div className="premium-screen">
            <div className="premium-card">
              <div className="premium-header">
                <div className="premium-icon-square" aria-hidden="true"><ShieldUserIcon /></div>
                <div className="premium-title">Admin Setup</div>
                <div className="premium-subtitle">
                  Create the admin password to enable secure access.
                </div>
              </div>
              <div className="premium-input-wrap">
                <input
                  type={adminSetupShowPass ? "text" : "password"}
                  placeholder="New admin password"
                  value={adminSetupPass}
                  onChange={(e) => {
                    setAdminSetupPass(e.target.value);
                    if (adminSetupError) setAdminSetupError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdminSetup(); }}
                  autoComplete="new-password"
                  autoFocus
                  className="premium-input"
                  disabled={adminSetupLoading || adminSecurityLoading}
                />
              </div>
              <div className="premium-input-wrap">
                <input
                  type={adminSetupShowPass ? "text" : "password"}
                  placeholder="Confirm admin password"
                  value={adminSetupConfirm}
                  onChange={(e) => {
                    setAdminSetupConfirm(e.target.value);
                    if (adminSetupError) setAdminSetupError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdminSetup(); }}
                  autoComplete="new-password"
                  className="premium-input"
                  disabled={adminSetupLoading || adminSecurityLoading}
                />
                <button
                  type="button"
                  className="premium-input-toggle"
                  onClick={() => setAdminSetupShowPass((v) => !v)}
                  aria-label={adminSetupShowPass ? "Hide password" : "Show password"}
                  title={adminSetupShowPass ? "Hide password" : "Show password"}
                >
                  {adminSetupShowPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {adminSetupError && (
                <div className="premium-error-banner is-critical" role="alert">
                  <AlertCircleIcon />
                  <span>{adminSetupError}</span>
                </div>
              )}
              <button
                className="premium-btn-primary"
                onClick={handleAdminSetup}
                disabled={adminSetupLoading || adminSecurityLoading}
              >
                {adminSetupLoading ? "Setting..." : "Set Admin Password"}
              </button>
              <button
                className="premium-btn-link"
                onClick={() => { setPage("home"); setAdminAuthError(""); }}
              >
                ← Return Home
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="premium-screen">
          <div className="premium-card">
            <div className="premium-header">
              <div className="premium-icon-square" aria-hidden="true"><ShieldUserIcon /></div>
              <div className="premium-title">Admin Panel</div>
              <div className="premium-subtitle">Enter admin password to continue.</div>
            </div>
            <div className="premium-input-wrap">
              <input
                type={adminShowPass ? "text" : "password"}
                placeholder="Enter password"
                value={adminInput}
                onChange={(e) => {
                  setAdminInput(e.target.value);
                  if (adminAuthError) setAdminAuthError("");
                  if (autoLoginCancelRef.current) {
                    autoLoginCancelRef.current();
                    autoLoginCancelRef.current = null;
                  }
                  if (adminChecking) setAdminChecking(false);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); }}
                autoComplete="current-password"
                autoFocus
                className="premium-input"
                disabled={adminSecurityLoading || adminPasswordSet === null}
              />
              <button
                type="button"
                className="premium-input-toggle"
                onClick={() => setAdminShowPass((v) => !v)}
                aria-label={adminShowPass ? "Hide password" : "Show password"}
                title={adminShowPass ? "Hide password" : "Show password"}
              >
                {adminShowPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {adminAuthError && (
              <div className="premium-error-banner is-critical" role="alert">
                <AlertCircleIcon />
                <span>{adminAuthError}</span>
              </div>
            )}
            <button
              className="premium-btn-primary"
              onClick={handleAdminLogin}
              disabled={adminChecking || adminSecurityLoading || adminPasswordSet === null}
            >
              Log In
            </button>
            <button className="premium-btn-link" onClick={() => { setPage("home"); setAdminAuthError(""); }}>
              ← Return Home
            </button>
          
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <div id="main-content">
          {/* Checking… overlay — shown while the first fetch is in flight */}
          {adminChecking && (
            <MinimalLoaderOverlay open={adminChecking} minDuration={400} />
          )}
          <AdminPanel
            adminPass={adminPassRef.current}
            onAuthError={handleAuthFail}
            onInitialLoadDone={() => setAdminChecking(false)}
            onBack={() => {
              setPage("home");
              setAdminUnlocked(false);
              setAdminChecking(false);
              setAdminAuthError("");
              adminPassRef.current = "";
              try { sessionStorage.removeItem(ADMIN_PASS_KEY); } catch {}
            }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Home page ─────────────────────────────────────────────
  return (
    <div id="main-content" className="home">
      <div className="home-bg" />
      <div className="home-card">

        <div className="home-logo-wrap">
          <img className="home-logo" src={teduLogo} alt="TED University" loading="eager" />
        </div>

        <h1>Senior Project Poster Day Jury Portal</h1>

        <p className="home-sub">
          TED University <br/> Dept. of Electrical and Electronics Engineering
        </p>

        <div className="home-buttons">
          <button
            className="btn-primary big home-primary-btn"
            onClick={() => setPage("jury")}
          >
            <span className="home-btn-icon" aria-hidden="true"><ClipboardIcon /></span>
            Start Evaluation
          </button>
          <button className="btn-outline big home-secondary-btn" onClick={() => setPage("admin")}>
            <span className="home-btn-icon" aria-hidden="true"><ShieldUserIcon /></span>
            Admin Panel
          </button>
        </div>

        <div className="home-footer">
          © 2026 · Developed by{" "}
          <a
            className="home-footer-link"
            href="https://huguryildiz.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Huseyin Ugur Yildiz
          </a>
          {" "}· v1.0
        </div>

      </div>
    </div>
  );
}
