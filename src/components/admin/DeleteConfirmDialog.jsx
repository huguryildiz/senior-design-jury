// src/components/admin/DeleteConfirmDialog.jsx

import { useEffect, useRef, useState } from "react";
import { TriangleAlertLucideIcon } from "../../shared/Icons";
import { useFocusTrap } from "../../shared/useFocusTrap";

function buildCountSummary(counts) {
  if (!counts) return null;
  const parts = [];
  if (counts.active_semesters > 0) {
    if ((counts.scores || 0) === 0) {
      parts.push(`${counts.active_semesters} semester${counts.active_semesters !== 1 ? "s" : ""} with no completed evaluations`);
    } else {
      parts.push(`${counts.active_semesters} semester${counts.active_semesters !== 1 ? "s" : ""} with ${counts.scores || 0} completed evaluation${counts.scores !== 1 ? "s" : ""}`);
    }
  } else if (counts.juror_auths > 0) {
    if ((counts.scores || 0) === 0) {
      parts.push(`${counts.juror_auths} semester${counts.juror_auths !== 1 ? "s" : ""} with no completed evaluations`);
    } else {
      parts.push(`${counts.juror_auths} juror assignment${counts.juror_auths !== 1 ? "s" : ""}`);
    }
  }
  if (counts.projects > 0) {
    parts.push(`${counts.projects} group project${counts.projects !== 1 ? "s" : ""}`);
  }
  if (counts.scores > 0 && counts.active_semesters <= 0 && counts.juror_auths <= 0) {
    parts.push(`${counts.scores} completed evaluation${counts.scores !== 1 ? "s" : ""}`);
  }
  if (parts.length === 0) return null;
  const line =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? parts.join(" and ")
        : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `This will also permanently delete: ${line}.`;
}

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  targetType,
  targetLabel,
  targetName,
  targetInst,
  counts,
  onConfirm,
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setLoading(false);
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    onOpenChange?.(false);
  };

  useFocusTrap({ containerRef, isOpen: open, onClose: handleClose });

  if (!open) return null;
  const label = targetLabel || "Selected record";
  const semesterPrefix = "Semester ";
  const jurorPrefix = "Juror ";
  const groupPrefix = "Group ";
  const isSemesterLabel = label.startsWith(semesterPrefix) && label.length > semesterPrefix.length;
  const isJurorLabel = label.startsWith(jurorPrefix) && label.length > jurorPrefix.length;
  const isGroupLabel = label.startsWith(groupPrefix) && label.length > groupPrefix.length;
  const isJurorTarget = targetType === "juror" || isJurorLabel;
  const jurorName = String(targetName || (isJurorLabel ? label.slice(jurorPrefix.length) : "") || "").trim();
  const jurorInst = String(targetInst || "").trim();

  const handleConfirm = async () => {
    const value = password.trim();
    if (!value) {
      setError("Delete password is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm?.(value);
      onOpenChange?.(false);
    } catch (e) {
      setError(e?.message || "Could not delete. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manage-modal" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <div className="manage-modal-card manage-modal-card--delete" ref={containerRef}>
        <div className="delete-dialog__header">
          <span className="delete-dialog__icon" aria-hidden="true"><TriangleAlertLucideIcon /></span>
          <div className="delete-dialog__title" id="delete-dialog-title">Delete Confirmation</div>
        </div>
        <div className="delete-dialog__body">
          <div className="delete-dialog__line">
            {isSemesterLabel ? (
              <>
                {semesterPrefix}
                <strong className="manage-delete-focus">{label.slice(semesterPrefix.length)}</strong>
                {" will be deleted. Are you sure?"}
              </>
            ) : isJurorTarget ? (
              <>
                {jurorPrefix}
                <strong className="manage-delete-focus manage-delete-focus--juror-name">
                  {jurorName || "this juror"}
                </strong>
                {jurorInst && (
                  <span className="manage-delete-focus-inst manage-delete-focus-inst--juror">
                    {" "}
                    ({jurorInst})
                  </span>
                )}
                {" will be deleted. Are you sure?"}
              </>
            ) : isGroupLabel ? (
              <>
                <strong className="manage-delete-focus">{label}</strong>
                {" will be deleted. Are you sure?"}
              </>
            ) : (
              <>
                <strong className="manage-delete-focus">{label}</strong>
                {" will be deleted. Are you sure?"}
              </>
            )}
          </div>
          {isSemesterLabel ? (
            <div className="delete-dialog__impact manage-delete-impact manage-delete-impact--warning">
              <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertLucideIcon /></span>
              <div className="manage-delete-warning-text">
                This will permanently delete <strong>all jurors, groups, and scores</strong> associated with this semester. This action cannot be undone.
              </div>
            </div>
          ) : buildCountSummary(counts) ? (
            <div className="delete-dialog__impact manage-delete-impact">
              {buildCountSummary(counts)}
            </div>
          ) : null}
          <div className="delete-dialog__line delete-dialog__sub">
            Enter the delete password to confirm.
          </div>
          <div className="delete-dialog__field">
            <label className="manage-label">Delete Password</label>
            <input
              type="password"
              className={`manage-input${error ? " is-danger" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="off"
              placeholder="Enter delete password"
            />
            {error && <div className="manage-field-error">{error}</div>}
          </div>
        </div>
        <div className="delete-dialog__actions">
          <button className="manage-btn manage-btn--delete-cancel" type="button" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="manage-btn manage-btn--delete-confirm"
            type="button"
            onClick={handleConfirm}
            disabled={!password.trim() || loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
