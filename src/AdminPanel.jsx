// src/AdminPanel.jsx
// ============================================================
// Admin panel with overview, evaluations, and settings.
//
// Data source: Supabase RPCs via src/shared/api.js
//   - adminGetScores       → raw score rows (for Juror Activity / Grid / Details views)
//   - adminProjectSummary  → per-project aggregates + notes (for Rankings / Analytics)
//
// Field names in rawScores are normalized in api.js to match
// the old GAS row shape so existing tab components work as-is.
//
// Phase 4 — Admin Layer Decomposition:
//   - Tab/URL/overflow state → useAdminTabs (src/admin/hooks/useAdminTabs.js)
//   - Data fetching + Realtime → useAdminData (src/admin/hooks/useAdminData.js)
//   - Derived useMemo values and JSX remain here
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CRITERIA } from "./config";
import { getActiveCriteria } from "./shared/criteriaHelpers";
import { cmp, rowKey } from "./admin/utils";
import { useAuth } from "./shared/auth";
import TenantSwitcher from "./admin/components/TenantSwitcher";
import { writeSection } from "./admin/persist";
import { getCellState, computeOverviewMetrics } from "./admin/scoreHelpers";
import { useAdminTabs } from "./admin/hooks/useAdminTabs";
import { useAdminData } from "./admin/hooks/useAdminData";
import { useAnchoredPopover } from "./shared/useAnchoredPopover";
import { RefreshIcon } from "./admin/components";
import UserAvatarMenu from "./admin/components/UserAvatarMenu";
import {
  ListChecksIcon,
  ChartIcon,
  LayoutDashboardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SettingsIcon,
  MedalIcon,
  TableIcon,
  Grid3x3Icon,
  TriangleAlertIcon,
  UserRoundCogIcon,
  CalendarRangeIcon,
  LandmarkIcon,
} from "./shared/Icons";
import veraLogo from "./assets/vera_logo.png";
import OverviewTab from "./admin/OverviewTab";
import ScoresTab from "./admin/ScoresTab";
import SettingsPage from "./admin/SettingsPage";
import AlertCard from "./shared/AlertCard";
import "./styles/admin-layout.css";
import "./styles/admin-summary.css";
import "./styles/admin-details.css";
import "./styles/admin-jurors.css";
import "./styles/admin-matrix.css";
import "./styles/admin-dashboard.css";
import "./styles/admin-responsive.css";
import "./styles/admin-manage.css";

const CRITERIA_LIST = CRITERIA.map((c) => ({
  id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max,
}));

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { id: "scores", label: "Scores", icon: ListChecksIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const EVALUATION_VIEWS = [
  { id: "rankings", label: "Rankings", icon: MedalIcon },
  { id: "analytics", label: "Analytics", icon: ChartIcon },
  { id: "grid", label: "Grid", icon: Grid3x3Icon },
  { id: "details", label: "Details", icon: TableIcon },
];

function SemesterDropdown({
  semesterList,
  sortedSemesters,
  selectedSemesterId,
  selectedSemesterName,
  semesterOpen,
  setSemesterOpen,
  setSelectedSemesterId,
  fetchData,
  variant = "tab",
  labelPrefix = "",
  leadingIcon: LeadingIcon = null,
  formatName = (n) => n,
}) {
  if (semesterList.length === 0) return null;

  const { triggerRef, panelRef, panelStyle, panelPlacement } = useAnchoredPopover(
    semesterOpen,
    [selectedSemesterId, sortedSemesters.length]
  );

  const triggerClass = [
    variant === "tab"
      ? "tab tab--dropdown semester-dropdown-trigger"
      : variant === "title"
        ? "semester-dropdown-trigger semester-dropdown-trigger--title"
        : "status-chip status-chip--semester semester-dropdown-trigger",
    semesterOpen ? "open" : "",
  ].filter(Boolean).join(" ");
  const displayLabel = labelPrefix
    ? `${labelPrefix} ${selectedSemesterName}`
    : selectedSemesterName;

  useEffect(() => {
    if (!semesterOpen) return;
    function handleOutside(e) {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (trigger && trigger.contains(e.target)) return;
      if (panel && panel.contains(e.target)) return;
      setSemesterOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [semesterOpen, setSemesterOpen, triggerRef, panelRef]);

  return (
    <div className="semester-dropdown">
      <button
        type="button"
        className={triggerClass}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={semesterOpen}
        onClick={() => setSemesterOpen((v) => !v)}
      >
        {LeadingIcon && (
          <span className="semester-dropdown-icon" aria-hidden="true"><LeadingIcon /></span>
        )}
        <span className="semester-dropdown-label">{displayLabel}</span>
        <span className="semester-dropdown-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>
      {semesterOpen && createPortal(
        <ul
          ref={panelRef}
          className={`semester-dropdown-panel semester-dropdown-panel--${panelPlacement}`}
          style={panelStyle || undefined}
          role="listbox"
          aria-label="Select semester"
        >
          {sortedSemesters.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={selectedSemesterId === s.id}
              className={`semester-dropdown-item${selectedSemesterId === s.id ? " active" : ""}`}
              onClick={() => {
                setSelectedSemesterId(s.id);
                setSemesterOpen(false);
                fetchData(s.id);
              }}
            >
              {formatName(s.semester_name)}
              {selectedSemesterId === s.id && (
                <span className="semester-dropdown-check" aria-hidden="true">✓</span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

function ScoresDropdown({
  open,
  setOpen,
  activeView,
  onSelect,
  isActive,
}) {
  const { triggerRef, panelRef, panelStyle, panelPlacement } = useAnchoredPopover(
    open,
    [activeView]
  );

  const triggerClass = [
    "tab tab--dropdown semester-dropdown-trigger scores-dropdown-trigger",
    isActive ? "active" : "",
    open ? "open" : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (trigger && trigger.contains(e.target)) return;
      if (panel && panel.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, setOpen, triggerRef, panelRef]);

  return (
    <div className="scores-dropdown">
      <button
        type="button"
        className={triggerClass}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ListChecksIcon />
        <span>
          Scores
          {isActive && activeView && (
            <span className="tab-sub-label" aria-hidden="true">
              {" · "}{EVALUATION_VIEWS.find((v) => v.id === activeView)?.label}
            </span>
          )}
        </span>
        <span className="semester-dropdown-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>
      {open && createPortal(
        <ul
          ref={panelRef}
          className={`semester-dropdown-panel semester-dropdown-panel--${panelPlacement}`}
          style={panelStyle || undefined}
          role="listbox"
          aria-label="Select scores view"
        >
          {EVALUATION_VIEWS.map((v) => (
            <li
              key={v.id}
              role="option"
              aria-selected={activeView === v.id}
              className={`semester-dropdown-item${activeView === v.id ? " active" : ""}`}
              onClick={() => {
                onSelect(v.id);
                setOpen(false);
              }}
            >
              <span className="dropdown-item-main">
                <span className="dropdown-item-icon" aria-hidden="true"><v.icon /></span>
                <span className="dropdown-item-label">{v.label}</span>
              </span>
              {activeView === v.id && (
                <span className="semester-dropdown-check" aria-hidden="true">✓</span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

export default function AdminPanel({ isDemoMode, onBack, onAuthError, onInitialLoadDone, onLogout }) {
  // ── Auth context (Phase C) ──────────────────────────────────
  const { activeTenant, isSuper, tenants, setActiveTenant, displayName, signOut, user } = useAuth();
  const tenantId = activeTenant?.id || "";

  // ── Sticky header collapse on scroll ─────────────────────
  // Sticky collapse — portrait/tablet only (≤768px or narrow landscape)
  // Use RAF + top-only expand to avoid scroll jitter feedback.
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        if (window.innerWidth > 768 || window.innerWidth > window.innerHeight) {
          setHeaderCollapsed(false);
          return;
        }
        const y = window.scrollY;
        setHeaderCollapsed((prev) => {
          if (!prev && y > 96) return true;
          if (prev && y <= 4) return false;
          return prev;
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Semester selection (UI state — drives dropdown + hook) ─
  const [selectedSemesterId, setSelectedSemesterId] = useState("");

  // settingsDirtyRef — passed to useAdminTabs for the unsaved-change guard
  // and used in the tab click handler JSX below.
  const settingsDirtyRef = useRef(false);

  // ── Tab navigation, URL sync, overflow hints ───────────────
  const {
    adminTab,
    setAdminTab,
    scoresView,
    switchScoresView,
    semesterOpen,
    setSemesterOpen,
    scoreMenuOpen,
    setScoreMenuOpen,
    tabOverflow,
    tabHintLeft,
    tabHintRight,
    tabBarRef,
    updateTabHints,
  } = useAdminTabs({ settingsDirtyRef, isDemoMode });

  // ── Data fetching, Realtime, trend, details ────────────────
  const {
    rawScores,
    summaryData,
    allJurors,
    semesterList,
    sortedSemesters,
    trendData,
    trendLoading,
    trendError,
    trendSemesterIds,
    setTrendSemesterIds,
    detailsScores,
    detailsSummary,
    detailsLoading,
    loading,
    loadError,
    authError,
    lastRefresh,
    fetchData,
  } = useAdminData({
    tenantId,
    selectedSemesterId,
    onSelectedSemesterChange: setSelectedSemesterId,
    onAuthError,
    onInitialLoadDone,
    scoresView,
  });

  // Diagnostic logging for demo environment
  useEffect(() => {
    if (isDemoMode) {
      console.log("[AdminPanel] Demo mode active. Database: vera-demo");
      console.log("[AdminPanel] Current adminTab:", adminTab);
    }
  }, [isDemoMode, adminTab]);

  // Persist overview metrics to sessionStorage for home page status chip
  const totalProjects = summaryData.length;

  // ── Derived data (useMemo) ─────────────────────────────────
  // These remain in AdminPanel because they are tightly coupled to the
  // rendering layer and combine data from multiple hook return values.

  const groups = useMemo(
    () =>
      summaryData
        .map((p) => ({
          id: p.id,
          groupNo: p.groupNo,
          label: `Group ${p.groupNo}`,
          title: p.name ?? "",
          students: p.students ?? "",
          desc: "",
        }))
        .sort((a, b) => a.groupNo - b.groupNo),
    [summaryData]
  );

  const uniqueJurors = useMemo(() => {
    const seen = new Map();
    allJurors.forEach((j) => {
      const key = j.jurorId;
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          name: j.juryName.trim(),
          dept: j.juryDept.trim(),
          jurorId: j.jurorId,
          editEnabled: !!j.editEnabled,
          finalSubmittedAt: j.finalSubmittedAt || j.final_submitted_at || "",
          finalSubmitted: !!(j.finalSubmittedAt || j.final_submitted_at),
          isAssigned: j.isAssigned,
        });
      }
    });
    rawScores.forEach((d) => {
      if (!d.juryName) return;
      const key = d.jurorId || rowKey(d);
      const prev = seen.get(key);
      seen.set(key, {
        key,
        name: d.juryName.trim(),
        dept: d.juryDept.trim(),
        jurorId: d.jurorId,
        editEnabled: prev?.editEnabled ?? false,
        finalSubmittedAt: prev?.finalSubmittedAt || "",
        finalSubmitted: prev?.finalSubmitted ?? false,
        isAssigned: prev?.isAssigned,
      });
    });
    return [...seen.values()].sort((a, b) => cmp(a.name, b.name));
  }, [allJurors, rawScores]);

  const matrixJurors = useMemo(() => {
    const assignedMap = new Map(allJurors.map((j) => [j.jurorId, j.isAssigned]));
    const hasAssignedFlag = allJurors.some((j) => typeof j.isAssigned === "boolean");
    if (hasAssignedFlag) {
      return uniqueJurors.filter((j) => assignedMap.get(j.jurorId) === true);
    }
    const scoreKeys = new Set(rawScores.map((r) => rowKey(r)));
    return uniqueJurors.filter((j) => scoreKeys.has(j.key));
  }, [allJurors, uniqueJurors, rawScores]);

  const assignedJurors = matrixJurors;

  const completedJurorKeys = useMemo(
    () => new Set(assignedJurors.filter((j) => !!(j.finalSubmitted ?? j.finalSubmittedAt)).map((j) => j.key)),
    [assignedJurors]
  );

  const submittedData = useMemo(
    () => rawScores.filter((r) => completedJurorKeys.has(rowKey(r)) && r.total !== null),
    [rawScores, completedJurorKeys]
  );

  const dashboardStats = useMemo(
    () =>
      summaryData.map((p) => ({
        id: p.id,
        name: `Group ${p.groupNo}`,
        groupNo: p.groupNo,
        projectTitle: p.name ?? "",
        students: p.students,
        count: p.count,
        avg: p.avg,
        totalAvg: p.totalAvg,
        totalMin: p.totalMin,
        totalMax: p.totalMax,
      })),
    [summaryData]
  );

  const ranked = useMemo(
    () => [...summaryData].sort((a, b) => {
      const aVal = Number.isFinite(a.totalAvg) ? a.totalAvg : -Infinity;
      const bVal = Number.isFinite(b.totalAvg) ? b.totalAvg : -Infinity;
      return bVal - aVal;
    }),
    [summaryData]
  );

  const jurorStats = useMemo(() => {
    return assignedJurors.map((j) => {
      const { key, name, dept, jurorId, editEnabled, finalSubmitted, finalSubmittedAt } = j;
      const rows = rawScores.filter((d) => rowKey(d) === key);
      const latestTs = rows.reduce((mx, r) => (r.tsMs > mx ? r.tsMs : mx), 0);
      const latestRow = rows.find((r) => r.tsMs === latestTs) || rows[0] || null;
      return {
        key, jury: name, dept, jurorId, rows,
        latestTs,
        latestRow: latestRow
          ? { ...latestRow, finalSubmittedAt: latestRow?.finalSubmittedAt || finalSubmittedAt || "" }
          : { finalSubmittedAt: finalSubmittedAt || "" },
        editEnabled,
      };
    });
  }, [assignedJurors, rawScores]);

  const overviewMetrics = useMemo(
    () => computeOverviewMetrics(rawScores, assignedJurors, totalProjects),
    [rawScores, assignedJurors, totalProjects]
  );

  useEffect(() => {
    if (!lastRefresh) return;
    try {
      sessionStorage.setItem(
        "ee492_home_meta",
        JSON.stringify({
          totalJurors: overviewMetrics.totalJurors,
          completedJurors: overviewMetrics.completedJurors,
          lastUpdated: lastRefresh.toISOString(),
        })
      );
    } catch { }
  }, [overviewMetrics.totalJurors, overviewMetrics.completedJurors, lastRefresh]);

  const lastRefreshTime = lastRefresh
    ? new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(lastRefresh)
    : "";

  const selectedSemester = sortedSemesters.find((s) => s.id === selectedSemesterId) ?? null;
  const selectedSemesterName = selectedSemester?.semester_name ?? "—";
  const selectedSemesterLocked = !!(selectedSemester?.is_locked);
  const activeCriteria = getActiveCriteria(selectedSemester?.criteria_template);

  const renderSemesterControl = (className = "", options = {}) => {
    if (!semesterList.length) return null;
    const { variant = "chip", labelPrefix = "", leadingIcon = null } = options;
    return (
      <div className={`semester-control ${className}`.trim()}>
        <SemesterDropdown
          semesterList={semesterList}
          sortedSemesters={sortedSemesters}
          selectedSemesterId={selectedSemesterId}
          selectedSemesterName={selectedSemesterName}
          semesterOpen={semesterOpen}
          setSemesterOpen={setSemesterOpen}
          setSelectedSemesterId={setSelectedSemesterId}
          fetchData={fetchData}
          variant={variant}
          labelPrefix={labelPrefix}
          leadingIcon={leadingIcon}
          formatName={(n) => n}
        />
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="admin-screen">

      {/* ── Demo banner ───────────────────────────────────────── */}
      {isDemoMode && (
        <div className="demo-banner" role="status">
          <span className="demo-banner-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/></svg>
          </span>
          <span className="demo-banner-text">
            <strong>Demo Mode</strong>
            <span className="demo-banner-sep">&middot;</span>
            Sample data, resets daily
          </span>
        </div>
      )}

      {/* ── Premium Header ──────────────────────────────────── */}
      <header className="form-header premium-header">

        {/* Band 1 — Brand + Identity + Utility */}
        <div className="ph-row ph-top-band">
          <div className="ph-brand-group">
            <div className="ph-brand">
              <img src={veraLogo} alt="VERA" className="ph-logo" />
            </div>
          </div>
          <div className="ph-utility">
            <span className="analog-clock-wrap" style={lastRefresh ? undefined : { visibility: "hidden" }}>
              {(() => {
                if (!lastRefresh) return null;
                const d = new Date(lastRefresh);
                const h = d.getHours() % 12;
                const m = d.getMinutes();
                const hAngle = (h + m / 60) * 30;
                const mAngle = m * 6;
                return (
                  <>
                    <svg className="analog-clock" viewBox="0 0 40 40" aria-label={lastRefreshTime}>
                      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--gray-300, #cbd5e1)" strokeWidth="1.5" />
                      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a) => (
                        <line key={a} x1="20" y1="4" x2="20" y2={a % 90 === 0 ? "7" : "5.5"}
                          stroke="var(--gray-400, #94a3b8)" strokeWidth={a % 90 === 0 ? "1.2" : "0.7"}
                          strokeLinecap="round" transform={`rotate(${a} 20 20)`} />
                      ))}
                      <line x1="20" y1="20" x2="20" y2="9"
                        stroke="var(--gray-700, #334155)" strokeWidth="1.8" strokeLinecap="round"
                        transform={`rotate(${hAngle} 20 20)`} />
                      <line x1="20" y1="20" x2="20" y2="5.5"
                        stroke="var(--gray-500, #64748b)" strokeWidth="1.2" strokeLinecap="round"
                        transform={`rotate(${mAngle} 20 20)`} />
                      <circle cx="20" cy="20" r="1.5" fill="var(--gray-600, #475569)" />
                    </svg>
                    <span className="analog-clock-tooltip">{lastRefreshTime}</span>
                  </>
                );
              })()}
            </span>
            <button
              className={`refresh-btn${loading ? " is-loading" : ""}`}
              onClick={() => fetchData()}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshIcon />
            </button>
            <UserAvatarMenu onLogout={onLogout} />
          </div>
        </div>

        {/* Row 3 — Controls (collapsible on scroll) */}
        <div className={`ph-controls-wrap${headerCollapsed ? " collapsed" : ""}`}>
        <div className="ph-row ph-controls-row">
          <div className="ph-controls-left">
            {semesterList.length > 0 && (
              <div className="ph-control-group">
                <span className="ph-control-label"><CalendarRangeIcon /> View Semester</span>
                {renderSemesterControl("semester-control--header", { variant: "chip" })}
              </div>
            )}
          </div>
          <div className="ph-controls-right">
            {isSuper ? (
              <div className="ph-control-group">
                <span className="ph-control-label"><LandmarkIcon /> Department</span>
                <TenantSwitcher
                  tenants={tenants}
                  activeTenant={activeTenant}
                  onSwitch={setActiveTenant}
                />
              </div>
            ) : activeTenant ? (
              <div className="ph-control-group">
                <span className="ph-control-label"><LandmarkIcon /> Department</span>
                <span className="ph-tenant-locked">
                  <span>{activeTenant.name}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar-wrap">
          <div className="tab-bar-row">
            <div className="tab-bar-shell" ref={tabBarRef} onScroll={updateTabHints}>
              <div className="tab-bar" role="tablist" aria-label="Admin panel sections">
                {TABS.map((t) => {
                  if (t.id === "scores") {
                    return (
                      <ScoresDropdown
                        key={t.id}
                        open={scoreMenuOpen}
                        setOpen={setScoreMenuOpen}
                        activeView={scoresView}
                        onSelect={(id) => {
                          setAdminTab("scores");
                          switchScoresView(id);
                        }}
                        isActive={adminTab === "scores" || scoreMenuOpen}
                      />
                    );
                  }
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={adminTab === t.id}
                      className={`tab ${adminTab === t.id ? "active" : ""}`}
                      onClick={() => {
                        if (adminTab === "settings" && settingsDirtyRef.current) {
                          if (!window.confirm("You have unsaved changes. Leave anyway?")) return;
                        }
                        setAdminTab(t.id);
                        writeSection("tab", { adminTab: t.id });
                      }}
                    >
                      <t.icon />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {tabOverflow && (
                <div className="tab-hints" aria-hidden="true">
                  <span className={`tab-fade left${tabHintLeft ? "" : " is-hidden"}`} />
                  <span className={`tab-fade right${tabHintRight ? "" : " is-hidden"}`} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Status messages */}
      {loading && <div className="loading">Loading data…</div>}

      {/* Tab content */}
      {!loading && (
        <div className="admin-body" role="tabpanel">
          {selectedSemesterLocked && adminTab !== "settings" && (
            <AlertCard variant="warning" className="admin-lock-banner">
              Evaluations are locked for this semester. Jurors cannot submit or edit scores.
            </AlertCard>
          )}
          {(authError || loadError) && (
            <AlertCard variant="error">
              {authError || loadError}
            </AlertCard>
          )}
          {adminTab === "overview" && (
            <OverviewTab
              jurorStats={jurorStats}
              groups={groups}
              metrics={overviewMetrics}
              onGoToSettings={() => setAdminTab("settings")}
            />
          )}
          {adminTab === "scores" && (
            <ScoresTab
              view={scoresView}
              ranked={ranked}
              submittedData={submittedData}
              rawScores={rawScores}
              criteriaTemplate={activeCriteria}
              mudekTemplate={selectedSemester?.mudek_template}
              detailsScores={detailsScores}
              jurors={uniqueJurors}
              matrixJurors={matrixJurors}
              groups={groups}
              semesterName={selectedSemesterName}
              summaryData={summaryData}
              detailsSummary={detailsSummary}
              dashboardStats={dashboardStats}
              overviewMetrics={overviewMetrics}
              lastRefresh={lastRefresh}
              loading={loading}
              error={loadError || null}
              detailsLoading={detailsLoading}
              semesterOptions={sortedSemesters}
              trendSemesterIds={trendSemesterIds}
              onTrendSelectionChange={setTrendSemesterIds}
              trendData={trendData}
              trendLoading={trendLoading}
              trendError={trendError}
            />
          )}
          {adminTab === "settings" && (
            <SettingsPage
              tenantId={tenantId}
              selectedSemesterId={selectedSemesterId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
              onCurrentSemesterChange={(semesterId) => {
                setSelectedSemesterId(semesterId);
                fetchData(semesterId);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
