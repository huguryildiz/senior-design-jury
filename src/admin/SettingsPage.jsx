// src/admin/SettingsPage.jsx
// ============================================================
// Admin settings page: semesters, projects, jurors, permissions.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../components/toast/useToast";
import {
  listSemesters,
  adminListJurors,
  adminGetScores,
  adminProjectSummary,
  adminSetActiveSemester,
  adminCreateSemester,
  adminUpdateSemester,
  adminListProjects,
  adminCreateProject,
  adminUpsertProject,
  adminCreateJuror,
  adminUpdateJuror,
  adminResetJurorPin,
  adminSetJurorEditMode,
  adminForceCloseJurorEditMode,
  adminDeleteEntity,
  adminDeleteCounts,
  adminSecurityState,
  adminListAuditLogs,
  adminSetSemesterEvalLock,
  adminFullExport,
  adminFullImport,
} from "../shared/api";
import { supabase } from "../lib/supabaseClient";
import { ChevronDownIcon, CloudUploadIcon, DatabaseBackupIcon, DownloadIcon, FileDownIcon, HistoryIcon, UploadIcon, FileUpIcon, KeyRoundIcon, LockIcon, CircleXLucideIcon, SearchIcon, TriangleAlertIcon } from "../shared/Icons";
import { exportXLSX, exportAuditLogsXLSX, buildExportFilename } from "./utils";
import { getCellState } from "./scoreHelpers";
import SemesterSettingsPanel from "./ManageSemesterPanel";
import ProjectSettingsPanel from "./ManageProjectsPanel";
import JurorSettingsPanel from "./ManageJurorsPanel";
import AccessSettingsPanel from "./ManagePermissionsPanel";
import AdminSecurityPanel from "../components/admin/AdminSecurityPanel";
import DeleteConfirmDialog from "../components/admin/DeleteConfirmDialog";
import {
  APP_DATE_MIN_YEAR,
  APP_DATE_MAX_YEAR,
  APP_DATE_MIN_DATE,
  APP_DATE_MAX_DATE,
  APP_DATE_MIN_DATETIME,
  APP_DATE_MAX_DATETIME,
  isValidDateParts,
  isIsoDateWithinBounds,
} from "../shared/dateBounds";
import { sortSemestersByPosterDateDesc } from "../shared/semesterSort";

const defaultSettings = {
  evalLockActive: false,
};

const AUDIT_PAGE_SIZE = 120;
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MIN_BACKUP_DELAY = 1200;
const SAMPLE_DB_BACKUP_JSON = `{
  "schema_version": 1,
  "semesters": [{ "...": "..." }],
  "jurors": [{ "...": "..." }],
  "projects": [{ "...": "..." }],
  "scores": [{ "...": "..." }],
  "juror_semester_auth": [{ "...": "..." }]
}`;

const defaultAuditFilters = {
  startDate: "",
  endDate: "",
};

const formatAuditTimestamp = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  const day = String(dt.getDate()).padStart(2, "0");
  const month = dt.toLocaleString("en-GB", { month: "short" });
  const year = dt.getFullYear();
  const hours = String(dt.getHours()).padStart(2, "0");
  const minutes = String(dt.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

const AUDIT_MIN_YEAR = APP_DATE_MIN_YEAR;
const AUDIT_MAX_YEAR = APP_DATE_MAX_YEAR;
const AUDIT_MIN_DATETIME = APP_DATE_MIN_DATETIME;
const AUDIT_MAX_DATETIME = APP_DATE_MAX_DATETIME;
const SEMESTER_MIN_DATE = APP_DATE_MIN_DATE;
const SEMESTER_MAX_DATE = APP_DATE_MAX_DATE;

const isSemesterPosterDateInRange = (value) => {
  return isIsoDateWithinBounds(value, { minDate: SEMESTER_MIN_DATE, maxDate: SEMESTER_MAX_DATE });
};

const normalizeStudentNames = (value) => {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, ";")
    .replace(/[,/|&]+/g, ";")
    .replace(/\s+-\s+/g, ";")
    .replace(/;+/g, ";")
    .split(";")
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("; ");
};

const getJurorNameById = (list, jurorId) => {
  const target = (list || []).find((j) => String(j?.juror_id || j?.jurorId || "") === String(jurorId || ""));
  return String(target?.juryName || target?.juror_name || "").trim();
};

const buildDeleteToastMessage = (type, label) => {
  const raw = String(label || "").trim();
  if (type === "project") {
    const groupNo = raw.replace(/^Group\s+/i, "").trim();
    return groupNo ? `Group ${groupNo} deleted` : "Group deleted";
  }
  if (type === "juror") {
    const jurorName = raw.replace(/^Juror\s+/i, "").trim();
    return jurorName ? `Juror ${jurorName} deleted` : "Juror deleted";
  }
  if (type === "semester") {
    const semesterName = raw.replace(/^Semester\s+/i, "").trim();
    return semesterName ? `Semester ${semesterName} deleted` : "Semester deleted";
  }
  return raw ? `${raw} deleted` : "Item deleted";
};

const isValidTimeParts = (hh, mi, ss) => {
  if (hh < 0 || hh > 23) return false;
  if (mi < 0 || mi > 59) return false;
  if (ss < 0 || ss > 59) return false;
  return true;
};

const monthLookup = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const normalizeSearchYear = (yearToken) => {
  if (!yearToken) return null;
  const raw = String(yearToken);
  if (!/^\d{2,4}$/.test(raw)) return null;
  if (raw.length === 2) return 2000 + Number(raw);
  return Number(raw);
};

const parseSearchDateParts = (value) => {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return null;
  let match = query.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*(\d{2,4})?$/i);
  if (match) {
    const month = monthLookup[match[1].toLowerCase()];
    const year = normalizeSearchYear(match[2]);
    if (!month) return null;
    return { day: null, month, year };
  }
  match = query.match(/^(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*(\d{2,4})?$/i);
  if (match) {
    const day = Number(match[1]);
    const month = monthLookup[match[2].toLowerCase()];
    const year = normalizeSearchYear(match[3]);
    if (!month || day < 1 || day > 31) return null;
    if (year && !isValidDateParts(year, month, day)) return null;
    return { day, month, year };
  }
  match = query.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = normalizeSearchYear(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (year && !isValidDateParts(year, month, day)) return null;
    return { day, month, year };
  }
  match = query.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return { day, month, year };
  }
  return null;
};

const isValidAuditYear = (year) => year >= AUDIT_MIN_YEAR && year <= AUDIT_MAX_YEAR;

const parseAuditDateString = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [datePart, timePart] = value.split("T");
    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    const [hh, mi, ss = "0"] = timePart.split(":").map(Number);
    if (!isValidAuditYear(yyyy)) return null;
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    if (!isValidTimeParts(hh, mi, ss)) return null;
    return { ms: new Date(yyyy, mm - 1, dd, hh, mi, ss).getTime(), isDateOnly: false };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-").map(Number);
    if (!isValidAuditYear(yyyy)) return null;
    if (!isValidDateParts(yyyy, mm, dd)) return null;
    return { ms: new Date(yyyy, mm - 1, dd).getTime(), isDateOnly: true };
  }
  return null;
};

const getAuditDateRangeError = (filters) => {
  const start = filters?.startDate || "";
  const end = filters?.endDate || "";
  const parsedStart = start ? parseAuditDateString(start) : null;
  const parsedEnd = end ? parseAuditDateString(end) : null;
  if ((start && !parsedStart) || (end && !parsedEnd)) {
    return "Invalid date format. Use YYYY-MM-DDThh:mm.";
  }
  if (parsedStart && parsedEnd && parsedStart.ms > parsedEnd.ms) {
    return "The 'From' date/time cannot be later than the 'To' date/time.";
  }
  return "";
};

const buildAuditParams = (filters, limit, cursor, searchText) => {
  let startAt = null;
  let endAt = null;
  if (filters.startDate) {
    const parsed = parseAuditDateString(filters.startDate);
    if (parsed) {
      startAt = new Date(parsed.ms);
    }
  }
  if (filters.endDate) {
    const parsed = parseAuditDateString(filters.endDate);
    if (parsed) {
      const endMs = parsed.ms + (parsed.isDateOnly ? (24 * 60 * 60 * 1000 - 1) : 0);
      endAt = new Date(endMs);
    }
  }
  const search = String(searchText || "").trim();
  const searchDate = parseSearchDateParts(search);
  return {
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    actorTypes: null,
    actions: null,
    limit: limit || AUDIT_PAGE_SIZE,
    beforeAt: cursor?.beforeAt || null,
    beforeId: cursor?.beforeId || null,
    search: search ? search : null,
    searchDay: searchDate?.day || null,
    searchMonth: searchDate?.month || null,
    searchYear: searchDate?.year || null,
  };
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, [query]);
  return matches;
}

export default function SettingsPage({ adminPass, onAdminPasswordChange, selectedSemesterId = "", onDirtyChange }) {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const isSmallMobile = useMediaQuery("(max-width: 500px)");
  const supportsInfiniteScroll = typeof window !== "undefined" && "IntersectionObserver" in window;
  const [openPanels, setOpenPanels] = useState(() => {
    // On small mobile, start with only one panel open (or all closed)
    const isSM = typeof window !== "undefined" && window.innerWidth <= 500;
    return {
      semester: !isSM,
      projects: !isSM,
      jurors: !isSM,
      permissions: !isSM,
      security: !isSM,
      audit: !isSM,
      export: !isSM,
      dbbackup: !isSM,
    };
  });

  const [panelDirty, setPanelDirty] = useState({ semester: false, projects: false, jurors: false });
  const handlePanelDirty = useCallback((panel, dirty) => {
    setPanelDirty((prev) => {
      if (prev[panel] === dirty) return prev;
      const next = { ...prev, [panel]: dirty };
      const anyDirty = Object.values(next).some(Boolean);
      onDirtyChange?.(anyDirty);
      return next;
    });
  }, [onDirtyChange]);

  const [semesterList, setSemesterList] = useState([]);
  const [activeSemesterId, setActiveSemesterId] = useState("");
  const [projects, setProjects] = useState([]);
  const [jurors, setJurors] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };
  const [panelErrors, setPanelErrors] = useState({
    semester: "",
    projects: "",
    jurors: "",
  });
  const setPanelError = (panel, err) => {
    setPanelErrors((prev) => ({ ...prev, [panel]: err || "" }));
  };
  const clearPanelError = (panel) => setPanelError(panel, "");
  const clearAllPanelErrors = () => {
    setPanelErrors({
      semester: "",
      projects: "",
      jurors: "",
    });
  };
  const [resetPinInfo, setResetPinInfo] = useState(null);
  const [pinResetTarget, setPinResetTarget] = useState(null);
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCounts, setDeleteCounts] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditFilters, setAuditFilters] = useState(defaultAuditFilters);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditHasMore, setAuditHasMore] = useState(true);
  const [auditCursor, setAuditCursor] = useState(null);
  const [auditExporting, setAuditExporting] = useState(false);
  const [showAllAuditLogs, setShowAllAuditLogs] = useState(false);
  const auditSearchRef = useRef("");
  const jurorTimerRef = useRef(null);  // debounce for loadJurors-only refetch
  const auditTimerRef = useRef(null);  // debounce for loadAuditLogs refetch
  const pinCopyTimerRef = useRef(null);
  const adminSecurityRef = useRef(null);
  const auditCardRef = useRef(null);
  const auditScrollRef = useRef(null);
  const auditSentinelRef = useRef(null);
  const localTimeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
    } catch {
      return "Local time";
    }
  })();
  const importFileRef = useRef(null);

  const [dbBackupMode, setDbBackupMode] = useState(null); // null | 'export' | 'import'
  const [dbBackupPassword, setDbBackupPassword] = useState("");
  const [dbImportData, setDbImportData] = useState(null);
  const [dbImportFileName, setDbImportFileName] = useState("");
  const [dbImportFileSize, setDbImportFileSize] = useState(0);
  const [dbImportDragging, setDbImportDragging] = useState(false);
  const [dbBackupConfirmText, setDbBackupConfirmText] = useState("");
  const [dbBackupLoading, setDbBackupLoading] = useState(false);
  const [dbBackupError, setDbBackupError] = useState("");
  const [dbImportSuccess, setDbImportSuccess] = useState("");
  const [dbImportWarning, setDbImportWarning] = useState("");
  const [backupPasswordSet, setBackupPasswordSet] = useState(true);
  const [evalLockConfirmOpen, setEvalLockConfirmOpen] = useState(false);
  const [evalLockConfirmNext, setEvalLockConfirmNext] = useState(false);
  const [evalLockConfirmLoading, setEvalLockConfirmLoading] = useState(false);
  const [evalLockError, setEvalLockError] = useState("");

  const copyPinToClipboard = async (pinValue) => {
    if (!pinValue) return false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(pinValue);
        return true;
      }
    } catch (copyError) {
      // fallback below
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = pinValue;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (fallbackError) {
      return false;
    }
  };

  useEffect(() => {
    setPinCopied(false);
    if (pinCopyTimerRef.current) {
      clearTimeout(pinCopyTimerRef.current);
      pinCopyTimerRef.current = null;
    }
  }, [resetPinInfo]);

  const activeSemester = useMemo(
    () => semesterList.find((s) => s.id === activeSemesterId) || null,
    [semesterList, activeSemesterId]
  );
  const activeSemesterLabel = activeSemester?.name || "—";
  const viewSemesterId = useMemo(() => {
    if (selectedSemesterId && semesterList.some((s) => s.id === selectedSemesterId)) return selectedSemesterId;
    return activeSemesterId || "";
  }, [selectedSemesterId, semesterList, activeSemesterId]);
  const viewSemester = useMemo(
    () => semesterList.find((s) => s.id === viewSemesterId) || null,
    [semesterList, viewSemesterId]
  );
  const viewSemesterLabel = viewSemester?.name || "—";

  useEffect(() => {
    setSettings({ evalLockActive: Boolean(viewSemester?.is_locked) });
  }, [viewSemester?.id, viewSemester?.is_locked]);

  useEffect(() => {
    let active = true;
    adminSecurityState()
      .then((state) => {
        if (!active) return;
        setBackupPasswordSet(Boolean(state?.backup_password_set));
      })
      .catch(() => {
        if (!active) return;
        setBackupPasswordSet(true);
      });
    return () => { active = false; };
  }, []);

  const togglePanel = (id) => {
    setOpenPanels((prev) => {
      const isCurrentlyOpen = prev[id];
      if (isCurrentlyOpen) {
        return { ...prev, [id]: false };
      }
      // Single-open: close all other panels when opening a new one
      const next = {};
      for (const key of Object.keys(prev)) {
        next[key] = key === id;
      }
      return next;
    });
  };

  const loadSemesters = useCallback(async () => {
    const sems = await listSemesters();
    setSemesterList(sems);
    const active = sems.find((s) => s.is_active) || sems[0];
    setActiveSemesterId(active?.id || "");
  }, []);

  const refreshSemesters = useCallback(async () => {
    const sems = await listSemesters();
    setSemesterList(sems);
    if (!activeSemesterId || !sems.some((s) => s.id === activeSemesterId)) {
      const active = sems.find((s) => s.is_active) || sems[0];
      setActiveSemesterId(active?.id || "");
    }
  }, [activeSemesterId]);

  const loadProjects = useCallback(async (semesterId) => {
    if (!semesterId || !adminPass) return;
    const rows = await adminListProjects(semesterId, adminPass);
    setProjects(rows || []);
  }, [adminPass]);

  const loadJurors = useCallback(async () => {
    if (!adminPass) return;
    const [rows, scoreRows] = await Promise.all([
      adminListJurors(viewSemesterId, adminPass),
      adminGetScores(viewSemesterId, adminPass),
    ]);
    const scoredByJuror = new Map();
    const startedByJuror = new Map();
    (scoreRows || []).forEach((r) => {
      const jurorId = String(r?.jurorId || "").trim();
      if (!jurorId) return;
      const cellState = getCellState(r);
      if (cellState === "scored") {
        scoredByJuror.set(jurorId, (scoredByJuror.get(jurorId) || 0) + 1);
      }
      if (cellState !== "empty") {
        startedByJuror.set(jurorId, (startedByJuror.get(jurorId) || 0) + 1);
      }
    });
    const mapped = (rows || []).map((j) => {
      const toBool = (v) => v === true || v === "true" || v === "t" || v === 1;
      const jurorId = String(j?.jurorId || j?.juror_id || "").trim();
      const totalProjects = Math.max(
        0,
        Number(j?.totalProjects ?? j?.total_projects ?? 0) || 0
      );
      const scoredProjects = scoredByJuror.get(jurorId) || 0;
      const startedProjects = startedByJuror.get(jurorId) || 0;
      const editEnabled = toBool(j?.editEnabled ?? j?.edit_enabled);
      const isCompleted = Boolean(j?.finalSubmittedAt || j?.final_submitted_at);
      const overviewStatus = editEnabled
        ? "editing"
        : isCompleted
          ? "completed"
          : (totalProjects > 0 && scoredProjects >= totalProjects)
            ? "ready_to_submit"
            : startedProjects > 0
              ? "in_progress"
              : "not_started";
      return {
        ...j,
        overviewStatus,
        overviewTotalProjects: totalProjects,
        overviewScoredProjects: scoredProjects,
        overviewStartedProjects: startedProjects,
      };
    });
    setJurors(mapped);
  }, [adminPass, viewSemesterId]);

  useEffect(() => {
    auditSearchRef.current = auditSearch;
  }, [auditSearch]);

  const loadAuditLogs = useCallback(async (filters, options = {}) => {
    if (!adminPass) return;
    const mode = options.mode || "replace";
    const cursor = options.cursor || null;
    const searchTerm = options.search ?? auditSearchRef.current;
    setAuditLoading(true);
    setAuditError("");
    const rangeError = getAuditDateRangeError(filters || defaultAuditFilters);
    if (rangeError) {
      setAuditError(rangeError);
      setAuditLogs([]);
      setAuditCursor(null);
      setAuditHasMore(false);
      setAuditLoading(false);
      return;
    }
    try {
      const params = buildAuditParams(filters || defaultAuditFilters, AUDIT_PAGE_SIZE, cursor, searchTerm);
      const rawRows = await adminListAuditLogs(params, adminPass);
      const rows = (rawRows || []).filter((row) => row?.action !== "admin_login_success");
      if (mode === "append") {
        setAuditLogs((prev) => [...prev, ...(rows || [])]);
      } else {
        setAuditLogs(rows || []);
      }
      setAuditHasMore((rawRows || []).length >= (params.limit || AUDIT_PAGE_SIZE));
      if (rawRows && rawRows.length > 0) {
        const last = rawRows[rawRows.length - 1];
        setAuditCursor({ beforeAt: last.created_at, beforeId: last.id });
      }
    } catch (e) {
      setAuditError(e?.message || "Could not load audit logs. Try again or adjust filters.");
    } finally {
      setAuditLoading(false);
    }
  }, [adminPass]);

  const applySemesterPatch = useCallback((patch) => {
    if (!patch?.id) return;
    setSemesterList((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === patch.id);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          ...patch,
          updated_at: patch.updated_at || next[idx].updated_at || new Date().toISOString(),
        };
      } else {
        next.push({
          ...patch,
          updated_at: patch.updated_at || new Date().toISOString(),
        });
      }
      return sortSemestersByPosterDateDesc(next);
    });
  }, []);

  const applyProjectPatch = useCallback((patch) => {
    if (!patch) return;
    setProjects((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (p) =>
          (patch.id && p.id === patch.id)
          || (
            patch.group_no != null
            && p.group_no === patch.group_no
            && (!patch.semester_id || p.semester_id === patch.semester_id)
          )
      );
      const updated = {
        ...((idx >= 0 ? next[idx] : {}) || {}),
        ...patch,
        updated_at: patch.updated_at || (idx >= 0 ? next[idx]?.updated_at : null) || new Date().toISOString(),
      };
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      return next;
    });
  }, []);

  const applyJurorPatch = useCallback((patch) => {
    if (!patch) return;
    const jurorId = patch.juror_id || patch.jurorId || patch.id;
    if (!jurorId) return;
    setJurors((prev) => {
      const next = [...prev];
      const idx = next.findIndex((j) => (j.juror_id || j.jurorId) === jurorId);
      const updated = {
        ...((idx >= 0 ? next[idx] : {}) || {}),
        ...patch,
      };
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      return next;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    clearPanelError("semester");
    loadSemesters()
      .catch(() => setPanelError("semester", "Could not load semesters. Try refreshing or check your connection."))
      .finally(() => setLoading(false));
  }, [loadSemesters]);

  useEffect(() => {
    if (!viewSemesterId) return;
    if (!adminPass) {
      setEvalLockError("Admin password missing. Please re-login.");
      return;
    }
    setLoading(true);
    clearPanelError("projects");
    clearPanelError("jurors");
    Promise.all([
      loadProjects(viewSemesterId),
      loadJurors(),
    ])
      .catch((e) => {
        const message = e?.message || "Could not load settings data. Check admin password or refresh.";
        setPanelError("projects", message);
        setPanelError("jurors", message);
      })
      .finally(() => setLoading(false));
  }, [viewSemesterId, adminPass, loadProjects, loadJurors]);

  useEffect(() => {
    if (!adminPass) return;
    loadAuditLogs(auditFilters, { mode: "replace", cursor: null });
  }, [adminPass, auditFilters, loadAuditLogs]);

  // Background refresh (no full-page reload).
  useEffect(() => {
    if (!adminPass) return;
    const interval = setInterval(() => {
      if (!viewSemesterId) return;
      Promise.all([
        loadProjects(viewSemesterId),
        loadJurors(),
      ]).catch(() => {});
      refreshSemesters().catch(() => {});
    }, 5_000);
    return () => clearInterval(interval);
  }, [adminPass, viewSemesterId, loadProjects, loadJurors, refreshSemesters]);

  const AUDIT_COMPACT_COUNT = isMobile ? 3 : 4;
  const hasAuditToggle = auditHasMore || auditLogs.length > AUDIT_COMPACT_COUNT;
  const visibleAuditLogs = showAllAuditLogs
    ? auditLogs
    : auditLogs.slice(0, AUDIT_COMPACT_COUNT);
  const auditRangeError = getAuditDateRangeError(auditFilters);
  const hasAuditFilters = Boolean(
    auditSearch.trim()
    || auditFilters.startDate
    || auditFilters.endDate
  );
  const showAuditLoadingHint = auditLoading && auditLogs.length === 0;

  useEffect(() => {
    if (!hasAuditToggle && showAllAuditLogs) {
      setShowAllAuditLogs(false);
    }
  }, [hasAuditToggle, showAllAuditLogs]);

  // Note: Audit log height is driven by its own "show all / show fewer" state.

  // Debounced juror-only refetch (enriched data: auth status, completion counts, etc.)
  const scheduleJurorRefresh = useCallback(() => {
    if (!adminPass) return;
    if (jurorTimerRef.current) return;
    jurorTimerRef.current = setTimeout(() => {
      jurorTimerRef.current = null;
      loadJurors().catch(() => {});
    }, 400);
  }, [adminPass, loadJurors]);

  // Debounced audit log refetch (respects current filters)
  const scheduleAuditRefresh = useCallback(() => {
    if (!adminPass) return;
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    auditTimerRef.current = setTimeout(() => {
      auditTimerRef.current = null;
      loadAuditLogs(auditFilters, { mode: "replace", cursor: null }).catch(() => {});
    }, 600);
  }, [adminPass, auditFilters, loadAuditLogs]);

  // Debounced search refetch (server-side search, reset pagination)
  useEffect(() => {
    if (!adminPass) return;
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    setAuditCursor(null);
    setAuditHasMore(true);
    auditTimerRef.current = setTimeout(() => {
      auditTimerRef.current = null;
      loadAuditLogs(auditFilters, { mode: "replace", cursor: null }).catch(() => {});
    }, 350);
    return () => {
      if (auditTimerRef.current) {
        clearTimeout(auditTimerRef.current);
        auditTimerRef.current = null;
      }
    };
  }, [auditSearch, adminPass, auditFilters, loadAuditLogs]);

  // Infinite scroll: load older audit logs when the sentinel comes into view
  useEffect(() => {
    if (!supportsInfiniteScroll) return;
    const root = auditScrollRef.current;
    const sentinel = auditSentinelRef.current;
    if (!root || !sentinel) return;
    if (!auditHasMore || auditLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!auditHasMore || auditLoading) return;
        if (!auditCursor) return;
        loadAuditLogs(auditFilters, { mode: "append", cursor: auditCursor });
      },
      { root, rootMargin: "200px 0px", threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [supportsInfiniteScroll, auditHasMore, auditLoading, auditCursor, auditFilters, loadAuditLogs]);

  useEffect(() => {
    if (!adminPass) return;

    const channel = supabase
      .channel("admin-manage-live")

      // ── semesters: patch in-place, no full reload ──────────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "semesters" }, (payload) => {
        if (payload.new?.id) applySemesterPatch(payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "semesters" }, (payload) => {
        if (payload.new?.id) {
          applySemesterPatch(payload.new);
          if (payload.new.is_active) setActiveSemesterId(payload.new.id);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "semesters" }, (payload) => {
        const deletedId = payload.old?.id;
        if (!deletedId) return;
        setSemesterList((prev) => {
          const next = prev.filter((s) => s.id !== deletedId);
          setActiveSemesterId((cur) => {
            if (cur !== deletedId) return cur;
            const active = next.find((s) => s.is_active) || next[0];
            return active?.id || "";
          });
          return next;
        });
      })

      // ── projects: patch in-place for viewed semester ───────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects" }, (payload) => {
        if (payload.new?.semester_id === viewSemesterId) applyProjectPatch(payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, (payload) => {
        if (payload.new?.semester_id === viewSemesterId) applyProjectPatch(payload.new);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects" }, (payload) => {
        const deletedId = payload.old?.id;
        if (deletedId) setProjects((prev) => prev.filter((p) => p.id !== deletedId));
      })

      // ── jurors / auth / scores: enriched → refetch jurors only
      .on("postgres_changes", { event: "*", schema: "public", table: "jurors" }, scheduleJurorRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "juror_semester_auth" }, scheduleJurorRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, scheduleJurorRefresh)

      // ── audit_logs: debounced reload respecting filters ────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, scheduleAuditRefresh)

      .subscribe();

    return () => {
      if (jurorTimerRef.current) { clearTimeout(jurorTimerRef.current); jurorTimerRef.current = null; }
      if (auditTimerRef.current) { clearTimeout(auditTimerRef.current); auditTimerRef.current = null; }
      supabase.removeChannel(channel);
    };
  }, [
    adminPass,
    viewSemesterId,
    applySemesterPatch,
    applyProjectPatch,
    scheduleJurorRefresh,
    scheduleAuditRefresh,
  ]);

  const handleSetActiveSemester = async (semesterId) => {
    setMessage("");
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    setLoading(true);
    try {
      const nextSemesterName = semesterList.find((s) => s.id === semesterId)?.name || "";
      await adminSetActiveSemester(semesterId, adminPass);
      setSemesterList((prev) =>
        prev.map((s) => ({ ...s, is_active: s.id === semesterId }))
      );
      setActiveSemesterId(semesterId);
      setMessage(nextSemesterName ? `Current semester set to ${nextSemesterName}.` : "Current semester set.");
      return { ok: true };
    } catch (e) {
      setPanelError("semester", e?.message || "Could not update active semester. Try again or re-login.");
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async (payload) => {
    setMessage("");
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    if (!isSemesterPosterDateInRange(payload?.poster_date)) {
      return { ok: false, fieldErrors: { poster_date: `Poster date must be between ${SEMESTER_MIN_DATE} and ${SEMESTER_MAX_DATE}.` } };
    }
    setLoading(true);
    try {
      const created = await adminCreateSemester(payload, adminPass);
      if (created?.id) {
        applySemesterPatch(created);
      } else {
        applySemesterPatch({
          id: `temp-${Date.now()}`,
          name: payload.name,
          poster_date: payload.poster_date,
          is_active: false,
        });
      }
      const semesterName = String(payload?.name || created?.name || "").trim();
      setMessage(semesterName ? `Semester ${semesterName} created` : "Semester created");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("semester_name_exists")
        || msgLower.includes("semesters_name_ci_unique")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        return { ok: false, fieldErrors: { name: "Semester name already exists." } };
      } else if (msg.includes("semester_name_required")) {
        return { ok: false, fieldErrors: { name: "Semester name is required." } };
      } else {
        setPanelError("semester", msg || "Could not create semester. Try again or check admin password.");
        return { ok: false };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSemester = async (payload) => {
    setMessage("");
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    if (!isSemesterPosterDateInRange(payload?.poster_date)) {
      return { ok: false, fieldErrors: { poster_date: `Poster date must be between ${SEMESTER_MIN_DATE} and ${SEMESTER_MAX_DATE}.` } };
    }
    setLoading(true);
    try {
      await adminUpdateSemester(payload, adminPass);
      applySemesterPatch({
        id: payload.id,
        name: payload.name,
        poster_date: payload.poster_date,
      });
      const semesterName = String(payload?.name || "").trim();
      setMessage(semesterName ? `Semester ${semesterName} updated` : "Semester updated");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("semester_name_exists")
        || msgLower.includes("semesters_name_ci_unique")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        return { ok: false, fieldErrors: { name: "Semester name already exists." } };
      } else if (msg.includes("semester_name_required")) {
        return { ok: false, fieldErrors: { name: "Semester name is required." } };
      } else {
        setPanelError("semester", msg || "Could not update semester. Try again or check admin password.");
        return { ok: false };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportProjects = async (rows) => {
    if (!viewSemesterId) {
      setPanelError("projects", "Select a semester from the header before importing groups.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("projects");
    setLoading(true);
    try {
      const semesterContext = (viewSemesterLabel && viewSemesterLabel !== "—")
        ? viewSemesterLabel
        : "selected semester";
      let skipped = 0;
      for (const row of rows) {
        const normalizedStudents = normalizeStudentNames(row.group_students);
        try {
          const res = await adminCreateProject(
            { ...row, group_students: normalizedStudents, semesterId: viewSemesterId },
            adminPass
          );
          applyProjectPatch({
            id: res?.project_id || res?.projectId || undefined,
            semester_id: viewSemesterId,
            group_no: row.group_no,
            project_title: row.project_title,
            group_students: normalizedStudents,
          });
        } catch (e) {
          const msg = String(e?.message || "");
          const msgLower = msg.toLowerCase();
          if (msg.includes("project_group_exists")
            || msgLower.includes("projects_semester_group_no_key")
            || msgLower.includes("duplicate key value violates unique constraint")) {
            skipped += 1;
            continue;
          }
          throw e;
        }
      }
      setMessage(
        skipped > 0
          ? `Groups imported for Semester ${semesterContext}, skipped ${skipped} existing groups`
          : `Groups imported for Semester ${semesterContext}`
      );
      return { ok: true, skipped };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("project_group_exists")
        || msgLower.includes("projects_semester_group_no_key")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        return { ok: false, formError: "Some groups already exist. Refresh and try again." };
      } else {
        return { ok: false, formError: msg || "Could not import groups. Check the CSV format and try again." };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (row) => {
    const targetSemesterId = row?.semesterId || viewSemesterId;
    if (!targetSemesterId) {
      setPanelError("projects", "Select a semester before adding a group.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("projects");
    setLoading(true);
    try {
      const normalizedStudents = normalizeStudentNames(row.group_students);
      const targetSemesterName = semesterList.find((s) => s.id === targetSemesterId)?.name || "";
      const res = await adminCreateProject(
        { ...row, group_students: normalizedStudents, semesterId: targetSemesterId },
        adminPass
      );
      const projectId = res?.project_id || res?.projectId;
      if (!projectId) {
        throw new Error("Could not create group. Please refresh and try again.");
      }
      if (targetSemesterId === viewSemesterId) {
        applyProjectPatch({
          id: projectId,
          semester_id: targetSemesterId,
          group_no: row.group_no,
          project_title: row.project_title,
          group_students: normalizedStudents,
        });
        await loadProjects(targetSemesterId);
      }
      setMessage(
        targetSemesterName
          ? `Group ${row.group_no} created in Semester ${targetSemesterName}`
          : `Group ${row.group_no} created`
      );
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("project_group_exists")
        || msgLower.includes("projects_semester_group_no_key")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        return { ok: false, fieldErrors: { group_no: `Group ${row.group_no} already exists. Use 'Edit' to update.` } };
      } else {
        setPanelError("projects", msg || "Could not save group. Try again or check admin password.");
        return { ok: false };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async (row) => {
    const targetSemesterId = row?.semesterId || viewSemesterId;
    if (!targetSemesterId) return;
    setMessage("");
    clearPanelError("projects");
    setLoading(true);
    try {
      const normalizedStudents = normalizeStudentNames(row.group_students);
      const res = await adminUpsertProject(
        { ...row, group_students: normalizedStudents, semesterId: targetSemesterId },
        adminPass
      );
      if (targetSemesterId === viewSemesterId) {
        applyProjectPatch({
          id: res?.project_id || res?.projectId || undefined,
          semester_id: targetSemesterId,
          group_no: row.group_no,
          project_title: row.project_title,
          group_students: normalizedStudents,
        });
      }
      setMessage(`Group ${row.group_no} updated`);
      return { ok: true };
    } catch (e) {
      setPanelError("projects", e?.message || "Could not update group. Try again or check admin password.");
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };


  const handleAddJuror = async (row) => {
    setMessage("");
    clearPanelError("jurors");
    setLoading(true);
    try {
      const created = await adminCreateJuror(row, adminPass);
      if (created?.juror_id) {
        applyJurorPatch({
          juror_id: created.juror_id,
          juror_name: created.juror_name,
          juror_inst: created.juror_inst,
          locked_until: null,
          last_seen_at: null,
          is_locked: false,
          is_assigned: false,
          scored_semesters: [],
          edit_enabled: false,
          final_submitted_at: null,
          last_activity_at: null,
          total_projects: projects.length,
          completed_projects: 0,
        });
      }
      const jurorName = String(created?.juror_name || row?.juror_name || "").trim();
      setMessage(jurorName ? `Juror ${jurorName} added` : "Juror added");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("juror_exists")
        || msgLower.includes("jurors_name_inst_norm_uniq")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        return { ok: false, fieldErrors: { duplicate: "A juror with the same name and institution / department already exists." } };
      } else {
        setPanelError("jurors", msg || "Could not add juror. Try again or check admin password.");
        return { ok: false };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportJurors = async (rows) => {
    setMessage("");
    clearPanelError("jurors");
    setLoading(true);
    try {
      let skipped = 0;
      for (const row of rows) {
        try {
          const created = await adminCreateJuror(row, adminPass);
          if (created?.juror_id) {
            applyJurorPatch({
              juror_id: created.juror_id,
              juror_name: created.juror_name,
              juror_inst: created.juror_inst,
              locked_until: null,
              last_seen_at: null,
              is_locked: false,
              is_assigned: false,
              scored_semesters: [],
              edit_enabled: false,
              final_submitted_at: null,
              last_activity_at: null,
              total_projects: projects.length,
              completed_projects: 0,
            });
          }
        } catch (e) {
          const msg = String(e?.message || "");
          const msgLower = msg.toLowerCase();
          if (msg.includes("juror_exists")
            || msgLower.includes("jurors_name_inst_norm_uniq")
            || msgLower.includes("duplicate key value violates unique constraint")) {
            skipped += 1;
            continue;
          }
          throw e;
        }
      }
      setMessage(
        skipped > 0
          ? `Jurors imported. Skipped ${skipped} existing jurors`
          : "Jurors imported"
      );
      return { ok: true, skipped };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("juror_exists")
        || msgLower.includes("jurors_name_inst_norm_uniq")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        return { ok: false, formError: "Some jurors already exist. Refresh and try again." };
      } else {
        return { ok: false, formError: msg || "Could not import jurors. Check the CSV format and try again." };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditJuror = async (row) => {
    if (!row?.jurorId) return;
    setMessage("");
    clearPanelError("jurors");
    setLoading(true);
    try {
      await adminUpdateJuror(row, adminPass);
      applyJurorPatch({
        juror_id: row.jurorId,
        juror_name: row.juror_name,
        juror_inst: row.juror_inst,
      });
      const jurorName = String(row?.juror_name || "").trim();
      setMessage(jurorName ? `Juror ${jurorName} updated` : "Juror updated");
      return { ok: true };
    } catch (e) {
      setPanelError("jurors", e?.message || "Could not update juror. Try again or check admin password.");
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (juror) => {
    const jurorId = juror?.jurorId || juror?.juror_id;
    const jurorName = juror?.juror_name || juror?.juryName;
    const jurorInst = juror?.juror_inst || juror?.juryDept;
    if (!viewSemesterId || !jurorId) {
      setPanelError("jurors", "Select a semester from the header before resetting a PIN.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("jurors");
    setLoading(true);
    try {
      const res = await adminResetJurorPin({ semesterId: viewSemesterId, jurorId }, adminPass);
      setResetPinInfo({
        ...res,
        juror_name: jurorName || res?.juror_name || null,
        juror_inst: jurorInst || res?.juror_inst || null,
      });
      applyJurorPatch({
        juror_id: jurorId,
        locked_until: null,
        failed_attempts: 0,
        is_locked: false,
        last_seen_at: null,
      });
      const jurorDisplayName = String(jurorName || res?.juror_name || "").trim();
      setMessage(jurorDisplayName ? `PIN reset for ${jurorDisplayName}` : "PIN reset");
      return { ok: true, data: res };
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("semester_inactive")) {
        setPanelError("jurors", "Only the semester selected in header can be edited.");
      } else if (msg.includes("unauthorized")) {
        setPanelError("jurors", "Admin password is invalid. Please re-login.");
      } else {
        setPanelError("jurors", e?.message || "Could not reset PIN. Try again or check admin password.");
      }
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  const requestResetPin = (juror) => {
    if (!juror) return;
    setResetPinInfo(null);
    setPinCopied(false);
    setPinResetTarget(juror);
  };

  const confirmResetPin = async () => {
    if (!pinResetTarget || pinResetLoading) return;
    setPinResetLoading(true);
    try {
      const result = await handleResetPin(pinResetTarget);
      if (result?.ok) {
        setPinCopied(false);
      }
    } finally {
      setPinResetLoading(false);
    }
  };

  const closeResetPinDialog = () => {
    setPinResetTarget(null);
    setResetPinInfo(null);
    setPinCopied(false);
  };

  const handleToggleJurorEdit = async ({ jurorId, enabled }) => {
    if (!viewSemesterId || !jurorId) return;
    setMessage("");
    setEvalLockError("");
    if (!enabled) {
      setEvalLockError("Edit mode can only be closed by juror resubmission.");
      return;
    }
    // Optimistic update — revert below if the RPC fails
    applyJurorPatch({ juror_id: jurorId, edit_enabled: true });
    setLoading(true);
    try {
      await adminSetJurorEditMode(
        { semesterId: viewSemesterId, jurorId, enabled: true },
        adminPass
      );
      const jurorName = getJurorNameById(jurors, jurorId);
      setMessage(jurorName ? `Editing unlocked for Juror ${jurorName}` : "Editing unlocked for juror");
    } catch (e) {
      applyJurorPatch({ juror_id: jurorId, edit_enabled: false }); // revert
      const msg = String(e?.message || "");
      if (msg.includes("edit_mode_disable_not_allowed")) {
        setEvalLockError("Edit mode can only be closed by juror resubmission.");
      } else if (msg.includes("final_submit_required")) {
        setEvalLockError("Edit mode can only be closed by juror resubmission.");
      } else if (msg.includes("final_submission_required")) {
        setEvalLockError("Juror must have a completed submission before edit mode can be enabled.");
      } else if (msg.includes("no_pin")) {
        setEvalLockError("Juror PIN is missing for this semester. Reset the PIN first.");
      } else if (msg.includes("semester_not_found") || msg.includes("semester_inactive")) {
        setEvalLockError("Selected semester could not be found. Refresh and try again.");
      } else if (msg.includes("semester_locked")) {
        setEvalLockError("Evaluation lock is active. Unlock the semester first.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError(e?.message || "Could not update edit mode. Try again or check admin password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceCloseJurorEdit = async ({ jurorId }) => {
    if (!viewSemesterId || !jurorId) return;
    setMessage("");
    setEvalLockError("");
    applyJurorPatch({ juror_id: jurorId, edit_enabled: false });
    setLoading(true);
    try {
      await adminForceCloseJurorEditMode(
        { semesterId: viewSemesterId, jurorId },
        adminPass
      );
      const jurorName = getJurorNameById(jurors, jurorId);
      setMessage(jurorName ? `Editing locked for Juror ${jurorName}` : "Editing locked for juror");
    } catch (e) {
      applyJurorPatch({ juror_id: jurorId, edit_enabled: true }); // revert
      const msg = String(e?.message || "");
      if (msg.includes("no_pin")) {
        setEvalLockError("Juror PIN is missing for this semester. Reset the PIN first.");
      } else if (msg.includes("semester_not_found") || msg.includes("semester_inactive")) {
        setEvalLockError("Selected semester could not be found. Refresh and try again.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError(e?.message || "Could not lock editing. Try again or check admin password.");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleSaveSettings = async (next) => {
    if (!adminPass) {
      setEvalLockError("Admin password missing. Please re-login.");
      return;
    }
    if (!viewSemesterId) {
      setEvalLockError("Select a semester from the header before changing lock settings.");
      return;
    }
    setLoading(true);
    setMessage("");
    setEvalLockError("");
    try {
      await adminSetSemesterEvalLock(viewSemesterId, !!next.evalLockActive, adminPass);
      applySemesterPatch({
        id: viewSemesterId,
        is_locked: !!next.evalLockActive,
      });
      setSettings(next);
      const semesterContext = (viewSemesterLabel && viewSemesterLabel !== "—")
        ? viewSemesterLabel
        : "the selected";
      setMessage(
        next.evalLockActive
          ? `Scoring for ${semesterContext} semester is now closed.`
          : `Scoring for ${semesterContext} semester is now open.`
      );
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("semester_not_found") || msg.includes("semester_inactive")) {
        setEvalLockError("Selected semester could not be found. Refresh and try again.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError(e?.message || "Could not save settings. Try again or check admin password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuditRefresh = () => {
    loadAuditLogs(auditFilters, { mode: "replace", cursor: null });
  };

  const handleAuditReset = () => {
    setAuditFilters(defaultAuditFilters);
    setAuditSearch("");
    setAuditCursor(null);
    setAuditHasMore(true);
  };

  const handleAuditLoadMore = () => {
    if (!auditHasMore || auditLoading) return;
    loadAuditLogs(auditFilters, { mode: "append", cursor: auditCursor });
  };

  const handleAuditExport = async () => {
    if (!adminPass) return;
    setAuditExporting(true);
    setAuditError("");
    try {
      const pageSize = 500;
      let cursor = null;
      let all = [];
      let loops = 0;
      while (true) {
        const params = buildAuditParams(auditFilters, pageSize, cursor, auditSearch);
        const rows = await adminListAuditLogs(params, adminPass);
        if (!rows || rows.length === 0) break;
        all = [...all, ...rows];
        if (rows.length < pageSize) break;
        const last = rows[rows.length - 1];
        cursor = { beforeAt: last.created_at, beforeId: last.id };
        loops += 1;
        if (loops > 200) break; // safety cap (~100k rows)
      }
      if (!all.length) {
        setMessage("No audit entries found for export");
        return;
      }
      await exportAuditLogsXLSX(all, { filters: auditFilters, search: auditSearch });
      setMessage("Audit log exported");
    } catch (e) {
      setAuditError(e?.message || "Could not export audit logs.");
    } finally {
      setAuditExporting(false);
    }
  };

  const handleRequestDelete = async (target) => {
    if (!target || !target.id) return;
    setDeleteTarget(target);
    setDeleteCounts(null);
    if (!adminPass) return;
    try {
      const counts = await adminDeleteCounts(target.type, target.id, adminPass);
      setDeleteCounts(counts);
    } catch (_) { /* counts are optional */ }
  };

  const mapDeleteError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("delete_password_missing")) {
      return "Delete password is not configured. Set it in Admin Security, then try again.";
    }
    if (msg.includes("incorrect_delete_password") || msg.includes("unauthorized")) {
      return "Incorrect delete password. Try again.";
    }
    if (msg.includes("not_found")) {
      return "Item not found. Refresh the list and try again.";
    }
    return "Could not delete. Please try again.";
  };

  const handleConfirmDelete = async (password) => {
    if (!deleteTarget) throw new Error("Nothing selected for deletion.");
    const { type, id, label } = deleteTarget;
    setMessage("");
    clearAllPanelErrors();
    await adminDeleteEntity({ targetType: type, targetId: id, deletePassword: password });
    if (type === "semester") {
      setSemesterList((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (activeSemesterId === id) {
          setActiveSemesterId(remaining[0]?.id || "");
        }
        return remaining;
      });
    } else if (type === "project") {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } else if (type === "juror") {
      setJurors((prev) => prev.filter((j) => (j.juror_id || j.jurorId) !== id));
    }
    setMessage(buildDeleteToastMessage(type, label));
  };

  const handleDbExportStart = () => {
    if (!backupPasswordSet || dbBackupLoading) return;
    setDbBackupMode("export");
    setDbBackupPassword("");
    setDbBackupConfirmText("");
    setDbBackupError("");
    setDbImportSuccess("");
    setDbImportWarning("");
    setDbImportData(null);
    setDbImportFileName("");
    setDbImportFileSize(0);
    setDbImportDragging(false);
  };

  const handleDbImportStart = () => {
    if (!backupPasswordSet || dbBackupLoading) return;
    setDbBackupMode("import");
    setDbBackupPassword("");
    setDbBackupConfirmText("");
    setDbBackupError("");
    setDbImportSuccess("");
    setDbImportWarning("");
    setDbImportData(null);
    setDbImportFileName("");
    setDbImportFileSize(0);
    setDbImportDragging(false);
  };

  const validateBackupPayload = (payload) => {
    if (!payload || typeof payload !== "object") return "Invalid backup file format.";
    if (!Number.isFinite(Number(payload.schema_version))) return "Missing schema_version in backup file.";
    const required = ["semesters", "jurors", "projects", "scores", "juror_semester_auth"];
    for (const key of required) {
      if (!Array.isArray(payload[key])) return `Backup file is missing '${key}' data.`;
    }
    return "";
  };

  const buildBackupLoadFeedback = (payload) => {
    const semesters = Array.isArray(payload?.semesters) ? payload.semesters.length : 0;
    const jurors = Array.isArray(payload?.jurors) ? payload.jurors.length : 0;
    const projects = Array.isArray(payload?.projects) ? payload.projects.length : 0;
    const scores = Array.isArray(payload?.scores) ? payload.scores.length : 0;
    const assignments = Array.isArray(payload?.juror_semester_auth) ? payload.juror_semester_auth.length : 0;
    const schemaVersion = Number(payload?.schema_version);
    const success = [
      "• Backup file loaded successfully.",
      `• Found: ${semesters} semesters, ${jurors} jurors, ${projects} groups, ${scores} scores, ${assignments} assignments (schema v${Number.isFinite(schemaVersion) ? schemaVersion : "?"}).`,
    ].join("\n");
    const emptySections = [];
    if (semesters === 0) emptySections.push("semesters");
    if (jurors === 0) emptySections.push("jurors");
    if (projects === 0) emptySections.push("groups");
    if (scores === 0) emptySections.push("scores");
    if (assignments === 0) emptySections.push("assignments");
    const warning = emptySections.length
      ? `• Empty sections in this backup: ${emptySections.join(", ")}.`
      : "";
    return { success, warning };
  };

  const handleDbImportFile = (file) => {
    if (!file) return;
    setDbBackupError("");
    setDbImportSuccess("");
    setDbImportWarning("");
    setDbImportData(null);
    if (!file.name.toLowerCase().endsWith(".json")) {
      setDbImportFileName("");
      setDbImportFileSize(0);
      setDbBackupError("Only .json backup files are supported.");
      return;
    }
    if (file.size > MAX_BACKUP_BYTES) {
      setDbImportFileName("");
      setDbImportFileSize(0);
      setDbBackupError("Backup file is too large (max 10 MB).");
      return;
    }
    setDbImportFileName(file.name);
    setDbImportFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const schemaError = validateBackupPayload(parsed);
        if (schemaError) {
          setDbBackupError(schemaError);
          setDbImportSuccess("");
          setDbImportWarning("");
          setDbImportData(null);
          return;
        }
        setDbImportData(parsed);
        setDbBackupError("");
        const feedback = buildBackupLoadFeedback(parsed);
        setDbImportSuccess(feedback.success);
        setDbImportWarning(feedback.warning);
      } catch {
        setDbBackupError("Invalid backup file. Could not parse JSON.");
        setDbImportSuccess("");
        setDbImportWarning("");
      }
    };
    reader.readAsText(file);
  };

  const handleDbImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleDbImportFile(file);
    e.target.value = "";
  };

  const mapDbBackupError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("backup_password_missing")) {
      return "Backup & restore password is not configured. Set it in Admin Security, then try again.";
    }
    if (msg.includes("incorrect_backup_password")) return "Incorrect backup & restore password. Try again.";
    if (msg.includes("unauthorized")) return "Incorrect admin password. Please re-login.";
    return null;
  };

  const handleDbExportConfirm = async () => {
    if (!dbBackupPassword || !adminPass) return;
    const start = Date.now();
    setDbBackupLoading(true);
    setDbBackupError("");
    try {
      const data = await adminFullExport(dbBackupPassword, adminPass);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportFilename("backup", activeSemester?.name, "json");
      a.click();
      URL.revokeObjectURL(url);
      setDbBackupMode(null);
      setDbBackupPassword("");
      setDbBackupConfirmText("");
      setDbImportDragging(false);
      setMessage("Database backup downloaded");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Export failed. Try again or check your passwords.");
    } finally {
      const remaining = Math.max(0, MIN_BACKUP_DELAY - (Date.now() - start));
      if (remaining) await new Promise((r) => setTimeout(r, remaining));
      setDbBackupLoading(false);
    }
  };

  const handleDbImportConfirm = async () => {
    if (!dbImportData || !dbBackupPassword || !adminPass) return;
    if (dbBackupConfirmText.trim() !== "RESTORE") {
      setDbBackupError("Type RESTORE to confirm.");
      return;
    }
    const start = Date.now();
    setDbBackupLoading(true);
    setDbBackupError("");
    try {
      await adminFullImport(dbImportData, dbBackupPassword, adminPass);
      setDbBackupMode(null);
      setDbBackupPassword("");
      setDbBackupConfirmText("");
      setDbImportDragging(false);
      setDbImportData(null);
      setDbImportFileName("");
      setDbImportFileSize(0);
      setDbImportSuccess("");
      setDbImportWarning("");
      setMessage("Database restored from backup");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Import failed. Check the backup file and try again.");
    } finally {
      const remaining = Math.max(0, MIN_BACKUP_DELAY - (Date.now() - start));
      if (remaining) await new Promise((r) => setTimeout(r, remaining));
      setDbBackupLoading(false);
    }
  };

  const handleExportProjects = async () => {
    if (!adminPass) return;
    const sems = (semesterList && semesterList.length ? semesterList : await listSemesters()) || [];
    if (!sems.length) return;
    const orderedSemesters = [...sems].sort((a, b) => {
      const aTs = a?.poster_date ? Date.parse(a.poster_date) : 0;
      const bTs = b?.poster_date ? Date.parse(b.poster_date) : 0;
      return bTs - aTs;
    });
    const projectsBySemester = await Promise.all(
      orderedSemesters.map(async (sem) => ({
        semesterName: sem?.name || "",
        rows: await adminListProjects(sem.id, adminPass),
      }))
    );
    const XLSX = await import("xlsx-js-style");
    const headers = ["Semester", "Group No", "Project Title", "Students"];
    const data = projectsBySemester.flatMap(({ semesterName, rows }) =>
      (rows || []).map((p) => [
        semesterName,
        p?.group_no ?? "",
        p?.project_title ?? "",
        p?.group_students || "",
      ])
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [18, 8, 36, 42].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Groups");
    XLSX.writeFile(wb, buildExportFilename("groups", "all-semesters"));
  };

  const handleExportJurors = async () => {
    if (!adminPass) return;
    const sems = (semesterList && semesterList.length ? semesterList : await listSemesters()) || [];
    if (!sems.length) return;
    const orderedSemesters = [...sems].sort((a, b) => {
      const aTs = a?.poster_date ? Date.parse(a.poster_date) : 0;
      const bTs = b?.poster_date ? Date.parse(b.poster_date) : 0;
      return bTs - aTs;
    });
    const jurorsBySemester = await Promise.all(
      orderedSemesters.map(async (sem) => ({
        semesterName: sem?.name || "",
        rows: await adminListJurors(sem.id, adminPass),
      }))
    );
    const isAssignedJuror = (j) => {
      if (j?.isAssigned === true) return true;
      if (j?.is_assigned === true) return true;
      if (typeof j?.isAssigned === "string") return ["true", "t", "1"].includes(j.isAssigned.toLowerCase());
      if (typeof j?.is_assigned === "string") return ["true", "t", "1"].includes(j.is_assigned.toLowerCase());
      return false;
    };
    const XLSX = await import("xlsx-js-style");
    const headers = ["Semester", "Juror Name", "Institution / Department"];
    const data = jurorsBySemester.flatMap(({ semesterName, rows }) => {
      const hasAssignedFlag = (rows || []).some((j) =>
        j?.isAssigned !== undefined && j?.isAssigned !== null
        || j?.is_assigned !== undefined && j?.is_assigned !== null
      );
      const exportRows = hasAssignedFlag ? (rows || []).filter(isAssignedJuror) : (rows || []);
      return exportRows.map((j) => [
        semesterName,
        j?.juryName || j?.juror_name || j?.jurorName || "",
        j?.juryDept || j?.juror_inst || j?.jurorInst || "",
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [18, 28, 32].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jurors");
    XLSX.writeFile(wb, buildExportFilename("jurors", "all-semesters"));
  };

  const handleExportScores = async () => {
    if (!adminPass) return;
    const sems = (semesterList && semesterList.length ? semesterList : await listSemesters()) || [];
    if (!sems.length) return;
    const orderedSemesters = [...sems].sort((a, b) => {
      const aTs = a?.poster_date ? Date.parse(a.poster_date) : 0;
      const bTs = b?.poster_date ? Date.parse(b.poster_date) : 0;
      return bTs - aTs;
    });
    const results = await Promise.all(
      orderedSemesters.map(async (sem) => {
        const [rows, summary] = await Promise.all([
          adminGetScores(sem.id, adminPass),
          adminProjectSummary(sem.id, adminPass).catch(() => []),
        ]);
        const summaryMap = new Map((summary || []).map((p) => [p.id, p]));
        const mappedRows = (rows || []).map((r) => ({
          ...r,
          semester: sem?.name || "",
          students: summaryMap.get(r.projectId)?.students ?? "",
        }));
        return { rows: mappedRows, summary: summary || [] };
      })
    );
    await exportXLSX(results.flatMap((x) => x.rows), {
      semesterName: "all-semesters",
      summaryData: results.flatMap((x) => x.summary),
    });
  };

  return (
    <div className="manage-page manage-page--settings">
      {loading && (
        <div className="manage-alerts-sticky">
          <div className="manage-alerts">
            <span className="manage-alert">Working…</span>
          </div>
        </div>
      )}
      {pinResetTarget && (
        <div className="manage-modal" role="dialog" aria-modal="true">
          <div className="manage-modal-card manage-modal-card--danger manage-modal-card--pin-flow">
            <div className="delete-dialog__header">
              <span className="delete-dialog__icon delete-dialog__icon--pin-reset" aria-hidden="true"><KeyRoundIcon /></span>
              <div className="delete-dialog__title">
                {resetPinInfo?.pin_plain_once ? "New Juror PIN" : "Reset Juror PIN"}
              </div>
            </div>
            <div className="delete-dialog__body delete-dialog__body--pin-flow">
              {resetPinInfo?.pin_plain_once ? (
                <div className="pin-reset-step pin-reset-step--result">
                  <div className="delete-dialog__line">New PIN generated. Share it securely with the juror.</div>
                  <div className="pin-code">
                    {String(resetPinInfo.pin_plain_once || "").padStart(4, "0").slice(0, 4)}
                  </div>
                </div>
              ) : (
                <div className="pin-reset-step pin-reset-step--confirm">
                  <div className="pin-reset-copy">
                    <div className="delete-dialog__line pin-reset-target-inline">
                      <span className="pin-reset-target-prefix">Will generate a new PIN for </span>
                      <span className="pin-reset-target-highlight">
                        {pinResetTarget.juror_name || pinResetTarget.juryName || "this juror"}
                      </span>
                      {(pinResetTarget.juror_inst || pinResetTarget.juryDept)
                        ? (
                          <span className="pin-reset-target-highlight pin-reset-target-highlight--inst">
                            {" ("}
                            {pinResetTarget.juror_inst || pinResetTarget.juryDept}
                            {")"}
                          </span>
                        )
                        : ""}
                      <span className="pin-reset-target-prefix">. Are you sure?</span>
                    </div>
                  </div>
                  <div className="manage-delete-warning manage-delete-warning--caution">
                    <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertIcon /></span>
                    <span className="manage-delete-warning-text">This will immediately deactivate the current PIN.</span>
                  </div>
                </div>
              )}
            </div>
            <div className="manage-modal-actions manage-modal-actions--pin-flow">
              {resetPinInfo?.pin_plain_once ? (
                <>
                  <button
                    className="manage-btn primary"
                    type="button"
                    onClick={async () => {
                      const pinValue = resetPinInfo.pin_plain_once;
                      if (!pinValue) return;
                      const ok = await copyPinToClipboard(pinValue);
                      if (ok) {
                        setPinCopied(true);
                        if (pinCopyTimerRef.current) {
                          clearTimeout(pinCopyTimerRef.current);
                        }
                        pinCopyTimerRef.current = setTimeout(() => {
                          setPinCopied(false);
                        }, 2000);
                      }
                    }}
                  >
                    {pinCopied ? "Copied!" : "Copy PIN"}
                  </button>
                  <button
                    className="manage-btn"
                    type="button"
                    onClick={closeResetPinDialog}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="manage-btn manage-btn--delete-cancel"
                    type="button"
                    disabled={pinResetLoading}
                    onClick={closeResetPinDialog}
                  >
                    Cancel
                  </button>
                  <button
                    className="manage-btn manage-btn--delete-confirm"
                    type="button"
                    disabled={pinResetLoading}
                    onClick={confirmResetPin}
                  >
                    {pinResetLoading ? "Resetting…" : "Reset PIN"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        targetType={deleteTarget?.type}
        targetLabel={deleteTarget?.label}
        targetName={deleteTarget?.name}
        targetInst={deleteTarget?.inst}
        counts={deleteCounts}
        onOpenChange={(open) => {
          if (!open) { setDeleteTarget(null); setDeleteCounts(null); }
        }}
        onConfirm={async (password) => {
          try {
            await handleConfirmDelete(password);
          } catch (e) {
            const msg = mapDeleteError(e);
            throw new Error(msg);
          }
        }}
      />

      {isMobile && !isSmallMobile && (
        <div className="manage-card-actions manage-card-actions--left manage-card-actions--tight">
          <button
            className="manage-btn ghost manage-expand-toggle"
            type="button"
            aria-pressed={Object.values(openPanels).every(Boolean)}
            onClick={() => {
              const next = !Object.values(openPanels).every(Boolean);
              setOpenPanels((prev) => {
                const updated = {};
                Object.keys(prev).forEach((k) => { updated[k] = next; });
                return updated;
              });
            }}
          >
            {Object.values(openPanels).every(Boolean) ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="manage-btn-icon lucide lucide-chevrons-right-left-icon lucide-chevrons-right-left"
                  aria-hidden="true"
                >
                  <path d="m20 17-5-5 5-5" />
                  <path d="m4 17 5-5-5-5" />
                </svg>
                <span className="manage-expand-toggle-label">Collapse all</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="manage-btn-icon lucide lucide-chevrons-left-right-icon lucide-chevrons-left-right"
                  aria-hidden="true"
                >
                  <path d="m9 7-5 5 5 5" />
                  <path d="m15 7 5 5-5 5" />
                </svg>
                <span className="manage-expand-toggle-label">Expand all</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="manage-grid">
        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          <h3 className="manage-section-title">Data Management</h3>
          <div className="manage-section-grid">
            <SemesterSettingsPanel
              semesters={semesterList}
              activeSemesterId={activeSemesterId}
              activeSemesterName={activeSemesterLabel}
              panelError={panelErrors.semester}
              isMobile={isMobile}
              isOpen={openPanels.semester}
              onToggle={() => togglePanel("semester")}
              onDirtyChange={(dirty) => handlePanelDirty("semester", dirty)}
              onSetActive={handleSetActiveSemester}
              onCreateSemester={handleCreateSemester}
              onUpdateSemester={handleUpdateSemester}
              onDeleteSemester={(s) =>
                (s?.id === activeSemesterId
                  ? setPanelError("semester", "Current semester cannot be deleted. Select another semester first.")
                  : handleRequestDelete({
                      type: "semester",
                      id: s?.id,
                      label: `Semester ${s?.name || ""}`.trim(),
                    })
                )
              }
            />

            <ProjectSettingsPanel
              projects={projects}
              semesterName={viewSemester?.name || ""}
              activeSemesterId={viewSemesterId}
              activeSemesterName={viewSemesterLabel}
              semesterOptions={semesterList}
              panelError={panelErrors.projects}
              isMobile={isMobile}
              isOpen={openPanels.projects}
              onToggle={() => togglePanel("projects")}
              onDirtyChange={(dirty) => handlePanelDirty("projects", dirty)}
              onImport={handleImportProjects}
              onAddGroup={handleAddProject}
              onEditGroup={handleEditProject}
              onDeleteProject={(p, groupLabel) =>
                handleRequestDelete({
                  type: "project",
                  id: p?.id,
                  label: `Group ${groupLabel}`,
                })
              }
            />

            <JurorSettingsPanel
              jurors={jurors}
              panelError={panelErrors.jurors}
              isMobile={isMobile}
              isOpen={openPanels.jurors}
              onToggle={() => togglePanel("jurors")}
              onDirtyChange={(dirty) => handlePanelDirty("jurors", dirty)}
              onImport={handleImportJurors}
              onAddJuror={handleAddJuror}
              onEditJuror={handleEditJuror}
              onResetPin={requestResetPin}
              onDeleteJuror={(j) =>
                handleRequestDelete({
                  type: "juror",
                  id: j?.jurorId || j?.juror_id,
                  label: `Juror ${j?.juryName || j?.juror_name || ""}`.trim(),
                  name: j?.juryName || j?.juror_name || "",
                  inst: j?.juryDept || j?.juror_inst || "",
                })
              }
            />

            <AccessSettingsPanel
              settings={settings}
              jurors={jurors}
              activeSemesterId={viewSemesterId}
              activeSemesterName={viewSemesterLabel}
              evalLockError={evalLockError}
              isMobile={isMobile}
              isOpen={openPanels.permissions}
              onToggle={() => togglePanel("permissions")}
              onRequestEvalLockChange={(checked) => {
                setEvalLockError("");
                setEvalLockConfirmNext(Boolean(checked));
                setEvalLockConfirmOpen(true);
              }}
              onToggleEdit={handleToggleJurorEdit}
              onForceCloseEdit={handleForceCloseJurorEdit}
            />
          </div>
        </section>

        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          <h3 className="manage-section-title">Access &amp; Security</h3>
          <div className="manage-section-grid">
            <AdminSecurityPanel
              isMobile={isMobile}
              isOpen={openPanels.security}
              onToggle={() => togglePanel("security")}
              onPasswordChanged={onAdminPasswordChange}
              adminPass={adminPass}
              innerRef={adminSecurityRef}
            />
            <div
              className={`manage-card manage-card-audit${isMobile ? " is-collapsible" : ""}`}
              ref={auditCardRef}
            >
              <div className="manage-card-header-row">
                <button
                  type="button"
                  className="manage-card-header"
                  onClick={() => togglePanel("audit")}
                  aria-expanded={openPanels.audit}
                >
                  <div className="manage-card-title">
                    <span className="manage-card-icon" aria-hidden="true"><HistoryIcon /></span>
                    <span className="section-label">Audit Log</span>
                  </div>
                  {isMobile && <ChevronDownIcon className={`settings-chevron${openPanels.audit ? " open" : ""}`} />}
                </button>
              </div>

              {(!isMobile || openPanels.audit) && (
                <div className="manage-card-body manage-audit-body">
                  <div className="manage-audit-header">
                    <div className="manage-card-desc">Audit trail of administrative actions and security events.</div>
                    <div className="manage-audit-filters">
                      <div className="manage-field">
                        <label className="manage-label" htmlFor="auditStartDate">From</label>
                        <input
                          id="auditStartDate"
                          type="datetime-local"
                          step="60"
                          placeholder="YYYY-MM-DDThh:mm"
                          className={`manage-input manage-date${auditFilters.startDate ? "" : " is-empty"}${auditRangeError ? " is-error" : ""}`}
                          value={auditFilters.startDate}
                          min={AUDIT_MIN_DATETIME}
                          max={AUDIT_MAX_DATETIME}
                          onChange={(e) => setAuditFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="manage-field">
                        <label className="manage-label" htmlFor="auditEndDate">To</label>
                        <input
                          id="auditEndDate"
                          type="datetime-local"
                          step="60"
                          placeholder="YYYY-MM-DDThh:mm"
                          className={`manage-input manage-date${auditFilters.endDate ? "" : " is-empty"}${auditRangeError ? " is-error" : ""}`}
                          value={auditFilters.endDate}
                          min={AUDIT_MIN_DATETIME}
                          max={AUDIT_MAX_DATETIME}
                          onChange={(e) => setAuditFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                      <div className="manage-field">
                        <label className="manage-label" htmlFor="auditSearch">Search</label>
                        <div className="manage-search">
                          <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
                          <input
                            id="auditSearch"
                            type="text"
                            className="manage-input manage-search-input"
                            placeholder="Search message, action, entity, or metadata"
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="manage-audit-export">
                        <button
                          type="button"
                          className="manage-btn manage-btn-ghost-pill"
                          onClick={handleAuditExport}
                          disabled={auditExporting}
                        >
                          <DownloadIcon /> Export
                        </button>
                        <span className="manage-hint manage-hint-inline">
                          Times shown in your local timezone ({localTimeZone}).
                        </span>
                      </div>
                    </div>
                    {auditRangeError && <div className="manage-hint manage-hint-error">{auditRangeError}</div>}
                    {auditError && !auditRangeError && (
                      <div className="manage-hint manage-hint-error">{auditError}</div>
                    )}
                    {showAuditLoadingHint && <div className="manage-hint">Loading audit logs…</div>}
                    {auditExporting && <div className="manage-hint">Preparing export…</div>}
                  </div>

                  <div
                    className={`manage-audit-scroll${showAllAuditLogs ? " is-expanded" : " is-compact"}`}
                    ref={auditScrollRef}
                    role="region"
                    aria-label="Audit log list"
                  >
                    {!auditLoading && visibleAuditLogs.length === 0 && (
                      <div className="manage-empty manage-empty-subtle">
                        {hasAuditFilters ? "No results for the current filters." : "No audit entries yet."}
                      </div>
                    )}

                    {visibleAuditLogs.length > 0 && (
                      <div className="manage-audit-list">
                        {visibleAuditLogs.map((log) => (
                          <div key={log.id} className="manage-audit-row">
                            <span className="manage-audit-time">{formatAuditTimestamp(log.created_at)}</span>
                            <span className="manage-audit-sep" aria-hidden="true">—</span>
                            <span className="manage-audit-message">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {auditHasMore && (
                      <div ref={auditSentinelRef} className="manage-audit-sentinel" aria-hidden="true" />
                    )}

                    {auditLoading && auditHasMore && (
                      <div className="manage-audit-footer">
                        <span className="manage-hint">Loading older events…</span>
                      </div>
                    )}
                  </div>
                  {hasAuditToggle && (
                    <button
                      className={`manage-btn ${isMobile ? "primary" : "ghost"}`}
                      type="button"
                      onClick={() => {
                        setShowAllAuditLogs((prev) => {
                          const next = !prev;
                          if (!next && auditScrollRef.current) {
                            auditScrollRef.current.scrollTop = 0;
                          }
                          return next;
                        });
                      }}
                    >
                      {showAllAuditLogs
                        ? "Show fewer audit logs"
                        : "Show all audit logs"}
                    </button>
                  )}
                  {!supportsInfiniteScroll && !auditLoading && auditHasMore && (
                    <div className="manage-audit-footer">
                      <button
                        className="manage-btn ghost"
                        type="button"
                        onClick={handleAuditLoadMore}
                        disabled={auditLoading || !auditHasMore}
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          <h3 className="manage-section-title">Data Operations</h3>
          <div className="manage-section-grid">
            <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
              <button
                type="button"
                className="manage-card-header"
                onClick={() => togglePanel("export")}
                aria-expanded={openPanels.export}
              >
                <div className="manage-card-title">
                  <span className="manage-card-icon" aria-hidden="true"><FileDownIcon /></span>
                  <span className="section-label">Export Tools</span>
                </div>
                {isMobile && <ChevronDownIcon className={`settings-chevron${openPanels.export ? " open" : ""}`} />}
              </button>

              {(!isMobile || openPanels.export) && (
                <div className="manage-card-body">
                  <div className="manage-card-desc">Download Excel exports for scores, jurors, and groups.</div>
                  <div className="manage-export-actions">
                    <button className="manage-btn" type="button" onClick={handleExportScores}>
                      <DownloadIcon /> Scores
                    </button>
                    <button className="manage-btn" type="button" onClick={handleExportJurors}>
                      <DownloadIcon /> Jurors
                    </button>
                    <button className="manage-btn" type="button" onClick={handleExportProjects}>
                      <DownloadIcon /> Groups
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
              <button
                type="button"
                className="manage-card-header"
                onClick={() => togglePanel("dbbackup")}
                aria-expanded={openPanels.dbbackup}
              >
                <div className="manage-card-title">
                  <span className="manage-card-icon" aria-hidden="true"><DatabaseBackupIcon /></span>
                  <span className="section-label">Database Backup</span>
                </div>
                {isMobile && <ChevronDownIcon className={`settings-chevron${openPanels.dbbackup ? " open" : ""}`} />}
              </button>

              {(!isMobile || openPanels.dbbackup) && (
                <div className="manage-card-body">
                  <div className="manage-card-desc">
                    Export or restore the database. Requires the backup & restore password.
                  </div>
                  {!backupPasswordSet && (
                    <div className="manage-delete-warning manage-delete-warning--caution" role="status">
                      <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertIcon /></span>
                      <span className="manage-delete-warning-text">
                        Backup &amp; restore password is not set. Create one in Admin Security to enable export/import.
                      </span>
                    </div>
                  )}
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={handleDbImportFileSelect}
                  />

                  <div className="manage-export-actions">
                    <button
                      className="manage-btn"
                      type="button"
                      onClick={handleDbExportStart}
                      disabled={!backupPasswordSet || dbBackupLoading}
                    >
                      <DownloadIcon /> Export JSON
                    </button>
                    <button
                      className="manage-btn"
                      type="button"
                      onClick={handleDbImportStart}
                      disabled={!backupPasswordSet || dbBackupLoading}
                    >
                      <UploadIcon /> Import / Restore
                    </button>
                  </div>
                </div>
              )}
            </div>

            {dbBackupMode && (
              <div className="manage-modal" role="dialog" aria-modal="true">
                <div className={`manage-modal-card${dbBackupMode === "import" ? " manage-modal-card--db-restore" : ""}`}>
                  {dbBackupMode === "export" ? (
                    <div className="edit-dialog__header">
                      <span className="edit-dialog__icon" aria-hidden="true">
                        <FileDownIcon />
                      </span>
                      <div className="edit-dialog__title">Export Database Backup</div>
                    </div>
                  ) : (
                    <div className="edit-dialog__header">
                      <span className="edit-dialog__icon" aria-hidden="true">
                        <FileUpIcon />
                      </span>
                      <div className="edit-dialog__title">Import / Restore Database</div>
                    </div>
                  )}
                  <div className="manage-modal-body">
                    <div className="manage-hint">
                      {dbBackupMode === "export"
                        ? "Export a full backup of semesters, jurors, groups, and scores."
                        : "Upload a backup JSON exported from this portal to restore all data."}
                    </div>
                    {dbBackupMode === "import" && (
                      <div className="manage-field">
                        <div
                          className={`manage-dropzone${dbImportDragging ? " is-dragging" : ""}`}
                          onDragEnter={(e) => { e.preventDefault(); setDbImportDragging(true); }}
                          onDragOver={(e) => { e.preventDefault(); setDbImportDragging(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setDbImportDragging(false); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDbImportDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            handleDbImportFile(file);
                          }}
                          onClick={() => {
                            if (dbBackupLoading) return;
                            importFileRef.current?.click();
                          }}
                          role="button"
                          tabIndex={0}
                          aria-disabled={dbBackupLoading}
                          onKeyDown={(e) => {
                            if (dbBackupLoading) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              importFileRef.current?.click();
                            }
                          }}
                        >
                          <div className="manage-dropzone-icon" aria-hidden="true"><CloudUploadIcon /></div>
                          <div className="manage-dropzone-title">Drag &amp; Drop your JSON here</div>
                          <div className="manage-dropzone-sub">
                            Only `.json` files exported from this portal.
                          </div>
                          <button className="manage-btn manage-btn--db-restore-select" type="button" tabIndex={-1}>
                            Select Backup File
                          </button>
                          <div className="manage-dropzone-sub manage-dropzone-sub--muted">Max file size: 10 MB</div>
                        </div>
                        {dbImportFileName && (
                          <div className="manage-hint" style={{ marginTop: "0.5rem" }}>
                            Selected: {dbImportFileName} ({Math.ceil(dbImportFileSize / 1024)} KB)
                          </div>
                        )}
                        {dbBackupMode === "import" && dbBackupError && (
                          <div className="manage-alerts" style={{ marginTop: "0.5rem" }}>
                            <span className="manage-alert error with-icon">
                              <span className="manage-alert-icon" aria-hidden="true"><CircleXLucideIcon /></span>
                              <span>{dbBackupError}</span>
                            </span>
                          </div>
                        )}
                        {dbBackupMode === "import" && dbImportSuccess && !dbBackupError && (
                          <div className="manage-import-feedback manage-import-feedback--success" role="status" style={{ marginTop: "0.5rem" }}>
                            {dbImportSuccess}
                          </div>
                        )}
                        {dbBackupMode === "import" && dbImportWarning && !dbBackupError && (
                          <div className="manage-import-feedback manage-import-feedback--warn" role="status" style={{ marginTop: "0.5rem" }}>
                            {dbImportWarning}
                          </div>
                        )}
                      </div>
                    )}
                    {dbBackupMode === "import" && (
                      <>
                        <details className="manage-collapsible">
                          <summary className="manage-collapsible-summary">
                            <span>JSON example</span>
                            <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                          </summary>
                          <div className="manage-collapsible-content">
                            <pre className="manage-code" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{SAMPLE_DB_BACKUP_JSON}</pre>
                          </div>
                        </details>
                        <details className="manage-collapsible">
                          <summary className="manage-collapsible-summary">
                            <span>Rules</span>
                            <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                          </summary>
                          <div className="manage-collapsible-content">
                            <ul className="manage-hint-list manage-rules-list">
                              <li>Only .json files exported from this portal are supported.</li>
                              <li>Backup contains semesters, jurors, groups, scores, and assignments.</li>
                              <li>Maximum file size: 10 MB.</li>
                              <li>This operation overwrites existing data.</li>
                              <li>Type RESTORE to confirm import.</li>
                            </ul>
                          </div>
                        </details>
                      </>
                    )}
                    <div className="manage-field">
                      <label className="manage-label">Backup &amp; Restore Password</label>
                      <input
                        type="password"
                        className="manage-input"
                        value={dbBackupPassword}
                        onChange={(e) => { setDbBackupPassword(e.target.value); setDbBackupError(""); }}
                        disabled={dbBackupLoading}
                        autoComplete="off"
                      />
                    </div>
                    {dbBackupMode === "import" && (
                      <div className="manage-field">
                        <label className="manage-label">Type RESTORE to confirm</label>
                        <input
                          type="text"
                          className="manage-input"
                          value={dbBackupConfirmText}
                          onChange={(e) => { setDbBackupConfirmText(e.target.value.toUpperCase()); setDbBackupError(""); }}
                          disabled={dbBackupLoading}
                          autoComplete="off"
                        />
                      </div>
                    )}
                    {dbBackupMode !== "import" && dbBackupError && (
                      <div className="manage-alerts">
                        <span className="manage-alert error with-icon">
                          <span className="manage-alert-icon" aria-hidden="true"><CircleXLucideIcon /></span>
                          <span>{dbBackupError}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="manage-modal-actions">
                    <button
                      className={`manage-btn${dbBackupMode === "import" ? " manage-btn--db-restore-cancel" : ""}`}
                      type="button"
                      disabled={dbBackupLoading}
                      onClick={() => {
                        setDbBackupMode(null);
                        setDbBackupPassword("");
                        setDbBackupConfirmText("");
                        setDbImportData(null);
                        setDbImportFileName("");
                        setDbImportFileSize(0);
                        setDbImportDragging(false);
                        setDbBackupError("");
                        setDbImportSuccess("");
                        setDbImportWarning("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={`manage-btn ${dbBackupMode === "import" ? "manage-btn--delete-confirm" : "primary"}`}
                      type="button"
                      disabled={
                        dbBackupLoading
                        || !dbBackupPassword
                        || (dbBackupMode === "import" && (!dbImportData || dbBackupConfirmText.trim() !== "RESTORE"))
                      }
                      onClick={dbBackupMode === "export" ? handleDbExportConfirm : handleDbImportConfirm}
                    >
                      {dbBackupLoading
                        ? (dbBackupMode === "export" ? "Exporting…" : "Restoring…")
                        : (dbBackupMode === "export" ? "Download Backup" : "Restore Database")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {evalLockConfirmOpen && (
        <div className="manage-modal" role="dialog" aria-modal="true">
          <div className="manage-modal-card manage-modal-card--danger manage-modal-card--pin-flow manage-modal-card--lock-flow">
            <div className="delete-dialog__header">
              <span className="delete-dialog__icon delete-dialog__icon--lock" aria-hidden="true"><LockIcon /></span>
              <div className="delete-dialog__title">
                {evalLockConfirmNext ? "Lock" : "Unlock"}
              </div>
            </div>
            <div className="delete-dialog__body">
              <div className="delete-dialog__line">
                {evalLockConfirmNext
                  ? (
                    <>
                      Jurors can no longer edit or submit scores for{" "}
                      {viewSemesterLabel && viewSemesterLabel !== "—" ? (
                        <>
                          <span className="delete-dialog__semester-alert">{viewSemesterLabel}</span>{" "}
                          <span>semester</span>
                        </>
                      ) : (
                        <span>the selected semester</span>
                      )}
                      .
                    </>
                  )
                  : (
                    <>
                      Jurors can edit and resubmit scores for{" "}
                      {viewSemesterLabel && viewSemesterLabel !== "—" ? (
                        <>
                          <span className="delete-dialog__semester-alert">{viewSemesterLabel}</span>{" "}
                          <span>semester</span>
                        </>
                      ) : (
                        <span>the selected semester</span>
                      )}
                      .
                    </>
                  )}
              </div>
            </div>
            <div className="manage-modal-actions">
              <button
                className="manage-btn"
                type="button"
                disabled={evalLockConfirmLoading}
                onClick={() => setEvalLockConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="manage-btn primary"
                type="button"
                disabled={evalLockConfirmLoading}
                onClick={async () => {
                  setEvalLockConfirmLoading(true);
                  await handleSaveSettings({ ...settings, evalLockActive: evalLockConfirmNext });
                  setEvalLockConfirmLoading(false);
                  setEvalLockConfirmOpen(false);
                }}
              >
                {evalLockConfirmLoading
                  ? (evalLockConfirmNext ? "Locking…" : "Unlocking…")
                  : (evalLockConfirmNext ? "Lock" : "Unlock")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
