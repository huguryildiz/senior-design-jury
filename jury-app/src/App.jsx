import { useState } from "react";
import JuryForm from "./JuryForm";
import AdminPanel from "./AdminPanel";
import "./App.css";

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
            <button className="btn-ghost" onClick={() => setPage("home")}>← Back</button>
          </div>
        </div>
      );
    }
    return <AdminPanel onBack={() => { setPage("home"); setAdminUnlocked(false); }} />;
  }

  return (
    <div className="home">
      <div className="home-bg" />
      <div className="home-card">
        <div className="home-badge">EE 492</div>
        <h1>Poster Presentation<br />Evaluation</h1>
        <p className="home-sub">TED University · Dept. of Electrical & Electronics Engineering</p>
        <div className="home-buttons">
          <button className="btn-primary big" onClick={() => setPage("jury")}>
            <span>📋</span> Evaluation Form
          </button>
          <button className="btn-outline big" onClick={() => setPage("admin")}>
            <span>📊</span> View Results
          </button>
        </div>
        <p className="home-hint">Jury members can click "Evaluation Form" to enter their scores.</p>
      </div>
    </div>
  );
}
