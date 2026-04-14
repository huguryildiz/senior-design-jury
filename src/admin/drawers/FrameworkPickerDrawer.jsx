// src/admin/drawers/FrameworkPickerDrawer.jsx
// Drawer: manage, clone, or switch accreditation frameworks for a period.
//
// Props:
//   open              — boolean
//   onClose           — () => void
//   frameworkId       — string | null  (currently active framework)
//   frameworkName     — string
//   frameworks        — array          (all org + global frameworks from useAdminContext)
//   organizationId    — string
//   selectedPeriodId  — string
//   outcomeCount      — number
//   directCount       — number
//   indirectCount     — number
//   unmappedCount     — number
//   onFrameworksChange — () => void   (triggers reload in parent)
//   hasMappings       — boolean       (true if current period has outcome-criterion maps)

import { useState } from "react";
import {
  BadgeCheck, Copy, Pencil, Trash2,
  PlusCircle, X, AlertCircle, ChevronDown,
} from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import InlineError from "@/shared/ui/InlineError";
import { useToast } from "@/shared/hooks/useToast";
import {
  cloneFramework,
  assignFrameworkToPeriod,
  createFramework,
  updateFramework,
  deleteFramework,
} from "@/shared/api";

export default function FrameworkPickerDrawer({
  open,
  onClose,
  frameworkId,
  frameworkName,
  frameworks = [],
  organizationId,
  selectedPeriodId,
  outcomeCount = 0,
  directCount = 0,
  indirectCount = 0,
  unmappedCount = 0,
  onFrameworksChange,
  hasMappings = false,
}) {
  const toast = useToast();

  // ── Clone active as new (library copy, period unchanged) ─────
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloning, setCloning] = useState(false);

  // ── Rename active framework ──────────────────────────────────
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // ── Remove (unassign) framework from period ──────────────────
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  // ── Clone & use a previous/template framework ────────────────
  const [changeConfirmOpen, setChangeConfirmOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [changingFw, setChangingFw] = useState(false);

  // ── Framework picker dropdown ────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFwId, setSelectedFwId] = useState(null);

  // ── Delete library framework ──────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Create blank framework ────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Derived ──────────────────────────────────────────────────
  const orgFrameworks = frameworks.filter((f) => f.organization_id && f.id !== frameworkId);
  const platformFrameworks = frameworks.filter((f) => !f.organization_id);
  const isDupeName = (name) =>
    name.trim().length > 0 &&
    frameworks.some((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase());

  // ── Handlers ─────────────────────────────────────────────────

  const handleCloneAsNew = async () => {
    if (!frameworkId || !cloneName.trim() || !organizationId) return;
    setCloning(true);
    try {
      await cloneFramework(frameworkId, cloneName.trim(), organizationId);
      toast.success("Framework cloned to library");
      setCloneOpen(false);
      setCloneName("");
      onFrameworksChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to clone");
    } finally {
      setCloning(false);
    }
  };

  const handleRename = async () => {
    if (!frameworkId || !renameName.trim()) return;
    setRenaming(true);
    try {
      await updateFramework(frameworkId, { name: renameName.trim() });
      toast.success("Framework renamed");
      setRenameOpen(false);
      setRenameName("");
      onFrameworksChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to rename");
    } finally {
      setRenaming(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedPeriodId) return;
    setRemoving(true);
    try {
      await assignFrameworkToPeriod(selectedPeriodId, null);
      toast.success("Framework unassigned from period");
      setRemoveConfirmOpen(false);
      onFrameworksChange?.();
      handleClose();
    } catch (e) {
      toast.error(e?.message || "Failed to remove");
    } finally {
      setRemoving(false);
    }
  };

  const handleCloneAndUse = (fw) => {
    setPendingTarget(fw);
    if (hasMappings) {
      setChangeConfirmOpen(true);
    } else {
      execCloneAndUse(fw);
    }
  };

  const execCloneAndUse = async (fw) => {
    const target = fw ?? pendingTarget;
    if (!target || !organizationId || !selectedPeriodId) return;
    setChangingFw(true);
    setChangeConfirmOpen(false);
    try {
      const autoName = `${target.name} — Copy`;
      const { id: clonedId } = await cloneFramework(target.id, autoName, organizationId);
      await assignFrameworkToPeriod(selectedPeriodId, clonedId);
      toast.success("Framework changed");
      setPendingTarget(null);
      onFrameworksChange?.();
      handleClose();
    } catch (e) {
      toast.error(e?.message || "Failed to change framework");
    } finally {
      setChangingFw(false);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim() || !organizationId) return;
    setCreating(true);
    try {
      const created = await createFramework({
        organization_id: organizationId,
        name: createName.trim(),
        description: createDesc.trim() || null,
      });
      if (selectedPeriodId && created?.id) {
        await assignFrameworkToPeriod(selectedPeriodId, created.id);
      }
      toast.success("Framework created");
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
      onFrameworksChange?.();
      handleClose();
    } catch (e) {
      toast.error(e?.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLibraryFw = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFramework(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      if (selectedFwId === deleteTarget.id) setSelectedFwId(null);
      onFrameworksChange?.();
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("periods_framework_id_fkey") || (msg.includes("foreign key") && msg.includes("periods"))) {
        toast.error("This framework is still assigned to one or more evaluation periods. Unassign it from all periods before deleting.");
      } else {
        toast.error(msg || "Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setCloneOpen(false);
    setCloneName("");
    setRenameOpen(false);
    setRenameName("");
    setRemoveConfirmOpen(false);
    setChangeConfirmOpen(false);
    setPendingTarget(null);
    setCreateOpen(false);
    setCreateName("");
    setCreateDesc("");
    setPickerOpen(false);
    setSelectedFwId(null);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} id="fw-picker-drawer">
        {/* Header */}
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="fs-icon accent">
                <BadgeCheck size={17} strokeWidth={2} />
              </div>
              <div>
                <div className="fs-title">Programme Framework</div>
                <div className="fs-subtitle">Manage, clone, or switch accreditation frameworks</div>
              </div>
            </div>
            <button className="fs-close" onClick={handleClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="fs-drawer-body">

          {/* ── Section 1: Active Framework ── */}
          {frameworkId && (
            <div className="fpd-section">
              <div className="fpd-section-label">Active Framework</div>

              {removeConfirmOpen ? (
                <div className="fs-confirm-panel">
                  <p className="fs-confirm-msg">
                    This will unassign <strong>{frameworkName}</strong> from this period. All outcome mappings will be cleared. This cannot be undone.
                  </p>
                  <div className="fs-confirm-btns">
                    <button className="fs-confirm-cancel" onClick={() => setRemoveConfirmOpen(false)} disabled={removing}>Cancel</button>
                    <button className="fs-confirm-action" onClick={handleRemove} disabled={removing}>
                      <Trash2 size={13} strokeWidth={2.2} />
                      <AsyncButtonContent loading={removing}>Remove</AsyncButtonContent>
                    </button>
                  </div>
                </div>
              ) : (
              <div className="fpd-active-card">
                <div className="fpd-active-card-top">
                  <div className="fpd-active-name">
                    <BadgeCheck size={14} strokeWidth={1.75} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    {frameworkName}
                  </div>
                  <span className="fpd-active-badge">Active</span>
                </div>
                <div className="fpd-meta-pills">
                  <span className="fpd-meta-pill">{outcomeCount} outcomes</span>
                  <span className="fpd-meta-pill direct">{directCount} direct</span>
                  <span className="fpd-meta-pill indirect">{indirectCount} indirect</span>
                  {unmappedCount > 0 && (
                    <span className="fpd-meta-pill unmapped">{unmappedCount} unmapped</span>
                  )}
                </div>
                <div className="fpd-active-actions">
                  <button
                    className="fpd-action-btn"
                    onClick={() => {
                      setCloneOpen(false);
                      setRenameOpen(true);
                      setRenameName(frameworkName);
                    }}
                  >
                    <Pencil size={13} strokeWidth={2} /> Rename
                  </button>
                  <button
                    className="fpd-action-btn"
                    onClick={() => {
                      setRenameOpen(false);
                      setCloneOpen(true);
                      setCloneName("");
                    }}
                  >
                    <Copy size={13} strokeWidth={2} /> Clone as new…
                  </button>
                  <button
                    className="fpd-action-btn danger"
                    onClick={() => setRemoveConfirmOpen(true)}
                  >
                    <Trash2 size={13} strokeWidth={2} /> Remove
                  </button>
                </div>

                {/* Rename inline form */}
                {renameOpen && (
                  <div className="fpd-inline-form">
                    <div className="fpd-field-label">Framework name <span style={{color:"var(--danger)"}}>*</span></div>
                    <input
                      className="fs-input"
                      placeholder="Framework name"
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      autoFocus
                      disabled={renaming}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        className="fs-btn fs-btn-secondary"
                        onClick={() => setRenameOpen(false)}
                        disabled={renaming}
                      >
                        Cancel
                      </button>
                      <button
                        className="fs-btn fs-btn-primary"
                        onClick={handleRename}
                        disabled={!renameName.trim() || renaming}
                      >
                        <AsyncButtonContent loading={renaming}>Save</AsyncButtonContent>
                      </button>
                    </div>
                  </div>
                )}

                {/* Clone as new inline form */}
                {cloneOpen && (
                  <div className="fpd-inline-form">
                    <div className="fpd-field-label">New framework name <span style={{color:"var(--danger)"}}>*</span></div>
                    <input
                      className={["fs-input", isDupeName(cloneName) ? "error" : ""].filter(Boolean).join(" ")}
                      placeholder={`${frameworkName} — Copy`}
                      value={cloneName}
                      onChange={(e) => setCloneName(e.target.value)}
                      autoFocus
                      disabled={cloning}
                    />
                    {isDupeName(cloneName) && (
                      <InlineError>A framework with this name already exists</InlineError>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        className="fs-btn fs-btn-secondary"
                        onClick={() => setCloneOpen(false)}
                        disabled={cloning}
                      >
                        Cancel
                      </button>
                      <button
                        className="fs-btn fs-btn-primary"
                        onClick={handleCloneAsNew}
                        disabled={!cloneName.trim() || isDupeName(cloneName) || cloning}
                      >
                        <AsyncButtonContent loading={cloning}>Clone</AsyncButtonContent>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* ── Section 2: Clone from existing (Previous Periods + Starter Templates) ── */}
          {(orgFrameworks.length > 0 || platformFrameworks.length > 0) && (
            <div className="fpd-section">
              <div className="fpd-section-label">Clone from Existing</div>

              {changeConfirmOpen ? (
                <div className="fs-confirm-panel">
                  <p className="fs-confirm-msg">
                    All outcome mappings for this period will be deleted. Are you sure you want to continue?
                  </p>
                  <div className="fs-confirm-btns">
                    <button
                      className="fs-confirm-cancel"
                      onClick={() => { setChangeConfirmOpen(false); setPendingTarget(null); }}
                      disabled={changingFw}
                    >
                      Cancel
                    </button>
                    <button
                      className="fs-confirm-action"
                      onClick={() => execCloneAndUse()}
                      disabled={changingFw}
                    >
                      <AsyncButtonContent loading={changingFw}>Change</AsyncButtonContent>
                    </button>
                  </div>
                </div>
              ) : deleteTarget ? (
                <div className="fs-confirm-panel">
                  <p className="fs-confirm-msg">
                    <strong>"{deleteTarget.name}"</strong> will be permanently deleted from the library. This cannot be undone.
                  </p>
                  <div className="fs-confirm-btns">
                    <button className="fs-confirm-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
                    <button className="fs-confirm-action" onClick={handleDeleteLibraryFw} disabled={deleting}>
                      <Trash2 size={13} strokeWidth={2.2} />
                      <AsyncButtonContent loading={deleting}>Delete</AsyncButtonContent>
                    </button>
                  </div>
                </div>
              ) : (
              <div className="fpd-picker-row">
                {/* Custom dropdown */}
                <div className="fpd-picker-select-wrap">
                  <button
                    className={["fpd-picker-trigger", pickerOpen ? "open" : ""].filter(Boolean).join(" ")}
                    onClick={() => setPickerOpen((v) => !v)}
                    disabled={changingFw}
                  >
                    <span className={selectedFwId ? "fpd-picker-trigger-label" : "fpd-picker-trigger-label placeholder"}>
                      {selectedFwId
                        ? [...orgFrameworks, ...platformFrameworks].find((f) => f.id === selectedFwId)?.name
                        : "Select a framework…"}
                    </span>
                    <ChevronDown size={14} strokeWidth={2} />
                  </button>

                  {pickerOpen && (
                    <div className="fpd-picker-dropdown">
                      {orgFrameworks.length > 0 && (
                        <>
                          <div className="fpd-picker-group-label">Previous Periods</div>
                          {orgFrameworks.map((fw) => (
                            <div
                              key={fw.id}
                              className={["fpd-picker-option", selectedFwId === fw.id ? "selected" : ""].filter(Boolean).join(" ")}
                              onClick={() => { setSelectedFwId(fw.id); setPickerOpen(false); }}
                            >
                              <span className="fpd-picker-option-name">{fw.name}</span>
                              <button
                                className="fpd-picker-delete-btn"
                                onClick={(e) => { e.stopPropagation(); setPickerOpen(false); setDeleteTarget(fw); }}
                                aria-label={`Delete ${fw.name}`}
                              >
                                <Trash2 size={12} strokeWidth={2} />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                      {platformFrameworks.length > 0 && (
                        <>
                          <div className="fpd-picker-group-label">Starter Templates</div>
                          {platformFrameworks.map((fw) => (
                            <div
                              key={fw.id}
                              className={["fpd-picker-option", selectedFwId === fw.id ? "selected" : ""].filter(Boolean).join(" ")}
                              onClick={() => { setSelectedFwId(fw.id); setPickerOpen(false); }}
                            >
                              <span className="fpd-picker-option-name">
                                {fw.name}
                                {fw.description && (
                                  <span className="fpd-picker-option-desc">{fw.description}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className="fpd-clone-use-btn"
                  onClick={() => {
                    const fw = [...orgFrameworks, ...platformFrameworks].find((f) => f.id === selectedFwId);
                    if (fw) handleCloneAndUse(fw);
                  }}
                  disabled={!selectedFwId || changingFw}
                >
                  <AsyncButtonContent loading={changingFw}>
                    Clone &amp; Use
                  </AsyncButtonContent>
                </button>
              </div>
              )}
            </div>
          )}

          {/* ── Create blank ── */}
          <div className="fpd-section">
            <div className="fpd-section-label">Create from Scratch</div>
            {!createOpen ? (
              <button className="fpd-create-blank-btn" onClick={() => setCreateOpen(true)}>
                <PlusCircle size={14} strokeWidth={2} />
                Create blank framework
              </button>
            ) : (
              <div className="fpd-inline-form">
                <div className="fpd-field-label">Framework name <span style={{color:"var(--danger)"}}>*</span></div>
                <input
                  className="fs-input"
                  placeholder="e. g., ABET, Custom"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  autoFocus
                  disabled={creating}
                />
                <div className="fpd-field-label" style={{ marginTop: 10 }}>Description <span style={{fontWeight:500,color:"var(--text-quaternary)"}}>(optional)</span></div>
                <textarea
                  className="fs-input"
                  placeholder="Short description of this framework…"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={2}
                  disabled={creating}
                  style={{ marginTop: 4, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    className="fs-btn fs-btn-secondary"
                    onClick={() => {
                      setCreateOpen(false);
                      setCreateName("");
                      setCreateDesc("");
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    className="fs-btn fs-btn-primary"
                    onClick={handleCreate}
                    disabled={!createName.trim() || creating}
                  >
                    <AsyncButtonContent loading={creating}>Create &amp; Use</AsyncButtonContent>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="fs-drawer-footer">
          <span className="fpd-footer-disclaimer">
            <AlertCircle size={12} strokeWidth={2} />
            Switching framework clears current mappings
          </span>
          <button className="fs-btn fs-btn-secondary" onClick={handleClose}>
            Close
          </button>
        </div>
      </Drawer>
  );
}
