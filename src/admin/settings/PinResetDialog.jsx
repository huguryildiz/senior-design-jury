// src/admin/settings/PinResetDialog.jsx
import { KeyRoundIcon, TriangleAlertIcon } from "../../shared/Icons";

export default function PinResetDialog({
  pinResetTarget,
  resetPinInfo,
  pinResetLoading,
  pinCopied,
  viewSemesterLabel,
  onCopyPin,
  onClose,
  onConfirmReset,
}) {
  if (!pinResetTarget) return null;

  return (
    <div className="manage-modal" role="dialog" aria-modal="true">
      <div className="manage-modal-card manage-modal-card--danger manage-modal-card--pin-flow">
        <div className="delete-dialog__header">
          <span className="delete-dialog__icon delete-dialog__icon--pin-reset" aria-hidden="true"><KeyRoundIcon /></span>
          <div className="delete-dialog__title">
            {resetPinInfo?.pin_plain_once ? "New Juror PIN" : "Reset Juror PIN"}
          </div>
        </div>
        <div className="delete-dialog__body delete-dialog__body--pin-flow">
          {resetPinInfo?.pin_plain_once ? (
            <div className="pin-reset-step pin-reset-step--result">
              <div className="delete-dialog__line pin-reset-detail-line">
                <span className="pin-reset-detail-label">Juror:</span>
                <span className="pin-reset-target-highlight">
                  {pinResetTarget?.juror_name || pinResetTarget?.juryName || "this juror"}
                </span>
              </div>
              <div className="delete-dialog__line">New PIN generated. Share it securely with the juror.</div>
              <div className="pin-code">
                {String(resetPinInfo.pin_plain_once || "").padStart(4, "0").slice(0, 4)}
              </div>
            </div>
          ) : (
            <div className="pin-reset-step pin-reset-step--confirm">
              <div className="pin-reset-copy">
                <div className="delete-dialog__line">
                  <span className="pin-reset-target-prefix">Generate a new PIN?</span>
                </div>
                <div className="delete-dialog__line pin-reset-detail-line">
                  <span className="pin-reset-detail-label">Juror:</span>
                  <span className="pin-reset-target-highlight">
                    {pinResetTarget.juror_name || pinResetTarget.juryName || "this juror"}
                  </span>
                  {(pinResetTarget.juror_inst || pinResetTarget.juryDept)
                    ? (
                      <span className="pin-reset-target-highlight pin-reset-target-highlight--inst">
                        {" ("}
                        {pinResetTarget.juror_inst || pinResetTarget.juryDept}
                        {")"}
                      </span>
                    )
                    : ""}
                </div>
                <div className="delete-dialog__line pin-reset-detail-line">
                  <span className="pin-reset-detail-label">Semester:</span>
                  <span className="pin-reset-target-highlight pin-reset-target-highlight--semester">
                    {viewSemesterLabel}
                  </span>
                </div>
              </div>
              <div className="manage-delete-warning manage-delete-warning--caution">
                <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertIcon /></span>
                <span className="manage-delete-warning-text">The previous PIN will stop working immediately.</span>
              </div>
            </div>
          )}
        </div>
        <div className="manage-modal-actions manage-modal-actions--pin-flow">
          {resetPinInfo?.pin_plain_once ? (
            <>
              <button
                className="manage-btn primary"
                type="button"
                onClick={onCopyPin}
              >
                {pinCopied ? "Copied!" : "Copy PIN"}
              </button>
              <button
                className="manage-btn"
                type="button"
                onClick={onClose}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                className="manage-btn manage-btn--delete-cancel"
                type="button"
                disabled={pinResetLoading}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="manage-btn manage-btn--delete-confirm"
                type="button"
                disabled={pinResetLoading}
                onClick={onConfirmReset}
              >
                {pinResetLoading ? "Resetting…" : "Reset PIN"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
