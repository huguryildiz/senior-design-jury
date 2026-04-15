// src/admin/modals/DeleteProjectModal.jsx
// Modal: confirm deletion of a project from an evaluation period.
// Centered danger layout with project card, impact stats, and typed confirmation.
//
// Props:
//   open        — boolean
//   onClose     — () => void
//   project     — { id, title, group_no, advisor }
//   impact      — { jurors: number, scores: number, avgScore: number|string }
//   onDelete    — () => Promise<void>
//   periodName  — string

import { useState } from "react";
import { AlertCircle, Icon } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import { StudentNames } from "@/shared/ui/EntityMeta";

export default function DeleteProjectModal({ open, onClose, project, impact = {}, onDelete, periodName }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");

  const handleClose = () => {
    setConfirmTitle("");
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete?.();
      setConfirmTitle("");
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = confirmTitle === project?.title;
  const confirmPlaceholder = project?.title
    ? `Type ${project.title} to confirm`
    : "Type the project title to confirm";

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </Icon>
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Delete Project?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{project?.title}</strong>{" "}
          will be permanently deleted from {periodName || "this evaluation period"}.
        </div>
      </div>
      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {project && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--surface-1)",
              borderRadius: "var(--radius)",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {project.group_no != null && (
                <span className="project-no-badge">P{project.group_no}</span>
              )}
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", flex: 1, textAlign: "justify", textJustify: "inter-word" }}>
                {project.title}
              </span>
            </div>
{project.members?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <StudentNames names={project.members} />
              </div>
            )}
          </div>
        )}

        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.scores ?? 0}</div>
            <div className="fs-impact-label">Scores</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.jurors ?? 0}</div>
            <div className="fs-impact-label">Jurors Affected</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.avgScore ?? "—"}</div>
            <div className="fs-impact-label">Avg Score</div>
          </div>
        </div>

        <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
          <div className="fs-alert-icon"><AlertCircle size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">All scores will be permanently deleted</div>
            <div className="fs-alert-desc">
              Evaluations submitted by {impact.jurors ?? 0} juror{impact.jurors !== 1 ? "s" : ""} for this project will be removed.
              Rankings and analytics will be recalculated without this project.
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
            Type <strong style={{ color: "var(--text-primary)" }}>{project?.title}</strong> to confirm
          </label>
          <input
            className="fs-typed-input"
            type="text"
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder={confirmPlaceholder}
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
          Keep Project
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleDelete}
          disabled={deleting || !canDelete}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={deleting} loadingText="Deleting…">Delete Project</AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
