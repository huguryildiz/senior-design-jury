// src/admin/pages/PeriodsPage.jsx — Phase 7
// Evaluation Periods management page.
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { useManagePeriods } from "../hooks/useManagePeriods";
import ExportPanel from "../components/ExportPanel";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import "../../styles/pages/periods.css";

function formatUpdated(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getPeriodStatus(period) {
  if (period.is_locked) return "locked";
  if (period.is_current) return "active";
  return "completed";
}

function StatusPill({ status }) {
  if (status === "active") {
    return (
      <span className="sem-status sem-status-active">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Active
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span className="sem-status sem-status-locked">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Locked
      </span>
    );
  }
  return (
    <span className="sem-status sem-status-completed">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="m20 6-11 11-5-5" />
      </svg>
      Completed
    </span>
  );
}

export default function PeriodsPage({
  organizationId,
  selectedPeriodId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
}) {
  const _toast = useToast();
  const { activeOrganization } = useAuth();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };
  const [panelError, setPanelErrorState] = useState("");
  const setPanelError = useCallback((_panel, msg) => setPanelErrorState(msg || ""), []);
  const clearPanelError = useCallback(() => setPanelErrorState(""), []);
  const [loadingCount, setLoadingCount] = useState(0);
  const incLoading = useCallback(() => setLoadingCount((c) => c + 1), []);
  const decLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), []);

  const periods = useManagePeriods({
    organizationId,
    selectedPeriodId,
    setMessage,
    incLoading,
    decLoading,
    onCurrentPeriodChange: onCurrentSemesterChange,
    setPanelError,
    clearPanelError,
  });

  // Filter/export panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [lockFilter, setLockFilter] = useState("all");

  // Set-current confirmation modal
  const [switchTarget, setSwitchTarget] = useState(null);
  const [switchLoading, setSwitchLoading] = useState(false);

  // Add/edit period modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formName, setFormName] = useState("");
  const [formPosterDate, setFormPosterDate] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Action menu open state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods."))
      .finally(() => decLoading());
  }, [periods.loadPeriods]);

  // Close action menus on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [openMenuId]);

  const periodList = periods.periodList || [];

  // Derived stats
  const totalPeriods = periodList.length;
  const activePeriods = periodList.filter((p) => !p.is_locked && p.is_current).length;
  const completedPeriods = periodList.filter((p) => !p.is_locked && !p.is_current).length;
  const lockedPeriods = periodList.filter((p) => p.is_locked).length;

  // Filtered list
  const filteredList = periodList.filter((p) => {
    const status = getPeriodStatus(p);
    if (statusFilter !== "all" && status !== statusFilter.toLowerCase()) return false;
    if (lockFilter === "Locked" && !p.is_locked) return false;
    if (lockFilter === "Unlocked" && p.is_locked) return false;
    return true;
  });

  // Locked period (first one, for banner)
  const lockedPeriod = periodList.find((p) => p.is_locked);

  function openSetCurrentModal(period) {
    setSwitchTarget(period);
    setOpenMenuId(null);
  }

  async function confirmSetCurrent() {
    if (!switchTarget) return;
    setSwitchLoading(true);
    try {
      await periods.handleSetCurrentPeriod(switchTarget.id);
      setSwitchTarget(null);
    } catch (e) {
      _toast.error(e?.message || "Could not set current period.");
    } finally {
      setSwitchLoading(false);
    }
  }

  function openAddModal() {
    setEditTarget(null);
    setFormName("");
    setFormPosterDate("");
    setAddModalOpen(true);
  }

  function openEditModal(period) {
    setEditTarget(period);
    setFormName(period.name || "");
    setFormPosterDate(period.poster_date ? period.poster_date.slice(0, 10) : "");
    setAddModalOpen(true);
    setOpenMenuId(null);
  }

  async function handleSavePeriod() {
    if (!formName.trim()) return;
    setFormSaving(true);
    try {
      if (editTarget) {
        await periods.handleUpdatePeriod({
          id: editTarget.id,
          name: formName.trim(),
          poster_date: formPosterDate || null,
        });
      } else {
        await periods.handleCreatePeriod({
          name: formName.trim(),
          poster_date: formPosterDate || null,
        });
      }
      setAddModalOpen(false);
    } catch (e) {
      _toast.error(e?.message || "Could not save period.");
    } finally {
      setFormSaving(false);
    }
  }

  return (
    <div>
      {/* Locked period banner */}
      {lockedPeriod && (
        <div className="sem-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="sem-banner-text">
            <strong>{lockedPeriod.name}</strong> is locked — evaluation period has ended and scores are finalized. View-only access available.
          </span>
          <span className="sem-banner-action">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View records
          </span>
        </div>
      )}

      {/* Page header */}
      <div className="sem-header">
        <div className="sem-header-left">
          <div className="page-title">Evaluation Periods</div>
          <div className="page-desc">Manage evaluation periods, active sessions, and locked historical records.</div>
        </div>
        <div className="sem-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            {" "}Filter
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {" "}Export
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: "auto", padding: "6px 14px", fontSize: "12px", background: "var(--accent)", boxShadow: "none" }}
            onClick={openAddModal}
          >
            + Add Period
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-panel-header">
            <div>
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter Periods
              </h4>
              <div className="filter-panel-sub">Narrow evaluation periods by status and lock state.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <select className="modal-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: "32px", fontSize: "12px" }}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="locked">Locked</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Eval Lock</label>
              <select className="modal-input" value={lockFilter} onChange={(e) => setLockFilter(e.target.value)} style={{ height: "32px", fontSize: "12px" }}>
                <option value="all">All</option>
                <option value="Unlocked">Unlocked</option>
                <option value="Locked">Locked</option>
              </select>
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={() => { setStatusFilter("all"); setLockFilter("all"); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
              {" "}Clear all
            </button>
          </div>
        </div>
      )}

      {/* Export panel */}
      {exportOpen && (
        <ExportPanel
          title="Export Periods"
          subtitle="Download period records with project counts, juror counts, and status history."
          meta={`${totalPeriods} periods · All records`}
          organization={activeOrganization?.name || ""}
          onClose={() => setExportOpen(false)}
          generateFile={async (fmt) => {
            const header = ["Name", "Season", "Current", "Locked", "Created"];
            const rows = filteredList.map((p) => [
              p.name ?? "", p.season ?? "", p.is_current ? "Yes" : "No", p.is_locked ? "Yes" : "No", formatUpdated(p.created_at),
            ]);
            return generateTableBlob(fmt, {
              filenameType: "Periods", sheetName: "Periods", periodName: "all",
              tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
              department: activeOrganization?.institution_name || "", pdfTitle: "VERA — Evaluation Periods",
              header, rows, colWidths: [28, 14, 10, 10, 18],
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = ["Name", "Season", "Current", "Locked", "Created"];
              const rows = filteredList.map((p) => [
                p.name ?? "", p.season ?? "", p.is_current ? "Yes" : "No", p.is_locked ? "Yes" : "No", formatUpdated(p.created_at),
              ]);
              await downloadTable(fmt, {
                filenameType: "Periods", sheetName: "Periods", periodName: "all",
                tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
                department: activeOrganization?.institution_name || "", pdfTitle: "VERA — Evaluation Periods",
                header, rows, colWidths: [28, 14, 10, 10, 18],
              });
              setExportOpen(false);
              _toast.success("Periods exported");
            } catch (e) {
              _toast.error(e?.message || "Export failed");
            }
          }}
        />
      )}

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalPeriods}</div>
          <div className="scores-kpi-item-label">Periods</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="success">{activePeriods}</span></div>
          <div className="scores-kpi-item-label">Active</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{completedPeriods}</div>
          <div className="scores-kpi-item-label">Completed</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{lockedPeriods}</div>
          <div className="scores-kpi-item-label">Locked</div>
        </div>
      </div>

      {/* Error */}
      {panelError && (
        <div className="fb-alert fba-danger" style={{ marginBottom: "12px" }}>
          <div className="fb-alert-body">{panelError}</div>
        </div>
      )}

      {/* Table */}
      <div className="sem-table-wrap">
        <table className="sem-table">
          <thead>
            <tr>
              <th style={{ minWidth: "200px" }}>Evaluation Period</th>
              <th style={{ width: "120px" }}>Status</th>
              <th style={{ width: "130px" }}>Last Updated</th>
              <th style={{ width: "52px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading periods…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  No periods found.
                </td>
              </tr>
            ) : filteredList.map((period) => {
              const status = getPeriodStatus(period);
              const isCurrent = !!period.is_current && !period.is_locked;
              return (
                <tr
                  key={period.id}
                  className={isCurrent ? "sem-row-current" : undefined}
                >
                  <td>
                    <div className="sem-name" style={period.is_locked ? { color: "var(--text-secondary)" } : undefined}>
                      {period.name}
                      {isCurrent && (
                        <span className="sem-badge-current">
                          <span className="dot" />
                          Current
                        </span>
                      )}
                    </div>
                    {period.poster_date && (
                      <div className="sem-name-sub">
                        {period.is_locked
                          ? `Locked · scores finalized · read-only`
                          : isCurrent
                          ? `Evaluation in progress`
                          : `Ended · all evaluations submitted`}
                      </div>
                    )}
                  </td>
                  <td><StatusPill status={status} /></td>
                  <td><span className="sem-updated">{formatUpdated(period.updated_at)}</span></td>
                  <td>
                    <div className="sem-action-wrap" ref={openMenuId === period.id ? menuRef : null}>
                      <button
                        className="sem-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === period.id ? null : period.id));
                        }}
                        title="Actions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {openMenuId === period.id && (
                        <div className="sem-action-menu open">
                          {!isCurrent && !period.is_locked && (
                            <div className="juror-action-item" onClick={() => openSetCurrentModal(period)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Set as Current
                            </div>
                          )}
                          <div className="juror-action-item" onClick={() => openEditModal(period)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Period
                          </div>
                          {!period.is_locked && (
                            <>
                              <div className="juror-action-sep" />
                              <div
                                className="juror-action-item danger"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (window.confirm(`Delete period "${period.name}"? This cannot be undone.`)) {
                                    periods.handleDeletePeriod(period.id);
                                  }
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete Period
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Set Current Period confirmation modal */}
      {switchTarget && (
        <div className="modal-overlay" onClick={() => setSwitchTarget(null)}>
          <div className="modal-card" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Set as Current Period</span>
              <button className="juror-drawer-close" onClick={() => setSwitchTarget(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fb-alert fba-info" style={{ marginBottom: "12px" }}>
                <div className="fb-alert-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <div className="fb-alert-body">
                  <div className="fb-alert-title">This switch is immediate</div>
                  <div className="fb-alert-desc">Juror assignments and scoring context will point to the newly active period right away.</div>
                </div>
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                You are switching active evaluation period to <strong>{switchTarget.name}</strong>.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setSwitchTarget(null)} disabled={switchLoading}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--accent)", color: "#fff" }}
                onClick={confirmSetCurrent}
                disabled={switchLoading}
              >
                {switchLoading ? "Switching…" : "Set as Current"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit period modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editTarget ? "Edit Period" : "Add Period"}</span>
              <button className="juror-drawer-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label className="modal-label">Period Name</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g. Spring 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-field" style={{ marginTop: "12px" }}>
                <label className="modal-label">Poster / Evaluation Date (optional)</label>
                <input
                  className="modal-input"
                  type="date"
                  value={formPosterDate}
                  onChange={(e) => setFormPosterDate(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setAddModalOpen(false)} disabled={formSaving}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSavePeriod}
                disabled={formSaving || !formName.trim()}
              >
                {formSaving ? "Saving…" : editTarget ? "Save Changes" : "Add Period"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
