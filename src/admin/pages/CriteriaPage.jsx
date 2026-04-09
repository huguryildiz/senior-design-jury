// src/admin/pages/CriteriaPage.jsx
// Phase 8 — full rewrite from vera-premium-prototype.html lines 14519–14718

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Plus, ClipboardList, CheckCircle2, Pencil, Trash2, MoreVertical, ClipboardX, AlertCircle } from "lucide-react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useToast } from "@/shared/hooks/useToast";
import { useManagePeriods } from "../hooks/useManagePeriods";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import FbAlert from "@/shared/ui/FbAlert";
import EditSingleCriterionDrawer from "@/admin/drawers/EditSingleCriterionDrawer";
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

// ── Main component ───────────────────────────────────────────

export default function CriteriaPage() {
  const {
    organizationId,
    selectedPeriodId,
    isDemoMode = false,
    onDirtyChange,
    onCurrentSemesterChange,
    onNavigate,
  } = useAdminContext();
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

  // ── Single-criterion editor state ──────────────────────────────
  // null = closed, -1 = add new, >= 0 = edit that index

  const [editingIndex, setEditingIndex] = useState(null);
  const closeEditor = () => setEditingIndex(null);

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
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
    if (deleteIndex === null || deleteSubmitting) return;
    const indexToDelete = deleteIndex;
    const next = criteriaConfig.filter((_, i) => i !== indexToDelete);

    setDeleteSubmitting(true);
    try {
      const result = await handleSave(next);
      if (!result.ok) {
        setPanelError("criteria", result.error);
        return;
      }
      setDeleteIndex(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const deleteLabel = deleteIndex !== null
    ? (criteriaConfig[deleteIndex]?.label || `Criterion ${deleteIndex + 1}`)
    : "";
  const deleteTargetText = deleteLabel || "";
  const canDeleteCriterion = !deleteTargetText || deleteConfirmText === deleteTargetText;

  useEffect(() => {
    setDeleteConfirmText("");
  }, [deleteIndex]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div id="page-criteria">
      {/* Lock info banner */}
      {isLocked && (
        <div className="crt-info-banner">
          <div className="crt-info-banner-icon">
            <Lock size={18} strokeWidth={1.8} />
          </div>
          <div className="crt-info-banner-body">
            <div className="crt-info-banner-title">
              <Lock size={14} className="crt-lock-icon" />
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
        <FbAlert variant="danger" style={{ marginBottom: 16 }}>
          {panelError}
        </FbAlert>
      )}

      {/* Page header */}
      <div className="crt-header">
        <div className="crt-header-left">
          <div className="page-title">Evaluation Criteria</div>
          <div className="page-desc">Define scoring rubrics and criteria weights for the active evaluation period.</div>
        </div>
        {periods.viewPeriodId && (
          <button className="crt-add-btn" onClick={() => setEditingIndex(-1)} disabled={isLocked}>
            <Plus size={13} strokeWidth={2.2} />
            Add Criterion
          </button>
        )}
      </div>

      {/* No periods exist yet */}
      {!periods.viewPeriodId && periods.periodList.length === 0 && !panelError && (
        <div className="crt-empty-state">
          <div className="crt-empty-state-icon">
            <ClipboardList size={28} strokeWidth={1.5} />
          </div>
          <div className="crt-empty-state-title">No evaluation periods yet</div>
          <div className="crt-empty-state-desc">
            Create an evaluation period first — then come back here to configure its criteria.
          </div>
          <button
            className="crt-add-btn"
            style={{ marginTop: 16 }}
            onClick={() => onNavigate?.("periods")}
          >
            <Plus size={13} strokeWidth={2.2} />
            Go to Evaluation Periods
          </button>
        </div>
      )}

      {/* Periods exist but none selected */}
      {!periods.viewPeriodId && periods.periodList.length > 0 && (
        <div className="crt-empty-state">
          <div className="crt-empty-state-icon">
            <ClipboardList size={28} strokeWidth={1.5} />
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
                <CheckCircle2 size={14} strokeWidth={2.2} />
                {criteriaConfig.length} {criteriaConfig.length === 1 ? "criterion" : "criteria"} &middot; {totalMax} points
              </div>
            )}
          </div>

          {criteriaConfig.length === 0 ? (
            <div className="crt-empty-state">
              <div className="crt-empty-state-icon">
                <ClipboardX size={28} strokeWidth={1.5} />
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
                              <span key={bi} className={`crt-band-pill ${rubricBandClass(band.level || band.label)}`}>
                                {bandRangeText(band) && (
                                  <span className="crt-band-range">{bandRangeText(band)}</span>
                                )}
                                {band.level || band.label}
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
                            aria-label="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {isMenuOpen && (
                            <div className="row-act-menu" style={{ display: "block" }}>
                              <div
                                className="juror-action-item"
                                onClick={() => { setOpenMenuId(null); setEditingIndex(i); }}
                              >
                                <Pencil size={15} style={{ flexShrink: 0 }} />
                                Edit Criterion
                              </div>
                              <div className="juror-action-sep" />
                              <div
                                className="juror-action-item danger"
                                onClick={() => { setOpenMenuId(null); setDeleteIndex(i); }}
                              >
                                <Trash2 size={15} style={{ flexShrink: 0 }} />
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

      {/* Delete confirm */}
      <Modal
        open={deleteIndex !== null}
        onClose={() => {
          if (deleteSubmitting) return;
          setDeleteIndex(null);
        }}
        size="sm"
        centered
      >
        <div className="fs-modal-header">
          <div className="fs-modal-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </div>
          <div className="fs-title" style={{ textAlign: "center" }}>Remove Criterion?</div>
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
            You are about to remove{" "}
            <strong style={{ color: "var(--text-primary)" }}>{deleteLabel || "this criterion"}</strong>{" "}
            from the evaluation template.
          </div>
        </div>

        <div className="fs-modal-body" style={{ paddingTop: 2 }}>
          <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">This action cannot be undone</div>
              <div className="fs-alert-desc">
                All rubric bands and outcome mappings for this criterion will be permanently removed.
                Scores already submitted will not be affected.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              Type <strong style={{ color: "var(--text-primary)" }}>{deleteTargetText}</strong> to confirm
            </label>
            <input
              className="fs-typed-input"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTargetText ? `Type ${deleteTargetText} to confirm` : "Type to confirm"}
              autoComplete="off"
              spellCheck={false}
              disabled={deleteSubmitting}
            />
          </div>
        </div>

        <div
          className="fs-modal-footer"
          style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}
        >
          <button
            type="button"
            className="fs-btn fs-btn-secondary"
            onClick={() => setDeleteIndex(null)}
            disabled={deleteSubmitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fs-btn fs-btn-danger"
            onClick={handleDeleteConfirm}
            disabled={deleteSubmitting || deleteIndex === null || !canDeleteCriterion}
            style={{ flex: 1 }}
          >
            <AsyncButtonContent loading={deleteSubmitting} loadingText="Removing…">
              Remove Criterion
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>

      {/* Single-criterion editor drawer */}
      <EditSingleCriterionDrawer
        open={editingIndex !== null}
        onClose={closeEditor}
        period={{ id: periods.viewPeriodId, name: periods.viewPeriodLabel }}
        criterion={editingIndex >= 0 ? criteriaConfig[editingIndex] : null}
        editIndex={editingIndex}
        criteriaConfig={criteriaConfig}
        outcomeConfig={periods.outcomeConfig || []}
        onSave={handleSave}
        disabled={loadingCount > 0}
        isLocked={isLocked}
      />
    </div>
  );
}
