// src/admin/pages/OutcomesPage.jsx
// Outcomes & Mapping page — framework-level outcome CRUD + criterion mapping.
// Matches vera-premium-prototype.html mockup.

import { useState } from "react";
import { Pencil, Trash2, Copy, MoreVertical, Layers, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useFrameworkOutcomes } from "../hooks/useFrameworkOutcomes";
import { useToast } from "@/shared/hooks/useToast";
import { createFramework, cloneFramework, assignFrameworkToPeriod } from "@/shared/api";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import AddOutcomeDrawer from "../drawers/AddOutcomeDrawer";
import OutcomeDetailDrawer from "../drawers/OutcomeDetailDrawer";
import Modal from "@/shared/ui/Modal";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import FrameworkPickerModal from "../modals/FrameworkPickerModal";
import FbAlert from "@/shared/ui/FbAlert";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import Pagination from "@/shared/ui/Pagination";
import "../../styles/pages/outcomes.css";
import "../../styles/pages/setup-wizard.css";

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
}) {
  const menuKey = `acc-row-${outcome.id}`;
  const isMenuOpen = openMenuId === menuKey;
  const hasMappings = mappedCriteria.length > 0;
  const prefixMatch = outcome.code.match(/^([A-Za-z]+)\s+(.+)$/);
  const codePrefix = prefixMatch ? prefixMatch[1] : "";
  const codeNum = prefixMatch ? prefixMatch[2] : outcome.code;

  return (
    <tr
      className="acc-row"
      onClick={() => onEdit(outcome)}
      style={{ cursor: "pointer" }}
    >
      {/* Code */}
      <td data-label="Code">
        <span className={`acc-code-badge ${hasMappings ? "mapped" : "unmapped"}`}>
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
              {c.short_label || c.label}
              <span
                className="acc-chip-x"
                onClick={(e) => { e.stopPropagation(); onRemoveChip(c.id, outcome.id); }}
                title="Remove mapping"
              >
                <XCircle size={12} strokeWidth={2.5} />
              </span>
            </span>
          ))}
          {coverage === "indirect" && !hasMappings && (
            <span style={{ fontSize: 10.5, color: "var(--text-quaternary)", fontWeight: 500 }}>Indirect coverage</span>
          )}
          <button
            className="acc-chip-add"
            onClick={(e) => { e.stopPropagation(); onAddMapping(outcome); }}
            title="Map a criterion"
          >
            +{!hasMappings && coverage !== "indirect" ? " Map criterion" : ""}
          </button>
        </div>
      </td>

      {/* Coverage */}
      <td className="text-center" data-label="Coverage">
        <span
          className={coverageBadgeClass(coverage)}
          onClick={(e) => {
            e.stopPropagation();
            if (coverage !== "direct") onCycleCoverage(outcome.id);
          }}
          title={coverage === "direct" ? "Explicitly assessed by mapped criteria" : "Click to change coverage level"}
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
                title="Actions"
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
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); onDuplicate(outcome); }}
            >
              <Copy size={13} strokeWidth={2} />
              Duplicate
            </button>
            <div className="floating-menu-divider" />
            <button
              className="floating-menu-item danger"
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); onDelete(outcome); }}
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
    onFrameworksChange,
  } = useAdminContext();

  const toast = useToast();
  const frameworkId = selectedPeriod?.framework_id || null;
  const frameworkName = frameworks.find((f) => f.id === frameworkId)?.name || "";

  // ── Data hook ─────────────────────────────────────────────

  const fw = useFrameworkOutcomes({ frameworkId });

  // ── Create-framework modal state ─────────────────────────

  const [createFwOpen, setCreateFwOpen] = useState(false);
  const [createFwName, setCreateFwName] = useState("");
  const [createFwDesc, setCreateFwDesc] = useState("");
  const [createFwSubmitting, setCreateFwSubmitting] = useState(false);

  const handleCreateFramework = async () => {
    if (!createFwName.trim() || !organizationId) return;
    setCreateFwSubmitting(true);
    try {
      const created = await createFramework({
        organization_id: organizationId,
        name: createFwName.trim(),
        description: createFwDesc.trim() || null,
      });
      if (selectedPeriodId && created?.id) {
        await assignFrameworkToPeriod(selectedPeriodId, created.id);
      }
      toast.success("Framework created");
      setCreateFwOpen(false);
      setCreateFwName("");
      setCreateFwDesc("");
      onFrameworksChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to create framework");
    } finally {
      setCreateFwSubmitting(false);
    }
  };

  // ── Local UI state ────────────────────────────────────────

  const [sortOrder, setSortOrder] = useState("asc");
  const [openMenuId, setOpenMenuId] = useState(null);
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

  // Panel error
  const [panelError, setPanelError] = useState("");

  // Framework picker + clone state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [changePickerOpen, setChangePickerOpen] = useState(false);
  const [changeConfirmOpen, setChangeConfirmOpen] = useState(false);
  const [pendingChangeFramework, setPendingChangeFramework] = useState(null);
  const [cloneNameOpen, setCloneNameOpen] = useState(false);
  const [cloneNameValue, setCloneNameValue] = useState("");
  const [cloneSubmitting, setCloneSubmitting] = useState(false);

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
    label: c.label || c.short_label,
    color: c.color || "var(--accent)",
  }));

  // ── Handlers ──────────────────────────────────────────────

  const handleAddOutcome = async ({ code, shortLabel, description, criterionIds }) => {
    setPanelError("");
    try {
      await fw.addOutcome({ code, shortLabel, description, criterionIds });
      toast.success("Outcome added successfully");
    } catch (e) {
      throw e; // Let drawer handle display
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
      setPanelError(e?.message || "Failed to remove outcome");
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

  // ── Framework handlers ───────────────────────────────────

  // "Start from existing" → clone selected → assign to current period
  const handlePickAndClone = async (selected) => {
    if (!organizationId || !selectedPeriodId) return;
    try {
      const autoName = `${selected.name} — Copy`;
      const { id: clonedId } = await cloneFramework(selected.id, autoName, organizationId);
      await assignFrameworkToPeriod(selectedPeriodId, clonedId);
      toast.success("Framework cloned and assigned");
      onFrameworksChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to clone framework");
    }
  };

  // "Clone as new..." → clone current framework into org library (period unchanged)
  const handleCloneAsNew = async () => {
    if (!frameworkId || !cloneNameValue.trim() || !organizationId) return;
    setCloneSubmitting(true);
    try {
      await cloneFramework(frameworkId, cloneNameValue.trim(), organizationId);
      toast.success("Framework cloned");
      setCloneNameOpen(false);
      setCloneNameValue("");
      onFrameworksChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to clone");
    } finally {
      setCloneSubmitting(false);
    }
  };

  // "Change..." → picked a framework → if mappings exist: show hard confirm; else assign directly
  const handleChangeFrameworkPicked = (selected) => {
    setPendingChangeFramework(selected);
    if (fw.mappings.length > 0) {
      setChangeConfirmOpen(true);
    } else {
      handleChangeConfirmed(selected);
    }
  };

  const handleChangeConfirmed = async (selected) => {
    const target = selected || pendingChangeFramework;
    if (!target || !organizationId || !selectedPeriodId) return;
    setChangeConfirmOpen(false);
    try {
      const autoName = `${target.name} — Copy`;
      const { id: clonedId } = await cloneFramework(target.id, autoName, organizationId);
      await assignFrameworkToPeriod(selectedPeriodId, clonedId);
      toast.success("Framework changed");
      setPendingChangeFramework(null);
      onFrameworksChange?.();
      fw.loadAll();
    } catch (e) {
      toast.error(e?.message || "Failed to change framework");
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

  // ── Render ────────────────────────────────────────────────

  const noFramework = !frameworkId;

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
        <>
          <div className="sw-empty-state">
            <div className="sw-empty-icon">
              <Layers size={32} strokeWidth={1.5} />
            </div>
            <div className="sw-empty-title">No framework assigned to this period</div>
            <div className="sw-empty-desc">
              A framework defines programme outcomes and criterion mappings.
              Required for accreditation analytics and reporting.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: "auto", padding: "8px 20px" }}
                onClick={() => setPickerOpen(true)}
              >
                Start from an existing framework
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "auto", padding: "8px 20px" }}
                onClick={() => setCreateFwOpen(true)}
              >
                Create from scratch
              </button>
            </div>
            <div className="sw-empty-context">Optional step · Recommended for accreditation</div>
          </div>

          {/* "Start from existing" picker */}
          <FrameworkPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            frameworks={frameworks}
            onSelect={handlePickAndClone}
          />

          {/* Create Framework Modal */}
          <Modal open={createFwOpen} onClose={() => setCreateFwOpen(false)} title="Create Framework">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Framework Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. MÜDEK, ABET, Custom"
                  value={createFwName}
                  onChange={(e) => setCreateFwName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Description (optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Brief description of the accreditation framework"
                  value={createFwDesc}
                  onChange={(e) => setCreateFwDesc(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setCreateFwOpen(false)} disabled={createFwSubmitting}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: "auto", padding: "8px 20px" }}
                  onClick={handleCreateFramework}
                  disabled={!createFwName.trim() || createFwSubmitting}
                >
                  <AsyncButtonContent loading={createFwSubmitting}>Create</AsyncButtonContent>
                </button>
              </div>
            </div>
          </Modal>
        </>
      ) : (
        <>
          {/* Framework context bar */}
          <div className="fw-context-bar">
            <div className="fw-context-label">FRAMEWORK</div>
            <div className="fw-chips">
              <button className="fw-chip active" style={{ cursor: "default" }}>
                <Layers size={14} strokeWidth={1.5} className="fw-chip-icon" />
                {frameworkName}
                <span className="fw-chip-count">{fw.outcomes.length}</span>
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
                onClick={() => { setCloneNameValue(""); setCloneNameOpen(true); }}
              >
                Clone as new…
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
                onClick={() => setChangePickerOpen(true)}
              >
                Change…
              </button>
            </div>
          </div>

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
              <div className="scores-kpi-item-value" style={{ color: "var(--text-tertiary)" }}>{unmappedCount}</div>
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
          <div className="card">
            <div className="card-header">
              <div className="card-title">Programme Outcomes</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="fw-active-badge">
                  <Layers size={13} strokeWidth={1.5} />
                  {frameworkName}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: "auto", padding: "6px 14px", fontSize: 12, background: "var(--accent)", boxShadow: "none" }}
                  onClick={() => setAddDrawerOpen(true)}
                >
                  + Add Outcome
                </button>
              </div>
            </div>
            <div className="table-wrap" style={{ border: "none", overflow: "visible" }}>
              {fw.loading && fw.outcomes.length === 0 ? (
                <div className="acc-empty-state" style={{ padding: "32px 24px" }}>
                  <div className="acc-empty-desc">Loading outcomes…</div>
                </div>
              ) : fw.outcomes.length === 0 ? (
                <div className="acc-empty-state" style={{ padding: "32px 24px" }}>
                  <div className="acc-empty-icon">
                    <Layers size={28} strokeWidth={1.5} />
                  </div>
                  <div className="acc-empty-title">No outcomes defined</div>
                  <div className="acc-empty-desc">Click "+ Add Outcome" to define your first programme outcome.</div>
                </div>
              ) : (
                <table className="acc-table" style={{ width: "100%", borderCollapse: "collapse" }}>
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
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
        criteria={drawerCriteria}
        onSave={handleAddOutcome}
      />
      {/* Edit Outcome Drawer */}
      <OutcomeDetailDrawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditingOutcome(null); }}
        outcome={editingOutcome}
        criteria={drawerCriteria}
        onSave={handleEditOutcome}
      />
      {/* "Clone as new..." name input modal */}
      <Modal open={cloneNameOpen} onClose={() => setCloneNameOpen(false)} title="Save framework copy">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Copy name</label>
            <input
              className="form-input"
              placeholder={`${frameworkName} — Copy`}
              value={cloneNameValue}
              onChange={(e) => setCloneNameValue(e.target.value)}
              autoFocus
              disabled={cloneSubmitting}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 5 }}>
              The current period is not affected; the copy is added to your framework library.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCloneNameOpen(false)} disabled={cloneSubmitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ width: "auto", padding: "8px 20px" }}
              onClick={handleCloneAsNew}
              disabled={!cloneNameValue.trim() || cloneSubmitting}
            >
              <AsyncButtonContent loading={cloneSubmitting}>Save</AsyncButtonContent>
            </button>
          </div>
        </div>
      </Modal>

      {/* "Change..." framework picker */}
      <FrameworkPickerModal
        open={changePickerOpen}
        onClose={() => setChangePickerOpen(false)}
        frameworks={frameworks}
        onSelect={(selected) => { setChangePickerOpen(false); handleChangeFrameworkPicked(selected); }}
      />

      {/* Hard confirm when period has existing mappings */}
      <ConfirmDialog
        open={changeConfirmOpen}
        onOpenChange={(v) => { if (!v) { setChangeConfirmOpen(false); setPendingChangeFramework(null); } }}
        onConfirm={() => handleChangeConfirmed()}
        title="Change framework?"
        body="All outcome mappings for this period will be deleted. Are you sure you want to continue?"
        confirmLabel="Change"
        tone="danger"
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
    </div>
  );
}
