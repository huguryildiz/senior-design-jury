// src/admin/settings/JuryRevokeConfirmDialog.jsx
import { useRef } from "react";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap";
import AlertCard from "@/shared/ui/AlertCard";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

import { Icon } from "lucide-react";

export default function JuryRevokeConfirmDialog({
  open,
  loading,
  activeJurorCount = 0,
  onCancel,
  onConfirm,
}) {
  const containerRef = useRef(null);
  useFocusTrap({ containerRef, isOpen: !!open, onClose: onCancel });

  if (!open) return null;

  return (
    <div
      className="vera-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jury-revoke-dialog-title"
    >
      <div className="vera-modal-card vera-modal-card--lg" ref={containerRef}>
        {/* Header */}
        <div className="vera-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--danger-soft)",
                color: "var(--danger)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Icon
                iconNode={[]}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </Icon>
            </span>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}
              id="jury-revoke-dialog-title"
            >
              Revoke Access
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="vera-modal-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            Are you sure you want to revoke jury entry access?
          </p>
          <AlertCard variant="error">
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              <li>New scans of the current QR code will be <strong>blocked immediately</strong>.</li>
              <li>All evaluations will be <strong>locked</strong> — active jurors will no longer be able to submit scores.</li>
            </ul>
          </AlertCard>
          {activeJurorCount > 0 && (
            <AlertCard variant="warning">
              <strong>{activeJurorCount}</strong> juror{activeJurorCount !== 1 ? "s are" : " is"} currently
              active and will be locked from further edits.
            </AlertCard>
          )}
        </div>

        {/* Actions */}
        <div className="vera-modal-actions">
          <button
            className="vera-btn-cancel"
            type="button"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="vera-btn-destructive"
            type="button"
            disabled={loading}
            onClick={onConfirm}
          >
            <span className="btn-loading-content">
              <AsyncButtonContent loading={loading} loadingText="Revoking…">Revoke Access</AsyncButtonContent>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
