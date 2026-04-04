// src/admin/hooks/useAuditLogFilters.js
// ============================================================
// Extracts all audit log state, effects, and handlers from
// SettingsPage into a reusable hook.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { listAuditLogs } from "../../shared/api";
import {
  AUDIT_PAGE_SIZE,
  formatAuditTimestamp,
  getAuditDateRangeError,
  buildAuditParams,
} from "../utils/auditUtils";
import { exportAuditLogsXLSX } from "../utils/exportXLSX";
import { downloadTable } from "../utils/downloadTable";
import { useAuth } from "@/auth";

const defaultAuditFilters = {
  startDate: "",
  endDate: "",
};

/**
 * useAuditLogFilters
 *
 * Manages all audit log state, pagination, search, and export.
 *
 * @param {object} params
 * @param {string} params.organizationId
 * @param {boolean} params.isMobile
 * @param {function} params.setMessage  - Toast message setter
 */
export function useAuditLogFilters({ organizationId, isMobile, setMessage }) {
  const { activeOrganization } = useAuth();
  const organizationCode = activeOrganization?.code || "";
  const supportsInfiniteScroll =
    typeof window !== "undefined" && "IntersectionObserver" in window;

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
  const auditTimerRef = useRef(null);
  const auditScrollRef = useRef(null);
  const auditSentinelRef = useRef(null);
  const auditCardRef = useRef(null);

  // ── Computed / derived ────────────────────────────────────
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
  const showAuditSkeleton = auditLoading && auditLogs.length === 0;
  const isAuditStaleRefresh = auditLoading && auditLogs.length > 0;

  // ── Keep ref in sync with state ───────────────────────────
  useEffect(() => {
    auditSearchRef.current = auditSearch;
  }, [auditSearch]);

  // ── Hide "show all" toggle when it's no longer needed ─────
  useEffect(() => {
    if (!hasAuditToggle && showAllAuditLogs) {
      setShowAllAuditLogs(false);
    }
  }, [hasAuditToggle, showAllAuditLogs]);

  // ── Core load function ────────────────────────────────────
  const loadAuditLogs = useCallback(async (filters, options = {}) => {
    if (!organizationId) return;
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
      const rawRows = await listAuditLogs({ ...params, organizationId });
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
  }, [organizationId]);

  // ── scheduleAuditRefresh (called from Realtime subscription) ──
  const scheduleAuditRefresh = useCallback(() => {
    if (!organizationId) return;
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    auditTimerRef.current = setTimeout(() => {
      auditTimerRef.current = null;
      loadAuditLogs(auditFilters, { mode: "replace", cursor: null }).catch(() => {});
    }, 600);
  }, [organizationId, auditFilters, loadAuditLogs]);

  // ── Load on filter change ─────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    loadAuditLogs(auditFilters, { mode: "replace", cursor: null });
  }, [organizationId, auditFilters, loadAuditLogs]);

  // ── Debounced search refetch ──────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
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
  }, [auditSearch, organizationId, auditFilters, loadAuditLogs]);

  // ── Infinite scroll ───────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────
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

  const handleAuditExport = async (format = "xlsx") => {
    if (!organizationId) return;
    setAuditExporting(true);
    setAuditError("");
    try {
      const pageSize = 500;
      let cursor = null;
      let all = [];
      let loops = 0;
      while (true) {
        const params = buildAuditParams(auditFilters, pageSize, cursor, auditSearch);
        const rows = await adminListAuditLogs({ ...params, organizationId });
        if (!rows || rows.length === 0) break;
        all = [...all, ...rows];
        if (rows.length < pageSize) break;
        const last = rows[rows.length - 1];
        cursor = { beforeAt: last.created_at, beforeId: last.id };
        loops += 1;
        if (loops > 200) break;
      }
      if (!all.length) {
        setMessage("No audit entries found for export");
        return;
      }
      if (format === "xlsx") {
        await exportAuditLogsXLSX(all, { filters: auditFilters, search: auditSearch, organizationCode });
      } else {
        const fmtTs = (v) => {
          if (!v) return "";
          const d = new Date(v);
          if (isNaN(d.getTime())) return "";
          const pad = (n) => String(n).padStart(2, "0");
          return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        const header = ["Timestamp", "Actor", "Action", "Entity", "Message"];
        const dataRows = all.map((r) => [
          fmtTs(r.created_at),
          r.actor_type ?? "",
          r.action ?? "",
          r.entity_type ?? "",
          r.message ?? "",
        ]);
        await downloadTable(format, {
          filenameType: "Audit",
          sheetName: "Audit Log",
          periodName: "all",
          tenantCode: organizationCode,
          pdfTitle: "VERA — Audit Log",
          pdfSubtitle: `${all.length} events · ${auditSearch ? `Search: "${auditSearch}"` : "All time"}`,
          header,
          rows: dataRows,
          colWidths: [22, 12, 18, 16, 48],
        });
      }
      setMessage("Audit log exported");
    } catch (e) {
      setAuditError(e?.message || "Could not export audit logs.");
    } finally {
      setAuditExporting(false);
    }
  };

  return {
    // State
    auditLogs,
    auditLoading,
    auditError,
    auditFilters,
    setAuditFilters,
    auditSearch,
    setAuditSearch,
    auditHasMore,
    auditExporting,
    showAllAuditLogs,
    setShowAllAuditLogs,
    // Refs
    auditScrollRef,
    auditSentinelRef,
    auditCardRef,
    // Computed
    AUDIT_COMPACT_COUNT,
    visibleAuditLogs,
    hasAuditFilters,
    hasAuditToggle,
    showAuditSkeleton,
    isAuditStaleRefresh,
    auditRangeError,
    // Handlers
    handleAuditRefresh,
    handleAuditReset,
    handleAuditLoadMore,
    handleAuditExport,
    scheduleAuditRefresh,
    // Re-exported for AuditLogCard
    formatAuditTimestamp,
  };
}
