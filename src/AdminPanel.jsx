// src/AdminPanel.jsx
// ── Admin results dashboard (modular) ────────────────────────
// Tabs: Summary → Dashboard → Details → Jurors → Matrix
// Auto-refresh every 30 seconds.
//
// Status values from Evaluations sheet:
//   "in_progress"      – juror started, group not scored yet
//   "group_submitted"  – group fully scored, not final-submitted
//   "all_submitted"    – final submit done
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";
import { toNum, tsToMillis, cmp, jurorBg, jurorDot, dedupeAndSort, HomeIcon } from "./admin/utils";
import SummaryTab   from "./admin/SummaryTab";
import DashboardTab from "./admin/DashboardTab";
import DetailsTab   from "./admin/DetailsTab";
import JurorsTab    from "./admin/JurorsTab";
import MatrixTab    from "./admin/MatrixTab";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));
const TOTAL_GROUPS  = PROJECT_LIST.length;
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const AUTO_REFRESH  = 30 * 1000;

const TABS = [
  { id: "summary",   label: "🏆 Summary"   },
  { id: "dashboard", label: "📈 Dashboard"  },
  { id: "detail",    label: "📋 Details"    },
  { id: "jurors",    label: "👤 Jurors"     },
  { id: "matrix",    label: "🔢 Matrix"     },
];

export default function AdminPanel({ adminPass, onBack }) {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [authError,   setAuthError]   = useState("");
  const [activeTab,   setActiveTab]   = useState("summary");
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const pass = adminPass || (sessionStorage.getItem("ee492_admin_pass") || "");
      if (!pass) { setData([]); setAuthError("Enter the admin password to load results."); return; }

      const res = await fetch(`${SCRIPT_URL}?action=export&pass=${encodeURIComponent(pass)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.text()).trim();
      if (raw.toLowerCase().includes("<html")) throw new Error("Received HTML — check Apps Script deployment.");
      let json;
      try { json = JSON.parse(raw); } catch { throw new Error("Apps Script returned invalid JSON."); }

      if (json?.status === "unauthorized") { setData([]); setAuthError("Incorrect password."); return; }
      if (json?.status !== "ok" || !Array.isArray(json?.rows)) throw new Error("Unexpected response.");

      try { sessionStorage.setItem("ee492_admin_pass", pass); } catch {}

      const parsed = json.rows.map((row) => ({
        juryName:    String(row["Juror Name"]  ?? row["Your Name"] ?? ""),
        juryDept:    String(row["Department / Institution"] ?? row["Department"] ?? ""),
        timestamp:   row["Timestamp"] || "",
        tsMs:        tsToMillis(row["Timestamp"] || ""),
        projectId:   toNum(row["Group No"]),
        projectName: String(row["Group Name"] ?? ""),
        design:      toNum(row["Design (20)"]),
        technical:   toNum(row["Technical (40)"]),
        delivery:    toNum(row["Delivery (30)"]),
        teamwork:    toNum(row["Teamwork (10)"]),
        total:       toNum(row["Total (100)"]),
        comments:    row["Comments"] || "",
        status:      String(row["Status"] ?? "all_submitted"),
      }));

      setData(dedupeAndSort(parsed));
      setLastRefresh(new Date());
    } catch (e) {
      setError("Could not load data: " + e.message); setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const id = setInterval(fetchData, AUTO_REFRESH);
    return () => clearInterval(id);
  }, [adminPass]);

  const jurors = useMemo(
    () => [...new Set(data.map((d) => d.juryName).filter(Boolean))].sort(cmp), [data]
  );
  const groups = useMemo(
    () => PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, desc: p.desc || "" }))
      .sort((a, b) => a.id - b.id), []
  );
  const jurorDeptMap = useMemo(() => {
    const m = new Map();
    data.forEach((r) => { if (r.juryName && r.juryDept && !m.has(r.juryName)) m.set(r.juryName, r.juryDept); });
    return m;
  }, [data]);
  const jurorColorMap = useMemo(() => {
    const m = new Map();
    jurors.forEach((n) => m.set(n, { bg: jurorBg(n), dot: jurorDot(n) }));
    return m;
  }, [jurors]);
  const submittedData = useMemo(() =>
    data.filter((r) => r.status === "all_submitted" || r.status === "group_submitted"), [data]
  );
  const projectStats = useMemo(() => {
    return PROJECT_LIST.map((p) => {
      const rows = submittedData.filter((d) => d.projectId === p.id);
      if (!rows.length) return { id: p.id, name: p.name, desc: p.desc, students: p.students, count: 0, avg: {}, totalAvg: 0, totalMin: 0, totalMax: 0 };
      const avg = {};
      CRITERIA_LIST.forEach((c) => { avg[c.id] = rows.reduce((s, r) => s + (r[c.id] || 0), 0) / rows.length; });
      const totals = rows.map((r) => r.total);
      return {
        id: p.id, name: p.name, desc: p.desc, students: p.students,
        count: rows.length, avg,
        totalAvg: totals.reduce((a, b) => a + b, 0) / totals.length,
        totalMin: Math.min(...totals),
        totalMax: Math.max(...totals),
      };
    });
  }, [submittedData]);
  const dashboardStats = useMemo(
    () => projectStats.map((s) => ({ ...s, name: `Group ${s.id}` })), [projectStats]
  );
  const ranked = useMemo(() => [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg), [projectStats]);
  const jurorStats = useMemo(() => {
    return jurors.map((jury) => {
      const rows       = data.filter((d) => d.juryName === jury);
      const submitted  = rows.filter((r) => r.status === "all_submitted" || r.status === "group_submitted");
      const inProgress = rows.filter((r) => r.status === "in_progress");
      const latestTs   = rows.reduce((mx, r) => r.tsMs > mx ? r.tsMs : mx, 0);
      const latestRow  = rows.find((r) => r.tsMs === latestTs) || rows[0];
      const overall    = submitted.length === TOTAL_GROUPS ? "all_submitted"
                       : submitted.length > 0 || inProgress.length > 0 ? "in_progress" : "not_started";
      return { jury, rows, submitted, inProgress, latestTs, latestRow, overall };
    });
  }, [jurors, data]);

  const inProgressCount = data.filter((r) => r.status === "in_progress").length;

  return (
    <div className="admin-screen">
      <div className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          <HomeIcon />
        </button>
        <div>
          <h2>Results Panel</h2>
          <p>
            {jurors.length} juror{jurors.length !== 1 ? "s" : ""} · {submittedData.length} submitted
            {inProgressCount > 0 && <span className="live-indicator"> · {inProgressCount} in progress</span>}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
            <button
              className="refresh-btn"
              title="Create / refresh the Info sheet in Google Sheets from config.js data"
              onClick={async () => {
                const pass = adminPass || (sessionStorage.getItem("ee492_admin_pass") || "");
                const res = await fetch(`${SCRIPT_URL}?action=initInfo&pass=${encodeURIComponent(pass)}`, { cache: "no-store" });
                const json = await res.json();
                alert(json.message || json.status);
              }}
            >
              📋 Init Info Sheet
            </button>
          </div>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading   && <div className="loading">Loading data…</div>}
      {error     && <div className="error-msg">{error}</div>}
      {authError && <div className="error-msg">{authError}</div>}

      {!loading && !error && !authError && (
        <div className="admin-body">
          {activeTab === "summary"   && <SummaryTab   ranked={ranked}              submittedData={submittedData} />}
          {activeTab === "dashboard" && <DashboardTab dashboardStats={dashboardStats} submittedData={submittedData} />}
          {activeTab === "detail"    && <DetailsTab   data={data}      jurors={jurors} jurorColorMap={jurorColorMap} />}
          {activeTab === "jurors"    && <JurorsTab    jurorStats={jurorStats} jurors={jurors} />}
          {activeTab === "matrix"    && <MatrixTab    data={data}      jurors={jurors} groups={groups} jurorDeptMap={jurorDeptMap} />}
        </div>
      )}
    </div>
  );
}
