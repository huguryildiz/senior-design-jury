// src/admin/pages/OutcomesPage.jsx
// Outcomes & Mapping page — framework-level outcome CRUD + criterion mapping.
// Matches vera-premium-prototype.html mockup.

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, MoreVertical, Icon } from "lucide-react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useFrameworkOutcomes } from "../hooks/useFrameworkOutcomes";
import { useToast } from "@/shared/hooks/useToast";
import { createFramework } from "@/shared/api";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import AddOutcomeDrawer from "../drawers/AddOutcomeDrawer";
import OutcomeDetailDrawer from "../drawers/OutcomeDetailDrawer";
import Modal from "@/shared/ui/Modal";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import FbAlert from "@/shared/ui/FbAlert";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import "../../styles/pages/outcomes.css";

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
  const aParts = a.code.split(".").map(Number);
  const bParts = b.code.split(".").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) {
    return <span className="sort-icon sort-icon-inactive">▲</span>;
  }
  return (
    <span className="sort-icon sort-icon-active">
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ── Detail row (expanded) ────────────────────────────────────

function OutcomeDetailRow({ outcome, mappedCriteria, coverage, isOpen }) {
  if (!isOpen) return null;

  return (
    <tr className="acc-detail-row open">
      <td colSpan="6">
        <div className="acc-detail-inner">
          <div className="acc-detail-section-label">Outcome Description</div>
          <div className="acc-detail-text">
            {outcome.description || <em style={{ color: "var(--text-quaternary)" }}>No description provided.</em>}
          </div>

          {mappedCriteria.length > 0 && (
            <>
              <div className="acc-detail-section-label">Mapped Criteria</div>
              {mappedCriteria.map((c) => (
                <div key={c.id} className="acc-detail-mapped-crit">
                  <span className="acc-detail-crit-dot" style={{ background: c.color || "var(--accent)" }} />
                  <span className="acc-detail-crit-name">{c.label}</span>
                  <span className="acc-detail-crit-meta">{c.max_score} pts max</span>
                </div>
              ))}
            </>
          )}

          {coverage === "indirect" && mappedCriteria.length === 0 && (
            <div className="acc-detail-indirect-note">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: 14, height: 14, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </Icon>
              <span>This outcome is assessed indirectly through related criteria. To strengthen accreditation evidence, consider mapping a criterion directly.</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Outcome row ──────────────────────────────────────────────

function OutcomeRow({
  outcome,
  mappedCriteria,
  coverage,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onRemoveChip,
  onAddMapping,
  onCycleCoverage,
  openMenuId,
  setOpenMenuId,
}) {
  const menuKey = `acc-row-${outcome.id}`;
  const isMenuOpen = openMenuId === menuKey;
  const hasMappings = mappedCriteria.length > 0;

  return (
    <>
      <tr
        className={`acc-row${isExpanded ? " acc-row-expanded" : ""}`}
        onClick={onToggleExpand}
        style={{ cursor: "pointer" }}
      >
        {/* Expand */}
        <td className="col-acc-expand" style={{ width: 28, textAlign: "center" }}>
          <button
            className="acc-expand-btn"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            aria-expanded={isExpanded}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              style={{ width: 12, height: 12, transition: "transform .15s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
              <path d="m9 18 6-6-6-6" />
            </Icon>
          </button>
        </td>

        {/* Code */}
        <td data-label="Code">
          <span className={`acc-code ${hasMappings ? "mapped" : "unmapped"}`}>{outcome.code}</span>
        </td>

        {/* Outcome label */}
        <td data-label="Outcome">
          <span className="acc-outcome-label">{outcome.label}</span>
        </td>

        {/* Mapped criteria chips */}
        <td data-label="Criteria">
          <div className="acc-chip-wrap">
            {mappedCriteria.map((c) => (
              <span key={c.id} className="acc-chip" data-criterion={c.id} data-outcome={outcome.id}>
                <span className="acc-crit-dot" style={{ background: c.color || "var(--accent)" }} />
                {c.short_label || c.label}
                <span
                  className="acc-chip-x"
                  onClick={(e) => { e.stopPropagation(); onRemoveChip(c.id, outcome.id); }}
                  title="Remove mapping"
                >
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </Icon>
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
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: 11, height: 11 }}>
                <path d="M12 5v14M5 12h14" />
              </Icon>
              {!hasMappings && coverage !== "indirect" ? "Map criterion" : ""}
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
        <td className="col-acc-actions" style={{ textAlign: "right" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <FloatingMenu
              trigger={<button className="juror-action-btn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : menuKey); }}><MoreVertical size={14} /></button>}
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
      <OutcomeDetailRow
        outcome={outcome}
        mappedCriteria={mappedCriteria}
        coverage={coverage}
        isOpen={isExpanded}
      />
    </>
  );
}

// ── Coverage help popover ────────────────────────────────────

function CoverageHelpPopover({ open, onToggle, anchorRef }) {
  if (!open) return null;
  return (
    <div className="col-info-popover" ref={anchorRef}>
      <div className="col-info-popover-title">Coverage Levels</div>
      <div className="col-info-popover-row">
        <span className="acc-cov-dot" style={{ background: "var(--success)", width: 6, height: 6, borderRadius: "50%", display: "inline-block" }} />
        <span><strong>Direct</strong> — Assessed by mapped criteria</span>
      </div>
      <div className="col-info-popover-row">
        <span className="acc-cov-dot" style={{ background: "var(--warning)", width: 6, height: 6, borderRadius: "50%", display: "inline-block" }} />
        <span><strong>Indirect</strong> — Tangentially assessed</span>
      </div>
      <div className="col-info-popover-row">
        <span className="acc-cov-dot" style={{ background: "var(--text-quaternary)", width: 6, height: 6, borderRadius: "50%", display: "inline-block" }} />
        <span><strong>Not mapped</strong> — No coverage</span>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function OutcomesPage() {
  const {
    organizationId,
    selectedPeriodId,
    frameworks = [],
    onFrameworksChange,
  } = useAdminContext();

  const toast = useToast();
  const frameworkId = frameworks[0]?.id || null;
  const frameworkName = frameworks[0]?.name || "";

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
      await createFramework({
        organization_id: organizationId,
        name: createFwName.trim(),
        description: createFwDesc.trim() || null,
      });
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
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);

  // Drawers
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Coverage help popover
  const [coverageHelpOpen, setCoverageHelpOpen] = useState(false);
  const coverageHelpRef = useRef(null);

  // Indirect overrides (for outcomes with no DB mappings)
  const [indirectOverrides, setIndirectOverrides] = useState(new Set());

  // Panel error
  const [panelError, setPanelError] = useState("");


  useEffect(() => {
    if (!coverageHelpOpen) return;
    const handler = (e) => {
      if (coverageHelpRef.current && !coverageHelpRef.current.contains(e.target)) setCoverageHelpOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [coverageHelpOpen]);

  // ── Derived data ──────────────────────────────────────────

  const sortedOutcomes = [...fw.outcomes].sort((a, b) => {
    const cmp = naturalCodeSort(a, b);
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const getCoverageWithOverrides = useCallback(
    (outcomeId) => {
      const dbCov = fw.getCoverage(outcomeId);
      if (dbCov !== "none") return dbCov;
      return indirectOverrides.has(outcomeId) ? "indirect" : "none";
    },
    [fw, indirectOverrides]
  );

  const totalOutcomes = fw.outcomes.length;
  const directCount = fw.outcomes.filter((o) => getCoverageWithOverrides(o.id) === "direct").length;
  const indirectCount = fw.outcomes.filter((o) => getCoverageWithOverrides(o.id) === "indirect").length;
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

  const handleEditOutcome = async ({ description, criterionIds }) => {
    if (!editingOutcome) return;
    setPanelError("");
    try {
      await fw.editOutcome(editingOutcome.id, {
        label: editingOutcome.label,
        description,
        criterionIds,
      });
      toast.success("Outcome updated successfully");
    } catch (e) {
      throw e;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setPanelError("");
    try {
      await fw.removeOutcome(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Outcome removed");
    } catch (e) {
      setPanelError(e?.message || "Failed to remove outcome");
      setDeleteTarget(null);
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
    const current = getCoverageWithOverrides(outcomeId);
    if (current === "none") {
      // none → indirect (local override)
      setIndirectOverrides((prev) => new Set([...prev, outcomeId]));
    } else if (current === "indirect") {
      // If it's a local override, remove it
      if (indirectOverrides.has(outcomeId)) {
        setIndirectOverrides((prev) => {
          const next = new Set(prev);
          next.delete(outcomeId);
          return next;
        });
      } else {
        // DB-level indirect → cycle via API
        await fw.cycleCoverage(outcomeId);
      }
    }
  };

  const openEditDrawer = (outcome) => {
    const mapped = fw.getMappedCriteria(outcome.id);
    setEditingOutcome({
      id: outcome.id,
      code: outcome.code,
      shortLabel: outcome.label,
      description: outcome.description || "",
      criterionIds: mapped.map((c) => c.id),
    });
    setEditDrawerOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSort = () => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

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
          <div className="acc-empty-state">
            <div className="acc-empty-icon">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
              </Icon>
            </div>
            <div className="acc-empty-title">No framework defined</div>
            <div className="acc-empty-desc">Create an accreditation framework to manage programme outcomes.</div>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 16, width: "auto", padding: "8px 20px" }}
              onClick={() => setCreateFwOpen(true)}
            >
              + Create Framework
            </button>
          </div>

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
          {/* Framework selector bar */}
          <div className="fw-context-bar">
            <div className="fw-context-label">Framework</div>
            <div className="fw-chips">
              {frameworks.map((fwItem) => (
                <div key={fwItem.id} className="fw-chip-wrap">
                  <button className="fw-chip active">
                    <Icon
                      iconNode={[]}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="fw-chip-icon">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                    </Icon>
                    {fwItem.name}
                    <span className="fw-chip-count">{fw.outcomes.length}</span>
                  </button>
                </div>
              ))}
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
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ width: 13, height: 13 }}>
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                  </Icon>
                  {frameworkName}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-quaternary)", fontWeight: 500 }}>Expand rows for details</span>
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
                    <Icon
                      iconNode={[]}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" />
                    </Icon>
                  </div>
                  <div className="acc-empty-title">No outcomes defined</div>
                  <div className="acc-empty-desc">Click "+ Add Outcome" to define your first programme outcome.</div>
                </div>
              ) : (
                <table className="acc-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }} />
                      <th
                        style={{ width: 60 }}
                        className="sortable sorted"
                        onClick={toggleSort}
                      >
                        Code <SortIcon colKey="code" sortKey="code" sortDir={sortOrder} />
                      </th>
                      <th>Outcome</th>
                      <th>Mapped Criteria</th>
                      <th style={{ width: 110, position: "relative" }} className="text-center">
                        Coverage
                        <span
                          className="col-info-icon"
                          onClick={(e) => { e.stopPropagation(); setCoverageHelpOpen((v) => !v); }}
                          style={{ cursor: "pointer", marginLeft: 3 }}
                        >
                          ?
                        </span>
                        <CoverageHelpPopover
                          open={coverageHelpOpen}
                          onToggle={() => setCoverageHelpOpen((v) => !v)}
                          anchorRef={coverageHelpRef}
                        />
                      </th>
                      <th style={{ width: 40 }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOutcomes.map((outcome) => (
                      <OutcomeRow
                        key={outcome.id}
                        outcome={outcome}
                        mappedCriteria={fw.getMappedCriteria(outcome.id)}
                        coverage={getCoverageWithOverrides(outcome.id)}
                        isExpanded={expandedRows.has(outcome.id)}
                        onToggleExpand={() => toggleExpand(outcome.id)}
                        onEdit={openEditDrawer}
                        onDelete={(o) => setDeleteTarget(o)}
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
      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Remove Outcome"
        body={
          <>
            You are about to remove outcome <strong>{deleteTarget?.code}</strong> from the framework.
          </>
        }
        warning="All criterion mappings for this outcome will be permanently removed. This cannot be undone."
        confirmLabel="Remove Outcome"
        tone="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
