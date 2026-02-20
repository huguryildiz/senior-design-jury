import { useState } from "react";
import JuryForm from "./JuryForm";
import AdminPanel from "./AdminPanel";
import "./App.css";
import teduLogo from "./assets/tedu-logo.png";

export default function App() {
  const [page, setPage] = useState("home");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const ADMIN_PASS = "ee492admin";

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
                if (e.key === "Enter" && adminInput === ADMIN_PASS) setAdminUnlocked(true);
              }}
            />
            <button
              className="btn-primary"
              onClick={() => {
                if (adminInput === ADMIN_PASS) setAdminUnlocked(true);
                else alert("Incorrect password!");
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
        onBack={() => {
          setPage("home");
          setAdminUnlocked(false);
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

        <h1>Senior Design Jury Portal</h1>
        <p className="home-sub">TED University · Department of Electrical & Electronics Engineering</p>

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
            Jury members: use <strong>Evaluation Form</strong> to submit scores.
          </span>
        </div>

        <div className="home-footer">
          © 2026 TED University · Developed by{" "}
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
