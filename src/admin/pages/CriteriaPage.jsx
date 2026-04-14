// src/admin/pages/CriteriaPage.jsx
// Phase 8 — full rewrite from vera-premium-prototype.html lines 14519–14718

import { useCallback, useEffect, useState } from "react";
import {
  Lock,
  Plus,
  ClipboardList,
  Calendar,
  Pencil,
  Trash2,
  MoreVertical,
  ClipboardX,
  AlertCircle,
  Icon,
  Copy,
  MoveUp,
  MoveDown,
  Info,
} from "lucide-react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useToast } from "@/shared/hooks/useToast";
import { useManagePeriods } from "../hooks/useManagePeriods";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import FbAlert from "@/shared/ui/FbAlert";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import EditSingleCriterionDrawer from "@/admin/drawers/EditSingleCriterionDrawer";
import WeightBudgetBar from "@/admin/criteria/WeightBudgetBar";
import SaveBar from "@/admin/criteria/SaveBar";
import InlineWeightEdit from "@/admin/criteria/InlineWeightEdit";
import Pagination from "@/shared/ui/Pagination";
import {
  rescaleRubricBandsByWeight,
  defaultRubricBands,
  nextCriterionColor,
  CRITERION_COLORS,
} from "@/admin/criteria/criteriaFormHelpers";
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
    loading: adminLoading,
    sortedPeriods: contextPeriods = [],
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

  // ── Delete modal state ────────────────────────────────────────

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ── Clone state ───────────────────────────────────────────
  const [cloneLoading, setCloneLoading] = useState(false);
  const [showClonePicker, setShowClonePicker] = useState(false);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ── Derived data ──────────────────────────────────────────────

  const viewPeriod = periods.periodList.find((s) => s.id === periods.viewPeriodId);
  const draftCriteria = periods.draftCriteria || [];
  const outcomeConfig = periods.outcomeConfig || [];
  const isLocked = !!(viewPeriod?.is_locked);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(draftCriteria.length / pageSize));
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pageRows = draftCriteria.slice((safePage - 1) * pageSize, safePage * pageSize);


  // ── Weight budget handlers ─────────────────────────────────────

  const handleDistribute = () => {
    if (!draftCriteria.length) return;
    const each = Math.floor(100 / draftCriteria.length);
    const remainder = 100 - each * draftCriteria.length;
    const next = draftCriteria.map((c, i) => {
      const newMax = each + (i < remainder ? 1 : 0);
      const rubric = Array.isArray(c.rubric) ? c.rubric : [];
      const scaled = rubric.length > 0
        ? rescaleRubricBandsByWeight(rubric, newMax)
        : defaultRubricBands(newMax);
      return { ...c, max: newMax, rubric: scaled };
    });
    periods.updateDraft(next);
  };

  const handleAutoFill = (criterion) => {
    const total = draftCriteria.reduce((s, c) => s + (c.max || 0), 0);
    const remaining = 100 - total;
    if (remaining <= 0) return;
    const next = draftCriteria.map((c) => {
      if (c !== criterion) return c;
      const newMax = (c.max || 0) + remaining;
      const rubric = Array.isArray(c.rubric) ? c.rubric : [];
      const scaled = rubric.length > 0
        ? rescaleRubricBandsByWeight(rubric, newMax)
        : defaultRubricBands(newMax);
      return { ...c, max: newMax, rubric: scaled };
    });
    periods.updateDraft(next);
  };

  // ── Inline weight change ───────────────────────────────────────

  const handleWeightChange = (index, newWeight) => {
    const next = draftCriteria.map((c, i) => {
      if (i !== index) return c;
      const rubric = Array.isArray(c.rubric) ? c.rubric : [];
      const scaled = rubric.length > 0
        ? rescaleRubricBandsByWeight(rubric, newWeight)
        : defaultRubricBands(newWeight);
      return { ...c, max: newWeight, rubric: scaled };
    });
    periods.updateDraft(next);
  };

  // ── Row actions ────────────────────────────────────────────────

  const handleDuplicate = (index) => {
    const orig = draftCriteria[index];
    const copy = {
      ...structuredClone(orig),
      label: (orig.label || "") + " (copy)",
      shortLabel: ((orig.shortLabel || "") + " Copy").substring(0, 15),
      key: `${orig.key || "crt"}-copy-${Date.now()}`,
      color: nextCriterionColor(draftCriteria),
    };
    const next = [...draftCriteria];
    next.splice(index + 1, 0, copy);
    periods.updateDraft(next);
  };

  const handleMove = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= draftCriteria.length) return;
    const next = [...draftCriteria];
    [next[index], next[target]] = [next[target], next[index]];
    periods.updateDraft(next);
  };

  // ── Save/discard ───────────────────────────────────────────────

  const handleCommit = async () => {
    setSaving(true);
    try {
      await periods.commitDraft();
      _toast.success("All criteria saved successfully");
    } catch (err) {
      const raw = err?.message || "";
      let msg = "Failed to save criteria. Please try again.";
      if (raw.includes("foreign key") && raw.includes("score_sheet_items")) {
        msg = "Cannot modify criteria while scores exist for this period. Lock the evaluation period first, or contact an administrator to clear existing scores before making structural changes.";
      } else if (raw.includes("foreign key")) {
        msg = "Cannot save — other data depends on the current criteria structure. Make sure no scores or evaluations reference criteria you're trying to remove.";
      } else if (raw.includes("duplicate key")) {
        msg = "A criterion with that label already exists. Please use a unique name for each criterion.";
      } else if (raw.includes("permission") || raw.includes("denied") || raw.includes("RLS")) {
        msg = "You don't have permission to modify criteria for this period. Contact your organization admin.";
      } else if (raw) {
        msg = `Failed to save criteria: ${raw}`;
      }
      setPanelError("criteria", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    periods.discardDraft();
  };

  // ── Save handler (used by drawer) ──────────────────────────────

  const handleSave = async (newTemplate) => {
    periods.updateDraft(newTemplate);
    return { ok: true };
  };

  // ── Row delete handler ────────────────────────────────────────

  const handleDeleteConfirm = () => {
    if (deleteIndex === null) return;
    const next = draftCriteria.filter((_, i) => i !== deleteIndex);
    periods.updateDraft(next);
    setDeleteIndex(null);
    setDeleteSubmitting(false);
  };

  // ── Clone from period handler ──────────────────────────────────────

  const otherPeriods = (periods.periodList || []).filter(
    (p) => p.id !== periods.viewPeriodId && p.id
  );

  const handleClone = async (sourcePeriodId) => {
    setCloneLoading(true);
    try {
      const { listPeriodCriteria } = await import("@/shared/api");
      const { getActiveCriteria } = await import("@/shared/criteria/criteriaHelpers");
      const rows = await listPeriodCriteria(sourcePeriodId);
      const cloned = getActiveCriteria(rows).map((c) => ({
        ...structuredClone(c),
        key: `${c.key || "crt"}-clone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
      if (cloned.length > 0) {
        periods.updateDraft(cloned);
        _toast.success(`Cloned ${cloned.length} criteria`);
      } else {
        _toast.info("Source period has no criteria to clone");
      }
    } catch (err) {
      setPanelError("criteria", err?.message || "Failed to clone criteria");
    } finally {
      setCloneLoading(false);
    }
  };

  const deleteLabel = deleteIndex !== null
    ? (draftCriteria[deleteIndex]?.label || `Criterion ${deleteIndex + 1}`)
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
      </div>
      {/* Weight budget bar */}
      {periods.viewPeriodId && draftCriteria.length > 0 && (
        <WeightBudgetBar
          criteria={draftCriteria}
          onDistribute={handleDistribute}
          onAutoFill={handleAutoFill}
          locked={isLocked}
        />
      )}
      {/* No periods exist yet */}
      {!periods.viewPeriodId && periods.periodList.length === 0 && !panelError && !adminLoading && contextPeriods.length === 0 && loadingCount === 0 && (
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
      {!periods.viewPeriodId && periods.periodList.length > 0 && !adminLoading && contextPeriods.length > 0 && loadingCount === 0 && (
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
            <div className="crt-table-card-title">Active Criteria</div>
            <div className="crt-chips-row">
              {periods.viewPeriodLabel && (
                <div className="crt-period-badge">
                  <Calendar size={11} strokeWidth={1.75} />
                  {periods.viewPeriodLabel}
                </div>
              )}
              {isLocked && (
                <span className="crt-lock-badge">
                  <Lock size={11} strokeWidth={2.2} />
                  Locked
                </span>
              )}
              <button
                className="crt-add-btn"
                onClick={() => setEditingIndex(-1)}
                disabled={isLocked}
              >
                <Plus size={13} strokeWidth={2.2} />
                Add Criterion
              </button>
            </div>
          </div>

          {draftCriteria.length === 0 && !adminLoading && loadingCount === 0 && contextPeriods.length > 0 ? (
            <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
              <div className="vera-es-card">
                <div className="vera-es-hero vera-es-hero--criteria">
                  <div className="vera-es-icon vera-es-icon--criteria">
                    <ClipboardX size={24} strokeWidth={1.65} />
                  </div>
                  <div>
                    <div className="vera-es-title">No criteria defined for this period</div>
                    <div className="vera-es-desc">
                      Criteria are the scored dimensions jurors evaluate. Each criterion has a weight and optional rubric bands.
                    </div>
                  </div>
                </div>
                <div className="vera-es-actions">
                  <button
                    className="vera-es-action vera-es-action--primary-criteria"
                    onClick={() => setShowClonePicker((s) => !s)}
                    disabled={otherPeriods.length === 0}
                  >
                    <div className="vera-es-num vera-es-num--criteria">1</div>
                    <div className="vera-es-action-text">
                      <div className="vera-es-action-label">Import from a previous period</div>
                      <div className="vera-es-action-sub">
                        {otherPeriods.length === 0
                          ? "No previous periods with criteria available"
                          : "Clone criteria and weights from an existing period"}
                      </div>
                    </div>
                    <span className="vera-es-badge vera-es-badge--criteria">Fastest</span>
                  </button>
                  <div className="vera-es-divider">or</div>
                  <button
                    className="vera-es-action vera-es-action--secondary"
                    onClick={() => setEditingIndex(-1)}
                  >
                    <div className="vera-es-num vera-es-num--secondary">2</div>
                    <div className="vera-es-action-text">
                      <div className="vera-es-action-label">Create from scratch</div>
                      <div className="vera-es-action-sub">Add criteria one by one with custom weights</div>
                    </div>
                    <span className="vera-es-badge vera-es-badge--secondary">Manual</span>
                  </button>
                </div>
                {showClonePicker && otherPeriods.length > 0 && (
                  <div className="vera-es-clone-list">
                    <div className="vera-es-clone-list-label">Select a period to clone from</div>
                    {otherPeriods.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        className="vera-es-clone-item"
                        onClick={() => handleClone(p.id)}
                        disabled={cloneLoading || isLocked}
                        type="button"
                      >
                        <div>
                          <div className="vera-es-clone-name">{p.name}</div>
                          <div className="vera-es-clone-meta">{p.criteria_count || "—"} criteria</div>
                        </div>
                        <span className="vera-es-clone-cta">Clone</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="vera-es-footer">
                  <Info size={12} strokeWidth={2} />
                  Required · Weights must sum to 100 pts
                </div>
              </div>
            </div>
          ) : (
            <table className="crt-table">
              <colgroup>
                <col style={{ width: 36 }} />
                <col />
                <col style={{ width: 72 }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="col-criterion">Criterion</th>
                  <th className="col-weight">Weight</th>
                  <th className="col-rubric">Rubric Bands</th>
                  <th className="col-mapping">Mapping</th>
                  <th className="col-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((criterion, rowIdx) => {
                  const i = (safePage - 1) * pageSize + rowIdx;
                  const rubric = Array.isArray(criterion.rubric) ? criterion.rubric : [];
                  const menuKey = `crt-row-${i}`;
                  const isMenuOpen = openMenuId === menuKey;
                  return (
                    <tr key={criterion.key || i} style={{ "--row-color": criterion.color || CRITERION_COLORS[i % CRITERION_COLORS.length] }}>
                      <td data-label="#"><span className="crt-row-num">{i + 1}</span></td>
                      <td data-label="Criterion">
                        <div className="crt-name">
                          <span className="crt-color-dot" style={{ background: criterion.color || CRITERION_COLORS[i % CRITERION_COLORS.length] }} />
                          {criterion.label || criterion.shortLabel || `Criterion ${i + 1}`}
                        </div>
                        {criterion.blurb && (
                          <div className="crt-desc">{criterion.blurb}</div>
                        )}
                      </td>
                      <td className="col-weight" data-label="Weight">
                        <InlineWeightEdit
                          value={criterion.max || 0}
                          color={criterion.color || CRITERION_COLORS[i % CRITERION_COLORS.length]}
                          otherTotal={draftCriteria.reduce((s, c, j) => j === i ? s : s + (c.max || 0), 0)}
                          onChange={(v) => handleWeightChange(i, v)}
                          disabled={isLocked}
                        />
                      </td>
                      <td className="col-rubric" data-label="Rubric Bands">
                        {rubric.length > 0 ? (
                          <div className="crt-rubric-bands">
                            {rubric.map((band, bi) => (
                              <span
                                key={bi}
                                className={`crt-band-pill ${rubricBandClass(band.level || band.label)}`}
                                onClick={() => { setEditingIndex(i); }}
                                style={{ cursor: "pointer" }}
                              >
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
                      <td className="col-mapping" data-label="Mapping">
                        <div className="crt-mapping-pills">
                          {(criterion.outcomes || []).map((code) => (
                            <span
                              key={code}
                              className="crt-mapping-pill"
                              onClick={() => { setEditingIndex(i); }}
                            >
                              {code}
                            </span>
                          ))}
                          <span
                            className="crt-mapping-add"
                            onClick={() => { setEditingIndex(i); }}
                          >
                            +
                          </span>
                        </div>
                      </td>
                      <td className="col-crt-actions">
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <FloatingMenu
                            trigger={<button className="juror-action-btn" aria-label="Actions" onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : menuKey); }}><MoreVertical size={14} /></button>}
                            isOpen={isMenuOpen}
                            onClose={() => setOpenMenuId(null)}
                            placement="bottom-end"
                          >
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); setEditingIndex(i); }}
                            >
                              <Pencil size={13} strokeWidth={2} />
                              Edit Criterion
                            </button>
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); handleDuplicate(i); }}
                            >
                              <Copy size={13} strokeWidth={2} />
                              Duplicate
                            </button>
                            <div className="floating-menu-divider" />
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); handleMove(i, -1); }}
                              disabled={i === 0}
                              style={i === 0 ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <MoveUp size={13} strokeWidth={2} />
                              Move Up
                            </button>
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); handleMove(i, 1); }}
                              disabled={i === draftCriteria.length - 1}
                              style={i === draftCriteria.length - 1 ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <MoveDown size={13} strokeWidth={2} />
                              Move Down
                            </button>
                            <div className="floating-menu-divider" />
                            <button
                              className="floating-menu-item danger"
                              onMouseDown={() => { setOpenMenuId(null); setDeleteIndex(i); }}
                            >
                              <Trash2 size={13} strokeWidth={2} />
                              Remove
                            </button>
                          </FloatingMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {/* Mobile card list — hidden on desktop via CSS */}
          {draftCriteria.length > 0 && (
            <div className="crt-mobile-list">
              {pageRows.map((criterion, rowIdx) => {
                const i = (safePage - 1) * pageSize + rowIdx;
                const rubric = Array.isArray(criterion.rubric) ? criterion.rubric : [];
                const outcomes = criterion.outcomes || [];
                const visibleOutcomes = outcomes.slice(0, 4);
                const overflowCount = outcomes.length - visibleOutcomes.length;
                const menuKey = `crt-mobile-${i}`;
                const isMenuOpen = openMenuId === menuKey;
                const color = criterion.color || CRITERION_COLORS[i % CRITERION_COLORS.length];
                return (
                  <div
                    key={criterion.key || i}
                    className={`crt-mobile-card${isLocked ? " crt-mobile-card--locked" : ""}`}
                  >
                    {/* Header */}
                    <div className="crt-mobile-card-header">
                      <span
                        className="crt-mobile-card-color-dot"
                        style={{ backgroundColor: color }}
                      />
                      <span className="crt-mobile-card-name">
                        {criterion.label || criterion.shortLabel || `Criterion ${i + 1}`}
                      </span>
                      <span className="crt-mobile-card-pts-badge">
                        {criterion.max != null ? `${criterion.max} pts` : "—"}
                      </span>
                      <FloatingMenu
                        trigger={
                          <button
                            className="crt-mobile-card-menu-btn"
                            aria-label="Actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : menuKey);
                            }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        }
                        isOpen={isMenuOpen}
                        onClose={() => setOpenMenuId(null)}
                        placement="bottom-end"
                      >
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); setEditingIndex(i); }}
                        >
                          <Pencil size={13} strokeWidth={2} />
                          Edit Criterion
                        </button>
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); handleDuplicate(i); }}
                        >
                          <Copy size={13} strokeWidth={2} />
                          Duplicate
                        </button>
                        <div className="floating-menu-divider" />
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); handleMove(i, -1); }}
                          disabled={i === 0}
                          style={i === 0 ? { opacity: 0.4, pointerEvents: "none" } : {}}
                        >
                          <MoveUp size={13} strokeWidth={2} />
                          Move Up
                        </button>
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); handleMove(i, 1); }}
                          disabled={i === draftCriteria.length - 1}
                          style={i === draftCriteria.length - 1 ? { opacity: 0.4, pointerEvents: "none" } : {}}
                        >
                          <MoveDown size={13} strokeWidth={2} />
                          Move Down
                        </button>
                        <div className="floating-menu-divider" />
                        <button
                          className="floating-menu-item danger"
                          onMouseDown={() => { setOpenMenuId(null); setDeleteIndex(i); }}
                        >
                          <Trash2 size={13} strokeWidth={2} />
                          Remove
                        </button>
                      </FloatingMenu>
                    </div>
                    {/* Lock strip */}
                    {isLocked && (
                      <div className="crt-mobile-lock-strip">
                        <Lock size={11} strokeWidth={2.2} />
                        Weights &amp; bands are read-only
                      </div>
                    )}
                    {/* Rubric band rows */}
                    {rubric.length > 0 && (
                      <div className="crt-mobile-bands">
                        {rubric.map((band, bi) => (
                          <div
                            key={bi}
                            className={`crt-mobile-band-row ${rubricBandClass(band.level || band.label)}`}
                          >
                            <span className="crt-mobile-band-name">
                              {band.level || band.label}
                            </span>
                            {bandRangeText(band) && (
                              <span className="crt-mobile-band-range">
                                {bandRangeText(band)} pts
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Outcome pills */}
                    {outcomes.length > 0 && (
                      <div className="crt-mobile-outcomes">
                        {visibleOutcomes.map((code) => (
                          <span key={code} className="crt-mobile-outcome-pill">
                            {code}
                          </span>
                        ))}
                        {overflowCount > 0 && (
                          <span className="crt-mobile-outcome-overflow">
                            +{overflowCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {draftCriteria.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={draftCriteria.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              itemLabel="criteria"
            />
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
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </Icon>
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
      {/* Save bar */}
      <SaveBar
        isDirty={periods.isDraftDirty}
        canSave={periods.canSaveDraft}
        total={periods.draftTotal}
        onSave={handleCommit}
        onDiscard={handleDiscard}
        saving={saving}
      />
      {/* Single-criterion editor drawer */}
      <EditSingleCriterionDrawer
        open={editingIndex !== null}
        onClose={closeEditor}
        period={{ id: periods.viewPeriodId, name: periods.viewPeriodLabel }}
        criterion={editingIndex >= 0 ? draftCriteria[editingIndex] : null}
        editIndex={editingIndex}
        criteriaConfig={draftCriteria}
        outcomeConfig={outcomeConfig}
        onSave={handleSave}
        disabled={loadingCount > 0}
        isLocked={isLocked}
      />
    </div>
  );
}
