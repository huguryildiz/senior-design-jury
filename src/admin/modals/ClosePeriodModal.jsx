// src/admin/modals/ClosePeriodModal.jsx
// Modal: confirm closing a Live period. Closing is a terminal action that
// signals the scoring window is over — jurors can no longer submit new
// scores and QR codes become inert. Reverting a closed period requires
// super admin approval via the existing unlock-request flow.
//
// Props:
//   open    — boolean
//   onClose — () => void
//   period  — { id, name }
//   onCloseAction — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, Archive } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import FbAlert from "@/shared/ui/FbAlert";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function ClosePeriodModal({ open, onClose, period, onCloseAction }) {
  const [closing, setClosing] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirmName("");
    setError("");
  }, [open]);

  const handleClose = () => {
    setConfirmName("");
    setError("");
    onClose();
  };

  const handleConfirm = async () => {
    setError("");
    setClosing(true);
    try {
      await onCloseAction?.();
      setConfirmName("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not close the period. Try again.");
    } finally {
      setClosing(false);
    }
  };

  const canConfirm = confirmName === period?.name;

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon warning">
          <Archive size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Close Evaluation Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will be closed. No new scores will be accepted, active QR tokens become
          inert, and rankings are archived. Reverting requires super admin approval.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        <FbAlert variant="danger" title="This action cannot be undone" style={{ marginBottom: 12 }}>
          Reopening a closed period requires super admin approval. All QR tokens become inert immediately.
        </FbAlert>

        {error && (
          <div className="fs-alert danger" style={{ marginBottom: 12, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{error}</div>
          </div>
        )}
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            Type <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong> to confirm
          </label>
          <input
            className="fs-typed-input"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={period?.name ? `Type ${period.name} to confirm` : "Type the period name to confirm"}
            autoComplete="off"
            spellCheck={false}
            disabled={closing}
          />
        </div>
      </div>

      <div
        className="fs-modal-footer"
        style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}
      >
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={handleClose}
          disabled={closing}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleConfirm}
          disabled={closing || !canConfirm}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={closing} loadingText="Closing…">
            Close Period
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
