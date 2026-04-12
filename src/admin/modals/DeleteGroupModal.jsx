// src/admin/modals/DeleteGroupModal.jsx
// Modal: confirm deletion of a project group.
// Centered danger layout with impact stats.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   groupName — string (e.g. "Project 5")
//   impact    — { members: number, scores: number, evaluations: number }
//   onDelete  — () => Promise<void>

import { useState } from "react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

import { Icon } from "lucide-react";

export default function DeleteGroupModal({ open, onClose, groupName, impact = {}, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete?.();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </Icon>
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>
          Delete {groupName || "Project"}?
        </div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          This will permanently remove the project, all team member assignments, and every score recorded by jurors for this project.
        </div>
      </div>
      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.members ?? 0}</div>
            <div className="fs-impact-label">Team Members</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.scores ?? 0}</div>
            <div className="fs-impact-label">Scores</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.evaluations ?? 0}</div>
            <div className="fs-impact-label">Evaluations</div>
          </div>
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
          disabled={deleting}
          style={{ flex: 1 }}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={deleting} loadingText="Deleting…">Delete Project</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Modal>
  );
}
