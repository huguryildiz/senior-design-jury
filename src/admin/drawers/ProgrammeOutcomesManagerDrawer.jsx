// src/admin/drawers/ProgrammeOutcomesManagerDrawer.jsx
// Drawer: view and manage all outcomes for the active accreditation framework.
// Lists outcomes with edit/delete actions; "Add Outcome" opens AddOutcomeDrawer.
//
// Props:
//   open            — boolean
//   onClose         — () => void
//   frameworkName   — string
//   periodName      — string
//   outcomes        — [{ id, code, shortLabel, description, criterionIds }]
//   onAddOutcome    — () => void — opens AddOutcomeDrawer
//   onEditOutcome   — (outcome) => void — opens OutcomeDetailDrawer
//   onDeleteOutcome — (outcome) => void
//   onSave          — () => Promise<void>

import { useState } from "react";
import { Info, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function ProgrammeOutcomesManagerDrawer({
  open,
  onClose,
  frameworkName = "",
  periodName = "",
  outcomes = [],
  onAddOutcome,
  onEditOutcome,
  onDeleteOutcome,
  onSave,
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon muted">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Programme Outcomes</div>
              <div className="fs-subtitle">Define and manage outcomes for the active accreditation framework.</div>
              {(frameworkName || periodName) && (
                <div className="fw-drawer-header-ctx">
                  {frameworkName && (
                    <span className="fw-drawer-tag">
                      <Icon
                        iconNode={[]}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                      </Icon>
                      {frameworkName}
                    </span>
                  )}
                  {periodName && (
                    <span className="fw-drawer-period">
                      <Icon
                        iconNode={[]}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </Icon>
                      {periodName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></Icon>
          </button>
        </div>
      </div>
      <div className="fs-drawer-body">
        <div className="fs-alert info" style={{ marginBottom: 14 }}>
          <div className="fs-alert-icon"><Info size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">Shared outcome template</div>
            <div className="fs-alert-desc">
              These outcomes belong to the selected accreditation framework and are available for mapping across all criteria in this evaluation period. Hover any row to edit or delete.
            </div>
          </div>
        </div>

        <div className="acc-outcomes-list">
          {outcomes.length === 0 && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
              No outcomes defined yet. Click "Add Outcome" to get started.
            </div>
          )}
          {outcomes.map((o) => (
            <div key={o.id} className="acc-outcome-row">
              <span className="acc-outcome-code">{o.code}</span>
              <span className="acc-outcome-label">{o.shortLabel}</span>
              <div className="acc-outcome-actions">
                <button
                  className="acc-outcome-action-btn"
                  type="button"
                  title="Edit"
                  onClick={() => onEditOutcome?.(o)}
                >
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
                </button>
                <button
                  className="acc-outcome-action-btn danger"
                  type="button"
                  title="Delete"
                  onClick={() => onDeleteOutcome?.(o)}
                >
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></Icon>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, padding: "8px 0", borderTop: "1px dashed var(--border)" }}>
          <span style={{ flex: 1 }} />
          <button className="fs-list-add" type="button" onClick={onAddOutcome}>
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></Icon>
            Add Outcome
          </button>
        </div>
      </div>
      <div className="fs-drawer-footer">
        <div className="fs-footer-meta">
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>
          <span>{outcomes.length} outcome{outcomes.length !== 1 ? "s" : ""} defined</span>
        </div>
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Save Outcomes</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
