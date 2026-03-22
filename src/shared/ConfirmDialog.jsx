// src/shared/ConfirmDialog.jsx
// ============================================================
// General-purpose in-app confirmation dialog.
//
// Follows the same visual language as DeleteConfirmDialog —
// modal overlay, rounded card, icon header, warning callout,
// and branded buttons.
//
// Use this instead of window.confirm() for any product UI flow.
// See CLAUDE.md "UI/UX Conventions" for the project rule.
//
// Props:
//   open         — boolean, whether the dialog is visible
//   onOpenChange — (open: boolean) => void, close callback
//   title        — dialog heading string
//   body         — main message string or ReactNode
//   warning      — optional caution callout text (string)
//   confirmLabel — confirm button label (default: "Confirm")
//   cancelLabel  — cancel button label (default: "Cancel")
//   onConfirm    — () => void, called when the user confirms
// ============================================================

import { useRef } from "react";
import { TriangleAlertLucideIcon } from "./Icons";
import { useFocusTrap } from "./useFocusTrap";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  body,
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
}) {
  const containerRef = useRef(null);

  const handleClose = () => onOpenChange?.(false);

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  useFocusTrap({ containerRef, isOpen: open, onClose: handleClose });

  if (!open) return null;

  return (
    <div className="manage-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="manage-modal-card manage-modal-card--delete" ref={containerRef}>
        <div className="delete-dialog__header">
          <span className="delete-dialog__icon" aria-hidden="true">
            <TriangleAlertLucideIcon />
          </span>
          <div className="delete-dialog__title" id="confirm-dialog-title">{title}</div>
        </div>

        <div className="delete-dialog__body">
          {body && (
            <div className="delete-dialog__line">{body}</div>
          )}
          {warning && (
            <div className="manage-delete-warning manage-delete-warning--caution">
              <span className="manage-delete-warning-icon" aria-hidden="true">
                <TriangleAlertLucideIcon />
              </span>
              <div className="manage-delete-warning-text">{warning}</div>
            </div>
          )}
        </div>

        <div className="delete-dialog__actions">
          <button
            className="manage-btn manage-btn--delete-cancel"
            type="button"
            onClick={handleClose}
          >
            {cancelLabel}
          </button>
          <button
            className="manage-btn manage-btn--delete-confirm"
            type="button"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
