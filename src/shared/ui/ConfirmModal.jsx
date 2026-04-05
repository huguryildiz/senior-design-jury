// src/shared/ConfirmModal.jsx
// Generic reusable confirmation modal.
// Supports simple confirm, typed confirmation, and danger/warning/info variants.
//
// Props:
//   open              — boolean
//   onClose           — () => void
//   title             — string
//   description       — string | ReactNode
//   variant           — "danger" | "warning" | "info" (default: "danger")
//   confirmLabel      — string (default: "Confirm")
//   cancelLabel       — string (default: "Cancel")
//   typedConfirmation — string | null — if set, user must type this exact string to enable confirm
//   onConfirm         — () => Promise<void> | void
//   children          — ReactNode (rendered inside modal body, below description)

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "./Modal";

const ICONS = {
  danger: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
};

export default function ConfirmModal({
  open,
  onClose,
  title,
  description,
  variant = "danger",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  typedConfirmation,
  onConfirm,
  children,
}) {
  const [typed, setTyped] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setTyped(""); setConfirming(false); setError(""); }
  }, [open]);

  const typedOk = !typedConfirmation || typed === typedConfirmation;
  const canConfirm = typedOk && !confirming;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirming(true);
    setError("");
    try {
      await onConfirm?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setConfirming(false);
    }
  };

  const btnClass = variant === "danger"
    ? "fs-btn fs-btn-danger"
    : variant === "warning"
      ? "fs-btn fs-btn-primary"
      : "fs-btn fs-btn-primary";

  return (
    <Modal open={open} onClose={onClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className={`fs-modal-icon ${variant}`}>{ICONS[variant] ?? ICONS.danger}</div>
        <div className="fs-title" style={{ textAlign: "center" }}>{title}</div>
        {description && (
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>{description}</div>
        )}
      </div>

      <div className="fs-modal-body" style={{ paddingTop: children || typedConfirmation || error ? 4 : 0 }}>
        {error && (
          <div className="fs-alert danger" style={{ marginBottom: 12 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{error}</div>
          </div>
        )}

        {children}

        {typedConfirmation && (
          <div className="fs-typed-field">
            <div className="fs-typed-label">
              Type <strong>{typedConfirmation}</strong> to confirm.
            </div>
            <input
              className="fs-typed-input"
              type="text"
              placeholder={typedConfirmation}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={confirming}
            />
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
          disabled={confirming}
          style={{ flex: 1 }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{ flex: 1 }}
        >
          {confirming ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
