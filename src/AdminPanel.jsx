// src/AdminPanel.jsx
// ============================================================
// Admin results dashboard with five tabs.
//
// Changes in this version:
//   - AUTO_REFRESH reduced from 30 s to 2 minutes (less noise).
//   - Parses EditingFlag (column 13) so JurorsTab can show the
//     "✏️ Editing" badge when a juror is actively re-editing.
//   - PIN reset button per juror (admin password required).
//   - Juror deduplication is case-insensitive so "Ali" and "ALI"
//     don't appear as two separate jurors.
//   - Admin password stored in a ref, never in state.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { PROJECTS, CRITERIA } from "./config";
import { getFromSheet }       from "./shared/api";
import { toNum, tsToMillis, cmp, jurorBg, jurorDot, dedupeAndSort } from "./admin/utils";
import { HomeIcon, RefreshIcon } from "./admin/components";
import SummaryTab    from "./admin/SummaryTab";
import DashboardTab  from "./admin/DashboardTab";
import DetailsTab    from "./admin/DetailsTab";
import JurorsTab     from "./admin/JurorsTab";
import MatrixTab     from "./admin/MatrixTab";
import "./styles/admin.css";

// ── Constants ─────────────────────────────────────────────────
const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const CRITERIA_LIST = CRITERIA.map((c) => ({
  id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max,
}));
const TOTAL_GROUPS  = PROJECT_LIST.length;
const AUTO_REFRESH  = 2 * 60 * 1000; // 2 minutes

const TABS = [
  { id: "summary",   label: "🏆 Summary"  },
  { id: "dashboard", label: "📈 Dashboard" },
  { id: "detail",    label: "📋 Details"   },
  { id: "jurors",    label: "👤 Jurors"    },
  { id: "matrix",    label: "🔢 Matrix"    },
];

export default function AdminPanel({ adminPass, onBack, onAuthError, onInitialLoadDone }) {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [authError,   setAuthError]   = useState("");
  const [activeTab,   setActiveTab]   = useState("summary");
  const [lastRefresh, setLastRefresh] = useState(null);

  // PIN reset feedback
  const [pinResetTarget, setPinResetTarget] = useState(null); // { juryName, juryDept }
  const [pinResetStatus, setPinResetStatus] = useState("");   // "" | "loading" | "ok" | "error"

  // Track whether the very first data fetch has resolved.
  const initialLoadFiredRef = useRef(false);

  // Keep adminPass current in a ref so the interval callback
  // always has the latest value without causing re-renders.
  const passRef = useRef(adminPass);
  useEffect(() => { passRef.current = adminPass; }, [adminPass]);

  // ── Data fetch ────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const pass = passRef.current || sessionStorage.getItem("ee492_admin_pass") || "";
      if (!pass) {
        setData([]);
        setAuthError("Enter the admin password to load results.");
        return;
      }

      const json = await getFromSheet({ action: "export", pass });

      if (json?.status === "unauthorized") {
        setData([]);
        if (onAuthError) { onAuthError("Invalid password"); return; }
        setAuthError("Incorrect password.");
        return;
      }
      if (json?.status !== "ok" || !Array.isArray(json?.rows)) {
        throw new Error("Unexpected response format.");
      }

      // Cache password for the duration of this browser session.
      try { sessionStorage.setItem("ee492_admin_pass", pass); } catch {}

      const parsed = json.rows.map((row) => ({
        juryName:    String(row["Juror Name"]  ?? row["Your Name"] ?? ""),
        juryDept:    String(row["Department / Institution"] ?? row["Department"] ?? ""),
        timestamp:   row["Timestamp"] || "",
        tsMs:        tsToMillis(row["Timestamp"] || ""),
        projectId:   toNum(row["Group No"]),
        projectName: String(row["Group Name"] ?? ""),
        jurorId:     String(row["Juror ID"] ?? ""),
        technical:   toNum(row["Technical (30)"]),
        design:      toNum(row["Written (30)"]),
        delivery:    toNum(row["Oral (30)"]),
        teamwork:    toNum(row["Teamwork (10)"]),
        total:       toNum(row["Total (100)"]),
        comments:    row["Comments"] || "",
        status:      String(row["Status"] ?? "all_submitted"),
        // EditingFlag (column 13) — set to "editing" by resetJuror,
        // cleared when the juror re-submits with all_submitted status.
        editingFlag: String(row["EditingFlag"] ?? ""),
      }));

      setData(dedupeAndSort(parsed));
      setLastRefresh(new Date());
      setAuthError("");
      if (!initialLoadFiredRef.current) {
        initialLoadFiredRef.current = true;
        onInitialLoadDone?.();
      }
    } catch (e) {
      if (onAuthError) { onAuthError("Connection error — try again."); return; }
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
  }, []); // interval never needs to restart — passRef always has latest pass

  // Lock body scroll while PIN reset modal is open.
  useEffect(() => {
    if (pinResetTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [pinResetTarget]);

  // ── PIN reset ─────────────────────────────────────────────
  const handlePinReset = async (juryName, juryDept, jurorId) => {
    setPinResetTarget({ juryName, juryDept });
    setPinResetStatus("loading");
    try {
      const pass = passRef.current || sessionStorage.getItem("ee492_admin_pass") || "";
      const json = await getFromSheet({
        action: "resetPin",
        jurorId: jurorId.trim(),
        pass,
      });
      setPinResetStatus(json.status === "ok" ? "ok" : "error");
    } catch {
      setPinResetStatus("error");
    }
    // Auto-dismiss toast after 3 s.
    setTimeout(() => { setPinResetTarget(null); setPinResetStatus(""); }, 3000);
  };

  // ── Derived data ──────────────────────────────────────────

  // Stable per-row key: jurorId if present, else name__dept (lowercased).
  // Must be consistent across AdminPanel, MatrixTab, DetailsTab, JurorsTab.
  const rowKey = (r) =>
    r.jurorId
      ? r.jurorId
      : `${(r.juryName || "").trim().toLowerCase()}__${(r.juryDept || "").trim().toLowerCase()}`;

  // Unique jurors by key — prevents same-name/different-dept collisions.
  const uniqueJurors = useMemo(() => {
    const seen = new Map(); // key → { key, name, dept, jurorId }
    data.forEach((d) => {
      if (!d.juryName) return;
      const key = rowKey(d);
      if (!seen.has(key))
        seen.set(key, { key, name: d.juryName.trim(), dept: d.juryDept.trim(), jurorId: d.jurorId });
    });
    return [...seen.values()].sort((a, b) => cmp(a.name, b.name));
  }, [data]);

  const groups = useMemo(
    () => PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, desc: p.desc || "" }))
      .sort((a, b) => a.id - b.id),
    []
  );

  // Key → dept map for MatrixTab.
  const jurorDeptMap = useMemo(() => {
    const m = new Map();
    uniqueJurors.forEach(({ key, dept }) => m.set(key, dept));
    return m;
  }, [uniqueJurors]);

  const jurorColorMap = useMemo(() => {
    const m = new Map();
    uniqueJurors.forEach(({ key, name }) => m.set(key, { bg: jurorBg(name), dot: jurorDot(name) }));
    return m;
  }, [uniqueJurors]);

  // Only rows with all_submitted count towards rankings and averages.
  const submittedData = useMemo(
    () => data.filter((r) => r.status === "all_submitted"),
    [data]
  );
  const completedData = useMemo(
    () => data.filter((r) => r.status === "group_submitted" || r.status === "all_submitted"),
    [data]
  );

  const projectStats = useMemo(() => {
    return PROJECT_LIST.map((p) => {
      const rows = submittedData.filter((d) => d.projectId === p.id);
      if (!rows.length) {
        return { id: p.id, name: p.name, desc: p.desc, students: p.students, count: 0, avg: {}, totalAvg: 0, totalMin: 0, totalMax: 0 };
      }
      const avg = {};
      CRITERIA_LIST.forEach((c) => {
        avg[c.id] = rows.reduce((s, r) => s + (r[c.id] || 0), 0) / rows.length;
      });
      const totals = rows.map((r) => r.total);
      return {
        id: p.id, name: p.name, desc: p.desc, students: p.students,
        count:    rows.length,
        avg,
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
  const ranked = useMemo(
    () => [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg),
    [projectStats]
  );

  const jurorStats = useMemo(() => {
    return uniqueJurors.map(({ key, name, dept, jurorId }) => {
      const rows           = data.filter((d) => rowKey(d) === key);
      const completed      = rows.filter((r) => r.status === "group_submitted" || r.status === "all_submitted");
      const finalSubmitted = rows.filter((r) => r.status === "all_submitted");
      const inProgress     = rows.filter((r) => r.status === "in_progress");
      const latestTs       = rows.reduce((mx, r) => (r.tsMs > mx ? r.tsMs : mx), 0);
      const latestRow      = rows.find((r) => r.tsMs === latestTs) || rows[0];

      const overall =
        finalSubmitted.length === TOTAL_GROUPS ? "all_submitted" :
        (completed.length > 0 || inProgress.length > 0) ? "in_progress" :
        "not_started";

      return {
        key, jury: name, dept, jurorId, rows,
        submitted: completed, // backwards-compatible alias
        completed, finalSubmitted, inProgress,
        latestTs, latestRow, overall,
      };
    });
  }, [uniqueJurors, data]);

  const inProgressCount = data.filter((r) => r.status === "in_progress").length;
  const editingCount    = jurorStats.filter((s) =>
    s.rows.some((r) => r.editingFlag === "editing")
  ).length;

  // ── Render ────────────────────────────────────────────────
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
            {uniqueJurors.length} juror{uniqueJurors.length !== 1 ? "s" : ""}
            {" · "}{completedData.length} completed
            {" · "}{submittedData.length} final
            {inProgressCount > 0 && (
              <span className="live-indicator"> · {inProgressCount} in progress</span>
            )}
            {editingCount > 0 && (
              <span className="editing-indicator"> · {editingCount} editing</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <button className="refresh-btn" onClick={fetchData} aria-label="Refresh" title="Refresh"><RefreshIcon /></button>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {lastRefresh.toLocaleTimeString("en-GB", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status messages */}
      {loading   && <div className="loading">Loading data…</div>}
      {error     && <div className="error-msg">{error}</div>}
      {authError && <div className="error-msg">{authError}</div>}

      {/* PIN reset modal */}
      {pinResetTarget && (
        <div className="pin-reset-modal-overlay">
          <div className={`pin-reset-modal-card ${pinResetStatus}`}>
            {pinResetStatus === "loading" && (
              <>
                <div className="pin-reset-modal-icon">🔑</div>
                <div className="pin-reset-modal-msg">
                  Resetting PIN for <strong>{pinResetTarget.juryName}</strong>…
                </div>
              </>
            )}
            {pinResetStatus === "ok" && (
              <>
                <div className="pin-reset-modal-icon">✅</div>
                <div className="pin-reset-modal-msg">
                  PIN reset. <strong>{pinResetTarget.juryName}</strong> will receive a new PIN on next login.
                </div>
              </>
            )}
            {pinResetStatus === "error" && (
              <>
                <div className="pin-reset-modal-icon">❌</div>
                <div className="pin-reset-modal-msg">
                  Could not reset PIN for <strong>{pinResetTarget.juryName}</strong>.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab content */}
      {!loading && !error && !authError && (
        <div className="admin-body">
          {activeTab === "summary"   && <SummaryTab   ranked={ranked} submittedData={submittedData} />}
          {activeTab === "dashboard" && <DashboardTab dashboardStats={dashboardStats} submittedData={submittedData} />}
          {activeTab === "detail"    && <DetailsTab   data={data} jurors={uniqueJurors} jurorColorMap={jurorColorMap} />}
          {activeTab === "jurors"    && (
            <JurorsTab
              jurorStats={jurorStats}
              jurors={uniqueJurors}
              onPinReset={handlePinReset}
            />
          )}
          {activeTab === "matrix"    && (
            <MatrixTab data={data} jurors={uniqueJurors} groups={groups} jurorDeptMap={jurorDeptMap} />
          )}
        </div>
      )}
    </div>
  );
}
