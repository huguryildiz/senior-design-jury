// src/admin/modals/RevertToDraftModal.jsx
// Modal: confirm reverting a Published period back to Draft. Used when the
// admin wants to fix structural content (criteria, projects) after publishing
// but before any juror has submitted scores. Typed confirmation required —
// QR tokens are revoked on revert.
//
// Props:
//   open     — boolean
//   onClose  — () => void
//   period   — { id, name }
//   onRevert — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, LockOpen } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function RevertToDraftModal({ open, onClose, period, onRevert }) {
  const [reverting, setReverting] = useState(false);
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

  const handleRevert = async () => {
    setError("");
    setReverting(true);
    try {
      await onRevert?.();
      setConfirmName("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not revert the period. Try again.");
    } finally {
      setReverting(false);
    }
  };

  const canRevert = confirmName === period?.name;

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <LockOpen size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Revert to Draft?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will return to Draft. Structural editing will be re-enabled and any
          active QR tokens will be revoked.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
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
            disabled={reverting}
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
          disabled={reverting}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleRevert}
          disabled={reverting || !canRevert}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={reverting} loadingText="Reverting…">
            Revert to Draft
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
