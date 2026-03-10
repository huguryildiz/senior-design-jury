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
  adminDeleteEntity,
  adminDeleteCounts,
  adminGetSettings,
  adminListAuditLogs,
  adminSetSetting,
  adminFullExport,
  adminFullImport,
} from "../shared/api";
import { supabase } from "../lib/supabaseClient";
import { ChevronDownIcon, DatabaseIcon, DownloadIcon, HistoryIcon, UploadIcon, KeyRoundIcon, LandmarkIcon, UserCheckIcon } from "../shared/Icons";
import { exportXLSX, exportAuditLogsXLSX, buildExportFilename } from "./utils";
import SemesterSettingsPanel from "./ManageSemesterPanel";
import ProjectSettingsPanel from "./ManageProjectsPanel";
import JurorSettingsPanel from "./ManageJurorsPanel";
import AccessSettingsPanel from "./ManagePermissionsPanel";
import AdminSecurityPanel from "../components/admin/AdminSecurityPanel";
import DeleteConfirmDialog from "../components/admin/DeleteConfirmDialog";

const SETTINGS_KEYS = {
  evalLock: "eval_lock_active_semester",
};

const defaultSettings = {
  evalLockActive: false,
};

const AUDIT_PAGE_SIZE = 120;

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

const AUDIT_MIN_YEAR = 2000;
const AUDIT_MAX_YEAR = 2100;
const AUDIT_MIN_DATETIME = "2000-01-01T00:00";
const AUDIT_MAX_DATETIME = "2100-12-31T23:59";

const isValidDateParts = (yyyy, mm, dd) => {
  if (yyyy < AUDIT_MIN_YEAR || yyyy > AUDIT_MAX_YEAR) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1) return false;
  const maxDays = new Date(yyyy, mm, 0).getDate();
  return dd <= maxDays;
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

export default function SettingsPage({ adminPass, onAdminPasswordChange }) {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const supportsInfiniteScroll = typeof window !== "undefined" && "IntersectionObserver" in window;
  const [openPanels, setOpenPanels] = useState({
    semester: true,
    projects: true,
    jurors: true,
    permissions: true,
    security: true,
    audit: true,
    export: true,
    dbbackup: true,
  });

  const [semesterList, setSemesterList] = useState([]);
  const [activeSemesterId, setActiveSemesterId] = useState("");
  const [projects, setProjects] = useState([]);
  const [jurors, setJurors] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };
  const setError   = (err) => { if (err) _toast.error(err); };
  const [resetPinInfo, setResetPinInfo] = useState(null);
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
  const [dbBackupLoading, setDbBackupLoading] = useState(false);
  const [dbBackupError, setDbBackupError] = useState("");

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

  const togglePanel = (id) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
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
    const rows = await adminListJurors(activeSemesterId, adminPass);
    setJurors(rows || []);
  }, [adminPass, activeSemesterId]);

  const loadSettings = useCallback(async () => {
    if (!adminPass) return;
    const rows = await adminGetSettings(adminPass);
    const map = new Map((rows || []).map((r) => [r.key, r.value]));
    const evalLockActive = map.get(SETTINGS_KEYS.evalLock) === "true";
    setSettings({
      evalLockActive,
    });
  }, [adminPass]);

  const loadAuditLogs = useCallback(async (filters, options = {}) => {
    if (!adminPass) return;
    const mode = options.mode || "replace";
    const cursor = options.cursor || null;
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
      const params = buildAuditParams(filters || defaultAuditFilters, AUDIT_PAGE_SIZE, cursor, auditSearch);
      const rows = await adminListAuditLogs(params, adminPass);
      if (mode === "append") {
        setAuditLogs((prev) => [...prev, ...(rows || [])]);
      } else {
        setAuditLogs(rows || []);
      }
      setAuditHasMore((rows || []).length >= (params.limit || AUDIT_PAGE_SIZE));
      if (rows && rows.length > 0) {
        const last = rows[rows.length - 1];
        setAuditCursor({ beforeAt: last.created_at, beforeId: last.id });
      }
    } catch (e) {
      setAuditError(e?.message || "Could not load audit logs.");
    } finally {
      setAuditLoading(false);
    }
  }, [adminPass, auditSearch]);

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
      return next;
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
    setError("");
    loadSemesters()
      .catch(() => setError("Could not load semesters."))
      .finally(() => setLoading(false));
  }, [loadSemesters]);

  useEffect(() => {
    if (!activeSemesterId) return;
    if (!adminPass) {
      setError("Admin password missing. Please re-login.");
      return;
    }
    setLoading(true);
    Promise.all([
      loadProjects(activeSemesterId),
      loadJurors(),
      loadSettings(),
    ])
      .catch((e) => setError(e?.message || "Could not load settings data."))
      .finally(() => setLoading(false));
  }, [activeSemesterId, adminPass, loadProjects, loadJurors, loadSettings]);

  useEffect(() => {
    if (!adminPass) return;
    loadAuditLogs(auditFilters, { mode: "replace", cursor: null });
  }, [adminPass, auditFilters, loadAuditLogs]);

  // Background refresh (no full-page reload).
  useEffect(() => {
    if (!adminPass) return;
    const interval = setInterval(() => {
      if (!activeSemesterId) return;
      Promise.all([
        loadProjects(activeSemesterId),
        loadJurors(),
        loadSettings(),
      ]).catch(() => {});
      refreshSemesters().catch(() => {});
    }, 5_000);
    return () => clearInterval(interval);
  }, [adminPass, activeSemesterId, loadProjects, loadJurors, loadSettings, refreshSemesters]);

  const AUDIT_COMPACT_COUNT = 5;
  const hasAuditToggle = auditHasMore || auditLogs.length > AUDIT_COMPACT_COUNT;
  const auditTotalLabel = auditHasMore ? `${auditLogs.length}+` : `${auditLogs.length}`;
  const visibleAuditLogs = auditLogs;
  const auditRangeError = getAuditDateRangeError(auditFilters);
  const hasAuditFilters = Boolean(
    auditSearch.trim()
    || auditFilters.startDate
    || auditFilters.endDate
  );

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

      // ── projects: patch in-place for active semester ───────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects" }, (payload) => {
        if (payload.new?.semester_id === activeSemesterId) applyProjectPatch(payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, (payload) => {
        if (payload.new?.semester_id === activeSemesterId) applyProjectPatch(payload.new);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects" }, (payload) => {
        const deletedId = payload.old?.id;
        if (deletedId) setProjects((prev) => prev.filter((p) => p.id !== deletedId));
      })

      // ── settings: patch settings state inline ─────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, (payload) => {
        const row = payload.new;
        if (!row?.key) return;
        if (row.key === SETTINGS_KEYS.evalLock) {
          setSettings((prev) => ({ ...prev, evalLockActive: row.value === "true" }));
        }
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
    activeSemesterId,
    applySemesterPatch,
    applyProjectPatch,
    scheduleJurorRefresh,
    scheduleAuditRefresh,
  ]);

  const handleSetActiveSemester = async (semesterId) => {
    setMessage("");
    setError("");
    if (!adminPass) return setError("Admin password missing.");
    setLoading(true);
    try {
      await adminSetActiveSemester(semesterId, adminPass);
      setSemesterList((prev) =>
        prev.map((s) => ({ ...s, is_active: s.id === semesterId }))
      );
      setActiveSemesterId(semesterId);
      setMessage("Active semester updated.");
    } catch (e) {
      setError(e?.message || "Could not update active semester.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async (payload) => {
    setMessage("");
    setError("");
    if (!adminPass) return setError("Admin password missing.");
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
      setMessage("Semester created.");
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("semester_name_exists")
        || msgLower.includes("semesters_name_ci_unique")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        setError("Semester name already exists.");
      } else if (msg.includes("semester_name_required")) {
        setError("Semester name is required.");
      } else {
        setError(msg || "Could not create semester.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSemester = async (payload) => {
    setMessage("");
    setError("");
    if (!adminPass) return setError("Admin password missing.");
    setLoading(true);
    try {
      await adminUpdateSemester(payload, adminPass);
      applySemesterPatch({
        id: payload.id,
        name: payload.name,
        poster_date: payload.poster_date,
      });
      setMessage("Semester updated.");
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("semester_name_exists")
        || msgLower.includes("semesters_name_ci_unique")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        setError("Semester name already exists.");
      } else if (msg.includes("semester_name_required")) {
        setError("Semester name is required.");
      } else {
        setError(msg || "Could not update semester.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportProjects = async (rows) => {
    if (!activeSemesterId) {
      setError("Select an active semester before importing groups.");
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);
    try {
      let skipped = 0;
      for (const row of rows) {
        try {
          const res = await adminCreateProject({ ...row, semesterId: activeSemesterId }, adminPass);
          applyProjectPatch({
            id: res?.project_id || res?.projectId || undefined,
            semester_id: activeSemesterId,
            group_no: row.group_no,
            project_title: row.project_title,
            group_students: row.group_students,
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
          ? `Projects imported. Skipped ${skipped} existing groups.`
          : "Projects imported."
      );
      return { skipped };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("project_group_exists")
        || msgLower.includes("projects_semester_group_no_key")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        setError("Some groups already exist. Refresh and try again.");
      } else {
        setError(msg || "Could not import projects.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (row) => {
    if (!activeSemesterId) {
      setError("Select an active semester before adding a group.");
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await adminCreateProject({ ...row, semesterId: activeSemesterId }, adminPass);
      const projectId = res?.project_id || res?.projectId;
      if (!projectId) {
        throw new Error("Could not create group. Please refresh and try again.");
      }
      applyProjectPatch({
        id: projectId,
        semester_id: activeSemesterId,
        group_no: row.group_no,
        project_title: row.project_title,
        group_students: row.group_students,
      });
      await loadProjects(activeSemesterId);
      setMessage("Group added.");
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("project_group_exists")
        || msgLower.includes("projects_semester_group_no_key")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        setError(`Group ${row.group_no} already exists. Use Edit to update.`);
      } else {
        setError(msg || "Could not save group.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async (row) => {
    if (!activeSemesterId) return;
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await adminUpsertProject({ ...row, semesterId: activeSemesterId }, adminPass);
      applyProjectPatch({
        id: res?.project_id || res?.projectId || undefined,
        semester_id: activeSemesterId,
        group_no: row.group_no,
        project_title: row.project_title,
        group_students: row.group_students,
      });
      setMessage("Group updated.");
    } catch (e) {
      setError(e?.message || "Could not update group.");
    } finally {
      setLoading(false);
    }
  };


  const handleAddJuror = async (row) => {
    setMessage("");
    setError("");
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
      setMessage("Juror added.");
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("juror_exists")
        || msgLower.includes("jurors_name_inst_norm_uniq")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        setError("Juror already exists.");
      } else {
        setError(msg || "Could not add juror.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportJurors = async (rows) => {
    setMessage("");
    setError("");
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
          ? `Jurors imported. Skipped ${skipped} existing jurors.`
          : "Jurors imported."
      );
      return { skipped };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (msg.includes("juror_exists")
        || msgLower.includes("jurors_name_inst_norm_uniq")
        || msgLower.includes("duplicate key value violates unique constraint")) {
        setError("Some jurors already exist. Refresh and try again.");
      } else {
        setError(msg || "Could not import jurors.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditJuror = async (row) => {
    if (!row?.jurorId) return;
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await adminUpdateJuror(row, adminPass);
      applyJurorPatch({
        juror_id: row.jurorId,
        juror_name: row.juror_name,
        juror_inst: row.juror_inst,
      });
      setMessage("Juror updated.");
    } catch (e) {
      setError(e?.message || "Could not update juror.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (juror) => {
    const jurorId = juror?.jurorId || juror?.juror_id;
    const jurorName = juror?.juror_name || juror?.juryName;
    const jurorInst = juror?.juror_inst || juror?.juryDept;
    if (!activeSemesterId || !jurorId) {
      setError("Select an active semester before resetting a PIN.");
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await adminResetJurorPin({ semesterId: activeSemesterId, jurorId }, adminPass);
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
      setMessage("PIN reset.");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("semester_inactive")) {
        setError("Only the active semester can be edited.");
      } else if (msg.includes("unauthorized")) {
        setError("Admin password is invalid. Please re-login.");
      } else {
        setError(e?.message || "Could not reset PIN.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJurorEdit = async ({ jurorId, enabled }) => {
    if (!activeSemesterId || !jurorId) return;
    setMessage("");
    setError("");
    // Optimistic update — revert below if the RPC fails
    applyJurorPatch({ juror_id: jurorId, edit_enabled: !!enabled });
    setLoading(true);
    try {
      await adminSetJurorEditMode(
        { semesterId: activeSemesterId, jurorId, enabled },
        adminPass
      );
      setMessage(enabled ? "Edit mode enabled." : "Edit mode disabled.");
    } catch (e) {
      applyJurorPatch({ juror_id: jurorId, edit_enabled: !enabled }); // revert
      const msg = String(e?.message || "");
      if (msg.includes("final_submit_required")) {
        setError("Cannot disable edit mode until all scores are re-submitted.");
      } else if (msg.includes("no_pin")) {
        setError("Juror PIN is missing for this semester. Reset the PIN first.");
      } else if (msg.includes("semester_inactive")) {
        setError("Only the active semester can be edited.");
      } else if (msg.includes("unauthorized")) {
        setError("Admin password is invalid. Please re-login.");
      } else {
        setError(e?.message || "Could not update edit mode.");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleSaveSettings = async (next) => {
    if (!adminPass) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await adminSetSetting(SETTINGS_KEYS.evalLock, String(!!next.evalLockActive), adminPass);
      setSettings(next);
      setMessage(
        next.evalLockActive
          ? "Evaluations locked for the active semester. Jurors can view but can’t edit."
          : "Evaluations unlocked. Jurors can edit and re-submit."
      );
    } catch (e) {
      setError(e?.message || "Could not save settings.");
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
        setMessage("No audit entries found for export.");
        return;
      }
      await exportAuditLogsXLSX(all, { filters: auditFilters, search: auditSearch });
      setMessage("Audit log exported.");
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
      return "Delete password is not configured. Set it in Admin Security.";
    }
    if (msg.includes("incorrect_delete_password") || msg.includes("unauthorized")) {
      return "Incorrect delete password.";
    }
    if (msg.includes("not_found")) {
      return "Item not found.";
    }
    return "Could not delete. Please try again.";
  };

  const handleConfirmDelete = async (password) => {
    if (!deleteTarget) throw new Error("Nothing selected for deletion.");
    const { type, id, label } = deleteTarget;
    setMessage("");
    setError("");
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
    setMessage(`Deleted ${label}.`);
  };

  const handleDbExportStart = () => {
    setDbBackupMode("export");
    setDbBackupPassword("");
    setDbBackupError("");
    setDbImportData(null);
  };

  const handleDbImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setDbImportData(parsed);
        setDbBackupMode("import");
        setDbBackupPassword("");
        setDbBackupError("");
      } catch {
        setDbBackupError("Invalid backup file. Could not parse JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const mapDbBackupError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("backup_password_missing")) {
      return "Backup & restore password is not configured. Set it in Admin Security.";
    }
    if (msg.includes("incorrect_backup_password")) return "Incorrect backup & restore password.";
    if (msg.includes("unauthorized")) return "Incorrect admin password.";
    return null;
  };

  const handleDbExportConfirm = async () => {
    if (!dbBackupPassword || !adminPass) return;
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
      setMessage("Backup downloaded successfully.");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Export failed. Please try again.");
    } finally {
      setDbBackupLoading(false);
    }
  };

  const handleDbImportConfirm = async () => {
    if (!dbImportData || !dbBackupPassword || !adminPass) return;
    setDbBackupLoading(true);
    setDbBackupError("");
    try {
      await adminFullImport(dbImportData, dbBackupPassword, adminPass);
      setDbBackupMode(null);
      setDbBackupPassword("");
      setDbImportData(null);
      setMessage("Database restored successfully.");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Import failed. Please try again.");
    } finally {
      setDbBackupLoading(false);
    }
  };

  const handleExportProjects = async () => {
    if (!projects.length) return;
    const XLSX = await import("xlsx");
    const headers = ["group_no", "project_title", "group_students"];
    const data = projects.map((p) => [p.group_no, p.project_title, p.group_students || ""]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [8, 36, 42].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, buildExportFilename("projects", activeSemester?.name));
  };

  const handleExportJurors = async () => {
    if (!jurors.length) return;
    const XLSX = await import("xlsx");
    const headers = ["juror_name", "juror_inst"];
    const data = jurors.map((j) => [j.juryName || j.juror_name || j.jurorName, j.juryDept || j.juror_inst || j.jurorInst]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [28, 32].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jurors");
    XLSX.writeFile(wb, buildExportFilename("jurors", activeSemester?.name));
  };

  const handleExportScores = async () => {
    if (!activeSemesterId || !adminPass) return;
    const rows = await adminGetScores(activeSemesterId, adminPass);
    await exportXLSX(rows || [], {
      semesterName: activeSemester?.name || "",
      summaryData: (projects || []).map((p) => ({ id: p.id, students: p.group_students || "" })),
    });
  };

  return (
    <div className="manage-page">
      {loading && (
        <div className="manage-alerts-sticky">
          <div className="manage-alerts">
            <span className="manage-alert">Working…</span>
          </div>
        </div>
      )}
      {resetPinInfo?.pin_plain_once && (
        <div className="manage-modal">
          <div className="manage-modal-card manage-modal-card--pin">
            <div className="edit-dialog__header">
              <span className="edit-dialog__icon" aria-hidden="true">
                <KeyRoundIcon />
              </span>
              <div className="edit-dialog__title">New PIN</div>
            </div>
            <div className="manage-pin-juror-line">
              <span className="manage-pin-juror-name">
                <UserCheckIcon />
                {resetPinInfo.juror_name || resetPinInfo.juror_id}
              </span>
              {resetPinInfo.juror_inst && (
                <span className="manage-pin-juror-inst">
                  <LandmarkIcon />
                  {resetPinInfo.juror_inst}
                </span>
              )}
            </div>
            <div className="pin-code">
              {String(resetPinInfo.pin_plain_once || "").padStart(4, "0").slice(0, 4)}
            </div>
            <div className="manage-pin-note">Share this PIN with the juror.</div>
            <div className="manage-pin-actions">
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
                onClick={() => setResetPinInfo(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        targetLabel={deleteTarget?.label}
        counts={deleteCounts}
        onOpenChange={(open) => {
          if (!open) { setDeleteTarget(null); setDeleteCounts(null); }
        }}
        onConfirm={async (password) => {
          try {
            await handleConfirmDelete(password);
          } catch (e) {
            const msg = mapDeleteError(e);
            setError(msg);
            throw new Error(msg);
          }
        }}
      />

      <div className="manage-grid">
        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          <h3 className="manage-section-title">Data</h3>
          <div className="manage-section-grid">
            <SemesterSettingsPanel
              semesters={semesterList}
              activeSemesterId={activeSemesterId}
              isMobile={isMobile}
              isOpen={openPanels.semester}
              onToggle={() => togglePanel("semester")}
              onSetActive={handleSetActiveSemester}
              onCreateSemester={handleCreateSemester}
              onUpdateSemester={handleUpdateSemester}
              onDeleteSemester={(s) =>
                (s?.id === activeSemesterId
                  ? setError("Active semester cannot be deleted. Select another semester first.")
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
              semesterName={activeSemester?.name || ""}
              isMobile={isMobile}
              isOpen={openPanels.projects}
              onToggle={() => togglePanel("projects")}
              onImport={handleImportProjects}
              onAddGroup={handleAddProject}
              onEditGroup={handleEditProject}
              onDeleteProject={(p, groupLabel) =>
                handleRequestDelete({
                  type: "project",
                  id: p?.id,
                  label: `Group ${groupLabel}${p?.project_title ? `: ${p.project_title}` : ""}`,
                })
              }
            />

            <JurorSettingsPanel
              jurors={jurors}
              isMobile={isMobile}
              isOpen={openPanels.jurors}
              onToggle={() => togglePanel("jurors")}
              onImport={handleImportJurors}
              onAddJuror={handleAddJuror}
              onEditJuror={handleEditJuror}
              onResetPin={handleResetPin}
              onDeleteJuror={(j) =>
                handleRequestDelete({
                  type: "juror",
                  id: j?.jurorId || j?.juror_id,
                  label: `Juror ${j?.juryName || j?.juror_name || ""}`.trim(),
                })
              }
            />

            <AccessSettingsPanel
              settings={settings}
              jurors={jurors}
              activeSemesterId={activeSemesterId}
              isMobile={isMobile}
              isOpen={openPanels.permissions}
              onToggle={() => togglePanel("permissions")}
              onSave={handleSaveSettings}
              onToggleEdit={handleToggleJurorEdit}
            />
          </div>
        </section>

        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          <h3 className="manage-section-title">Access Control</h3>
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
                  {isMobile && <ChevronDownIcon className={`manage-chevron${openPanels.audit ? " open" : ""}`} />}
                </button>
                <button
                  type="button"
                  className="manage-btn manage-btn-ghost-pill"
                  onClick={handleAuditExport}
                  disabled={auditExporting}
                >
                  <DownloadIcon /> Export XLSX
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
                        <input
                          id="auditSearch"
                          type="text"
                          className="manage-input"
                          placeholder="Search message, action, entity, or metadata"
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="manage-audit-meta">
                      <span className="manage-hint manage-hint-inline">
                        Times shown in your local timezone ({localTimeZone}).
                      </span>
                    </div>
                    {auditRangeError && <div className="manage-hint manage-hint-error">{auditRangeError}</div>}
                    {auditError && !auditRangeError && (
                      <div className="manage-hint manage-hint-error">{auditError}</div>
                    )}
                    {auditLoading && <div className="manage-hint">Loading audit logs…</div>}
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
                      className="manage-btn ghost"
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
                        : `Show all audit logs (${auditTotalLabel})`}
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

            <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
              <button
                type="button"
                className="manage-card-header"
                onClick={() => togglePanel("export")}
                aria-expanded={openPanels.export}
              >
                <div className="manage-card-title">
                  <span className="manage-card-icon" aria-hidden="true"><DownloadIcon /></span>
                  <span className="section-label">Export Tools</span>
                </div>
                {isMobile && <ChevronDownIcon className={`manage-chevron${openPanels.export ? " open" : ""}`} />}
              </button>

              {(!isMobile || openPanels.export) && (
                <div className="manage-card-body">
                  <div className="manage-card-desc">Download Excel exports for scores, jurors, and projects.</div>
                  <div className="manage-export-actions">
                    <button className="manage-btn" type="button" onClick={handleExportScores}>
                      <DownloadIcon /> Export Scores
                    </button>
                    <button className="manage-btn" type="button" onClick={handleExportJurors}>
                      <DownloadIcon /> Export Jurors
                    </button>
                    <button className="manage-btn" type="button" onClick={handleExportProjects}>
                      <DownloadIcon /> Export Projects
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
                  <span className="manage-card-icon" aria-hidden="true"><DatabaseIcon /></span>
                  <span className="section-label">Database Backup</span>
                </div>
                {isMobile && <ChevronDownIcon className={`manage-chevron${openPanels.dbbackup ? " open" : ""}`} />}
              </button>

              {(!isMobile || openPanels.dbbackup) && (
                <div className="manage-card-body">
                  <div className="manage-card-desc">
                    Export or restore the database. Requires the backup & restore password.
                  </div>

                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={handleDbImportFileSelect}
                  />

                  {!dbBackupMode && (
                    <div className="manage-export-actions">
                      <button className="manage-btn" type="button" onClick={handleDbExportStart}>
                        <DownloadIcon /> Export Database
                      </button>
                      <button className="manage-btn" type="button" onClick={() => importFileRef.current?.click()}>
                        <UploadIcon /> Import / Restore
                      </button>
                    </div>
                  )}

                  {dbBackupMode && (
                    <div className="manage-security-stack" style={{ marginTop: "0.75rem" }}>
                      <div className="manage-mini-card">
                        <div className="manage-mini-card-title">
                          {dbBackupMode === "export" ? "Confirm Export" : "Confirm Restore"}
                        </div>
                        <div className="manage-mini-card-body">
                          {dbBackupMode === "import" && (
                            <div className="manage-hint" style={{ marginBottom: "0.5rem" }}>
                              This will overwrite existing data with the backup. This action cannot be undone.
                            </div>
                          )}
                          <div className="manage-field">
                            <label className="manage-label">Backup & Restore Password</label>
                            <input
                              type="password"
                              className="manage-input"
                              value={dbBackupPassword}
                              onChange={(e) => { setDbBackupPassword(e.target.value); setDbBackupError(""); }}
                              disabled={dbBackupLoading}
                              autoFocus
                              autoComplete="off"
                            />
                          </div>
                          {dbBackupError && (
                            <div className="manage-alerts">
                              <span className="manage-alert error">{dbBackupError}</span>
                            </div>
                          )}
                          <div className="manage-card-actions">
                            <button
                              className="manage-btn"
                              type="button"
                              disabled={dbBackupLoading}
                              onClick={() => { setDbBackupMode(null); setDbBackupPassword(""); setDbImportData(null); }}
                            >
                              Cancel
                            </button>
                            <button
                              className="manage-btn primary"
                              type="button"
                              disabled={dbBackupLoading || !dbBackupPassword}
                              onClick={dbBackupMode === "export" ? handleDbExportConfirm : handleDbImportConfirm}
                            >
                              {dbBackupLoading
                                ? (dbBackupMode === "export" ? "Exporting…" : "Restoring…")
                                : (dbBackupMode === "export" ? "Download Backup" : "Restore Database")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
