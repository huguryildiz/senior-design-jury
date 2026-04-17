// src/admin/pages/OutcomesPage.jsx
// Outcomes & Mapping page — period-scoped outcome CRUD + criterion mapping.
// Matches vera-premium-prototype.html mockup.

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Copy, MoreVertical, BadgeCheck, Network, AlertCircle, XCircle, CheckCircle, AlertTriangle, Circle, Info, Lock, LockKeyhole, PencilLine, Download } from "lucide-react";
import { updateFramework, cloneFramework, assignFrameworkToPeriod, unassignPeriodFramework, listFrameworks } from "@/shared/api";
import { useAdminContext } from "../hooks/useAdminContext";
import { usePeriodOutcomes } from "../hooks/usePeriodOutcomes";
import { useToast } from "@/shared/hooks/useToast";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import AddOutcomeDrawer from "../drawers/AddOutcomeDrawer";
import OutcomeDetailDrawer from "../drawers/OutcomeDetailDrawer";
import Modal from "@/shared/ui/Modal";
import FbAlert from "@/shared/ui/FbAlert";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import Pagination from "@/shared/ui/Pagination";
import SaveBar from "@/admin/criteria/SaveBar";
import "../../styles/pages/outcomes.css";
import "../../styles/pages/setup-wizard.css";
import { useAuth } from "@/auth";
import ExportPanel from "../components/ExportPanel";
import { useOutcomesExport } from "../hooks/useOutcomesExport";

// ── Coverage helpers ─────────────────────────────────────────

function coverageBadgeClass(type) {
  if (type === "direct") return "acc-coverage direct";
  if (type === "indirect") return "acc-coverage indirect acc-coverage-toggle";
  return "acc-coverage none acc-coverage-toggle";
}

function coverageLabel(type) {
  if (type === "direct") return "Direct";
  if (type === "indirect") return "Indirect";
  return "Not mapped";
}

// ── Coverage legend data ────────────────────────────────────

const COVERAGE_LEGEND = [
  {
    key: "direct",
    label: "Direct",
    desc: "Assessed through mapped evaluation criteria. Attainment is calculated from jury scores.",
    icon: CheckCircle,
    cls: "direct",
  },
  {
    key: "indirect",
    label: "Indirect",
    desc: "Assessed outside VERA through external instruments (surveys, alumni feedback, etc.). Include results in your self-evaluation report.",
    icon: AlertTriangle,
    cls: "indirect",
  },
  {
    key: "none",
    label: "Not Mapped",
    desc: "No assessment method assigned. Map criteria for direct assessment, or mark as indirect if assessed externally.",
    icon: Circle,
    cls: "unmapped",
  },
];

// ── Sort helper ──────────────────────────────────────────────

function naturalCodeSort(a, b) {
  const isCopy = (code) => /\(copy\)/i.test(code);
  const normalize = (code) => code.replace(/^[A-Za-z]+\s*/, "").replace(/\s*\(copy\)/i, "").trim();
  const aParts = normalize(a.code).split(".").map(Number);
  const bParts = normalize(b.code).split(".").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  // Same base code — copies sort after originals
  return Number(isCopy(a.code)) - Number(isCopy(b.code));
}

// ── Outcome row ──────────────────────────────────────────────

function OutcomeRow({
  outcome,
  mappedCriteria,
  coverage,
  onEdit,
  onDelete,
  onDuplicate,
  onRemoveChip,
  onAddMapping,
  onCycleCoverage,
  openMenuId,
  setOpenMenuId,
  isLocked,
}) {
  const menuKey = `acc-row-${outcome.id}`;
  const isMenuOpen = openMenuId === menuKey;
  const hasMappings = mappedCriteria.length > 0;
  const prefixMatch = outcome.code.match(/^([A-Za-z]+)\s+(.+)$/);
  const codePrefix = prefixMatch ? prefixMatch[1] : "";
  const codeNum = prefixMatch ? prefixMatch[2] : outcome.code;

  const coverageClass = coverage === "direct" ? "direct" : coverage === "indirect" ? "indirect" : "unmapped";

  return (
    <tr
      className="acc-row"
      onClick={() => onEdit(outcome)}
      style={{ cursor: "pointer" }}
    >
      {/* Code */}
      <td data-label="Code">
        <span className={`acc-code-badge ${coverageClass}`}>
          {codePrefix && <span className="acc-code-prefix">{codePrefix}</span>}
          {codeNum || outcome.code}
        </span>
      </td>

      {/* Outcome label + inline description */}
      <td data-label="Outcome">
        <div className="acc-outcome-cell">
          <span className="acc-outcome-label">{outcome.label}</span>
          {outcome.description && (
            <span className="acc-outcome-desc">{outcome.description}</span>
          )}
        </div>
      </td>

      {/* Mapped criteria chips */}
      <td data-label="Criteria">
        <div className="acc-chip-wrap">
          {mappedCriteria.map((c) => (
            <span key={c.id} className="acc-chip">
              <span className="acc-crit-dot" style={{ background: c.color || "var(--accent)" }} />
              {c.label}
              {!isLocked && (
                <span
                  className="acc-chip-x"
                  onClick={(e) => { e.stopPropagation(); onRemoveChip(c.id, outcome.id); }}
                >
                  <XCircle size={12} strokeWidth={2.5} />
                </span>
              )}
            </span>
          ))}
          {coverage === "indirect" && !hasMappings && (
            <span style={{ fontSize: 10.5, color: "var(--text-quaternary)", fontWeight: 500 }}>Indirect coverage</span>
          )}
          {!isLocked && (
            <button
              className="acc-chip-add"
              onClick={(e) => { e.stopPropagation(); onAddMapping(outcome); }}
            >
              +{!hasMappings && coverage !== "indirect" ? " Map criterion" : ""}
            </button>
          )}
        </div>
      </td>

      {/* Coverage */}
      <td className="text-center" data-label="Coverage">
        <span
          className={coverageBadgeClass(coverage)}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLocked && coverage !== "direct") onCycleCoverage(outcome.id);
          }}
          style={isLocked ? { cursor: "default", opacity: 0.75 } : {}}
        >
          <span className="acc-cov-dot" />
          {coverageLabel(coverage)}
        </span>
      </td>

      {/* Actions */}
      <td className="col-acc-actions">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <FloatingMenu
            trigger={
              <button
                className="juror-action-btn"
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : menuKey); }}
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
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); onEdit(outcome); }}
            >
              <Pencil size={13} strokeWidth={2} />
              Edit Outcome
            </button>
            <button
              className="floating-menu-item"
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); if (!isLocked) onDuplicate(outcome); }}
              disabled={isLocked}
              style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
            >
              <Copy size={13} strokeWidth={2} />
              Duplicate
            </button>
            <div className="floating-menu-divider" />
            <button
              className="floating-menu-item danger"
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); if (!isLocked) onDelete(outcome); }}
              disabled={isLocked}
              style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
            >
              <Trash2 size={13} strokeWidth={2} />
              Remove Outcome
            </button>
          </FloatingMenu>
        </div>

      </td>
    </tr>
  );
}

// ── Main component ───────────────────────────────────────────

export default function OutcomesPage() {
  const {
    organizationId,
    selectedPeriodId,
    selectedPeriod,
    frameworks = [],
    semesterOptions: allPeriods = [],
    onFrameworksChange,
    loading: adminLoading,
    fetchData,
  } = useAdminContext();

  const toast = useToast();
  const isLocked = !!selectedPeriod?.is_locked;
  const frameworkId = selectedPeriod?.framework_id || null;
  const savedFrameworkName = frameworks.find((f) => f.id === frameworkId)?.name || "";
  // Only show accreditation frameworks (MÜDEK/ABET) in the "no framework" picker —
  // VERA Standard belongs to the Criteria page, not here.
  const isAccreditationFramework = (fw) => /MÜDEK|ABET/i.test(fw.name);
  const platformFrameworks = frameworks.filter((f) => !f.organization_id && isAccreditationFramework(f));
  const periodsWithFrameworks = allPeriods.filter(
    (p) => p.id !== selectedPeriodId && p.framework_id
  );

  // Independently load platform templates when no framework is assigned.
  // Guards against the context frameworks not being ready yet (race on initial load).
  const [localPlatformFrameworks, setLocalPlatformFrameworks] = useState(null);
  useEffect(() => {
    if (frameworkId || !organizationId) return;
    listFrameworks(organizationId)
      .then((rows) => setLocalPlatformFrameworks(rows.filter((f) => !f.organization_id && isAccreditationFramework(f))))
      .catch(() => {}); // on error keep null → falls back to context platformFrameworks
  }, [frameworkId, organizationId]);

  const effectivePlatformFrameworks = localPlatformFrameworks ?? platformFrameworks;

  // ── Data hook ─────────────────────────────────────────────

  const fw = usePeriodOutcomes({ periodId: selectedPeriodId });
  const { activeOrganization } = useAuth();
  const { generateFile: generateOutcomesFile, handleExport: handleOutcomesExport } = useOutcomesExport({
    outcomes: fw.outcomes,
    criteria: fw.criteria,
    mappings: fw.mappings,
    periodName: selectedPeriod?.name || "",
  });

  // Effective framework name reflects any queued rename in the draft so the
  // UI updates instantly without hitting the DB.
  const frameworkName =
    fw.pendingFrameworkName !== undefined ? fw.pendingFrameworkName : savedFrameworkName;

  // ── Local UI state ────────────────────────────────────────

  const [sortOrder, setSortOrder] = useState("asc");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Drawers
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Unassign framework modal
  const [unassignFwOpen, setUnassignFwOpen] = useState(false);
  const [unassignFwConfirmText, setUnassignFwConfirmText] = useState("");
  const [unassignFwSubmitting, setUnassignFwSubmitting] = useState(false);

  // Framework import confirm modal (shown before committing a queued import
  // when the period already has saved outcomes/mappings that would be replaced).
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  // Panel error
  const [panelError, setPanelError] = useState("");

  // Framework picker expand/collapse (draft-first: Start-from-blank and clone
  // choices set `fw.pendingFrameworkImport` and are applied on Save; no DB write
  // runs here.)
  const [showFwPicker, setShowFwPicker] = useState(false);

  const requireOrg = () => {
    if (!organizationId) {
      toast.error("No active organization selected. Switch to a tenant from the org switcher.");
      return false;
    }
    return true;
  };

  const handleStartBlank = () => {
    if (!selectedPeriodId || !requireOrg()) return;
    fw.setPendingFrameworkImport({ kind: "blank", proposedName: "Custom Outcome" });
  };

  const handleCloneFromPeriod = (period) => {
    if (!selectedPeriodId || !requireOrg()) return;
    setShowFwPicker(false);
    const fwName =
      frameworks.find((f) => f.id === period.framework_id)?.name || "Custom Outcome";
    fw.setPendingFrameworkImport({
      kind: "clonePeriod",
      sourceFrameworkId: period.framework_id,
      proposedName: `${fwName} (copy)`,
    });
  };

  const handleCloneTemplate = (template) => {
    if (!selectedPeriodId || !requireOrg()) return;
    setShowFwPicker(false);
    fw.setPendingFrameworkImport({
      kind: "cloneTemplate",
      sourceFrameworkId: template.id,
      proposedName: template.name,
    });
  };

  // Inline framework rename
  const [fwRenaming, setFwRenaming] = useState(false);
  const [fwRenameVal, setFwRenameVal] = useState("");
  const [fwRenameSaving, setFwRenameSaving] = useState(false);
  const fwRenameInputRef = useRef(null);

  // ── Derived data ──────────────────────────────────────────

  const sortedOutcomes = [...fw.outcomes].sort((a, b) => {
    const cmp = naturalCodeSort(a, b);
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedOutcomes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedOutcomes.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalOutcomes = fw.outcomes.length;
  const directCount = fw.outcomes.filter((o) => fw.getCoverage(o.id) === "direct").length;
  const indirectCount = fw.outcomes.filter((o) => fw.getCoverage(o.id) === "indirect").length;
  const unmappedCount = totalOutcomes - directCount - indirectCount;
  const incompleteCount = unmappedCount + indirectCount;

  // ── Criteria for drawers ──────────────────────────────────

  const drawerCriteria = fw.criteria.map((c) => ({
    id: c.id,
    label: c.label,
    color: c.color || "var(--accent)",
  }));

  // ── Handlers ──────────────────────────────────────────────

  const handleAddOutcome = async ({ code, shortLabel, description, criterionIds }) => {
    setPanelError("");
    try {
      await fw.addOutcome({ code, shortLabel, description, criterionIds });
      toast.success("Outcome added successfully");
    } catch (e) {
      toast.error(e?.message || "Failed to add outcome");
      throw e;
    }
  };

  const handleEditOutcome = async ({ code, shortLabel, description, criterionIds, coverageType }) => {
    if (!editingOutcome) return;
    setPanelError("");
    try {
      await fw.editOutcome(editingOutcome.id, {
        code,
        label: shortLabel,
        description,
        criterionIds,
        coverageType: coverageType || "direct",
      });
      toast.success("Outcome updated successfully");
    } catch (e) {
      toast.error(e?.message || "Failed to update outcome");
      throw e;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setPanelError("");
    try {
      await fw.removeOutcome(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success("Outcome removed");
    } catch (e) {
      const msg = e?.message || "Failed to remove outcome";
      setPanelError(msg);
      toast.error(msg);
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDuplicate = async (outcome) => {
    setPanelError("");
    try {
      const newCode = outcome.code + " (copy)";
      await fw.addOutcome({
        code: newCode,
        shortLabel: outcome.label,
        description: outcome.description || "",
        criterionIds: fw.getMappedCriteria(outcome.id).map((c) => c.id),
      });
      toast.success("Outcome duplicated");
    } catch (e) {
      toast.error(e?.message || "Failed to duplicate outcome");
    }
  };

  const handleRemoveChip = async (criterionId, outcomeId) => {
    try {
      await fw.removeMapping(criterionId, outcomeId);
    } catch (e) {
      toast.error(e?.message || "Failed to remove mapping");
    }
  };

  const handleCycleCoverage = async (outcomeId) => {
    try {
      await fw.cycleCoverage(outcomeId);
    } catch (e) {
      toast.error(e?.message || "Failed to update coverage");
    }
  };

  const openEditDrawer = (outcome) => {
    const mapped = fw.getMappedCriteria(outcome.id);
    const coverage = fw.getCoverage(outcome.id);
    setEditingOutcome({
      id: outcome.id,
      code: outcome.code,
      shortLabel: outcome.label,
      description: outcome.description || "",
      criterionIds: mapped.map((c) => c.id),
      coverageType: coverage === "none" ? "direct" : coverage,
    });
    setEditDrawerOpen(true);
  };

  // ── Framework rename handlers ─────────────────────────────

  const startFwRename = () => {
    setFwRenameVal(frameworkName);
    setFwRenaming(true);
    setTimeout(() => {
      fwRenameInputRef.current?.focus();
      fwRenameInputRef.current?.select();
    }, 0);
  };

  const cancelFwRename = () => {
    setFwRenaming(false);
    setFwRenameVal("");
  };

  // Queue the rename in the draft; no RPC runs until Save Changes.
  const saveFwRename = () => {
    const trimmed = fwRenameVal.trim();
    if (!trimmed || trimmed === frameworkName || !frameworkId) {
      cancelFwRename();
      return;
    }
    fw.setPendingFrameworkName(trimmed);
    setFwRenaming(false);
    setFwRenameVal("");
  };

  const handleFwRenameKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); saveFwRename(); }
    if (e.key === "Escape") { e.preventDefault(); cancelFwRename(); }
  };

  // ── Draft save/discard ────────────────────────────────────

  // Core commit flow — runs the queued draft (import + diffs + rename) against
  // the DB. Split out so the framework-import confirm modal can call it after
  // the user confirms, while the non-destructive path can call it directly.
  const runSaveDraft = async () => {
    try {
      // Unassign supersedes all other edits — if the user queued it, the
      // framework goes away and everything else is moot. Use the atomic RPC
      // so period_outcomes + period_criterion_outcome_maps are wiped in the
      // same transaction that clears framework_id. Without this, stale rows
      // linger and CriteriaPage's Mapping column keeps showing outcome codes
      // from the removed framework.
      if (fw.pendingUnassign) {
        await unassignPeriodFramework(selectedPeriodId);
        await Promise.all([fetchData?.(), fw.loadAll()]);
        onFrameworksChange?.();
        toast.success("Outcomes removed from this period");
        return;
      }

      // Outcome/mapping diffs (and framework import if queued). commitDraft
      // runs the framework create/clone + assign + freeze when an import is
      // pending, then processes any outcome/mapping diff on top.
      const hadImport = !!fw.pendingFrameworkImport;
      if (fw.itemsDirty || fw.pendingFrameworkImport) {
        await fw.commitDraft({ organizationId });
      }
      if (hadImport) {
        await fetchData?.();
        onFrameworksChange?.();
      }

      // Framework rename — clone-if-shared or update-in-place.
      if (fw.pendingFrameworkName !== undefined && frameworkId) {
        const trimmed = fw.pendingFrameworkName;
        const sharedWith = allPeriods.filter(
          (p) => p.framework_id === frameworkId && p.id !== selectedPeriodId
        );
        if (sharedWith.length > 0 && organizationId) {
          const { id: clonedId } = await cloneFramework(frameworkId, trimmed, organizationId);
          await assignFrameworkToPeriod(selectedPeriodId, clonedId);
        } else {
          await updateFramework(frameworkId, { name: trimmed });
        }
        await fetchData?.();
        onFrameworksChange?.();
        fw.setPendingFrameworkName(undefined);
      }

      toast.success("Outcomes saved");
    } catch (e) {
      toast.error(e?.message || "Failed to save outcomes");
    }
  };

  // SaveBar entry point. When the draft includes a framework import and the
  // period already has saved outcomes/mappings, show an inline confirm so the
  // user understands the outcome set will be replaced (criteria are preserved).
  const handleSaveDraft = async () => {
    const hasExistingOutcomes =
      (fw.savedOutcomesCount ?? 0) > 0 || (fw.savedMappingsCount ?? 0) > 0;
    if (fw.pendingFrameworkImport && hasExistingOutcomes) {
      setImportConfirmOpen(true);
      return;
    }
    await runSaveDraft();
  };

  const handleConfirmImport = async () => {
    setImportConfirmOpen(false);
    await runSaveDraft();
  };

  const handleDiscardDraft = () => {
    // All intents (outcome/mapping edits, rename, unassign, framework import)
    // live in the hook's draft — discardDraft resets them without any RPC.
    fw.discardDraft();
  };

  // ── Unassign framework handler ─────────────────────────────
  // Queues the unassign in the draft — the RPC runs only when the user clicks
  // Save Changes. Discard reverts to the current framework without a request.

  const handleUnassignFramework = () => {
    fw.markUnassign();
    setUnassignFwOpen(false);
    setUnassignFwConfirmText("");
  };

  // ── Render ────────────────────────────────────────────────

  const pendingImport = fw.pendingFrameworkImport;
  const noFramework = !adminLoading && !frameworkId && !pendingImport;
  const showPendingImportView = !adminLoading && !frameworkId && !!pendingImport;

  return (
    <div id="page-accreditation">
      {/* Panel error */}
      {panelError && (
        <FbAlert variant="danger" style={{ marginBottom: 16 }}>{panelError}</FbAlert>
      )}
      {/* Page title */}
      <div style={{ marginBottom: 16 }}>
        <div className="page-title">Outcomes &amp; Mapping</div>
        <div className="page-desc">Map evaluation criteria to programme outcomes and track coverage.</div>
      </div>
      {noFramework ? (
        <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
          <div className="vera-es-card">
            <div className="vera-es-hero vera-es-hero--fw">
              <div className="vera-es-icon vera-es-icon--fw">
                <Network size={24} strokeWidth={1.65} />
              </div>
              <div>
                <div className="vera-es-title">No framework assigned to this period</div>
                <div className="vera-es-desc">
                  A framework defines programme outcomes and criterion mappings.
                  Required for accreditation analytics and reporting.
                </div>
              </div>
            </div>
            <div className="vera-es-actions">
              <button
                className={`vera-es-action vera-es-action--primary-fw${showFwPicker ? " vera-es-action--expanded" : ""}`}
                onClick={() => {
                  if (periodsWithFrameworks.length > 0 || effectivePlatformFrameworks.length > 0) {
                    setShowFwPicker((s) => !s);
                  } else {
                    setAddDrawerOpen(true);
                  }
                }}
              >
                <div className="vera-es-num vera-es-num--fw">1</div>
                <div className="vera-es-action-text">
                  <div className="vera-es-action-label">Start from an existing framework</div>
                  <div className="vera-es-action-sub">
                    {periodsWithFrameworks.length > 0
                      ? "Clone from a previous period or use a platform template"
                      : "Pick a platform template with predefined outcomes"}
                  </div>
                </div>
                <span className="vera-es-badge vera-es-badge--fw">Recommended</span>
              </button>
              {showFwPicker && (
                <div className="vera-es-clone-list vera-es-clone-list--fw">
                  {periodsWithFrameworks.length > 0 && (
                    <>
                      <div className="vera-es-clone-list-label">Clone from a previous period</div>
                      <div className="vera-es-clone-scroll">
                        {periodsWithFrameworks.map((p) => {
                          const fwName = frameworks.find((f) => f.id === p.framework_id)?.name || "Custom Outcome";
                          return (
                            <button
                              key={p.id}
                              className="vera-es-clone-item"
                              onClick={() => handleCloneFromPeriod(p)}
                            >
                              <div>
                                <div className="vera-es-clone-name">{p.name}</div>
                                <div className="vera-es-clone-meta">{fwName}</div>
                              </div>
                              <span className="vera-es-clone-cta">Clone</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {effectivePlatformFrameworks.length > 0 && (
                    <>
                      <div className="vera-es-clone-list-label" style={{ paddingTop: periodsWithFrameworks.length > 0 ? 8 : 0 }}>
                        {periodsWithFrameworks.length > 0 ? "or use a default template" : "Default templates"}
                      </div>
                      {effectivePlatformFrameworks.map((fw) => (
                        <button
                          key={fw.id}
                          type="button"
                          className="vera-es-clone-item"
                          onClick={() => handleCloneTemplate(fw)}
                        >
                          <div>
                            <div className="vera-es-clone-name">{fw.name}</div>
                            {fw.description && (
                              <div className="vera-es-clone-meta">{fw.description}</div>
                            )}
                          </div>
                          <span className="vera-es-clone-cta">Use</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
              <div className="vera-es-divider">or</div>
              <button
                className="vera-es-action vera-es-action--secondary"
                onClick={handleStartBlank}
              >
                <div className="vera-es-num vera-es-num--secondary">2</div>
                <div className="vera-es-action-text">
                  <div className="vera-es-action-label">Start from blank</div>
                  <div className="vera-es-action-sub">Add your own outcomes from scratch</div>
                </div>
                <span className="vera-es-badge vera-es-badge--secondary">Manual</span>
              </button>
            </div>
            <div className="vera-es-footer">
              <Info size={12} strokeWidth={2} />
              Optional step · Recommended for accreditation
            </div>
          </div>
        </div>
      ) : showPendingImportView ? (
        <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
          <div className="vera-es-card">
            <div className="vera-es-hero vera-es-hero--fw">
              <div className="vera-es-icon vera-es-icon--fw">
                <Network size={24} strokeWidth={1.65} />
              </div>
              <div>
                <div className="vera-es-title">Framework ready to apply</div>
                <div className="vera-es-desc">
                  <strong style={{ color: "var(--text-primary)" }}>{pendingImport.proposedName}</strong>{" "}
                  {pendingImport.kind === "blank"
                    ? "will be created as a blank framework for this period. No outcomes will be added until you define them."
                    : "will be cloned as a new framework for this period, carrying the source outcomes and mappings."}
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
      ) : (
        <>
          {/* Lock banner */}
          {isLocked && (
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
                  Criterion mappings, coverage types, labels, and descriptions cannot be changed while scores exist.
                </div>
                <div className="lock-notice-chips">
                  <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Criterion Mappings</span>
                  <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Coverage Types</span>
                  <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Labels &amp; Descriptions</span>
                </div>
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="scores-kpi-strip">
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">{totalOutcomes}</div>
              <div className="scores-kpi-item-label">Total Outcomes</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value success">{directCount}</div>
              <div className="scores-kpi-item-label">Direct</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value warning">{indirectCount}</div>
              <div className="scores-kpi-item-label">Indirect</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value muted">{unmappedCount}</div>
              <div className="scores-kpi-item-label">Unmapped</div>
            </div>
          </div>

          {/* Coverage progress bar */}
          {totalOutcomes > 0 && (
            <div className="acc-coverage-progress">
              <div className="acc-coverage-progress-top">
                <span className="acc-coverage-progress-label">Overall Coverage</span>
                <span className="acc-coverage-progress-pct">
                  {totalOutcomes > 0 ? Math.round(((directCount + indirectCount) / totalOutcomes) * 100) : 0}% covered
                </span>
              </div>
              <div className="acc-coverage-bar-track">
                <div className="acc-coverage-bar-direct" style={{ width: `${totalOutcomes > 0 ? (directCount / totalOutcomes) * 100 : 0}%` }} />
                <div className="acc-coverage-bar-indirect" style={{ width: `${totalOutcomes > 0 ? (indirectCount / totalOutcomes) * 100 : 0}%` }} />
              </div>
              <div className="acc-coverage-bar-legend">
                <span className="acc-coverage-bar-legend-item"><span className="legend-dot" style={{ background: "var(--success)" }} /> Direct ({directCount})</span>
                <span className="acc-coverage-bar-legend-item"><span className="legend-dot" style={{ background: "var(--warning)" }} /> Indirect ({indirectCount})</span>
                <span className="acc-coverage-bar-legend-item"><span className="legend-dot" style={{ background: "var(--text-quaternary)" }} /> Unmapped ({unmappedCount})</span>
              </div>
            </div>
          )}

          {/* Advisory banner */}
          {incompleteCount > 0 && totalOutcomes > 0 && (
            <FbAlert variant="warning" style={{ marginBottom: 16 }} title="Incomplete outcome coverage">
              {incompleteCount} of {totalOutcomes} programme outcome{totalOutcomes !== 1 ? "s" : ""} lack direct criterion mapping
              ({unmappedCount > 0 ? `${unmappedCount} unmapped` : ""}
              {unmappedCount > 0 && indirectCount > 0 ? ", " : ""}
              {indirectCount > 0 ? `${indirectCount} indirect` : ""}).
              {" "}Consider adding explicit mappings or supplementary assessment instruments to strengthen accreditation compliance.
            </FbAlert>
          )}

          {/* Outcomes table card */}
          <div className={`card acc-table-card${isLocked ? " locked-card" : ""}`}>
            <div className="card-header">
              <div className="acc-card-title-group">
                <div className="crt-title-row">
                  {!isLocked && (
                    <FloatingMenu
                      trigger={
                        <button
                          className="crt-kebab-inline"
                          onClick={() => setOpenMenuId(openMenuId === "acc-header" ? null : "acc-header")}
                        >
                          <MoreVertical size={14} />
                        </button>
                      }
                      isOpen={openMenuId === "acc-header"}
                      onClose={() => setOpenMenuId(null)}
                      placement="bottom-start"
                    >
                      <button
                        className="floating-menu-item"
                        onMouseDown={(e) => { e.preventDefault(); setOpenMenuId(null); startFwRename(); }}
                      >
                        <Pencil size={13} strokeWidth={2} />Rename Outcome
                      </button>
                      <div className="floating-menu-divider" />
                      <button
                        className="floating-menu-item danger"
                        onMouseDown={() => { setOpenMenuId(null); setUnassignFwOpen(true); setUnassignFwConfirmText(""); }}
                      >
                        <Trash2 size={13} strokeWidth={2} />Remove Outcome
                      </button>
                    </FloatingMenu>
                  )}
                  {fwRenaming ? (
                    <div className="acc-title-rename-wrap">
                      <input
                        ref={fwRenameInputRef}
                        className="acc-title-rename-input"
                        value={fwRenameVal}
                        onChange={(e) => setFwRenameVal(e.target.value)}
                        onBlur={saveFwRename}
                        onKeyDown={handleFwRenameKeyDown}
                        disabled={fwRenameSaving}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className={`acc-card-editable-title${isLocked ? " no-rename" : ""}`}
                      onClick={isLocked ? undefined : startFwRename}
                      role={isLocked ? undefined : "button"}
                      tabIndex={isLocked ? undefined : 0}
                      onKeyDown={isLocked ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") startFwRename(); }}
                    >
                      {frameworkName}
                      {!isLocked && <Pencil size={13} strokeWidth={2} className="acc-title-edit-icon" />}
                    </div>
                  )}
                </div>
                <div className="acc-card-subtitle">
                  {totalOutcomes} outcome{totalOutcomes !== 1 ? "s" : ""} · {directCount} direct
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setExportOpen((v) => !v)}
                >
                  <Download size={14} strokeWidth={2} style={{ verticalAlign: "-1px" }} />
                  {" "}Export
                </button>
                {isLocked ? (
                  <span className="acc-lock-badge">
                    <Lock size={11} strokeWidth={2.5} />
                    Evaluation Active
                  </span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: "auto", padding: "6px 14px", fontSize: 12, background: "var(--accent)", boxShadow: "none" }}
                    onClick={() => setAddDrawerOpen(true)}
                  >
                    + Add Outcome
                  </button>
                )}
              </div>
            </div>
            {exportOpen && (
              <ExportPanel
                title="Export Outcomes"
                subtitle="Download programme outcomes with criterion mappings and coverage analysis."
                meta={`${(fw.outcomes || []).length} outcomes · ${selectedPeriod?.name || "—"}`}
                organization={activeOrganization?.name || ""}
                onClose={() => setExportOpen(false)}
                generateFile={generateOutcomesFile}
                onExport={handleOutcomesExport}
              />
            )}
            <div className="table-wrap" style={{ border: "none" }}>
              {fw.loading && fw.outcomes.length === 0 ? (
                <div className="acc-empty-state" style={{ padding: "32px 24px" }}>
                  <div className="acc-empty-desc">Loading outcomes…</div>
                </div>
              ) : fw.outcomes.length === 0 ? (
                <div className="acc-empty-state" style={{ padding: "32px 24px" }}>
                  <div className="acc-empty-icon">
                    <BadgeCheck size={28} strokeWidth={1.5} />
                  </div>
                  <div className="acc-empty-title">No outcomes defined</div>
                  <div className="acc-empty-desc">Click "+ Add Outcome" to define your first programme outcome.</div>
                </div>
              ) : (
                <table className="acc-table table-standard table-pill-balance" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 80 }} className="sortable sorted" onClick={() => { setSortOrder(prev => prev === "asc" ? "desc" : "asc"); setCurrentPage(1); }}>
                        Code <span className={`sort-icon sort-icon-active`}>{sortOrder === "asc" ? "▲" : "▼"}</span>
                      </th>
                      <th>Outcome</th>
                      <th>Mapped Criteria</th>
                      <th style={{ width: 110 }} className="text-center">Coverage</th>
                      <th style={{ width: 44 }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((outcome) => (
                      <OutcomeRow
                        key={outcome.id}
                        outcome={outcome}
                        mappedCriteria={fw.getMappedCriteria(outcome.id)}
                        coverage={fw.getCoverage(outcome.id)}
                        onEdit={openEditDrawer}
                        onDelete={(o) => setDeleteTarget(o)}
                        onDuplicate={handleDuplicate}
                        onRemoveChip={handleRemoveChip}
                        onAddMapping={openEditDrawer}
                        onCycleCoverage={handleCycleCoverage}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        isLocked={isLocked}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Coverage legend strip */}
            {fw.outcomes.length > 0 && (
              <div className="acc-legend-strip">
                {COVERAGE_LEGEND.map((item) => (
                  <div key={item.key} className={`acc-legend-item ${item.cls}`}>
                    <div className={`acc-legend-icon-wrap ${item.cls}`}>
                      <item.icon size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <div className={`acc-legend-label ${item.cls}`}>{item.label}</div>
                      <div className="acc-legend-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedOutcomes.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              itemLabel="outcomes"
            />
          </div>
        </>
      )}
      {/* Add Outcome Drawer */}
      <AddOutcomeDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        frameworkName={frameworkName}
        frameworkId={frameworkId}
        platformFrameworks={effectivePlatformFrameworks}
        criteria={drawerCriteria}
        onSave={handleAddOutcome}
        onSelectFrameworkTemplate={(template) => {
          if (!selectedPeriodId || !requireOrg()) return;
          if (template) {
            fw.setPendingFrameworkImport({
              kind: "cloneTemplate",
              sourceFrameworkId: template.id,
              proposedName: template.name,
            });
          } else {
            fw.setPendingFrameworkImport({
              kind: "blank",
              proposedName: "Custom Outcome",
            });
          }
          setAddDrawerOpen(false);
        }}
      />
      {/* Edit Outcome Drawer */}
      <OutcomeDetailDrawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditingOutcome(null); }}
        outcome={editingOutcome}
        criteria={drawerCriteria}
        onSave={handleEditOutcome}
        isLocked={isLocked}
      />
      {/* Delete Confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => { if (!deleteSubmitting) { setDeleteTarget(null); setDeleteConfirmText(""); } }}
        size="sm"
        centered
      >
        <div className="fs-modal-header">
          <div className="fs-modal-icon danger">
            <Trash2 size={22} strokeWidth={2} />
          </div>
          <div className="fs-title" style={{ textAlign: "center" }}>Remove Outcome?</div>
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
            You are about to remove{" "}
            <strong style={{ color: "var(--text-primary)" }}>{deleteTarget?.code}</strong>{" "}
            from the framework.
          </div>
        </div>
        <div className="fs-modal-body" style={{ paddingTop: 2 }}>
          <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">This action cannot be undone</div>
              <div className="fs-alert-desc">
                All criterion mappings for this outcome will be permanently removed.
                Scores already submitted will not be affected.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
              Type <strong style={{ color: "var(--text-primary)" }}>{deleteTarget?.code}</strong> to confirm
            </label>
            <input
              className="fs-typed-input"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget?.code ? `Type ${deleteTarget.code} to confirm` : "Type to confirm"}
              autoComplete="off"
              spellCheck={false}
              disabled={deleteSubmitting}
            />
          </div>
        </div>
        <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}>
          <button
            type="button"
            className="fs-btn fs-btn-secondary"
            onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
            disabled={deleteSubmitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fs-btn fs-btn-danger"
            onClick={handleDeleteConfirm}
            disabled={deleteSubmitting || deleteConfirmText !== deleteTarget?.code}
            style={{ flex: 1 }}
          >
            <AsyncButtonContent loading={deleteSubmitting} loadingText="Removing…">
              Remove Outcome
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>
      {/* Unassign framework confirm */}
      <Modal
        open={unassignFwOpen}
        onClose={() => { if (!unassignFwSubmitting) { setUnassignFwOpen(false); setUnassignFwConfirmText(""); } }}
        size="sm"
        centered
      >
        <div className="fs-modal-header">
          <div className="fs-modal-icon danger">
            <Trash2 size={22} strokeWidth={2} />
          </div>
          <div className="fs-title" style={{ textAlign: "center" }}>Remove Framework?</div>
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
            You are about to remove the framework{" "}
            <strong style={{ color: "var(--text-primary)" }}>{frameworkName}</strong>{" "}
            from this evaluation period.
          </div>
        </div>
        <div className="fs-modal-body" style={{ paddingTop: 2 }}>
          <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">This action cannot be undone</div>
              <div className="fs-alert-desc">
                All programme outcomes and criterion mappings defined for this period will be permanently removed.
                Scores already submitted will not be affected.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
              Type <strong style={{ color: "var(--text-primary)" }}>{frameworkName}</strong> to confirm
            </label>
            <input
              className="fs-typed-input"
              type="text"
              value={unassignFwConfirmText}
              onChange={(e) => setUnassignFwConfirmText(e.target.value)}
              placeholder={`Type ${frameworkName} to confirm`}
              autoComplete="off"
              spellCheck={false}
              disabled={unassignFwSubmitting}
            />
          </div>
        </div>
        <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}>
          <button
            type="button"
            className="fs-btn fs-btn-secondary"
            onClick={() => { setUnassignFwOpen(false); setUnassignFwConfirmText(""); }}
            disabled={unassignFwSubmitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fs-btn fs-btn-danger"
            onClick={handleUnassignFramework}
            disabled={unassignFwSubmitting || unassignFwConfirmText !== frameworkName}
            style={{ flex: 1 }}
          >
            <AsyncButtonContent loading={unassignFwSubmitting} loadingText="Removing…">
              Remove Outcome
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>
      {/* Framework import confirm — shown when a period already has outcomes
          and the user is replacing the framework. Criteria are preserved. */}
      <Modal
        open={importConfirmOpen}
        onClose={() => { if (!fw.saving) setImportConfirmOpen(false); }}
        size="sm"
        centered
      >
        <div className="fs-modal-header">
          <div className="fs-modal-icon warning">
            <Network size={22} strokeWidth={2} />
          </div>
          <div className="fs-title" style={{ textAlign: "center" }}>Replace Outcome Set?</div>
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
            You are about to replace this period's outcome set with{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {fw.pendingFrameworkImport?.proposedName || "a new framework"}
            </strong>.
          </div>
        </div>
        <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}>
          <button
            type="button"
            className="fs-btn fs-btn-secondary"
            onClick={() => setImportConfirmOpen(false)}
            disabled={fw.saving}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fs-btn fs-btn-primary"
            onClick={handleConfirmImport}
            disabled={fw.saving}
            style={{ flex: 1 }}
          >
            <AsyncButtonContent loading={fw.saving} loadingText="Replacing…">
              Replace Outcomes
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>
      <SaveBar
        isDirty={fw.isDirty}
        canSave={true}
        total={100}
        onSave={handleSaveDraft}
        onDiscard={handleDiscardDraft}
        saving={fw.saving}
      />
    </div>
  );
}
