// src/admin/drawers/PeriodCriteriaDrawer.jsx

import { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Pencil,
  Trash2,
  LayoutTemplate,
  PlusCircle,
  Copy,
  X,
} from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import CustomSelect from "@/shared/ui/CustomSelect";
import { STARTER_CRITERIA } from "./StarterCriteriaDrawer";
import { CRITERION_COLORS } from "@/admin/criteria/criteriaFormHelpers";

export default function PeriodCriteriaDrawer({
  open,
  onClose,
  period,
  criteria = [],
  isLocked = false,
  otherPeriods = [],
  onApplyTemplate,
  onCopyFromPeriod,
  onEditCriteria,
  onClearCriteria,
  onRenamePeriod,
  onClonePeriod,
  onDeletePeriod,
}) {
  const [copyPeriodId, setCopyPeriodId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState(false);

  const total = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
  const isBalanced = criteria.length > 0 && total === 100;
  const hasExisting = criteria.length > 0;

  const MAX_VISIBLE = 5;
  const visibleCriteria = criteria.slice(0, MAX_VISIBLE);
  const overflow = criteria.length - MAX_VISIBLE;

  const periodOptions = otherPeriods
    .filter((p) => p.id)
    .map((p) => ({ value: p.id, label: p.name }));

  function handleApplyTemplate() {
    if (hasExisting) {
      setConfirmTemplate(true);
    } else {
      onApplyTemplate(STARTER_CRITERIA);
      onClose();
    }
  }

  function handleConfirmTemplate() {
    setConfirmTemplate(false);
    onApplyTemplate(STARTER_CRITERIA);
    onClose();
  }

  function handleStartBlank() {
    if (hasExisting) {
      setConfirmClear(true);
    } else {
      onClearCriteria();
      onEditCriteria();
    }
  }

  function handleConfirmClear() {
    setConfirmClear(false);
    onClearCriteria();
    onClose();
  }

  function handleCopy() {
    if (!copyPeriodId) return;
    onCopyFromPeriod(copyPeriodId);
    setCopyPeriodId("");
    onClose();
  }

  function handleClose() {
    setConfirmClear(false);
    setConfirmTemplate(false);
    onClose();
  }

  return (
    <Drawer open={open} onClose={handleClose}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="fs-icon accent">
              <ClipboardList size={17} strokeWidth={1.75} />
            </div>
            <div>
              <div className="fs-title">{period?.name ?? "Period"} — Criteria</div>
              <div className="fs-subtitle">Manage criteria, weights, and rubric bands for this period</div>
            </div>
          </div>
          <button className="fs-close" onClick={handleClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="fs-drawer-body">

        {/* ── ACTIVE CRITERIA ── */}
        <div className="pcd-section">
          <div className="pcd-section-label">Active Criteria</div>
          <div className="pcd-active-card">
            {/* Stat pills */}
            <div className="pcd-stat-pills">
              <span className="pcd-pill pcd-pill--neutral">
                <ClipboardList size={10} strokeWidth={2} />
                {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"}
              </span>
              {criteria.length > 0 && (
                isBalanced ? (
                  <span className="pcd-pill pcd-pill--success">
                    <CheckCircle2 size={10} strokeWidth={2} />
                    {total} pts · balanced
                  </span>
                ) : (
                  <span className="pcd-pill pcd-pill--warning">
                    <AlertTriangle size={10} strokeWidth={2} />
                    {total} / 100 pts
                  </span>
                )
              )}
              {isLocked && (
                <span className="pcd-pill pcd-pill--locked">
                  <Lock size={10} strokeWidth={2.2} />
                  Scores exist · locked
                </span>
              )}
            </div>

            {/* Criteria mini-list */}
            {criteria.length === 0 ? (
              <div className="pcd-empty">No criteria defined for this period</div>
            ) : (
              <div className="pcd-criteria-list">
                {visibleCriteria.map((c, i) => (
                  <div key={c.key || i} className="pcd-criterion-row">
                    <span
                      className="pcd-dot"
                      style={{ background: c.color || CRITERION_COLORS[i % CRITERION_COLORS.length] }}
                    />
                    <span className="pcd-crit-label">
                      {c.label || c.shortLabel || `Criterion ${i + 1}`}
                    </span>
                    <span className="pcd-crit-weight">
                      {c.max != null ? `${c.max} pts` : "—"}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="pcd-overflow">+{overflow} more</div>
                )}
              </div>
            )}

            {/* Card action buttons */}
            <div className="pcd-card-actions">
              <button className="pcd-action-btn" onClick={() => { onEditCriteria(); onClose(); }}>
                <Pencil size={12} strokeWidth={2} /> Edit Criteria
              </button>
              <button
                className="pcd-action-btn pcd-action-btn--danger"
                onClick={() => setConfirmClear(true)}
                disabled={criteria.length === 0}
              >
                <Trash2 size={12} strokeWidth={2} /> Clear
              </button>
            </div>

            {/* Period management buttons */}
            {(onRenamePeriod || onClonePeriod || onDeletePeriod) && !confirmClear && (
              <div className="pcd-card-actions pcd-card-actions--period">
                {onRenamePeriod && (
                  <button className="pcd-action-btn" onClick={() => { onRenamePeriod(period); onClose(); }}>
                    <Pencil size={12} strokeWidth={2} /> Rename
                  </button>
                )}
                {onClonePeriod && (
                  <button className="pcd-action-btn" onClick={() => { onClonePeriod(period); onClose(); }}>
                    <Copy size={12} strokeWidth={2} /> Clone as new…
                  </button>
                )}
                {onDeletePeriod && (
                  <button
                    className="pcd-action-btn pcd-action-btn--danger"
                    onClick={() => { onDeletePeriod(period); onClose(); }}
                  >
                    <Trash2 size={12} strokeWidth={2} /> Remove
                  </button>
                )}
              </div>
            )}

            {/* Inline confirm: clear */}
            {confirmClear && (
              <div className="pcd-inline-confirm">
                <div className="pcd-inline-confirm-text">
                  This will remove all {criteria.length} criteria from this period. Continue?
                </div>
                <div className="pcd-inline-confirm-actions">
                  <button className="fs-btn fs-btn-secondary fs-btn-sm" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </button>
                  <button className="fs-btn fs-btn-danger fs-btn-sm" onClick={handleConfirmClear}>
                    <Trash2 size={12} strokeWidth={2} /> Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DEFAULT TEMPLATE ── */}
        <div className="pcd-section">
          <div className="pcd-section-label">Default Template</div>

          {/* Inline confirm: apply template over existing */}
          {confirmTemplate && (
            <div className="pcd-inline-confirm" style={{ marginBottom: 10 }}>
              <div className="pcd-inline-confirm-text">
                This replaces your {criteria.length} existing {criteria.length === 1 ? "criterion" : "criteria"} with the VERA Default template.
              </div>
              <div className="pcd-inline-confirm-actions">
                <button className="fs-btn fs-btn-secondary fs-btn-sm" onClick={() => setConfirmTemplate(false)}>
                  Cancel
                </button>
                <button className="fs-btn fs-btn-danger fs-btn-sm" onClick={handleConfirmTemplate}>
                  <LayoutTemplate size={12} strokeWidth={2} /> Replace
                </button>
              </div>
            </div>
          )}

          <div className="pcd-template-list">
            <button className="pcd-template-row" onClick={handleApplyTemplate} disabled={isLocked}>
              <div className="pcd-template-row-icon">
                <LayoutTemplate size={14} strokeWidth={1.75} />
              </div>
              <div className="pcd-template-row-body">
                <div className="pcd-template-row-name">VERA Default</div>
                <div className="pcd-template-row-desc">
                  {STARTER_CRITERIA.length} criteria · {STARTER_CRITERIA.reduce((s, c) => s + c.max, 0)} pts · with rubric bands
                </div>
              </div>
            </button>
            <button
              className="pcd-template-row pcd-template-row--blank"
              onClick={handleStartBlank}
              disabled={isLocked}
            >
              <div className="pcd-template-row-icon pcd-template-row-icon--blank">
                <PlusCircle size={14} strokeWidth={1.75} />
              </div>
              <div className="pcd-template-row-body">
                <div className="pcd-template-row-name">Create blank criteria</div>
                <div className="pcd-template-row-desc">Define criteria from scratch</div>
              </div>
            </button>
          </div>
        </div>

        {/* ── COPY FROM ANOTHER PERIOD ── */}
        <div className="pcd-section">
          <div className="pcd-section-label">Copy from Another Period</div>
          <div className="pcd-copy-row">
            <CustomSelect
              value={copyPeriodId}
              onChange={setCopyPeriodId}
              options={periodOptions}
              placeholder="Select a period…"
              disabled={periodOptions.length === 0 || isLocked}
              ariaLabel="Select period to copy criteria from"
            />
            <button
              className="fs-btn fs-btn-primary"
              onClick={handleCopy}
              disabled={!copyPeriodId || isLocked}
            >
              <Copy size={13} strokeWidth={2} />
              Copy &amp; Use
            </button>
          </div>
          {periodOptions.length === 0 && (
            <div className="pcd-copy-hint">No other periods with criteria available</div>
          )}
        </div>

      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" onClick={handleClose}>
          Close
        </button>
      </div>
    </Drawer>
  );
}
