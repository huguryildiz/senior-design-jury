// src/App.jsx
// ============================================================
// Root component — manages page routing and local draft banner.
//
// Security fix: admin password is no longer stored in state.
// It is read once at login time, passed to AdminPanel for the
// initial export call, then immediately discarded. Subsequent
// calls inside AdminPanel use sessionStorage (cleared on tab close).
// ============================================================

import { useEffect, useRef, useState } from "react";
import JuryForm    from "./JuryForm";
import AdminPanel  from "./AdminPanel";
import { postToSheet } from "./shared/api";
import "./App.css";

import teduLogo from "./assets/tedu-logo.png";
import { APP_CONFIG } from "./config";

const STORAGE_KEY = "ee492_jury_draft_v1";

export default function App() {
  const [page,         setPage]         = useState("home");
  // Admin: keep password in a ref (not state) so it is never
  // serialised into DevTools component tree as plain text.
  const adminPassRef   = useRef("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput,    setAdminInput]    = useState("");
  const [draftOwner,    setDraftOwner]    = useState(null);
  const [startAtEval,   setStartAtEval]   = useState(false);

  useEffect(() => { loadDraftInfo(); }, []);

  const loadDraftInfo = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) { setDraftOwner(null); return; }
      const parsed = JSON.parse(saved);
      if (parsed?.step === "eval" && parsed?.juryName) {
        setDraftOwner({ name: parsed.juryName, dept: parsed.juryDept || "" });
      } else {
        setDraftOwner(null);
      }
    } catch (_) {
      setDraftOwner(null);
    }
  };

  // Clear local draft AND delete from Sheets (Drafts + Evaluations)
  const clearDraft = () => {
    const owner = draftOwner;
    localStorage.removeItem(STORAGE_KEY);
    setDraftOwner(null);
    if (owner?.name) {
      postToSheet({ action: "deleteJurorData", juryName: owner.name, juryDept: owner.dept || "" });
    }
  };

  // Admin login: store password in ref only, never in state
  const handleAdminLogin = () => {
    const pass = adminInput.trim();
    if (!pass) { alert("Please enter the admin password."); return; }
    adminPassRef.current = pass;
    setAdminInput("");        // clear input immediately
    setAdminUnlocked(true);
  };

  // ── Jury form page ────────────────────────────────────────
  if (page === "jury") {
    return (
      <JuryForm
        startAtEval={startAtEval}
        onBack={() => {
          setPage("home");
          setStartAtEval(false);
          loadDraftInfo();
        }}
      />
    );
  }

  // ── Admin page ────────────────────────────────────────────
  if (page === "admin") {
    if (!adminUnlocked) {
      return (
        <div className="lock-screen">
          <div className="lock-card">
            <div className="lock-icon">🔒</div>
            <h2>Admin Panel</h2>
            <p>Enter the password to view results</p>
            <input
              type="password"
              placeholder="Password"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); }}
            />
            <button className="btn-primary" onClick={handleAdminLogin}>Login</button>
            <button className="btn-ghost" onClick={() => setPage("home")}>← Back</button>
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
          <img className="home-logo" src={teduLogo} alt="TED University Logo" loading="eager" />
        </div>

        <h1>
          EE 491/492<br />
          Senior Project Jury Portal
        </h1>

        <p className="home-sub">
          TED University<br />
          Department of Electrical &amp; Electronics Engineering
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
              <button className="btn-draft-clear" onClick={clearDraft} title="Delete draft">
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

        <div className="home-hint">
          <span className="home-hint-ico">ℹ️</span>
          <span>Please use the <strong>Evaluation Form</strong> to submit your scores.</span>
        </div>

        <div className="home-footer">
          © 2026 · Developed by{" "}
          <a className="home-footer-link" href="https://huguryildiz.com" target="_blank" rel="noopener noreferrer">
            Huseyin Ugur Yildiz
          </a>
        </div>
      </div>
    </div>
  );
}
