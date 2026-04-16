// src/admin/modals/SetCurrentPeriodModal.jsx
// Modal: confirm switching the active evaluation period.
// Uses the same visual structure as RevertToDraftModal with typed confirmation.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   period    — { id, name }
//   onConfirm — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, Play } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function SetCurrentPeriodModal({ open, onClose, period, onConfirm }) {
  const [settingCurrent, setSettingCurrent] = useState(false);
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
    setSettingCurrent(true);
    try {
      await onConfirm?.();
      setConfirmName("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not set the current period. Try again.");
    } finally {
      setSettingCurrent(false);
    }
  };

  const canConfirm = confirmName === period?.name;

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <Play size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Set as Current Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will become the active period and jurors will continue scoring in this period.
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
            disabled={settingCurrent}
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
          disabled={settingCurrent}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleConfirm}
          disabled={settingCurrent || !canConfirm}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={settingCurrent} loadingText="Setting…">
            Set as Current
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
