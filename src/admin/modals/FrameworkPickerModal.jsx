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
import { Layers } from "lucide-react";
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
    gap: 8,
    width: "100%",
    padding: "9px 12px",
    borderRadius: "var(--radius)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
    background: isSelected ? "rgba(var(--accent-rgb), 0.06)" : "var(--surface-1)",
    color: isSelected ? "var(--accent)" : "var(--text-primary)",
    textAlign: "left",
    transition: "border-color 0.15s, background 0.15s",
  });

  const sectionLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-tertiary)",
    padding: "8px 0 4px",
  };

  return (
    <Modal open={open} onClose={onClose} title="Start from an existing framework">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
        {orgFrameworks.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Previous Periods</div>
            {orgFrameworks.map((fw) => (
              <button
                key={fw.id}
                style={itemStyle(selected?.id === fw.id)}
                onClick={() => setSelected(fw)}
              >
                <Layers size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
                {fw.name}
              </button>
            ))}
          </>
        )}
        {globalTemplates.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Platform Templates</div>
            {globalTemplates.map((fw) => (
              <button
                key={fw.id}
                style={itemStyle(selected?.id === fw.id)}
                onClick={() => setSelected(fw)}
              >
                <Layers size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
                {fw.name}
              </button>
            ))}
          </>
        )}
        {orgFrameworks.length === 0 && globalTemplates.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "16px 0", textAlign: "center" }}>
            No frameworks available.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
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
