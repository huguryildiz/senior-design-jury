// src/admin/modals/FrameworkPickerModal.jsx
// Modal: pick a framework to clone from.
// Groups org's own frameworks above platform templates (organization_id IS NULL).
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   frameworks — array from listFrameworks (includes both org + global rows)
//   onSelect   — (framework: { id, name, organization_id }) => void

import { useState, useEffect } from "react";
import { BadgeCheck } from "lucide-react";
import Modal from "@/shared/ui/Modal";

export default function FrameworkPickerModal({ open, onClose, frameworks = [], onSelect }) {
  const [selected, setSelected] = useState(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const orgFrameworks = frameworks.filter((f) => f.organization_id !== null);
  const globalTemplates = frameworks.filter((f) => f.organization_id === null);

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  const itemStyle = (isSelected) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
    background: isSelected ? "rgba(var(--accent-rgb), 0.06)" : "var(--bg-card)",
    color: isSelected ? "var(--accent)" : "var(--text-primary)",
    textAlign: "left",
    transition: "border-color 0.15s, background 0.15s",
  });

  const sectionLabelStyle = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "var(--text-tertiary)",
    padding: "10px 2px 4px",
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="fs-modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <div className="fs-icon accent" aria-hidden="true">
            <BadgeCheck size={18} strokeWidth={1.75} />
          </div>
          <div>
            <div className="fs-title">Start from an existing framework</div>
            <div className="fs-subtitle">Select a framework to clone into this period.</div>
          </div>
        </div>
      </div>
      <div className="fs-modal-body" style={{ maxHeight: 360, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

          {/* Platform template cards — shown first */}
          {globalTemplates.length > 0 && (
            <>
              <div style={sectionLabelStyle}>Platform Templates</div>
              <div className="fw-template-cards">
                {globalTemplates.map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    className={["fw-template-card", selected?.id === fw.id ? "selected" : ""].filter(Boolean).join(" ")}
                    onClick={() => setSelected(fw)}
                  >
                    <div className="fw-template-card-icon">
                      <BadgeCheck size={20} strokeWidth={1.75} />
                    </div>
                    <div className="fw-template-card-body">
                      <div className="fw-template-card-name">{fw.name}</div>
                      {fw.description && (
                        <div className="fw-template-card-desc">{fw.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Org frameworks — plain list */}
          {orgFrameworks.length > 0 && (
            <>
              <div style={{ ...sectionLabelStyle, paddingTop: globalTemplates.length > 0 ? 14 : 10 }}>Previous Periods</div>
              {orgFrameworks.map((fw) => (
                <button
                  key={fw.id}
                  type="button"
                  style={itemStyle(selected?.id === fw.id)}
                  onClick={() => setSelected(fw)}
                >
                  <BadgeCheck size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: selected?.id === fw.id ? "var(--accent)" : "var(--text-secondary)" }} />
                  {fw.name}
                </button>
              ))}
            </>
          )}

          {orgFrameworks.length === 0 && globalTemplates.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "24px 0", textAlign: "center" }}>
              No frameworks available.
            </div>
          )}

        </div>
      </div>
      <div className="fs-modal-footer">
        <button className="fs-btn fs-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="fs-btn fs-btn-primary"
          onClick={handleConfirm}
          disabled={!selected}
        >
          Clone &amp; Use
        </button>
      </div>
    </Modal>
  );
}
