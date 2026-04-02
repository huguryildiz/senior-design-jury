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

import { useEffect, useMemo, useRef, useState } from "react";
import { CRITERIA } from "./config";
import { getActiveCriteria } from "./shared/criteriaHelpers";
import { cmp, rowKey } from "./admin/utils";
import { useAuth } from "./shared/auth";
import { writeSection } from "./admin/persist";
import { computeOverviewMetrics } from "./admin/scoreHelpers";
import { useAdminTabs } from "./admin/hooks/useAdminTabs";
import { useAdminData } from "./admin/hooks/useAdminData";
import OverviewTab from "./admin/OverviewTab";
import ScoresTab from "./admin/ScoresTab";
import EntryControlPage from "./admin/pages/EntryControlPage";
import AuditLogPage from "./admin/pages/AuditLogPage";
import ExportPage from "./admin/pages/ExportPage";
import OrgSettingsPage from "./admin/pages/OrgSettingsPage";
import ProjectsPage from "./admin/pages/ProjectsPage";
import JurorsPage from "./admin/pages/JurorsPage";
import SemestersPage from "./admin/pages/SemestersPage";
import CriteriaPage from "./admin/pages/CriteriaPage";
import OutcomesPage from "./admin/pages/OutcomesPage";
import AlertCard from "./shared/AlertCard";
import { AdminLayout } from "./admin/layout/AdminLayout";
import { AdminHeader } from "./admin/layout/AdminHeader";
// Phase 8: Removed CSS files for pages restyled with Tailwind
// admin-layout.css — sidebar replaced in Phase 2A
// admin-summary.css — overview KPIs restyled in Phase 3
// admin-jurors.css — juror activity restyled in Phase 3
// admin-dashboard.css — charts wrapped in Phase 5A
// admin-responsive.css — Tailwind responsive utilities replace breakpoints
// admin-matrix.css — migrated to Tailwind in Phase 5C
// Kept: admin-manage.css (deep restyle pending)

const CRITERIA_LIST = CRITERIA.map((c) => ({
  id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max,
}));

const EVALUATION_VIEWS = [
  { id: "rankings", label: "Rankings" },
  { id: "analytics", label: "Analytics" },
  { id: "grid", label: "Grid" },
  { id: "details", label: "Details" },
];

export default function AdminPanel({ isDemoMode, onBack, onAuthError, onInitialLoadDone, onLogout }) {
  // ── Auth context (Phase C) ──────────────────────────────────
  const { activeOrganization, isSuper, organizations, setActiveOrganization, displayName, signOut, user } = useAuth();
  const organizationId = activeOrganization?.id || "";

  // ── Period selection (UI state — drives dropdown + hook) ─
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  // settingsDirtyRef — passed to useAdminTabs for the unsaved-change guard
  // and used in the tab click handler JSX below.
  const settingsDirtyRef = useRef(false);

  // ── Tab navigation, URL sync ────────────────────────────────
  const {
    adminTab,
    setAdminTab,
    scoresView,
    switchScoresView,
  } = useAdminTabs({ settingsDirtyRef, isDemoMode });

  // ── Data fetching, Realtime, trend, details ────────────────
  const {
    rawScores,
    summaryData,
    allJurors,
    periodList,
    sortedPeriods,
    trendData,
    trendLoading,
    trendError,
    trendPeriodIds,
    setTrendPeriodIds,
    detailsScores,
    detailsSummary,
    detailsLoading,
    loading,
    loadError,
    authError,
    lastRefresh,
    fetchData,
  } = useAdminData({
    organizationId,
    selectedPeriodId,
    onSelectedPeriodChange: setSelectedPeriodId,
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
          dept: j.affiliation.trim(),
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
        dept: d.affiliation.trim(),
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
        title: p.name ?? "",
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

  const selectedPeriod = sortedPeriods.find((s) => s.id === selectedPeriodId) ?? null;
  const selectedPeriodName = selectedPeriod?.period_name ?? "—";
  const selectedPeriodLocked = !!(selectedPeriod?.is_locked);
  const activeCriteria = getActiveCriteria(selectedPeriod?.criteria_config);

  // ── Page title for header ─────────────────────────────────
  const pageTitle = useMemo(() => {
    const titles = {
      overview: "Overview",
      settings: "Settings",
      jurors: "Jurors",
      projects: "Projects",
      periods: "Evaluation Periods",
      "entry-control": "Entry Control",
      "audit-log": "Audit Log",
      export: "Export",
      criteria: "Evaluation Criteria",
      outcomes: "Outcomes & Mapping",
    };
    if (adminTab === "scores") {
      const viewLabel = EVALUATION_VIEWS.find((v) => v.id === scoresView)?.label || "Rankings";
      return `Scores · ${viewLabel}`;
    }
    return titles[adminTab] || "Overview";
  }, [adminTab, scoresView]);

  // ── Render ────────────────────────────────────────────────
  return (
    <AdminLayout
      sidebarProps={{
        adminTab,
        scoresView,
        onNavigate: (tabId) => {
          setAdminTab(tabId);
          writeSection("tab", { adminTab: tabId });
        },
        onScoresViewChange: (viewId) => {
          setAdminTab("scores");
          switchScoresView(viewId);
        },
        activeOrganization,
        organizations,
        onTenantSwitch: setActiveOrganization,
        isSuper,
        user,
        displayName,
        onLogout,
      }}
    >
      <AdminHeader
        title={pageTitle}
        activeOrganization={activeOrganization}
        loading={loading}
        lastRefresh={lastRefresh}
        onRefresh={() => fetchData()}
        isDemoMode={isDemoMode}
        periodList={periodList}
        sortedPeriods={sortedPeriods}
        selectedPeriodId={selectedPeriodId}
        selectedPeriodName={selectedPeriodName}
        onPeriodChange={setSelectedPeriodId}
        onFetchData={fetchData}
      />

      {/* Status messages */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading data…
        </div>
      )}

      {/* Tab content */}
      {!loading && (
        <div className="p-6 md:p-8 lg:p-10">
          {selectedPeriodLocked && (adminTab === "overview" || adminTab === "scores") && (
            <AlertCard variant="warning" className="admin-lock-banner">
              Evaluations are locked for this period. Jurors cannot submit or edit scores.
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
              summaryData={summaryData}
              metrics={overviewMetrics}
              rawScores={rawScores}
              criteriaConfig={activeCriteria}
              period={selectedPeriod}
              onGoToSettings={() => setAdminTab("settings")}
            />
          )}
          {adminTab === "scores" && (
            <ScoresTab
              view={scoresView}
              ranked={ranked}
              submittedData={submittedData}
              rawScores={rawScores}
              criteriaConfig={activeCriteria}
              outcomeConfig={selectedPeriod?.outcome_config}
              detailsScores={detailsScores}
              jurors={uniqueJurors}
              matrixJurors={matrixJurors}
              groups={groups}
              periodName={selectedPeriodName}
              summaryData={summaryData}
              detailsSummary={detailsSummary}
              dashboardStats={dashboardStats}
              overviewMetrics={overviewMetrics}
              lastRefresh={lastRefresh}
              loading={loading}
              error={loadError || null}
              detailsLoading={detailsLoading}
              periodOptions={sortedPeriods}
              trendPeriodIds={trendPeriodIds}
              onTrendSelectionChange={setTrendPeriodIds}
              trendData={trendData}
              trendLoading={trendLoading}
              trendError={trendError}
            />
          )}
          {adminTab === "entry-control" && (
            <EntryControlPage
              organizationId={organizationId}
              periodId={selectedPeriodId}
              periodName={selectedPeriodName}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "audit-log" && (
            <AuditLogPage organizationId={organizationId} />
          )}
          {adminTab === "export" && (
            <ExportPage organizationId={organizationId} isDemoMode={isDemoMode} />
          )}
          {adminTab === "jurors" && (
            <JurorsPage
              organizationId={organizationId}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
              onCurrentSemesterChange={(periodId) => {
                setSelectedSemesterId(periodId);
                fetchData(periodId);
              }}
            />
          )}
          {adminTab === "projects" && (
            <ProjectsPage
              organizationId={organizationId}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
              onCurrentSemesterChange={(periodId) => {
                setSelectedSemesterId(periodId);
                fetchData(periodId);
              }}
            />
          )}
          {adminTab === "periods" && (
            <SemestersPage
              organizationId={organizationId}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
              onCurrentSemesterChange={(periodId) => {
                setSelectedSemesterId(periodId);
                fetchData(periodId);
              }}
            />
          )}
          {adminTab === "settings" && (
            <OrgSettingsPage
              organizationId={organizationId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
            />
          )}
          {adminTab === "criteria" && (
            <CriteriaPage
              organizationId={organizationId}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
              onCurrentSemesterChange={(periodId) => {
                setSelectedSemesterId(periodId);
                fetchData(periodId);
              }}
            />
          )}
          {adminTab === "outcomes" && (
            <OutcomesPage
              organizationId={organizationId}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onDirtyChange={(dirty) => { settingsDirtyRef.current = dirty; }}
              onCurrentSemesterChange={(periodId) => {
                setSelectedSemesterId(periodId);
                fetchData(periodId);
              }}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
