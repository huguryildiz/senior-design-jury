// src/admin/pages/CriteriaPage.jsx
// Phase 8 — full rewrite from vera-premium-prototype.html lines 14519–14718

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Lock,
  LockKeyhole,
  PencilLine,
  Plus,
  ClipboardList,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
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
  Download,
  Filter,
  XCircle,
} from "lucide-react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useToast } from "@/shared/hooks/useToast";
import { useManagePeriods } from "../hooks/useManagePeriods";
import { usePeriodOutcomes } from "../hooks/usePeriodOutcomes";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import FbAlert from "@/shared/ui/FbAlert";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import EditSingleCriterionDrawer from "@/admin/drawers/EditSingleCriterionDrawer";
import StarterCriteriaDrawer, { STARTER_CRITERIA } from "@/admin/drawers/StarterCriteriaDrawer";
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
import { useAuth } from "@/auth";
import ExportPanel from "../components/ExportPanel";
import { useCriteriaExport } from "../hooks/useCriteriaExport";
import { FilterButton } from "@/shared/ui/FilterButton";
import CustomSelect from "@/shared/ui/CustomSelect";

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
  const shouldUseCardLayout = true;

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
  const [editingInitialTab, setEditingInitialTab] = useState("details");
  const [starterDrawerOpen, setStarterDrawerOpen] = useState(false);

  // ── Inline period rename ─────────────────────────────────────
  const [periodRenaming, setPeriodRenaming] = useState(false);
  const [periodRenameVal, setPeriodRenameVal] = useState("");
  const [periodRenameSaving, setPeriodRenameSaving] = useState(false);
  const periodRenameInputRef = useRef(null);
  const closeEditor = () => { setEditingIndex(null); setEditingInitialTab("details"); };
  const openEditor = (i, tab = "details") => { setEditingInitialTab(tab); setEditingIndex(i); };

  // ── Row action menus ──────────────────────────────────────────

  const [openMenuId, setOpenMenuId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mappingFilter, setMappingFilter] = useState("all");   // all | mapped | unmapped
  const [rubricFilter, setRubricFilter] = useState("all");     // all | defined | none
  const activeFilterCount =
    (mappingFilter !== "all" ? 1 : 0) + (rubricFilter !== "all" ? 1 : 0);

  // ── Delete modal state ────────────────────────────────────────

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ── Clear-all-criteria modal state ───────────────────────────

  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");
  const [clearAllSubmitting, setClearAllSubmitting] = useState(false);

  // ── Clone state ───────────────────────────────────────────
  const [cloneLoading, setCloneLoading] = useState(false);
  const [showClonePicker, setShowClonePicker] = useState(false);

  // ── Pending import preview ────────────────────────────────
  // Derived from hook state (sessionStorage-backed via criteria scratch) so
  // the "Criteria ready to apply" banner is restored when the user navigates
  // away and back — identical to OutcomesPage's pendingFrameworkImport pattern.
  // Do not use local useState here; write via periods.setPendingCriteriaPreview.

  // ── Scratch mode: skip empty state, show full criteria card ──
  // Derived from DB: true when period has criteria_name set or criteria already exist.
  const [startingBlank, setStartingBlank] = useState(false);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ── Reset page to 1 when filters change ────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [mappingFilter, rubricFilter]);

  // ── Derived data ──────────────────────────────────────────────

  const viewPeriod = periods.periodList.find((s) => s.id === periods.viewPeriodId);
  const draftCriteria = periods.draftCriteria || [];
  const outcomeConfig = periods.outcomeConfig || [];
  const isLocked = !!(viewPeriod?.is_locked);
  const [saving, setSaving] = useState(false);

  const { activeOrganization } = useAuth();
  const { generateFile: generateCriteriaFile, handleExport: handleCriteriaExport } = useCriteriaExport({
    criteria: draftCriteria,
    periodName: periods.viewPeriodLabel || "",
  });

  // Single outcome-mapping draft owned at the page level; the edit drawer
  // mutates this instance so the SaveBar commits mappings alongside criteria.
  const po = usePeriodOutcomes({ periodId: periods.viewPeriodId });

  // Effective criteria_name accounts for any draft rename queued in the hook.
  // `pendingCriteriaName === undefined` → no change; otherwise use the pending
  // value (which may be null, meaning "cleared on next save").
  const pendingCriteriaName = periods.pendingCriteriaName;
  const effectiveCriteriaName =
    pendingCriteriaName !== undefined ? pendingCriteriaName : viewPeriod?.criteria_name;

  // Scratch mode: the period already has criteria_name committed to DB, or draft
  // items exist. A pending-only criteria name (pendingCriteriaName set but not yet
  // saved to DB) does NOT activate scratch mode — that state is represented by
  // pendingCriteriaPreview showing the "ready to apply" banner instead. This
  // prevents the table from appearing immediately when the user navigated away
  // from an uncommitted blank-start (which wrote pendingCriteriaName to scratch
  // but has no DB state yet). A pending clear-all forces the empty state back so
  // the user can pick a new starting point.
  const scratchMode =
    !periods.pendingClearAll &&
    (!!viewPeriod?.criteria_name || draftCriteria.length > 0);

  // Pending import preview — built from hook state so it survives navigation.
  const pendingCriteriaPreview = periods.pendingCriteriaPreviewKind
    ? { kind: periods.pendingCriteriaPreviewKind, sourceLabel: periods.pendingCriteriaPreviewSource }
    : null;

  const filteredCriteria = draftCriteria.filter((c) => {
    const hasMapping = Array.isArray(c.outcomes) && c.outcomes.length > 0;
    const hasRubric = Array.isArray(c.rubric) && c.rubric.length > 0;
    if (mappingFilter === "mapped" && !hasMapping) return false;
    if (mappingFilter === "unmapped" && hasMapping) return false;
    if (rubricFilter === "defined" && !hasRubric) return false;
    if (rubricFilter === "none" && hasRubric) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCriteria.length / pageSize));
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pageRows = filteredCriteria.slice((safePage - 1) * pageSize, safePage * pageSize);


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
      // Outcome mappings edited via the criterion drawer live in po's draft;
      // commit them after criteria so mapping target IDs (period_criterion_id)
      // are stable. After the mapping commit we re-fetch period_criteria so
      // the Mapping column reflects the fresh DB state — without this the
      // listPeriodCriteria call inside periods.commitDraft() runs BEFORE the
      // mappings land in the DB, leaving draftCriteria[i].outcomes stale until
      // the page is remounted.
      //
      // organizationId is passed so commitDraft can honor a pendingFrameworkImport
      // if the user queued one on OutcomesPage before navigating here — otherwise
      // it throws "organizationId required to import framework".
      if (po.itemsDirty) {
        await po.commitDraft({ organizationId });
        await periods.reloadCriteria();
      }
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
      _toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    periods.discardDraft();
    po.discardDraft();
  };

  // ── Period rename handlers ────────────────────────────────────

  const startPeriodRename = () => {
    setPeriodRenameVal(effectiveCriteriaName || viewPeriod?.name || "");
    setPeriodRenaming(true);
    setTimeout(() => {
      periodRenameInputRef.current?.focus();
      periodRenameInputRef.current?.select();
    }, 0);
  };

  const cancelPeriodRename = () => {
    setPeriodRenaming(false);
    setPeriodRenameVal("");
  };

  // Queue rename in the draft; no RPC fires until Save Changes is clicked.
  const savePeriodRename = () => {
    const trimmed = periodRenameVal.trim();
    const currentName = effectiveCriteriaName || viewPeriod?.name || "";
    if (!trimmed || !viewPeriod || trimmed === currentName) {
      cancelPeriodRename();
      return;
    }
    periods.setPendingCriteriaName(trimmed);
    setPeriodRenaming(false);
    setPeriodRenameVal("");
  };

  const handlePeriodRenameKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); savePeriodRename(); }
    if (e.key === "Escape") { e.preventDefault(); cancelPeriodRename(); }
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

  // ── Clear all criteria handler ────────────────────────────────
  // Queues the clear in the draft; the destructive RPCs run only on Save.

  const handleClearAllCriteria = () => {
    periods.markClearAll();
    setClearAllOpen(false);
    setClearAllConfirmText("");
  };

  // ── Clone from period handler ──────────────────────────────────────

  const otherPeriods = (periods.periodList || []).filter(
    (p) => p.id !== periods.viewPeriodId && p.id
  );

  // Imports criteria from a source period into the draft. No RPC runs until Save.
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
        const sourcePeriod = periods.periodList.find((p) => p.id === sourcePeriodId);
        const cloneName = `${sourcePeriod?.criteria_name || sourcePeriod?.name || "Criteria"} (copy)`;
        periods.setPendingCriteriaName(cloneName);
        periods.setPendingCriteriaPreview("clone", sourcePeriod?.name || "another period");
        setShowClonePicker(false);
      } else {
        _toast.info("Source period has no criteria to clone");
      }
    } catch (err) {
      setPanelError("criteria", err?.message || "Failed to clone criteria");
    } finally {
      setCloneLoading(false);
    }
  };

  // Start-blank queues the criteria_name in the draft and surfaces the same
  // "ready to apply" banner used by clone/template, matching the framework
  // blank-start flow on OutcomesPage: nothing hits the DB until Save.
  const handleStartBlank = () => {
    setStartingBlank(true);
    periods.setPendingCriteriaName("Custom Criteria");
    periods.setPendingCriteriaPreview("blank", null);
    setStartingBlank(false);
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
        {periods.viewPeriodId && (draftCriteria.length > 0 || scratchMode) && !pendingCriteriaPreview && (
          <div className="crt-header-actions mobile-toolbar-stack">
            <FilterButton
              className="mobile-toolbar-filter"
              activeCount={activeFilterCount}
              isOpen={filterOpen}
              onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
            />
            <button
              className="btn btn-outline btn-sm mobile-toolbar-export"
              onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}
            >
              <Download size={14} strokeWidth={2} style={{ verticalAlign: "-1px" }} />
              {" "}Export
            </button>
            {isLocked ? (
              <div className="crt-lock-badge mobile-toolbar-primary">
                <Lock size={11} strokeWidth={2.2} />
                Evaluation Active
              </div>
            ) : (
              <button
                className="btn btn-primary btn-sm mobile-toolbar-primary"
                onClick={() => setEditingIndex(-1)}
              >
                <Plus size={13} strokeWidth={2.2} />
                Add Criterion
              </button>
            )}
          </div>
        )}
      </div>
      {periods.viewPeriodId && (draftCriteria.length > 0 || scratchMode) && !pendingCriteriaPreview && !isLocked && (
        <button
          className="btn btn-primary btn-sm mobile-primary-below-kpi"
          onClick={() => setEditingIndex(-1)}
        >
          <Plus size={13} strokeWidth={2.2} />
          Add Criterion
        </button>
      )}
      {exportOpen && (
        <ExportPanel
          title="Export Criteria"
          subtitle="Download evaluation criteria with rubric bands and outcome mappings."
          meta={`${(draftCriteria || []).length} criteria · ${periods.viewPeriodLabel || "—"}`}
          periodName={periods.viewPeriodLabel || ""}
          organization={activeOrganization?.name || ""}
          department={activeOrganization?.institution || ""}
          onClose={() => setExportOpen(false)}
          generateFile={generateCriteriaFile}
          onExport={handleCriteriaExport}
        />
      )}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ display: "inline", marginRight: 4, opacity: 0.5, verticalAlign: "-1px" }} />
                Filter Criteria
              </h4>
              <div className="filter-panel-sub">Narrow criteria by outcome mapping and rubric state.</div>
            </div>
            <button className="filter-panel-close" aria-label="Close filter panel" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Mapping</label>
              <CustomSelect
                compact
                value={mappingFilter}
                onChange={(v) => setMappingFilter(v)}
                options={[
                  { value: "all", label: "All mappings" },
                  { value: "mapped", label: "Mapped to outcomes" },
                  { value: "unmapped", label: "Unmapped" },
                ]}
                ariaLabel="Mapping"
              />
            </div>
            <div className="filter-group">
              <label>Rubric</label>
              <CustomSelect
                compact
                value={rubricFilter}
                onChange={(v) => setRubricFilter(v)}
                options={[
                  { value: "all", label: "All rubrics" },
                  { value: "defined", label: "Rubric defined" },
                  { value: "none", label: "No rubric" },
                ]}
                ariaLabel="Rubric"
              />
            </div>
            <button
              className="btn btn-outline btn-sm filter-clear-btn"
              onClick={() => { setMappingFilter("all"); setRubricFilter("all"); }}
            >
              <XCircle size={12} strokeWidth={2} style={{ opacity: 0.5, verticalAlign: "-1px" }} />
              {" "}Clear all
            </button>
          </div>
        </div>
      )}
      {/* Lock banner */}
      {isLocked && periods.viewPeriodId && (
        <div className="lock-notice">
          <div className="lock-notice-left">
            <div className="lock-notice-icon-wrap">
              <LockKeyhole size={20} strokeWidth={1.8} />
            </div>
            <div className="lock-notice-badge">locked</div>
          </div>
          <div className="lock-notice-body">
            <div className="lock-notice-title">Evaluation in progress — structural fields locked</div>
            <div className="lock-notice-desc">
              Criteria weights, rubric bands, outcome mappings, labels, and descriptions cannot be changed while scores exist.
            </div>
            <div className="lock-notice-chips">
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Criterion Weights</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Rubric Bands</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Outcome Mappings</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Labels &amp; Descriptions</span>
            </div>
          </div>
        </div>
      )}
      {/* Weight budget bar */}
      {periods.viewPeriodId && draftCriteria.length > 0 && !pendingCriteriaPreview && (
        <WeightBudgetBar
          criteria={draftCriteria}
          onDistribute={handleDistribute}
          onAutoFill={handleAutoFill}
          locked={isLocked}
        />
      )}
      {/* Criteria ready to apply — inline preview before commit. Mirrors the
          framework-import banner on OutcomesPage so clone / template / blank
          imports are explicit: nothing touches the DB until the user hits Save. */}
      {periods.viewPeriodId && pendingCriteriaPreview && (
        <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
          <div className="vera-es-card">
            <div className="vera-es-hero vera-es-hero--fw">
              <div className="vera-es-icon vera-es-icon--fw">
                <ClipboardList size={24} strokeWidth={1.65} />
              </div>
              <div>
                <div className="vera-es-title">Criteria ready to apply</div>
                <div className="vera-es-desc">
                  <strong style={{ color: "var(--text-primary)" }}>
                    {effectiveCriteriaName || "Criteria"}
                  </strong>{" "}
                  {pendingCriteriaPreview.kind === "blank"
                    ? "will be created as a blank criteria set for this period. No criteria will be added until you define them."
                    : pendingCriteriaPreview.kind === "clone"
                    ? `will be cloned from ${pendingCriteriaPreview.sourceLabel} as the criteria set for this period — ${draftCriteria.length} criteria totaling ${draftCriteria.reduce((s, c) => s + (Number(c.max) || 0), 0)} pts.`
                    : `will be applied from ${pendingCriteriaPreview.sourceLabel} as the criteria set for this period — ${draftCriteria.length} criteria totaling ${draftCriteria.reduce((s, c) => s + (Number(c.max) || 0), 0)} pts.`}
                  {" "}Save to apply, or Discard to cancel.
                </div>
              </div>
            </div>
            <div className="vera-es-footer">
              <Info size={12} strokeWidth={2} />
              Nothing has been written to the database yet.
            </div>
          </div>
        </div>
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
      {/* Empty state — no card wrapper when no criteria */}
      {periods.viewPeriodId && draftCriteria.length === 0 && !scratchMode && !pendingCriteriaPreview && !adminLoading && loadingCount === 0 && contextPeriods.length > 0 && (
            <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
              <div className="vera-es-card">
                <div className="vera-es-hero vera-es-hero--fw">
                  <div className="vera-es-icon vera-es-icon--fw">
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
                    className={`vera-es-action vera-es-action--primary-criteria${showClonePicker ? " vera-es-action--expanded" : ""}`}
                    onClick={() => setShowClonePicker((s) => !s)}
                    disabled={startingBlank || cloneLoading}
                  >
                    <div className="vera-es-num vera-es-num--criteria">1</div>
                    <div className="vera-es-action-text">
                      <div className="vera-es-action-label">Start from an existing criteria</div>
                      <div className="vera-es-action-sub">
                        {otherPeriods.length > 0
                          ? "Clone from a previous period or use a default template"
                          : "Use the VERA Standard template with predefined criteria"}
                      </div>
                    </div>
                    <span className="vera-es-badge vera-es-badge--criteria">Recommended</span>
                  </button>
                  <div className="vera-es-divider">or</div>
                  <button
                    className="vera-es-action vera-es-action--secondary"
                    onClick={handleStartBlank}
                    disabled={startingBlank || cloneLoading}
                  >
                    <div className="vera-es-num vera-es-num--secondary">2</div>
                    <div className="vera-es-action-text">
                      <div className="vera-es-action-label">Start from blank</div>
                      <div className="vera-es-action-sub">
                        {startingBlank ? "Setting up criteria…" : "Add your own criteria one by one with custom weights"}
                      </div>
                    </div>
                    <span className="vera-es-badge vera-es-badge--secondary">Manual</span>
                  </button>
                </div>
                {showClonePicker && (
                  <div className="vera-es-clone-list">
                    {otherPeriods.length > 0 && (
                      <>
                        <div className="vera-es-clone-list-label">Clone from a previous period</div>
                        <div className="vera-es-clone-scroll">
                          {otherPeriods.map((p) => (
                            <button
                              key={p.id}
                              className="vera-es-clone-item"
                              onClick={() => handleClone(p.id)}
                              disabled={cloneLoading || isLocked}
                              type="button"
                            >
                              <div>
                                <div className="vera-es-clone-name">{p.name}</div>
                                <div className="vera-es-clone-meta">
                                  {p.criteria_count ?? "—"} criteria
                                  {p.criteria_labels?.length > 0 && (
                                    <> · {p.criteria_labels.join(", ")} · {p.criteria_total_pts} pts</>
                                  )}
                                </div>
                              </div>
                              <span className="vera-es-clone-cta">Clone</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="vera-es-clone-list-label" style={{ paddingTop: otherPeriods.length > 0 ? 8 : 0 }}>
                      {otherPeriods.length > 0 ? "or use a default template" : "Default template"}
                    </div>
                    <button
                      type="button"
                      className="vera-es-clone-item"
                      onClick={() => {
                        periods.updateDraft(STARTER_CRITERIA);
                        periods.setPendingCriteriaName("VERA Standard");
                        periods.setPendingCriteriaPreview("template", "the VERA Standard template");
                        setShowClonePicker(false);
                      }}
                      disabled={cloneLoading || isLocked}
                    >
                      <div>
                        <div className="vera-es-clone-name">VERA Standard</div>
                        <div className="vera-es-clone-meta">4 criteria · Written, Oral, Technical, Teamwork · 100 pts</div>
                      </div>
                      <span className="vera-es-clone-cta">Use</span>
                    </button>
                  </div>
                )}
                <div className="vera-es-footer">
                  <Info size={12} strokeWidth={2} />
                  Required · Weights must sum to 100 pts
                </div>
              </div>
            </div>
          )}
      {/* Criteria table — shown when criteria exist OR scratch mode active,
          but hidden while a clone/template import is awaiting confirmation. */}
      {periods.viewPeriodId && (draftCriteria.length > 0 || scratchMode) && !pendingCriteriaPreview && (
        <div className="crt-table-card">
          <div className="crt-table-card-header">
            <div className="crt-card-title-group">
              <div className="crt-title-row">
                {!isLocked && (
                  <FloatingMenu
                    trigger={
                      <button
                        className="crt-kebab-inline"
                        onClick={() => setOpenMenuId(openMenuId === "crt-header" ? null : "crt-header")}
                      >
                        <MoreVertical size={14} />
                      </button>
                    }
                    isOpen={openMenuId === "crt-header"}
                    onClose={() => setOpenMenuId(null)}
                    placement="bottom-start"
                  >
                    <button
                      className="floating-menu-item"
                      onMouseDown={(e) => { e.preventDefault(); setOpenMenuId(null); startPeriodRename(); }}
                    >
                      <Pencil size={13} strokeWidth={2} />Rename
                    </button>
                    <div className="floating-menu-divider" />
                    <button
                      className="floating-menu-item danger"
                      onMouseDown={() => { setOpenMenuId(null); setClearAllOpen(true); setClearAllConfirmText(""); }}
                    >
                      <Trash2 size={13} strokeWidth={2} />Delete All Criteria
                    </button>
                  </FloatingMenu>
                )}
                {periodRenaming ? (
                  <div className="crt-title-rename-wrap">
                    <input
                      ref={periodRenameInputRef}
                      className="crt-title-rename-input"
                      value={periodRenameVal}
                      onChange={(e) => setPeriodRenameVal(e.target.value)}
                      onBlur={savePeriodRename}
                      onKeyDown={handlePeriodRenameKeyDown}
                      disabled={periodRenameSaving}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    className={`crt-card-editable-title${isLocked ? " no-rename" : ""}`}
                    onClick={isLocked ? undefined : startPeriodRename}
                    role={isLocked ? undefined : "button"}
                    tabIndex={isLocked ? undefined : 0}
                    onKeyDown={isLocked ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") startPeriodRename(); }}
                  >
                    {effectiveCriteriaName || periods.viewPeriodLabel || "Active Criteria"}
                    {!isLocked && <Pencil size={13} strokeWidth={2} className="crt-title-edit-icon" />}
                  </div>
                )}
              </div>
              <div className="crt-card-subtitle">
                {draftCriteria.length} {draftCriteria.length === 1 ? "criterion" : "criteria"} · {periods.draftTotal ?? 0} pts
              </div>
            </div>
          </div>
            <table className="crt-table table-standard table-pill-balance">
              <thead>
                <tr>
                  <th style={{ width: "3%" }}>#</th>
                  <th className="col-criterion" style={{ width: "42%" }}>Criterion</th>
                  <th className="col-weight" style={{ width: "7%" }}>Weight</th>
                  <th className="col-rubric" style={{ width: "16%" }}>Rubric Bands</th>
                  <th className="col-mapping" style={{ width: "13%" }}>Mapping</th>
                  <th className="col-action" style={{ width: "6%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr className="crt-empty-row">
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-tertiary)" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <ClipboardList size={28} strokeWidth={1.4} style={{ opacity: 0.35 }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {activeFilterCount > 0 ? "No criteria match the current filter" : "No criteria yet"}
                        </span>
                        <span style={{ fontSize: 12, opacity: 0.6 }}>
                          {activeFilterCount > 0
                            ? (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ marginTop: 6 }}
                                onClick={() => { setMappingFilter("all"); setRubricFilter("all"); }}
                              >
                                Clear filters
                              </button>
                            )
                            : "Click \"+​ Add Criterion\" above to add your first criterion."}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {pageRows.map((criterion, rowIdx) => {
                  const i = draftCriteria.indexOf(criterion);
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
                                onClick={isLocked ? undefined : () => openEditor(i, "rubric")}
                                style={{ cursor: isLocked ? "default" : "pointer", opacity: isLocked ? 0.65 : 1 }}
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
                          {(criterion.outcomes || []).map((code) => {
                            const isIndirect = criterion.outcomeTypes?.[code] === "indirect";
                            return (
                              <span
                                key={code}
                                className={`crt-mapping-pill${isIndirect ? " indirect" : ""}${isLocked ? " disabled" : ""}`}
                                onClick={isLocked ? undefined : () => openEditor(i, "mapping")}
                                aria-label={`${code} ${isIndirect ? "indirect" : "direct"} mapping`}
                                aria-disabled={isLocked || undefined}
                              >
                                {code}
                              </span>
                            );
                          })}
                          {!isLocked && (
                            <span
                              className="crt-mapping-add"
                              onClick={() => openEditor(i, "mapping")}
                            >
                              +
                            </span>
                          )}
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
                              disabled={isLocked}
                              style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <Pencil size={13} strokeWidth={2} />
                              Edit Criterion
                            </button>
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); handleDuplicate(i); }}
                              disabled={isLocked}
                              style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <Copy size={13} strokeWidth={2} />
                              Duplicate
                            </button>
                            <div className="floating-menu-divider" />
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); handleMove(i, -1); }}
                              disabled={i === 0 || isLocked}
                              style={(i === 0 || isLocked) ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <MoveUp size={13} strokeWidth={2} />
                              Move Up
                            </button>
                            <button
                              className="floating-menu-item"
                              onMouseDown={() => { setOpenMenuId(null); handleMove(i, 1); }}
                              disabled={i === draftCriteria.length - 1 || isLocked}
                              style={(i === draftCriteria.length - 1 || isLocked) ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <MoveDown size={13} strokeWidth={2} />
                              Move Down
                            </button>
                            <div className="floating-menu-divider" />
                            <button
                              className="floating-menu-item danger"
                              onMouseDown={() => { setOpenMenuId(null); setDeleteIndex(i); }}
                              disabled={isLocked}
                              style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                            >
                              <Trash2 size={13} strokeWidth={2} />
                              Delete Criterion
                            </button>
                          </FloatingMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          {/* Mobile card list — hidden on desktop via CSS */}
          {shouldUseCardLayout && draftCriteria.length > 0 && (
            <div className="crt-mobile-list">
              {pageRows.map((criterion, rowIdx) => {
                const i = draftCriteria.indexOf(criterion);
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
                      <span
                        className="crt-mobile-card-pts-badge"
                        style={{
                          backgroundColor: `${color || "#94A3B8"}18`,
                          borderColor: `${color || "#94A3B8"}40`,
                          color: color || "var(--text-tertiary)",
                        }}
                      >
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
                          disabled={isLocked}
                          style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
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
                          Delete Criterion
                        </button>
                      </FloatingMenu>
                    </div>
                    {/* Blurb */}
                    {criterion.blurb && (
                      <div className="crt-mobile-card-blurb">
                        {criterion.blurb}
                      </div>
                    )}
                    {/* Rubric band rows */}
                    {rubric.length > 0 && (
                      <div className="crt-mobile-bands">
                        <div className="crt-mobile-section-label">Rubric Bands</div>
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
                        <div className="crt-mobile-section-label">Outcomes</div>
                        <div className="crt-mobile-outcomes-pills">
                          {visibleOutcomes.map((code) => {
                            const isIndirect = criterion.outcomeTypes?.[code] === "indirect";
                            return (
                              <span
                                key={code}
                                className={`crt-mobile-outcome-pill${isIndirect ? " indirect" : ""}`}
                              >
                                {code}
                              </span>
                            );
                          })}
                          {overflowCount > 0 && (
                            <span className="crt-mobile-outcome-overflow">
                              +{overflowCount}
                            </span>
                          )}
                        </div>
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
              totalItems={filteredCriteria.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              itemLabel="criteria"
            />
          )}
        </div>
      )}
      {/* Clear-all-criteria confirm */}
      <Modal
        open={clearAllOpen}
        onClose={() => { if (!clearAllSubmitting) { setClearAllOpen(false); setClearAllConfirmText(""); } }}
        size="sm"
        centered
      >
        <div className="fs-modal-header">
          <div className="fs-modal-icon danger">
            <Trash2 size={22} strokeWidth={2} />
          </div>
          <div className="fs-title" style={{ textAlign: "center" }}>Delete All Criteria?</div>
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
            You are about to permanently delete all criteria from{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {effectiveCriteriaName || periods.viewPeriodLabel}
            </strong>.
          </div>
        </div>
        <div className="fs-modal-body" style={{ paddingTop: 2 }}>
          <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">This action cannot be undone</div>
              <div className="fs-alert-desc">
                All rubric bands, weights, and outcome mappings for every criterion will be permanently removed.
                Scores already submitted will not be affected.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
              Type{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {effectiveCriteriaName || periods.viewPeriodLabel}
              </strong>{" "}
              to confirm
            </label>
            <input
              className="fs-typed-input"
              type="text"
              value={clearAllConfirmText}
              onChange={(e) => setClearAllConfirmText(e.target.value)}
              placeholder={`Type ${effectiveCriteriaName || periods.viewPeriodLabel} to confirm`}
              autoComplete="off"
              spellCheck={false}
              disabled={clearAllSubmitting}
            />
          </div>
        </div>
        <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}>
          <button
            type="button"
            className="fs-btn fs-btn-secondary"
            onClick={() => { setClearAllOpen(false); setClearAllConfirmText(""); }}
            disabled={clearAllSubmitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fs-btn fs-btn-danger"
            onClick={handleClearAllCriteria}
            disabled={clearAllSubmitting || clearAllConfirmText !== (effectiveCriteriaName || periods.viewPeriodLabel)}
            style={{ flex: 1 }}
          >
            <AsyncButtonContent loading={clearAllSubmitting} loadingText="Deleting…">
              Delete All Criteria
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>
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
        isDirty={periods.isDraftDirty || po.itemsDirty}
        canSave={periods.canSaveDraft}
        total={draftCriteria.length > 0 ? periods.draftTotal : undefined}
        statusText={
          periods.pendingClearAll
            ? "All criteria will be cleared"
            : (draftCriteria.length === 0 ? "Ready to save" : undefined)
        }
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
        initialTab={editingInitialTab}
        criteriaConfig={draftCriteria}
        outcomeConfig={outcomeConfig}
        onSave={handleSave}
        disabled={loadingCount > 0}
        isLocked={isLocked}
        po={po}
      />
      <StarterCriteriaDrawer
        open={starterDrawerOpen}
        onClose={() => setStarterDrawerOpen(false)}
        draftCriteria={draftCriteria}
        otherPeriods={otherPeriods}
        isLocked={isLocked}
        onApplyTemplate={(criteria) => {
          periods.updateDraft(criteria);
          setStarterDrawerOpen(false);
        }}
        onCopyFromPeriod={(periodId) => {
          setStarterDrawerOpen(false);
          handleClone(periodId);
        }}
      />
    </div>
  );
}
