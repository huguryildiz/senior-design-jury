// src/admin/modals/DeletePeriodModal.jsx
// Modal: confirm deletion of an evaluation period.
// Danger layout with impact stats, danger alert, and typed confirmation.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   period    — { id, name }
//   onDelete  — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import { getPeriodCounts } from "@/shared/api";

export default function DeletePeriodModal({ open, onClose, period, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const [counts, setCounts] = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    if (!open || !period?.id) return;
    setConfirmName("");
    setError("");
    setCounts(null);
    setCountsLoading(true);
    getPeriodCounts(period.id)
      .then(setCounts)
      .catch(() => setCounts(null))
      .finally(() => setCountsLoading(false));
  }, [open, period?.id]);

  const handleClose = () => {
    setConfirmName("");
    setError("");
    onClose();
  };

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      await onDelete?.();
      setConfirmName("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not delete the period. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = confirmName === period?.name;
  const val = (key) => countsLoading ? "…" : (counts?.[key] ?? "—");

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <Trash2 size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Delete Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will be permanently deleted along with all associated data.
        </div>
      </div>
      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {error && (
          <div className="fs-alert danger" style={{ marginBottom: 12, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{error}</div>
          </div>
        )}

        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value">{val("project_count")}</div>
            <div className="fs-impact-label">Projects</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{val("juror_count")}</div>
            <div className="fs-impact-label">Jurors</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{val("score_count")}</div>
            <div className="fs-impact-label">Scores</div>
          </div>
        </div>

        <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
          <div className="fs-alert-icon"><AlertCircle size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">This action cannot be undone</div>
            <div className="fs-alert-desc">
              All projects, juror assignments, scores, and analytics data for this period will be permanently removed.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
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
            disabled={deleting}
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
          disabled={deleting}
          style={{ flex: 1 }}
        >
          Keep Period
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleDelete}
          disabled={deleting || !canDelete}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={deleting} loadingText="Deleting…">
            Delete Period
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
