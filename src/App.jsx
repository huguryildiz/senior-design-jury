import { useEffect, useState } from "react";
import JuryForm from "./JuryForm";
import AdminPanel from "./AdminPanel";
import "./App.css";

import teduLogo from "./assets/tedu-logo.png";

const STORAGE_KEY = "ee492_jury_draft_v1";

export default function App() {
  const [page, setPage] = useState("home");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);

      // If a draft exists and user was in evaluation step, resume JuryForm
      if (parsed?.step === "eval") {
        setPage("jury");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  if (page === "jury") return <JuryForm onBack={() => setPage("home")} />;

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
              onKeyDown={(e) => {
                if (e.key === "Enter" && adminInput.trim()) setAdminUnlocked(true);
              }}
            />
            <button
              className="btn-primary"
              onClick={() => {
                if (adminInput.trim()) setAdminUnlocked(true);
                else alert("Please enter the admin password.");
              }}
            >
              Login
            </button>
            <button className="btn-ghost" onClick={() => setPage("home")}>
              ← Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <AdminPanel
        adminPass={adminInput}
        onBack={() => {
          setPage("home");
          setAdminUnlocked(false);
          setAdminInput("");
        }}
      />
    );
  }

  return (
    <div className="home">
      <div className="home-bg" />

      <div className="home-card">
        <div className="home-logo-wrap">
          <img className="home-logo" src={teduLogo} alt="TED University Logo" loading="eager" />
        </div>

        <h1>
          EE 491/492
          <br />
          Senior Project Jury Portal
        </h1>
        <p className="home-sub">
          TED University<br />
          Department of Electrical & Electronics Engineering
        </p>

        <div className="home-buttons">
          <button className="btn-primary big" onClick={() => setPage("jury")}>
            <span>📋</span> Evaluation Form
          </button>
          <button className="btn-outline big" onClick={() => setPage("admin")}>
            <span>📊</span> View Results
          </button>
        </div>

        <div className="home-hint">
          <span className="home-hint-ico">ℹ️</span>
          <span>
            Please use the <strong>Evaluation Form</strong> to submit your scores.
          </span>
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
        </div>
      </div>
    </div>
  );
}
