// src/admin/modals/RemoveJurorModal.jsx
// Modal: confirm removal of a juror from an evaluation period.
// Centered danger layout with juror card, impact stats, and danger alert.
//
// Props:
//   open     — boolean
//   onClose  — () => void
//   juror    — { name, affiliation, initials, color }
//   impact   — { scores: number, groupsAffected: number, avgScore: number|string }
//   onRemove — () => Promise<void>

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import JurorBadge from "../components/JurorBadge";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function RemoveJurorModal({ open, onClose, juror, impact = {}, onRemove, periodName }) {
  const [removing, setRemoving] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const handleClose = () => {
    setConfirmName("");
    onClose();
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove?.();
      setConfirmName("");
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  const canRemove = confirmName === juror?.name;
  const confirmPlaceholder = juror?.name
    ? `Type ${juror.name} to confirm`
    : "Type the juror name to confirm";

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Remove Juror?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{juror?.name}</strong>{" "}
          will be permanently removed from {periodName || "this evaluation period"}.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {juror && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", background: "var(--surface-1)",
              borderRadius: "var(--radius)", marginBottom: 12,
              textAlign: "left",
            }}
          >
            <JurorBadge name={juror.name} affiliation={juror.affiliation} size="md" />
          </div>
        )}

        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.scores ?? 0}</div>
            <div className="fs-impact-label">Scores</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value">{impact.groupsAffected ?? 0}</div>
            <div className="fs-impact-label">Groups Affected</div>
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
              This juror's evaluations for all {impact.groupsAffected ?? 0} project groups will be removed.
              Rankings and analytics for these groups will be recalculated without this juror's input.
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
            Type <strong style={{ color: "var(--text-primary)" }}>{juror?.name}</strong> to confirm
          </label>
          <input
            className="fs-typed-input"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={confirmPlaceholder}
            autoComplete="off"
            spellCheck={false}
            disabled={removing}
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
          disabled={removing}
          style={{ flex: 1 }}
        >
          Keep Juror
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleRemove}
          disabled={removing || !canRemove}
          style={{ flex: 1 }}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={removing} loadingText="Removing…">Remove Juror</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Modal>
  );
}
