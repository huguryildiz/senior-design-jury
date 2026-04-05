// src/admin/pages/OutcomesPage.jsx
// Phase 8 — full rewrite from vera-premium-prototype.html lines 14718–14797

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { useManagePeriods } from "../hooks/useManagePeriods";
import OutcomeEditor from "../components/OutcomeEditor";
import "../../styles/pages/outcomes.css";

// ── Coverage helpers ─────────────────────────────────────────

function computeCoverage(outcomeCode, criteriaConfig) {
  const mapped = (criteriaConfig || []).filter(
    (c) => Array.isArray(c.mudek) && c.mudek.includes(outcomeCode)
  );
  return mapped.length > 0 ? "direct" : "none";
}

function getMappedCriteria(outcomeCode, criteriaConfig) {
  return (criteriaConfig || []).filter(
    (c) => Array.isArray(c.mudek) && c.mudek.includes(outcomeCode)
  );
}

// ── Outcome delete modal ──────────────────────────────────────

function OutcomeDeleteModal({ open, outcomeCode, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay show"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Remove Outcome</span>
          <button className="juror-drawer-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="fb-alert fba-danger" style={{ marginBottom: 12 }}>
            <div className="fb-alert-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" />
                <path d="M12 9v4m0 4h.01" stroke="currentColor" />
              </svg>
            </div>
            <div className="fb-alert-body">
              <div className="fb-alert-title">This action is irreversible</div>
              <div className="fb-alert-desc">
                All criterion mappings for this outcome will be permanently removed. This cannot be undone.
              </div>
            </div>
          </div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            You are about to remove outcome <strong>{outcomeCode}</strong> from the framework.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-sm"
            style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
            onClick={onConfirm}
          >
            Remove Outcome
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Outcome row ───────────────────────────────────────────────

function OutcomeRow({ outcome, index, criteriaConfig, isLocked, openMenuId, setOpenMenuId, menuRef, onEdit, onDelete, isExpanded, onToggleExpand }) {
  const menuKey = `acc-row-${index}`;
  const isMenuOpen = openMenuId === menuKey;
  const coverage = computeCoverage(outcome.code, criteriaConfig);
  const mappedCriteria = getMappedCriteria(outcome.code, criteriaConfig);

  return (
    <tr className={isExpanded ? "acc-row-expanded" : ""}>
      <td style={{ width: 28, padding: "12px 8px" }}>
        <button
          className="acc-expand-btn"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            style={{ width: 12, height: 12, transition: "transform .15s", transform: isExpanded ? "rotate(90deg)" : "none" }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </td>
      <td>
        <span className="acc-code">{outcome.code}</span>
      </td>
      <td>
        <div className="acc-outcome-label">
          {isExpanded ? (
            <>
              {outcome.desc_en && <div style={{ marginBottom: 4 }}>{outcome.desc_en}</div>}
              {outcome.desc_tr && (
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontStyle: "italic" }}>
                  {outcome.desc_tr}
                </div>
              )}
            </>
          ) : (
            <span>{outcome.desc_en || outcome.desc_tr || <em style={{ color: "var(--text-quaternary)" }}>No description</em>}</span>
          )}
        </div>
      </td>
      <td>
        {mappedCriteria.length > 0 ? (
          <div className="acc-criteria-chips">
            {mappedCriteria.map((c, ci) => (
              <span key={ci} className="acc-criteria-chip">
                {c.shortLabel || c.label}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--text-quaternary)" }}>—</span>
        )}
      </td>
      <td className="text-center">
        {coverage === "direct" ? (
          <span className="acc-coverage acc-coverage-direct">Direct</span>
        ) : (
          <span className="acc-coverage acc-coverage-none">Not mapped</span>
        )}
      </td>
      <td className="text-center">
        <div
          className="row-act-wrap"
          ref={isMenuOpen ? menuRef : null}
          style={{ justifyContent: "center" }}
        >
          <button
            className="juror-action-btn"
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : menuKey); }}
            title="Actions"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {isMenuOpen && (
            <div className="row-act-menu" style={{ display: "block" }}>
              <div
                className="juror-action-item"
                onClick={() => { setOpenMenuId(null); onEdit(); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
                Edit Outcome
              </div>
              <div className="juror-action-sep" />
              <div
                className="juror-action-item danger"
                onClick={() => { setOpenMenuId(null); onDelete(); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
                </svg>
                Remove Outcome
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main component ───────────────────────────────────────────

export default function OutcomesPage({
  organizationId,
  selectedPeriodId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
  frameworks = [],
  onFrameworksChange,
}) {
  const _toast = useToast();
  const setMessage = useCallback((msg) => { if (msg) _toast.success(msg); }, [_toast]);

  const [panelError, setPanelErrorState] = useState("");
  const setPanelError = useCallback((_panel, msg) => setPanelErrorState(msg || ""), []);
  const clearPanelError = useCallback(() => setPanelErrorState(""), []);

  const [loadingCount, setLoadingCount] = useState(0);
  const incLoading = useCallback(() => setLoadingCount((c) => c + 1), []);
  const decLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), []);

  // ── Periods ──────────────────────────────────────────────────

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

  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods. Try refreshing."))
      .finally(() => decLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods.loadPeriods]);

  // ── Editor overlay state ──────────────────────────────────────

  const [editorOpen, setEditorOpen] = useState(false);
  const openEditor = () => setEditorOpen(true);
  const closeEditor = () => setEditorOpen(false);

  // ── Row expand state ──────────────────────────────────────────

  const [expandedRows, setExpandedRows] = useState(new Set());
  const toggleExpand = (i) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // ── Row action menus ──────────────────────────────────────────

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  // ── Delete modal state ────────────────────────────────────────

  const [deleteIndex, setDeleteIndex] = useState(null);

  // ── Threshold edit state ──────────────────────────────────────

  const [editingThresholdFor, setEditingThresholdFor] = useState(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [thresholdError, setThresholdError] = useState("");

  // ── Escape key handler for threshold edit ─────────────────────

  useEffect(() => {
    if (!editingThresholdFor) return;
    const handler = (e) => {
      if (e.key === "Escape") setEditingThresholdFor(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingThresholdFor]);

  // ── Derived data ──────────────────────────────────────────────

  const viewPeriod = periods.periodList.find((s) => s.id === periods.viewPeriodId);
  const outcomeConfig = periods.outcomeConfig || [];
  const criteriaConfig = periods.criteriaConfig || [];
  const isLocked = !!(viewPeriod?.is_locked);

  // KPI computation
  const totalOutcomes = outcomeConfig.length;
  const directCount = outcomeConfig.filter((o) => computeCoverage(o.code, criteriaConfig) === "direct").length;
  const indirectCount = 0; // future feature
  const unmappedCount = totalOutcomes - directCount - indirectCount;
  const incompleteCount = unmappedCount + indirectCount;

  // ── Save handler (used by OutcomeEditor overlay) ──────────────

  const handleSave = async (newTemplate) => {
    if (!periods.viewPeriodId) return { ok: false, error: "No period selected" };
    try {
      incLoading();
      await periods.updateMudekTemplate(periods.viewPeriodId, newTemplate);
      setMessage("Outcomes updated successfully");
      return { ok: true };
    } catch (err) {
      const msg = err?.message || "Failed to update outcomes";
      setPanelError("outcomes", msg);
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  // ── Row delete handler ────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    const next = outcomeConfig.filter((_, i) => i !== deleteIndex);
    setDeleteIndex(null);
    const result = await handleSave(next);
    if (!result.ok) setPanelError("outcomes", result.error);
  };

  const deleteCode = deleteIndex !== null ? (outcomeConfig[deleteIndex]?.code || `Outcome ${deleteIndex + 1}`) : "";

  // ── Threshold save handler ────────────────────────────────────

  const handleThresholdSave = async (frameworkId) => {
    const val = Number(thresholdValue);
    if (Number.isNaN(val) || val < 0 || val > 100) {
      setThresholdError("Enter a value between 0 and 100.");
      return;
    }
    setThresholdSaving(true);
    setThresholdError("");
    try {
      const { updateFramework } = await import("../../shared/api");
      await updateFramework(frameworkId, { default_threshold: val });
      setEditingThresholdFor(null);
      onFrameworksChange?.();
      _toast.success(`Passing threshold set to ${val}%`);
    } catch (err) {
      setThresholdError(err?.message || "Failed to save. Try again.");
    } finally {
      setThresholdSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div id="page-accreditation">
      {/* Panel error */}
      {panelError && (
        <div className="fb-alert fba-danger" style={{ marginBottom: 16 }}>
          <div className="fb-alert-body">
            <div className="fb-alert-desc">{panelError}</div>
          </div>
        </div>
      )}

      {/* Page title */}
      <div style={{ marginBottom: 16 }}>
        <div className="page-title">Outcomes &amp; Mapping</div>
        <div className="page-desc">Map evaluation criteria to programme outcomes and track coverage.</div>
      </div>

      {!periods.viewPeriodId ? (
        <div className="acc-empty-state">
          <div className="acc-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
            </svg>
          </div>
          <div className="acc-empty-title">No period selected</div>
          <div className="acc-empty-desc">Select an evaluation period to manage its outcomes.</div>
        </div>
      ) : (
        <>
          {/* Framework selector bar */}
          <div className="fw-context-bar">
            <div className="fw-context-label">Framework</div>
            <div className="fw-chips">
              {frameworks.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No frameworks</span>
              ) : (
                frameworks.map((fw) => {
                  const isEditing = editingThresholdFor === fw.id;
                  return (
                    <div key={fw.id} className="fw-chip-wrap">
                      <button className="fw-chip active">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="fw-chip-icon">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                          <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                        </svg>
                        {fw.name}
                        <span className="fw-chip-count">{outcomeConfig.length}</span>
                      </button>
                      <button
                        className="fw-chip-options"
                        onClick={(e) => e.stopPropagation()}
                        title="Framework options"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                        </svg>
                      </button>
                      <div className="fw-chip-menu">
                        <button
                          className="fw-chip-menu-item"
                          onClick={(e) => { e.stopPropagation(); openEditor(); }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit Framework
                        </button>
                        <div className="fw-chip-menu-sep" />
                        <button
                          className="fw-chip-menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setThresholdValue(String(fw.default_threshold ?? 70));
                            setThresholdError("");
                            setEditingThresholdFor(isEditing ? null : fw.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          Set Threshold
                          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600 }}>
                            {fw.default_threshold ?? 70}%
                          </span>
                        </button>
                      </div>

                      {/* Inline threshold edit row */}
                      {isEditing && (
                        <div className="fw-threshold-edit-row" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, padding: "6px 8px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)" }}>
                          <label style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            Threshold:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={thresholdValue}
                            onChange={(e) => { setThresholdValue(e.target.value); setThresholdError(""); }}
                            disabled={thresholdSaving}
                            style={{ width: 64, padding: "3px 8px", fontSize: 13, borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)" }}
                            autoFocus
                          />
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>%</span>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: "3px 12px", fontSize: 12 }}
                            onClick={() => handleThresholdSave(fw.id)}
                            disabled={thresholdSaving}
                          >
                            {thresholdSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
                            onClick={() => setEditingThresholdFor(null)}
                            aria-label="Cancel"
                            disabled={thresholdSaving}
                          >
                            ×
                          </button>
                          {thresholdError && (
                            <span style={{ fontSize: 11, color: "var(--danger)" }}>{thresholdError}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* KPI summary strip */}
          <div className="scores-kpi-strip" id="acc-summary-strip">
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">{totalOutcomes}</div>
              <div className="scores-kpi-item-label">Total Outcomes</div>
              <div style={{ fontSize: 9, color: "var(--text-quaternary)", marginTop: 2 }}>Defined in framework</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">
                <span className="success">{directCount}</span>
              </div>
              <div className="scores-kpi-item-label">Direct</div>
              <div style={{ fontSize: 9, color: "var(--text-quaternary)", marginTop: 2 }}>Explicitly mapped</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value" style={{ color: "var(--warning)" }}>{indirectCount}</div>
              <div className="scores-kpi-item-label">Indirect</div>
              <div style={{ fontSize: 9, color: "var(--text-quaternary)", marginTop: 2 }}>Tangentially assessed</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value" style={{ color: "var(--text-tertiary)" }}>{unmappedCount}</div>
              <div className="scores-kpi-item-label">Unmapped</div>
              <div style={{ fontSize: 9, color: "var(--text-quaternary)", marginTop: 2 }}>No coverage</div>
            </div>
          </div>

          {/* Advisory banner */}
          {incompleteCount > 0 && totalOutcomes > 0 && (
            <div className="fb-alert fba-warning" style={{ marginBottom: 16 }}>
              <div className="fb-alert-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" />
                  <path d="M12 9v4m0 4h.01" stroke="currentColor" />
                </svg>
              </div>
              <div className="fb-alert-body">
                <div className="fb-alert-title">Incomplete outcome coverage</div>
                <div className="fb-alert-desc">
                  {incompleteCount} of {totalOutcomes} programme outcome{totalOutcomes !== 1 ? "s" : ""} lack
                  direct criterion mapping
                  {unmappedCount > 0 ? ` (${unmappedCount} unmapped)` : ""}.
                  Consider adding explicit criterion mappings to strengthen accreditation compliance.
                </div>
              </div>
            </div>
          )}

          {/* Outcomes table card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Programme Outcomes</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="fw-active-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 13, height: 13 }}>
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                  </svg>
                  MÜDEK {periods.viewPeriodLabel ? `— ${periods.viewPeriodLabel}` : ""}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-quaternary)", fontWeight: 500 }}>Expand rows for details</span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: "auto", padding: "6px 14px", fontSize: 12, background: "var(--accent)", boxShadow: "none" }}
                  onClick={openEditor}
                  disabled={isLocked}
                >
                  + Add Outcome
                </button>
              </div>
            </div>
            <div className="table-wrap" style={{ border: "none", overflow: "visible" }}>
              {outcomeConfig.length === 0 ? (
                <div className="acc-empty-state" style={{ padding: "32px 24px" }}>
                  <div className="acc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <div className="acc-empty-title">No outcomes defined</div>
                  <div className="acc-empty-desc">Click "Add Outcome" to define your first programme outcome.</div>
                </div>
              ) : (
                <table className="acc-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}></th>
                      <th style={{ width: 60 }}>Code</th>
                      <th>Outcome</th>
                      <th>Mapped Criteria</th>
                      <th style={{ width: 110 }} className="text-center">Coverage</th>
                      <th style={{ width: 40 }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomeConfig.map((outcome, i) => (
                      <OutcomeRow
                        key={outcome.id || outcome.code || i}
                        outcome={outcome}
                        index={i}
                        criteriaConfig={criteriaConfig}
                        isLocked={isLocked}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        menuRef={menuRef}
                        onEdit={openEditor}
                        onDelete={() => setDeleteIndex(i)}
                        isExpanded={expandedRows.has(i)}
                        onToggleExpand={() => toggleExpand(i)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete modal */}
      <OutcomeDeleteModal
        open={deleteIndex !== null}
        outcomeCode={deleteCode}
        onCancel={() => setDeleteIndex(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* OutcomeEditor fullscreen overlay */}
      {editorOpen && (
        <div className="crt-editor-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}>
          <div className="crt-editor-panel" onClick={(e) => e.stopPropagation()}>
            <div className="crt-editor-panel-head">
              <div className="crt-editor-panel-title">
                <div className="crt-editor-panel-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                  </svg>
                </div>
                <div>
                  <div className="crt-editor-panel-label">Edit MÜDEK Outcomes</div>
                  {periods.viewPeriodLabel && (
                    <div className="crt-editor-panel-sub">{periods.viewPeriodLabel}</div>
                  )}
                </div>
              </div>
              <button className="crt-editor-panel-close" onClick={closeEditor} aria-label="Close editor">×</button>
            </div>
            <div className="crt-editor-panel-body">
              <OutcomeEditor
                outcomeConfig={outcomeConfig}
                criteriaConfig={criteriaConfig}
                onSave={async (newTemplate) => {
                  const result = await handleSave(newTemplate);
                  if (result.ok) closeEditor();
                  return result;
                }}
                onDirtyChange={onDirtyChange}
                disabled={loadingCount > 0}
                isLocked={isLocked}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
