// src/admin/settings/JuryRevokeConfirmDialog.jsx
import { XCircle } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import FbAlert from "@/shared/ui/FbAlert";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function JuryRevokeConfirmDialog({
  open,
  loading,
  activeJurorCount = 0,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal open={open} onClose={() => { if (!loading) onCancel(); }} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <XCircle size={22} strokeWidth={2} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Revoke Jury Access?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          This action will immediately cut off all juror entry.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2, display: "flex", flexDirection: "column", gap: 10 }}>
        <FbAlert variant="danger" title="Immediate effect">
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>New scans of the current QR code will be <strong>blocked immediately</strong>.</li>
            <li>All evaluations will be <strong>locked</strong> — active jurors will no longer be able to submit scores.</li>
          </ul>
        </FbAlert>
        {activeJurorCount > 0 && (
          <FbAlert variant="warning">
            <strong>{activeJurorCount}</strong> juror{activeJurorCount !== 1 ? "s are" : " is"} currently
            active and will be locked from further edits.
          </FbAlert>
        )}
      </div>

      <div className="fs-modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          className="fs-btn fs-btn-secondary"
          type="button"
          disabled={loading}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="fs-btn fs-btn-danger"
          type="button"
          disabled={loading}
          onClick={onConfirm}
        >
          <AsyncButtonContent loading={loading} loadingText="Revoking…">Revoke Access</AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
