// src/AdminPanel.jsx
// ============================================================
// Admin results dashboard (modular tabs).
// Tabs: Summary → Dashboard → Details → Jurors → Matrix
// Auto-refresh every 30 seconds.
//
// New in this version:
//  - Parses EditingFlag (col 13) from Sheets — passed to JurorsTab
//  - PIN reset button per juror (admin password required)
//  - Admin password is never stored in state — only used at call time
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";
import { getFromSheet, postToSheet } from "./shared/api";
import { toNum, tsToMillis, cmp, jurorBg, jurorDot, dedupeAndSort } from "./admin/utils";
import { HomeIcon } from "./admin/components";
import SummaryTab   from "./admin/SummaryTab";
import DashboardTab from "./admin/DashboardTab";
import DetailsTab   from "./admin/DetailsTab";
import JurorsTab    from "./admin/JurorsTab";
import MatrixTab    from "./admin/MatrixTab";

const PROJECT_LIST  = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));
const TOTAL_GROUPS  = PROJECT_LIST.length;
const AUTO_REFRESH  = 30 * 1000;

const TABS = [
  { id: "summary",   label: "🏆 Summary"  },
  { id: "dashboard", label: "📈 Dashboard" },
  { id: "detail",    label: "📋 Details"   },
  { id: "jurors",    label: "👤 Jurors"    },
  { id: "matrix",    label: "🔢 Matrix"    },
];

export default function AdminPanel({ adminPass, onBack }) {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [authError,   setAuthError]   = useState("");
  const [activeTab,   setActiveTab]   = useState("summary");
  const [lastRefresh, setLastRefresh] = useState(null);

  // PIN reset UI state
  const [pinResetTarget, setPinResetTarget] = useState(null); // { juryName, juryDept }
  const [pinResetStatus, setPinResetStatus] = useState("");   // "" | "loading" | "ok" | "error"

  // Keep adminPass in a ref so interval callback always has the latest value
  const adminPassRef = useRef(adminPass);
  useEffect(() => { adminPassRef.current = adminPass; }, [adminPass]);

  // ── Fetch evaluations from Sheets ─────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const pass = adminPassRef.current || sessionStorage.getItem("ee492_admin_pass") || "";
      if (!pass) {
        setData([]);
        setAuthError("Enter the admin password to load results.");
        return;
      }

      const json = await getFromSheet({ action: "export", pass });

      if (json?.status === "unauthorized") {
        setData([]);
        setAuthError("Incorrect password.");
        return;
      }
      if (json?.status !== "ok" || !Array.isArray(json?.rows)) {
        throw new Error("Unexpected response format.");
      }

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
        // ── EditingFlag (col 13) ─────────────────────────────
        // Set to "editing" by resetJuror, cleared when all_submitted again.
        editingFlag: String(row["EditingFlag"] ?? ""),
      }));

      setData(dedupeAndSort(parsed));
      setLastRefresh(new Date());
      setAuthError("");
    } catch (e) {
      setError("Could not load data: " + e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const id = setInterval(fetchData, AUTO_REFRESH);
    return () => clearInterval(id);
  }, []);

  // ── PIN reset handler ────────────────────────────────────
  const handlePinReset = async (juryName, juryDept) => {
    setPinResetTarget({ juryName, juryDept });
    setPinResetStatus("loading");
    try {
      const pass = adminPassRef.current || sessionStorage.getItem("ee492_admin_pass") || "";
      const json = await getFromSheet({
        action:   "resetPin",
        juryName: juryName.trim(),
        juryDept: juryDept.trim(),
        pass,
      });
      setPinResetStatus(json.status === "ok" ? "ok" : "error");
    } catch {
      setPinResetStatus("error");
    }
    setTimeout(() => { setPinResetTarget(null); setPinResetStatus(""); }, 3000);
  };

  // ── Derived memos ────────────────────────────────────────
  const jurors = useMemo(
    () => [...new Set(data.map((d) => d.juryName).filter(Boolean))].sort(cmp),
    [data]
  );
  const groups = useMemo(
    () => PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, desc: p.desc || "" }))
      .sort((a, b) => a.id - b.id),
    []
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

  // Only FINAL submissions count for rankings / averages
  const submittedData = useMemo(() => data.filter((r) => r.status === "all_submitted"), [data]);
  const completedData = useMemo(
    () => data.filter((r) => r.status === "group_submitted" || r.status === "all_submitted"),
    [data]
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
    () => projectStats.map((s) => ({ ...s, name: `Group ${s.id}` })),
    [projectStats]
  );
  const ranked = useMemo(() => [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg), [projectStats]);

  const jurorStats = useMemo(() => {
    return jurors.map((jury) => {
      const rows           = data.filter((d) => d.juryName === jury);
      const completed      = rows.filter((r) => r.status === "group_submitted" || r.status === "all_submitted");
      const finalSubmitted = rows.filter((r) => r.status === "all_submitted");
      const inProgress     = rows.filter((r) => r.status === "in_progress");
      const latestTs       = rows.reduce((mx, r) => (r.tsMs > mx ? r.tsMs : mx), 0);
      const latestRow      = rows.find((r) => r.tsMs === latestTs) || rows[0];

      const overall = finalSubmitted.length === TOTAL_GROUPS
        ? "all_submitted"
        : (completed.length > 0 || inProgress.length > 0)
          ? "in_progress"
          : "not_started";

      return {
        jury, rows,
        submitted: completed,   // backwards-compatible alias
        completed, finalSubmitted, inProgress,
        latestTs, latestRow, overall,
      };
    });
  }, [jurors, data]);

  const inProgressCount = data.filter((r) => r.status === "in_progress").length;
  const editingCount    = jurorStats.filter((s) => s.rows.some((r) => r.editingFlag === "editing")).length;

  return (
    <div className="admin-screen">
      {/* Header */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          <HomeIcon />
        </button>
        <div>
          <h2>Results Panel</h2>
          <p>
            {jurors.length} juror{jurors.length !== 1 ? "s" : ""}
            {" · "}{completedData.length} completed
            {" · "}{submittedData.length} final
            {inProgressCount > 0 && <span className="live-indicator"> · {inProgressCount} in progress</span>}
            {editingCount > 0 && <span className="editing-indicator"> · {editingCount} editing</span>}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {loading   && <div className="loading">Loading data…</div>}
      {error     && <div className="error-msg">{error}</div>}
      {authError && <div className="error-msg">{authError}</div>}

      {/* PIN reset toast */}
      {pinResetTarget && (
        <div className={`pin-reset-toast ${pinResetStatus}`}>
          {pinResetStatus === "loading" && `Resetting PIN for ${pinResetTarget.juryName}…`}
          {pinResetStatus === "ok"      && `✓ PIN reset — ${pinResetTarget.juryName} will get a new PIN on next login.`}
          {pinResetStatus === "error"   && `✗ Could not reset PIN for ${pinResetTarget.juryName}.`}
        </div>
      )}

      {!loading && !error && !authError && (
        <div className="admin-body">
          {activeTab === "summary"   && <SummaryTab   ranked={ranked} submittedData={submittedData} />}
          {activeTab === "dashboard" && <DashboardTab dashboardStats={dashboardStats} submittedData={submittedData} />}
          {activeTab === "detail"    && <DetailsTab   data={data} jurors={jurors} jurorColorMap={jurorColorMap} />}
          {activeTab === "jurors"    && (
            <JurorsTab
              jurorStats={jurorStats}
              jurors={jurors}
              onPinReset={handlePinReset}
            />
          )}
          {activeTab === "matrix"    && <MatrixTab    data={data} jurors={jurors} groups={groups} jurorDeptMap={jurorDeptMap} />}
        </div>
      )}
    </div>
  );
}
