// src/App.jsx
// ============================================================
// Root component — manages top-level page routing.
//
// Pages: "home" | "jury" | "admin"
//
// Security: admin password is stored in a useRef (not useState)
// so it is never serialised into the React DevTools component
// tree as readable plaintext. Cleared when leaving admin.
// ============================================================

import { useEffect, useRef, useState } from "react";
import JuryForm   from "./JuryForm";
import AdminPanel from "./AdminPanel";
import { postToSheet } from "./shared/api";
import "./styles/home.css";

import teduLogo from "./assets/tedu-logo.png";

const STORAGE_KEY = "ee492_jury_draft_v1";

export default function App() {
  const [page,          setPage]         = useState("home");
  const adminPassRef    = useRef("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput,    setAdminInput]    = useState("");
  const [draftOwner,    setDraftOwner]    = useState(null);
  const [startAtEval,   setStartAtEval]   = useState(false);

  // Load draft info on mount and whenever we return to home.
  useEffect(() => { refreshDraftInfo(); }, []);

  function refreshDraftInfo() {
    try {
      const raw    = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setDraftOwner(null); return; }
      const saved = JSON.parse(raw);
      if (saved?.step === "eval" && saved?.juryName) {
        setDraftOwner({ name: saved.juryName, dept: saved.juryDept || "" });
      } else {
        setDraftOwner(null);
      }
    } catch (_) {
      setDraftOwner(null);
    }
  }

  // Delete local draft + Sheets data when the user dismisses the banner.
  function handleClearDraft() {
    const owner = draftOwner;
    localStorage.removeItem(STORAGE_KEY);
    setDraftOwner(null);
    if (owner?.name) {
      postToSheet({
        action:   "deleteJurorData",
        juryName: owner.name,
        juryDept: owner.dept || "",
      });
    }
  }

  // Admin login: store password in ref only, clear the input immediately.
  function handleAdminLogin() {
    const pass = adminInput.trim();
    if (!pass) { alert("Please enter the admin password."); return; }
    adminPassRef.current = pass;
    setAdminInput("");
    setAdminUnlocked(true);
  }

  // ── Jury form ─────────────────────────────────────────────
  if (page === "jury") {
    return (
      <JuryForm
        startAtEval={startAtEval}
        onBack={() => {
          setPage("home");
          setStartAtEval(false);
          refreshDraftInfo();
        }}
      />
    );
  }

  // ── Admin panel ───────────────────────────────────────────
  if (page === "admin") {
    if (!adminUnlocked) {
      return (
        <div className="lock-screen">
          <div className="lock-card">
            <div className="lock-icon">🔒</div>
            <h2>Results Panel</h2>
            <p>Enter the admin password to view results</p>
            <input
              type="password"
              placeholder="Password"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); }}
              autoFocus
            />
            <button className="btn-primary" onClick={handleAdminLogin}>Login</button>
            <button className="btn-ghost"   onClick={() => setPage("home")}>← Back</button>
          </div>
        </div>
      );
    }
    return (
      <AdminPanel
        adminPass={adminPassRef.current}
        onBack={() => {
          setPage("home");
          setAdminUnlocked(false);
          adminPassRef.current = "";
        }}
      />
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

        <h1>Senior Project<br />Jury Portal</h1>

        <p className="home-sub">
          TED University <br />
          Dept. of Electrical &amp; Electronics Engineering
        </p>

        {/* Local draft resume banner */}
        {draftOwner && (
          <div className="draft-banner">
            <div className="draft-banner-icon">📝</div>
            <div className="draft-banner-text">
              <strong>Saved draft found</strong>
              <span>
                {draftOwner.name}
                {draftOwner.dept ? ` · ${draftOwner.dept}` : ""}
              </span>
            </div>
            <div className="draft-banner-actions">
              <button
                className="btn-draft-resume"
                onClick={() => { setStartAtEval(true); setPage("jury"); }}
              >
                Resume
              </button>
              <button
                className="btn-draft-clear"
                onClick={handleClearDraft}
                title="Discard draft"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="home-buttons">
          <button
            className="btn-primary big"
            onClick={() => { setStartAtEval(false); setPage("jury"); }}
          >
            <span>📋</span> Evaluation Form
          </button>
          <button className="btn-outline big" onClick={() => setPage("admin")}>
            <span>📊</span> View Results
          </button>
        </div>

        <p className="home-hint">
          <span className="home-hint-ico">ℹ️</span>
          Use the <strong>Evaluation Form</strong> to score each project group.
        </p>

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
        </div>

      </div>
    </div>
  );
}
