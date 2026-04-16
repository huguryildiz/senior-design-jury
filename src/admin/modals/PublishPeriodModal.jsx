// src/admin/modals/PublishPeriodModal.jsx
// Modal: confirm publishing a Draft period. No typed confirmation — this is a
// reversible action (Revert to Draft still works until scores exist).
// Shows a brief summary of what will happen post-publish.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   period    — { id, name }
//   onPublish — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, Send } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function PublishPeriodModal({ open, onClose, period, onPublish }) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open]);

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handlePublish = async () => {
    setError("");
    setPublishing(true);
    try {
      await onPublish?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Could not publish the period. Try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon accent">
          <Send size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Publish Evaluation Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will become Published. Structural data freezes, and you'll be able to
          generate QR codes and let jurors score.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {error && (
          <div className="fs-alert danger" style={{ marginBottom: 12, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{error}</div>
          </div>
        )}
        <ul style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          textAlign: "justify",
          textJustify: "inter-word",
        }}>
          <li>Criteria, rubric bands, and project list are frozen.</li>
          <li>New jurors can still self-register via QR.</li>
          <li>You can revert to Draft later if no scores have been submitted.</li>
        </ul>
      </div>

      <div
        className="fs-modal-footer"
        style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}
      >
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={handleClose}
          disabled={publishing}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-primary"
          onClick={handlePublish}
          disabled={publishing}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={publishing} loadingText="Publishing…">
            Publish Period
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
