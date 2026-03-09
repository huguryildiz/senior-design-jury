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
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./components/toast/useToast";
import { CRITERIA } from "./config";
import {
  adminLogin,
  adminGetScores,
  adminListJurors,
  adminProjectSummary,
  listSemesters,
} from "./shared/api";
import { supabase } from "./lib/supabaseClient";
import { cmp, rowKey } from "./admin/utils";
import { readSection, writeSection } from "./admin/persist";
import { getCellState } from "./admin/scoreHelpers";
import { HomeIcon, RefreshIcon } from "./admin/components";
import {
  ListChecksIcon,
  ChartIcon,
  LayoutDashboardIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SettingsIcon,
  MedalIcon,
  TableIcon,
  Grid3x3Icon,
  PinIcon,
} from "./shared/Icons";
import OverviewTab from "./admin/OverviewTab";
import EvaluationsTab from "./admin/EvaluationsTab";
import SettingsPage from "./admin/SettingsPage";
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
  { id: "overview",    label: "Overview",    icon: LayoutDashboardIcon },
  { id: "evaluations", label: "Evaluations", icon: ListChecksIcon },
  { id: "settings",    label: "Settings",    icon: SettingsIcon },
];

const EVALUATION_VIEWS = [
  { id: "rankings",  label: "Rankings",  icon: MedalIcon },
  { id: "analytics", label: "Analytics", icon: ChartIcon },
  { id: "grid",      label: "Grid",      icon: Grid3x3Icon },
  { id: "details",   label: "Details",   icon: TableIcon },
];

function useAnchoredPopover(isOpen, deps = []) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);
  const [panelPlacement, setPanelPlacement] = useState("bottom");

  const computePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 180);
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = Math.min(rect.left, viewportW - minWidth - 12);
    left = Math.max(12, left);
    let top = rect.bottom + 6;
    let placement = "bottom";

    if (panelRef.current) {
      const panelHeight = panelRef.current.offsetHeight;
      if (top + panelHeight > viewportH - 12) {
        const aboveTop = rect.top - panelHeight - 6;
        if (aboveTop >= 12) {
          top = aboveTop;
          placement = "top";
        } else {
          top = Math.max(12, viewportH - panelHeight - 12);
        }
      }
    }

    setPanelPlacement(placement);
    setPanelStyle({
      position: "fixed",
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      minWidth: `${Math.round(minWidth)}px`,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => computePanelPosition();
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, computePanelPosition, ...deps]);

  return { triggerRef, panelRef, panelStyle, panelPlacement };
}

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
}) {
  if (semesterList.length === 0) return null;

  const { triggerRef, panelRef, panelStyle, panelPlacement } = useAnchoredPopover(
    semesterOpen,
    [selectedSemesterId, sortedSemesters.length]
  );

  const triggerClass = [
    variant === "tab"
      ? "tab tab--dropdown semester-dropdown-trigger"
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
              {s.name}
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

function EvaluationsDropdown({
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
    "tab tab--dropdown semester-dropdown-trigger evaluations-dropdown-trigger",
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
    <div className="evaluations-dropdown">
      <button
        type="button"
        className={triggerClass}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ListChecksIcon />
        <span>Evaluations</span>
        <span className="semester-dropdown-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>
      {open && createPortal(
        <ul
          ref={panelRef}
          className={`semester-dropdown-panel semester-dropdown-panel--${panelPlacement}`}
          style={panelStyle || undefined}
          role="listbox"
          aria-label="Select evaluations view"
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

export default function AdminPanel({ adminPass, onBack, onAuthError, onInitialLoadDone }) {
  // Raw score rows — normalized by api.js to match old GAS field names
  const [rawScores,  setRawScores]  = useState([]);
  // All jurors for semester (includes those with zero scores)
  const [allJurors,  setAllJurors]  = useState([]);
  // Per-project aggregates from rpc_admin_project_summary
  const [summaryData, setSummaryData] = useState([]);
  // Semester selector
  const [semesterList,       setSemesterList]       = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [semesterOpen,       setSemesterOpen]       = useState(false);
  const [evalMenuOpen,       setEvalMenuOpen]       = useState(false);

  const [loading,     setLoading]     = useState(true);
  const _toast = useToast();
  const setError     = (msg) => { if (msg) _toast.error(msg); };
  const setAuthError = (msg) => { if (msg) _toast.error(msg); };
  const normalizeTab = (value) => {
    if (value === "results" || value === "analysis") return "evaluations";
    if (value === "manage") return "settings";
    if (value === "overview" || value === "evaluations" || value === "settings") return value;
    return "overview";
  };
  const VALID_TABS = new Set(["overview", "evaluations", "settings"]);
  const [adminTab, setAdminTab] = useState(() => {
    const saved = readSection("tab");
    const savedTab = saved.adminTab || saved.activeTab;
    const normalized = normalizeTab(savedTab);
    return VALID_TABS.has(normalized) ? normalized : "overview";
  });
  const normalizeEvaluationsView = (value) => {
    if (value === "table") return "details";
    if (value === "matrix") return "grid";
    if (value === "analysis") return "analytics";
    if (value === "rankings" || value === "analytics" || value === "grid" || value === "details") return value;
    return "";
  };
  const VALID_EVALUATION_VIEWS = new Set(["rankings", "analytics", "grid", "details"]);
  const [evaluationsView, setEvaluationsView] = useState(() => {
    const saved = readSection("evaluations");
    const legacy = readSection("results");
    const savedView = saved.view || legacy.view;
    const normalized = normalizeEvaluationsView(savedView);
    return VALID_EVALUATION_VIEWS.has(normalized) ? normalized : "rankings";
  });
  function switchEvaluationsView(id) {
    setEvaluationsView(id);
    writeSection("evaluations", { view: id });
  }
  useEffect(() => {
    if (semesterOpen) setEvalMenuOpen(false);
  }, [semesterOpen]);
  useEffect(() => {
    if (evalMenuOpen) setSemesterOpen(false);
  }, [evalMenuOpen]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tabOverflow, setTabOverflow] = useState(false);
  const [tabHintLeft, setTabHintLeft] = useState(false);
  const [tabHintRight, setTabHintRight] = useState(false);
  const tabBarRef = useRef(null);

  const initialLoadFiredRef = useRef(false);
  const [adminPassState, setAdminPassState] = useState(
    () => adminPass || sessionStorage.getItem("ee492_admin_pass") || ""
  );
  const passRef = useRef(adminPassState);
  useEffect(() => {
    const next = adminPass || sessionStorage.getItem("ee492_admin_pass") || "";
    setAdminPassState(next);
  }, [adminPass]);
  useEffect(() => { passRef.current = adminPassState; }, [adminPassState]);
  const getAdminPass = () => passRef.current || sessionStorage.getItem("ee492_admin_pass") || "";
  const handleAdminPasswordChange = (nextPass) => {
    if (!nextPass) return;
    setAdminPassState(nextPass);
    passRef.current = nextPass;
    try { sessionStorage.setItem("ee492_admin_pass", nextPass); } catch {}
  };

  // Track selected semester separately so refresh uses the latest selection
  const selectedSemesterRef = useRef("");
  useEffect(() => { selectedSemesterRef.current = selectedSemesterId; }, [selectedSemesterId]);


  // ── Data fetch ────────────────────────────────────────────
  const fetchData = async (forceSemesterId) => {
    setLoading(true);
    setError("");
    try {
      const pass = getAdminPass();
      if (!pass) {
        setRawScores([]);
        setSummaryData([]);
        setAuthError("Enter the admin password to load evaluations.");
        return;
      }

      // Verify credentials first
      const valid = await adminLogin(pass);
      if (!valid) {
        setRawScores([]);
        setSummaryData([]);
        if (onAuthError) { onAuthError("Invalid password"); return; }
        setAuthError("Incorrect password.");
        return;
      }

      // Cache password for the duration of this session
      try { sessionStorage.setItem("ee492_admin_pass", pass); } catch {}

      // Always refresh semesters (IDs change after reseed)
      const sems = await listSemesters();
      setSemesterList(sems);

      // Determine target semester
      const activeId = sems.find((s) => s.is_active)?.id || "";
      const targetId =
        forceSemesterId ||
        activeId ||
        selectedSemesterRef.current ||
        sems[0]?.id;

      if (!targetId) {
        setRawScores([]);
        setSummaryData([]);
        setLoading(false);
        return;
      }
      setSelectedSemesterId(targetId);

      // Fetch scores + summary + juror list in parallel
      // adminListJurors is non-fatal: degrades gracefully if RPC not yet deployed
      const [scores, summary, jurors] = await Promise.all([
        adminGetScores(targetId, pass),
        adminProjectSummary(targetId, pass),
        adminListJurors(targetId, pass).catch(() => []),
      ]);

      setRawScores(scores);
      setSummaryData(summary);
      setAllJurors(jurors);
      setLastRefresh(new Date());
      setAuthError("");

      if (!initialLoadFiredRef.current) {
        initialLoadFiredRef.current = true;
        onInitialLoadDone?.();
      }
    } catch (e) {
      if (e.unauthorized) {
        if (onAuthError) { onAuthError("Invalid password"); return; }
        setAuthError("Incorrect password.");
        return;
      }
      if (onAuthError) { onAuthError("Connection error — try again."); return; }
      setError("Could not load data: " + e.message);
      setRawScores([]);
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Background (silent) refresh — no loading spinner, used by Realtime subscription
  const bgTimerRef = useRef(null);
  const bgRefresh = useRef(null);
  bgRefresh.current = async () => {
    const pass = getAdminPass();
    if (!pass) return;
    try {
      const sems = await listSemesters();
      setSemesterList(sems);
      const activeId = sems.find((s) => s.is_active)?.id || sems[0]?.id || "";
      const semId = activeId || selectedSemesterRef.current;
      if (!semId) return;
      if (semId !== selectedSemesterRef.current) {
        setSelectedSemesterId(semId);
      }
      const [scores, summary, jurors] = await Promise.all([
        adminGetScores(semId, pass),
        adminProjectSummary(semId, pass),
        adminListJurors(semId, pass).catch(() => []),
      ]);
      setRawScores(scores);
      setSummaryData(summary);
      setAllJurors(jurors);
      setLastRefresh(new Date());
    } catch {
      // silent — don't flash error on background sync
    }
  };

  // Live refresh (Supabase Realtime) — uses bgRefresh to avoid loading flicker
  useEffect(() => {
    if (!getAdminPass()) return;
    const scheduleBgRefresh = () => {
      if (bgTimerRef.current) return;
      bgTimerRef.current = setTimeout(() => {
        bgTimerRef.current = null;
        bgRefresh.current?.();
      }, 600);
    };

    const channel = supabase
      .channel("admin-panel-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "juror_semester_auth" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "semesters" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "jurors" }, scheduleBgRefresh)
      .subscribe();

    return () => {
      if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }
      supabase.removeChannel(channel);
    };
  }, [adminPassState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab overflow hints ─────────────────────────────────────
  const updateTabHints = () => {
    const el = tabBarRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const hasOverflow = maxScroll > 2;
    setTabOverflow(hasOverflow);
    if (!hasOverflow) { setTabHintLeft(false); setTabHintRight(false); return; }
    setTabHintLeft(el.scrollLeft > 4);
    setTabHintRight(el.scrollLeft < maxScroll - 4);
  };
  useEffect(() => {
    updateTabHints();
    window.addEventListener("resize", updateTabHints);
    return () => window.removeEventListener("resize", updateTabHints);
  }, [adminTab]);

  // ── Derived data ───────────────────────────────────────────
  // Total projects in this semester (dynamic)
  const totalProjects = summaryData.length;

  // Groups for EvaluationGrid/JurorActivity (built from summaryData so UUIDs are correct)
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

  // Unique jurors — seeded from allJurors (full list) so unscored jurors appear too
  const uniqueJurors = useMemo(() => {
    const seen = new Map();
    // Seed from allJurors first (includes jurors with 0 scores)
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
    // Fill / override with rawScores data (has same info, just ensures consistency)
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

  // Grid should show only jurors assigned to the selected semester.
  const matrixJurors = useMemo(() => {
    const assignedMap = new Map(allJurors.map((j) => [j.jurorId, j.isAssigned]));
    const hasAssignedFlag = allJurors.some((j) => typeof j.isAssigned === "boolean");
    if (hasAssignedFlag) {
      return uniqueJurors.filter((j) => assignedMap.get(j.jurorId) === true);
    }
    // Fallback: only jurors that appear in scores
    const scoreKeys = new Set(rawScores.map((r) => rowKey(r)));
    return uniqueJurors.filter((j) => scoreKeys.has(j.key));
  }, [allJurors, uniqueJurors, rawScores]);

  const assignedJurors = matrixJurors;

  // Keys of jurors who have finalized (final_submitted_at set) — used for averages & charts
  const completedJurorKeys = useMemo(
    () => new Set(assignedJurors.filter((j) => !!(j.finalSubmitted ?? j.finalSubmittedAt)).map((j) => j.key)),
    [assignedJurors]
  );

  // Rows from completed jurors only, fully scored (total !== null)
  // Used for all averages, charts, and evaluation counts
  const submittedData = useMemo(
    () => rawScores.filter((r) => completedJurorKeys.has(rowKey(r)) && r.total !== null),
    [rawScores, completedJurorKeys]
  );

  // For DashboardTab: summaryData as dashboardStats
  // DashboardTab receives the same shape as old projectStats
  const dashboardStats = useMemo(
    () =>
      summaryData.map((p) => ({
        id:       p.id,
        name:     `Group ${p.groupNo}`,
        students: p.students,
        count:    p.count,
        avg:      p.avg,
        totalAvg: p.totalAvg,
        totalMin: p.totalMin,
        totalMax: p.totalMax,
      })),
    [summaryData]
  );

  // For RankingsTab: ranked by totalAvg descending
  const ranked = useMemo(
    () => [...summaryData].sort((a, b) => b.totalAvg - a.totalAvg),
    [summaryData]
  );

  // jurorStats for juror activity
  const jurorStats = useMemo(() => {
    return assignedJurors.map((j) => {
      const { key, name, dept, jurorId, editEnabled, finalSubmitted, finalSubmittedAt } = j;
      const rows     = rawScores.filter((d) => rowKey(d) === key);
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

  // overviewMetrics for dashboard cards
  const overviewMetrics = useMemo(() => {
    const assignedIds = new Set(assignedJurors.map((j) => j.jurorId));
    const totalJurors = assignedJurors.length;

    // Count fully-scored rows per juror (total !== null = all 4 criteria filled)
    const scoredByJuror = new Map();
    const startedByJuror = new Map();
    let scoredEvaluations = 0;
    let partialEvaluations = 0;
    rawScores.forEach((r) => {
      if (assignedIds.size > 0 && !assignedIds.has(r.jurorId)) return;
      const cellState = getCellState(r);
      if (cellState === "scored") scoredEvaluations += 1;
      if (cellState === "partial") partialEvaluations += 1;
      if (r.total === null || r.total === undefined) return;
      const key = rowKey(r);
      scoredByJuror.set(key, (scoredByJuror.get(key) || 0) + 1);
    });
    rawScores.forEach((r) => {
      if (assignedIds.size > 0 && !assignedIds.has(r.jurorId)) return;
      if (getCellState(r) === "empty") return;
      const key = rowKey(r);
      startedByJuror.set(key, (startedByJuror.get(key) || 0) + 1);
    });

    const editingJurors = assignedJurors.filter((j) =>
      !!(j.editEnabled ?? j.edit_enabled)
    ).length;

    const completedJurors = assignedJurors.filter((j) => {
      const isEditing = !!(j.editEnabled ?? j.edit_enabled);
      return !isEditing && !!(j.finalSubmitted ?? j.finalSubmittedAt);
    }).length;
    const totalEvaluations = totalJurors * totalProjects;
    const emptyEvaluations = Math.max(
      totalEvaluations - scoredEvaluations - partialEvaluations,
      0
    );

    const readyToSubmitJurors = assignedJurors.filter((j) => {
      const isEditing = !!(j.editEnabled ?? j.edit_enabled);
      const isFinal = !!(j.finalSubmitted ?? j.finalSubmittedAt);
      if (isEditing || isFinal) return false;
      return totalProjects > 0 && (scoredByJuror.get(j.key) || 0) >= totalProjects;
    }).length;

    const inProgressJurors = assignedJurors.filter((j) => {
      const isEditing = !!(j.editEnabled ?? j.edit_enabled);
      const isFinal = !!(j.finalSubmitted ?? j.finalSubmittedAt);
      if (isEditing || isFinal) return false;
      const started = startedByJuror.get(j.key) || 0;
      const scored = scoredByJuror.get(j.key) || 0;
      return started > 0 && scored < totalProjects;
    }).length;

    const notStartedJurors = assignedJurors.filter((j) => {
      const isEditing = !!(j.editEnabled ?? j.edit_enabled);
      if (isEditing) return false;
      const isFinal = !!(j.finalSubmitted ?? j.finalSubmittedAt);
      if (isFinal) return false;
      return (startedByJuror.get(j.key) || 0) === 0;
    }).length;

    return {
      completedJurors,
      readyToSubmitJurors,
      totalJurors,
      totalEvaluations,
      totalProjects,
      scoredEvaluations,
      partialEvaluations,
      emptyEvaluations,
      inProgressJurors,
      editingJurors,
      notStartedJurors,
    };
  }, [rawScores, assignedJurors, totalProjects]);

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
    } catch {}
  }, [overviewMetrics.totalJurors, overviewMetrics.completedJurors, lastRefresh]);

  const lastRefreshTime = lastRefresh
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(lastRefresh)
    : "";

  // Semester list sorted descending: year DESC, then Fall > Summer > Spring
  const sortedSemesters = useMemo(() => {
    const TERM_RANK = { fall: 3, summer: 2, spring: 1, winter: 0 };
    const getYear = (sem) => {
      const label = String(sem?.name || "");
      const match = label.match(/\d{4}/);
      if (match) return Number(match[0]) || 0;
      if (sem?.poster_date) return Number(String(sem.poster_date).slice(0, 4)) || 0;
      return 0;
    };
    const getTermRank = (sem) => {
      const t = String(sem?.name || "").toLowerCase();
      if (t.includes("fall")) return TERM_RANK.fall;
      if (t.includes("summer")) return TERM_RANK.summer;
      if (t.includes("spring")) return TERM_RANK.spring;
      if (t.includes("winter")) return TERM_RANK.winter;
      return -1;
    };
    return semesterList.slice().sort((a, b) => {
      const yearDiff = getYear(b) - getYear(a);
      if (yearDiff !== 0) return yearDiff;
      const termDiff = getTermRank(b) - getTermRank(a);
      if (termDiff !== 0) return termDiff;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [semesterList]);
  const selectedSemesterName = sortedSemesters.find((s) => s.id === selectedSemesterId)?.name ?? "—";
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
        />
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="admin-screen">

      {/* Header */}
      <div className="form-header">
        <div className="form-header-main">
          <div className="header-left">
            <button className="back-btn" onClick={onBack} aria-label="Return Home">
              <HomeIcon />
            </button>
            <div className="header-title">
              <div className="admin-title-row">
                <h2>Admin Panel</h2>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              {lastRefresh && (
                <span className="last-updated">
                  <ClockIcon />
                  <span className="last-updated-time">{lastRefreshTime}</span>
                </span>
              )}
              <button
                className={`refresh-btn${loading ? " is-loading" : ""}`}
                onClick={() => fetchData()}
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar-wrap">
          <div className="tab-bar-row">
            <div className="tab-context">
              {renderSemesterControl("semester-control--tab", { variant: "chip", leadingIcon: PinIcon })}
            </div>
            <div className="tab-bar-shell" ref={tabBarRef} onScroll={updateTabHints}>
              <div className="tab-bar">
                {TABS.map((t) => {
                  if (t.id === "evaluations") {
                    return (
                      <EvaluationsDropdown
                        key={t.id}
                        open={evalMenuOpen}
                        setOpen={setEvalMenuOpen}
                        activeView={evaluationsView}
                        onSelect={(id) => {
                          setAdminTab("evaluations");
                          switchEvaluationsView(id);
                        }}
                        isActive={adminTab === "evaluations" || evalMenuOpen}
                      />
                    );
                  }
                  return (
                    <button
                      key={t.id}
                      className={`tab ${adminTab === t.id ? "active" : ""}`}
                      onClick={() => { setAdminTab(t.id); writeSection("tab", { adminTab: t.id }); }}
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
      </div>

      {/* Status messages */}
      {loading && <div className="loading">Loading data…</div>}

      {/* Tab content */}
      {!loading && (
        <div className="admin-body">
          {adminTab === "overview" && (
            <OverviewTab
              jurorStats={jurorStats}
              groups={groups}
              metrics={overviewMetrics}
            />
          )}
          {adminTab === "evaluations" && (
            <EvaluationsTab
              view={evaluationsView}
              ranked={ranked}
              submittedData={submittedData}
              rawScores={rawScores}
              jurors={uniqueJurors}
              matrixJurors={matrixJurors}
              groups={groups}
              semesterName={selectedSemesterName}
              summaryData={summaryData}
              dashboardStats={dashboardStats}
              overviewMetrics={overviewMetrics}
              lastRefresh={lastRefresh}
              loading={loading}
            />
          )}
          {adminTab === "settings" && (
            <SettingsPage
              adminPass={adminPassState || getAdminPass()}
              onAdminPasswordChange={handleAdminPasswordChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
