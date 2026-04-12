// src/admin/modals/RevokeTokenModal.jsx
// Modal: confirm revoking the active entry token.
// Centered warning layout. Shows active juror count.
//
// Props:
//   open        — boolean
//   onClose     — () => void
//   activeCount — number (jurors currently scoring)
//   onRevoke    — () => Promise<void>

import { useState } from "react";
import { AlertTriangle, Icon } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function RevokeTokenModal({ open, onClose, activeCount = 0, onRevoke }) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await onRevoke?.();
      onClose();
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon warning">
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </Icon>
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Revoke Entry Token?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          The QR code and token link will stop working immediately.
        </div>
      </div>
      <div className="fs-modal-body" style={{ paddingTop: 4 }}>
        {activeCount > 0 && (
          <div className="fs-alert warning" style={{ margin: 0, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertTriangle size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">
                {activeCount} juror{activeCount !== 1 ? "s are" : " is"} currently scoring
              </div>
              <div className="fs-alert-desc">Their active sessions will end. Unsaved scores will be lost.</div>
            </div>
          </div>
        )}
      </div>
      <div
        className="fs-modal-footer"
        style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}
      >
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={onClose}
          disabled={revoking}
          style={{ flex: 1 }}
        >
          Keep Token
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleRevoke}
          disabled={revoking}
          style={{ flex: 1 }}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={revoking} loadingText="Revoking…">Revoke & Regenerate</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Modal>
  );
}
