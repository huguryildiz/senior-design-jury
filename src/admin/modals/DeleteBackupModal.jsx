// src/admin/modals/DeleteBackupModal.jsx
// Modal: confirm permanent deletion of a database backup.
// Centered danger layout matching RemoveJurorModal style.
//
// Props:
//   open     — boolean
//   onClose  — () => void
//   backup   — backup object ({ created_at, origin, size_bytes, period_ids, created_by_name, format })
//   onDelete — () => Promise<void>

import { useState } from "react";
import { AlertCircle, Database } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import { formatDateTime as formatDate } from "@/shared/lib/dateUtils";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[idx]}`;
}


export default function DeleteBackupModal({ open, onClose, backup, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleClose = () => {
    if (deleting) return;
    setConfirmText("");
    setDeleteError("");
    onClose();
  };

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete?.();
      setConfirmText("");
    } catch (e) {
      setDeleteError(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const periodCount = backup?.period_ids?.length ?? 0;
  const origin = backup?.origin ?? "manual";

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <Database size={18} strokeWidth={2} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Delete Backup?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          The backup from{" "}
          <strong style={{ color: "var(--text-primary)" }}>{formatDate(backup?.created_at)}</strong>{" "}
          will be permanently deleted.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {/* Backup info card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "var(--surface-1)",
            borderRadius: "var(--radius)",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(96,165,250,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#60a5fa",
            }}
          >
            <Database size={15} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {formatDate(backup?.created_at)}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
              {periodCount} period{periodCount !== 1 ? "s" : ""} ·{" "}
              {formatBytes(backup?.size_bytes)} ·{" "}
              {(backup?.format ?? "JSON").toUpperCase()}
            </div>
          </div>
          <span
            style={{
              fontSize: 10.5, fontWeight: 600,
              padding: "2px 8px", borderRadius: 20,
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              textTransform: "capitalize",
            }}
          >
            {origin}
          </span>
        </div>

        {/* Impact stats */}
        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value">{periodCount}</div>
            <div className="fs-impact-label">Periods</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{formatBytes(backup?.size_bytes)}</div>
            <div className="fs-impact-label">Size</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value" style={{ textTransform: "capitalize" }}>{origin}</div>
            <div className="fs-impact-label">Origin</div>
          </div>
        </div>

        {/* Danger alert */}
        <div className="fs-alert danger" style={{ margin: 0, textAlign: "left" }}>
          <div className="fs-alert-icon"><AlertCircle size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">This action cannot be undone</div>
            <div className="fs-alert-desc">
              The backup file will be removed from storage and cannot be recovered.
              Automatic backups are not affected.
            </div>
          </div>
        </div>

        {/* Typed confirmation */}
        <div style={{ marginTop: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Type <strong style={{ color: "var(--text-primary)" }}>DELETE</strong> to confirm
          </label>
          <input
            className="fs-typed-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            spellCheck={false}
            disabled={deleting}
          />
        </div>

        {deleteError && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#f87171", textAlign: "left" }}>
            {deleteError}
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
          onClick={handleClose}
          disabled={deleting}
          style={{ flex: 1 }}
        >
          Keep it
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleDelete}
          disabled={deleting || !canDelete}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={deleting} loadingText="Deleting…">
            Delete Backup
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
