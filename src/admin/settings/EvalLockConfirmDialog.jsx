// src/admin/settings/EvalLockConfirmDialog.jsx
import { LockIcon } from "../../shared/Icons";

export default function EvalLockConfirmDialog({
  evalLockConfirmOpen,
  evalLockConfirmNext,
  evalLockConfirmLoading,
  viewSemesterLabel,
  onCancel,
  onConfirm,
}) {
  if (!evalLockConfirmOpen) return null;

  return (
    <div className="manage-modal" role="dialog" aria-modal="true">
      <div className="manage-modal-card manage-modal-card--danger manage-modal-card--pin-flow manage-modal-card--lock-flow">
        <div className="delete-dialog__header">
          <span className="delete-dialog__icon delete-dialog__icon--lock" aria-hidden="true"><LockIcon /></span>
          <div className="delete-dialog__title">
            {evalLockConfirmNext ? "Lock" : "Unlock"}
          </div>
        </div>
        <div className="delete-dialog__body">
          <div className="delete-dialog__line">
            {evalLockConfirmNext
              ? (
                <>
                  Jurors can no longer edit or submit scores for{" "}
                  {viewSemesterLabel && viewSemesterLabel !== "—" ? (
                    <>
                      <span className="delete-dialog__semester-alert">{viewSemesterLabel}</span>{" "}
                      <span>semester</span>
                    </>
                  ) : (
                    <span>the selected semester</span>
                  )}
                  .
                </>
              )
              : (
                <>
                  Jurors can edit and resubmit scores for{" "}
                  {viewSemesterLabel && viewSemesterLabel !== "—" ? (
                    <>
                      <span className="delete-dialog__semester-alert">{viewSemesterLabel}</span>{" "}
                      <span>semester</span>
                    </>
                  ) : (
                    <span>the selected semester</span>
                  )}
                  .
                </>
              )}
          </div>
        </div>
        <div className="manage-modal-actions">
          <button
            className="manage-btn"
            type="button"
            disabled={evalLockConfirmLoading}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="manage-btn primary"
            type="button"
            disabled={evalLockConfirmLoading}
            onClick={onConfirm}
          >
            {evalLockConfirmLoading
              ? (evalLockConfirmNext ? "Locking…" : "Unlocking…")
              : (evalLockConfirmNext ? "Lock" : "Unlock")}
          </button>
        </div>
      </div>
    </div>
  );
}
