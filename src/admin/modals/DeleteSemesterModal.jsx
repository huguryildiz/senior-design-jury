// src/admin/modals/DeleteSemesterModal.jsx
// Modal: confirm deletion of an evaluation period with typed confirmation.
// Centered danger layout, impact stats, typed confirmation field.
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   periodName — string (e.g. "2025-26 Spring")
//   impact     — { projects: number, jurors: number, scores: number }
//   onDelete   — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function DeleteSemesterModal({ open, onClose, periodName, impact = {}, onDelete }) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (open) { setTyped(""); setDeleting(false); setDeleteError(""); }
  }, [open]);

  const confirmed = typed === periodName;

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete?.();
      onClose();
    } catch (e) {
      setDeleteError(e?.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Delete Evaluation Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          Deleting this evaluation period will permanently remove all project groups, juror assignments and scores. This action cannot be undone.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {deleteError && (
          <div className="fs-alert danger" style={{ marginBottom: 12 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{deleteError}</div>
          </div>
        )}

        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.projects ?? 0}</div>
            <div className="fs-impact-label">Projects</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.jurors ?? 0}</div>
            <div className="fs-impact-label">Jurors</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.scores ?? 0}</div>
            <div className="fs-impact-label">Scores</div>
          </div>
        </div>

        <div className="fs-typed-field">
          <div className="fs-typed-label">
            Type <strong>{periodName}</strong> to confirm deletion.
          </div>
          <input
            className="fs-typed-input"
            type="text"
            placeholder={periodName ? `Type ${periodName} to confirm` : "Type the period name to confirm"}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
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
          onClick={onClose}
          disabled={deleting}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleDelete}
          disabled={deleting || !confirmed}
          style={{ flex: 1 }}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={deleting} loadingText="Deleting…">Delete</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Modal>
  );
}
