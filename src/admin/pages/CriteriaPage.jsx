// src/admin/pages/CriteriaPage.jsx
// Phase 8 — full rewrite from vera-premium-prototype.html lines 14519–14718

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { useManagePeriods } from "../hooks/useManagePeriods";
import CriteriaManager from "../criteria/CriteriaManager";
import "../../styles/pages/criteria.css";

// ── Helpers ──────────────────────────────────────────────────

function rubricBandClass(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("excel") || l.includes("outstanding")) return "crt-band-excellent";
  if (l.includes("good") || l.includes("profic")) return "crt-band-good";
  if (l.includes("fair") || l.includes("satisf") || l.includes("average") || l.includes("develop")) return "crt-band-fair";
  return "crt-band-poor";
}

function bandRangeText(band) {
  if (band.min != null && band.max != null) return `${band.min}–${band.max}`;
  if (band.min != null) return `${band.min}+`;
  if (band.max != null) return `≤${band.max}`;
  return "";
}

// ── Delete modal ─────────────────────────────────────────────

function CriteriaDeleteModal({ open, criterionLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Remove Criterion</span>
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
                All rubric bands and outcome mappings for this criterion will be permanently removed.
                Scores already submitted will not be affected.
              </div>
            </div>
          </div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            You are about to remove <strong>{criterionLabel}</strong> from the evaluation template.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-sm"
            style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
            onClick={onConfirm}
          >
            Remove Criterion
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function CriteriaPage({
  organizationId,
  selectedPeriodId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
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

  // ── Derived data ──────────────────────────────────────────────

  const viewPeriod = periods.periodList.find((s) => s.id === periods.viewPeriodId);
  const criteriaConfig = periods.criteriaConfig || [];
  const isLocked = !!(viewPeriod?.is_locked);
  const totalMax = criteriaConfig.reduce((s, c) => s + (c.max || 0), 0);

  // ── Save handler (used by CriteriaManager overlay) ───────────

  const handleSave = async (newTemplate) => {
    if (!periods.viewPeriodId) return { ok: false, error: "No period selected" };
    try {
      incLoading();
      await periods.updateCriteriaTemplate(periods.viewPeriodId, newTemplate);
      setMessage("Criteria updated successfully");
      return { ok: true };
    } catch (err) {
      const msg = err?.message || "Failed to update criteria";
      setPanelError("criteria", msg);
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  // ── Row delete handler ────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    const next = criteriaConfig.filter((_, i) => i !== deleteIndex);
    setDeleteIndex(null);
    const result = await handleSave(next);
    if (!result.ok) setPanelError("criteria", result.error);
  };

  const deleteLabel = deleteIndex !== null
    ? (criteriaConfig[deleteIndex]?.label || `Criterion ${deleteIndex + 1}`)
    : "";

  // ── Render ────────────────────────────────────────────────────

  return (
    <div id="page-criteria">
      {/* Lock info banner */}
      {isLocked && (
        <div className="crt-info-banner">
          <div className="crt-info-banner-icon">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" fill="none" strokeWidth="1.8" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" fill="none" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="crt-info-banner-body">
            <div className="crt-info-banner-title">
              <svg className="crt-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Scores exist for this evaluation period
            </div>
            <div className="crt-info-banner-desc">
              Structural fields (<strong>weights</strong>, <strong>max scores</strong>) are locked while scores exist.
              Labels and descriptions remain editable.
            </div>
          </div>
        </div>
      )}

      {/* Panel error */}
      {panelError && (
        <div className="fb-alert fba-danger" style={{ marginBottom: 16 }}>
          <div className="fb-alert-body">
            <div className="fb-alert-desc">{panelError}</div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="crt-header">
        <div className="crt-header-left">
          <div className="page-title">Evaluation Criteria</div>
          <div className="page-desc">Define scoring rubrics and criteria weights for the active evaluation period.</div>
        </div>
        {periods.viewPeriodId && (
          <button className="crt-add-btn" onClick={openEditor} disabled={isLocked}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Criterion
          </button>
        )}
      </div>

      {/* No period selected */}
      {!periods.viewPeriodId && (
        <div className="crt-empty-state">
          <div className="crt-empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          </div>
          <div className="crt-empty-state-title">No period selected</div>
          <div className="crt-empty-state-desc">Select an evaluation period to manage its criteria.</div>
        </div>
      )}

      {/* Criteria table */}
      {periods.viewPeriodId && (
        <div className="crt-table-card">
          <div className="crt-table-card-header">
            <div className="crt-table-card-title">
              Active Criteria{periods.viewPeriodLabel ? ` — ${periods.viewPeriodLabel}` : ""}
            </div>
            {criteriaConfig.length > 0 && (
              <div className="crt-summary-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {criteriaConfig.length} {criteriaConfig.length === 1 ? "criterion" : "criteria"} &middot; {totalMax} points
              </div>
            )}
          </div>

          {criteriaConfig.length === 0 ? (
            <div className="crt-empty-state">
              <div className="crt-empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="crt-empty-state-title">No criteria defined</div>
              <div className="crt-empty-state-desc">Click "Add Criterion" to define your first evaluation criterion.</div>
            </div>
          ) : (
            <table className="crt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="col-criterion">Criterion</th>
                  <th className="col-weight">Weight</th>
                  <th className="col-max">Max Score</th>
                  <th className="col-rubric">Rubric Bands</th>
                  <th className="col-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {criteriaConfig.map((criterion, i) => {
                  const weight = totalMax > 0 ? Math.round((criterion.max / totalMax) * 100) : 0;
                  const rubric = Array.isArray(criterion.rubric) ? criterion.rubric : [];
                  const menuKey = `crt-row-${i}`;
                  const isMenuOpen = openMenuId === menuKey;
                  return (
                    <tr key={criterion.key || i}>
                      <td><span className="crt-row-num">{i + 1}</span></td>
                      <td>
                        <div className="crt-name">{criterion.label || criterion.shortLabel || `Criterion ${i + 1}`}</div>
                        {criterion.blurb && (
                          <div className="crt-desc">{criterion.blurb}</div>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="crt-weight-cell">{weight}%</span>
                      </td>
                      <td className="text-center">
                        <span className="crt-max">{criterion.max}</span>
                      </td>
                      <td>
                        {rubric.length > 0 ? (
                          <div className="crt-rubric-bands">
                            {rubric.map((band, bi) => (
                              <span key={bi} className={`crt-band-pill ${rubricBandClass(band.label)}`}>
                                {bandRangeText(band) && (
                                  <span className="crt-band-range">{bandRangeText(band)}</span>
                                )}
                                {band.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: "var(--text-quaternary)" }}>No rubric defined</span>
                        )}
                      </td>
                      <td>
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
                                onClick={() => { setOpenMenuId(null); openEditor(); }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
                                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                                Edit Criterion
                              </div>
                              <div className="juror-action-sep" />
                              <div
                                className="juror-action-item danger"
                                onClick={() => { setOpenMenuId(null); setDeleteIndex(i); }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
                                </svg>
                                Remove Criterion
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Delete modal */}
      <CriteriaDeleteModal
        open={deleteIndex !== null}
        criterionLabel={deleteLabel}
        onCancel={() => setDeleteIndex(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* CriteriaManager fullscreen overlay */}
      {editorOpen && (
        <div className="crt-editor-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}>
          <div className="crt-editor-panel" onClick={(e) => e.stopPropagation()}>
            <div className="crt-editor-panel-head">
              <div className="crt-editor-panel-title">
                <div className="crt-editor-panel-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                  </svg>
                </div>
                <div>
                  <div className="crt-editor-panel-label">Edit Criteria Template</div>
                  {periods.viewPeriodLabel && (
                    <div className="crt-editor-panel-sub">{periods.viewPeriodLabel}</div>
                  )}
                </div>
              </div>
              <button className="crt-editor-panel-close" onClick={closeEditor} aria-label="Close editor">×</button>
            </div>
            <div className="crt-editor-panel-body">
              <CriteriaManager
                template={criteriaConfig}
                outcomeConfig={periods.outcomeConfig || []}
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
