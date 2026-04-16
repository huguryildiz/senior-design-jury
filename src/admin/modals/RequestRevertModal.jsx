// src/admin/modals/RequestRevertModal.jsx
// Modal: org admin requests super-admin approval to revert a Live or Closed
// period back to Draft. Reason required (min 10 char). Fire-and-forget email
// goes to super admins. Underlying RPCs unchanged (rpc_admin_request_unlock +
// rpc_super_admin_resolve_unlock); this is a UI rename.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   period    — { id, name }
//   onRequest — (reason: string) => Promise<{ ok, error_code? }>

import { useState, useEffect } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import FbAlert from "@/shared/ui/FbAlert";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

const MIN_REASON = 10;

function mapErrorCode(code) {
  switch (code) {
    case "reason_too_short":
      return `Please provide at least ${MIN_REASON} characters.`;
    case "period_not_locked":
      return "This period is not currently published.";
    case "period_has_no_scores":
      return "No scores exist yet — you can revert directly instead.";
    case "pending_request_exists":
      return "A revert request is already pending for this period.";
    case "unauthorized":
      return "Unauthorized — check your session.";
    case "period_not_found":
      return "Period not found.";
    default:
      return "Could not submit the request. Try again.";
  }
}

export default function RequestRevertModal({ open, onClose, period, onRequest }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError("");
  }, [open]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= MIN_REASON && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await onRequest?.(trimmed);
      if (result && result.ok === false) {
        setError(mapErrorCode(result.error_code));
        return;
      }
      setReason("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not submit the request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon warning">
          <ShieldAlert size={22} strokeWidth={2} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Request Revert to Draft</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          already has evaluation scores. A super admin must approve reverting it to Draft.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2, display: "flex", flexDirection: "column", gap: 10 }}>
        <FbAlert variant="warning" title="Why approval is required">
          Once jurors have submitted scores, reverting to Draft re-opens structural editing — changing criterion weights, rubric bands, or outcome mappings makes prior scores inconsistent. Include enough detail so the super admin can decide quickly.
        </FbAlert>

        {error && (
          <div className="fs-alert danger" style={{ textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{error}</div>
          </div>
        )}

        <div>
          <label
            htmlFor="request-unlock-reason"
            style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}
          >
            Reason <span style={{ color: "var(--text-tertiary)" }}>(min {MIN_REASON} characters)</span>
          </label>
          <textarea
            id="request-unlock-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Criterion 3 label has a typo that must be corrected before results are published."
            rows={4}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "inherit",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text-primary)",
              background: "var(--input-bg, var(--bg-2))",
              border: "1px solid var(--border)",
              borderRadius: 8,
              resize: "vertical",
              minHeight: 90,
              outline: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: 11,
              color: trimmed.length >= MIN_REASON ? "var(--success)" : "var(--text-tertiary)",
              marginTop: 4,
            }}
          >
            {trimmed.length} / {MIN_REASON}+
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
          onClick={handleClose}
          disabled={submitting}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={submitting} loadingText="Submitting…">
            Submit Request
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
