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
// Note: localStorage is NOT used — Sheets is the single source of truth
// are pre-filled, but the banner that bypassed the PIN step
// is gone.
// ============================================================

import { useEffect, useRef, useState } from "react";
import JuryForm   from "./JuryForm";
import AdminPanel from "./AdminPanel";
import { PROJECTS } from "./config";
import {
  ClipboardIcon,
  ChartIcon,
  InfoIcon,
  ClockIcon,
  UsersLucideIcon,
  FolderCheckIcon,
  LockIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "./shared/Icons";
import "./styles/home.css";

import teduLogo from "./assets/tedu-logo.png";

export default function App() {
  const [page,           setPage]          = useState("home");
  const adminPassRef     = useRef("");
  const [adminUnlocked,  setAdminUnlocked]  = useState(false);
  const [adminChecking,  setAdminChecking]  = useState(false);
  const [adminInput,     setAdminInput]     = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminShowPass,  setAdminShowPass]  = useState(false);
  const [homeMeta,       setHomeMeta]       = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("ee492_home_meta") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (page !== "home") return;
    try {
      setHomeMeta(JSON.parse(sessionStorage.getItem("ee492_home_meta") || "null"));
    } catch {
      setHomeMeta(null);
    }
  }, [page]);

  const totalGroups = PROJECTS.length;
  const safeTotalGroups = Number.isFinite(totalGroups) ? Math.max(0, totalGroups) : 0;
  const rawTotalJurors = Number(homeMeta?.totalJurors);
  const rawCompletedJurors = Number(homeMeta?.completedJurors);
  const safeTotalJurors = Number.isFinite(rawTotalJurors) ? Math.max(0, rawTotalJurors) : 0;
  const safeCompletedJurors = Number.isFinite(rawCompletedJurors)
    ? Math.min(Math.max(0, rawCompletedJurors), safeTotalJurors)
    : 0;
  const hasJurorStats = safeTotalJurors > 0;
  const isAllCompleted = hasJurorStats && safeCompletedJurors >= safeTotalJurors;
  const metaTheme = hasJurorStats ? (isAllCompleted ? "completed" : "inprogress") : "empty";

  const lastUpdated = homeMeta?.lastUpdated ? new Date(homeMeta.lastUpdated) : null;
  const hasLastUpdated = !!lastUpdated && Number.isFinite(lastUpdated.getTime());
  const metaDate = hasLastUpdated
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "short",
      }).format(lastUpdated)
    : "—";
  const metaTime = hasLastUpdated
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(lastUpdated)
    : "—";
  const jurorCount = hasJurorStats ? `${safeCompletedJurors}/${safeTotalJurors}` : "—";
  const groupCount = safeTotalGroups > 0 ? String(safeTotalGroups) : "—";

  function handleAdminLogin() {
    const pass = adminInput.trim();
    if (!pass) { setAdminAuthError("Please enter the admin password."); return; }
    adminPassRef.current = pass;
    setAdminInput("");
    setAdminAuthError("");
    setAdminChecking(true);
    setAdminUnlocked(true);
  }

  function handleAuthFail(msg) {
    setAdminUnlocked(false);
    setAdminChecking(false);
    adminPassRef.current = "";
    setAdminAuthError(msg || "Authentication failed.");
  }

  // ── Jury form ─────────────────────────────────────────────
  if (page === "jury") {
    return (
      <JuryForm
        onBack={() => setPage("home")}
      />
    );
  }

  // ── Admin panel ───────────────────────────────────────────
  if (page === "admin") {
    if (!adminUnlocked) {
      return (
        <div className="lock-screen">
          <div className="lock-card">
            <div className="lock-icon" aria-hidden="true"><LockIcon /></div>
            <h2 className="lock-title">Results Panel</h2>
            <p className="lock-subtitle">Enter the admin password to view results</p>
            <div className="lock-input-wrap">
              <input
                type={adminShowPass ? "text" : "password"}
                placeholder="Admin password"
                value={adminInput}
                onChange={(e) => {
                  setAdminInput(e.target.value);
                  if (adminAuthError) setAdminAuthError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); }}
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                className="lock-toggle"
                onClick={() => setAdminShowPass((v) => !v)}
                aria-label={adminShowPass ? "Hide password" : "Show password"}
                title={adminShowPass ? "Hide password" : "Show password"}
              >
                {adminShowPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {adminAuthError && (
              <div className="login-error" role="alert">
                <AlertCircleIcon />
                <span>{adminAuthError}</span>
              </div>
            )}
            <button className="btn-primary lock-login-btn" onClick={handleAdminLogin} disabled={adminChecking}>
              Login
            </button>
            <button className="lock-back-btn" onClick={() => { setPage("home"); setAdminAuthError(""); }}>
              ← Back to Home
            </button>
            <div className="lock-footnote">Admin Access • Restricted</div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Checking… overlay — shown while the first fetch is in flight */}
        {adminChecking && (
          <div className="admin-checking-overlay">
            <div className="admin-checking-card">
              <div className="admin-checking-icon" aria-hidden="true"><Loader2Icon /></div>
              <div className="admin-checking-msg">
                Checking access
                <span className="admin-checking-dots" aria-hidden="true">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </div>
              <div className="admin-checking-sub">Secure session validation in progress</div>
            </div>
          </div>
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
          }}
        />
      </>
    );
  }

  // ── Home page ─────────────────────────────────────────────
  return (
    <div className="home">
      <div className="home-bg" />
      <div className="home-card">

        <div className="home-logo-wrap">
          <img className="home-logo" src={teduLogo} alt="TED University" loading="eager" />
        </div>

        <h1>Senior Project Jury Portal</h1>

        <p className="home-sub">
          TED University <br />
          Dept. of Electrical &amp; Electronics Engineering
        </p>

        <div className="home-meta">
          <span className={`home-meta-pill home-meta-pill--${metaTheme}`}>
            <span className="home-meta-block">
              <span className="home-meta-icon" aria-hidden="true"><UsersLucideIcon /></span>
              <span className="home-meta-value">{jurorCount}</span>
            </span>
            <span className="home-meta-block">
              <span className="home-meta-sep">·</span>
              <span className="home-meta-icon" aria-hidden="true"><FolderCheckIcon /></span>
            <span className="home-meta-value">{groupCount}</span>
            </span>
            <span className="home-meta-block">
              <span className="home-meta-sep">·</span>
              <span className="home-meta-icon" aria-hidden="true"><ClockIcon /></span>
              <span className="home-meta-time">{metaDate}</span>
              <span className="home-meta-sep">·</span>
              <span className="home-meta-time">{metaTime}</span>
            </span>
          </span>
        </div>

        <div className="home-buttons">
          <button
            className="btn-primary big home-primary-btn"
            onClick={() => setPage("jury")}
          >
            <span className="home-btn-icon" aria-hidden="true"><ClipboardIcon /></span>
            Evaluation Form
          </button>
          <button className="btn-outline big home-secondary-btn" onClick={() => setPage("admin")}>
            <span className="home-btn-icon" aria-hidden="true"><ChartIcon /></span>
            View Results
          </button>
        </div>

        <div className="home-info">
          <span className="home-info-icon" aria-hidden="true"><InfoIcon /></span>
          <span>Use the <strong>Evaluation Form</strong> to score each project group.</span>
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
