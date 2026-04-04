// src/admin/modals/PinResultModal.jsx
// Modal: shows the new PIN after a successful reset (step 2 of 2).
// Includes copy-to-clipboard and send-via-email with QR option.
//
// Props:
//   open        — boolean
//   onClose     — () => void
//   juror       — { name, affiliation, initials, color, email }
//   newPin      — string (4-digit PIN)
//   onSendEmail — ({ email, includeQr }) => Promise<void>

import { useState } from "react";
import Modal from "@/shared/ui/Modal";
import JurorBadge from "../components/JurorBadge";

export default function PinResultModal({ open, onClose, juror, newPin, onSendEmail }) {
  const [copied, setCopied] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [includeQr, setIncludeQr] = useState(true);
  const [sending, setSending] = useState(false);

  const handleCopy = () => {
    if (newPin) {
      navigator.clipboard.writeText(newPin).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendEmail?.({ email: emailRecipient.trim(), includeQr });
    } finally {
      setSending(false);
    }
  };

  const displayPin = newPin ? newPin.split("").join(" ") : "• • • •";

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="fs-modal-header">
        <div className="fs-modal-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">PIN Reset Complete</div>
              <div className="fs-subtitle">New PIN generated successfully.</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fs-modal-body">
        <div className="fs-steps">
          <div className="fs-step done">
            <div className="fs-step-dot">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="fs-step-label">Confirm</div>
          </div>
          <div className="fs-step-line" style={{ background: "var(--success)" }} />
          <div className="fs-step active">
            <div className="fs-step-dot">2</div>
            <div className="fs-step-label">New PIN</div>
          </div>
        </div>

        {juror && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", background: "var(--surface-1)",
              borderRadius: "var(--radius)", marginBottom: 12,
            }}
          >
            <JurorBadge name={juror.name} affiliation={juror.affiliation} size="md" />
          </div>
        )}

        {/* PIN display */}
        <div
          style={{
            textAlign: "center", padding: 16,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.5px", color: "var(--text-tertiary)", marginBottom: 6,
            }}
          >
            New PIN
          </div>
          <div
            style={{
              fontFamily: "var(--mono)", fontSize: 32, fontWeight: 800,
              letterSpacing: 8, color: "var(--text-primary)",
            }}
          >
            {displayPin}
          </div>
          <button
            type="button"
            className="fs-btn fs-btn-ghost fs-btn-xs"
            style={{ marginTop: 6, color: "var(--text-tertiary)" }}
            onClick={handleCopy}
          >
            {copied ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        {/* Send via email */}
        <div
          style={{
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: 12, background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Send PIN via Email</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <input
              className="fs-input"
              type="email"
              value={emailRecipient || juror?.email || ""}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="juror@university.edu"
              style={{ fontSize: 11.5, flex: 1 }}
              disabled={sending}
            />
            <button
              type="button"
              className="fs-btn fs-btn-primary fs-btn-sm"
              onClick={handleSend}
              disabled={sending || !((emailRecipient || juror?.email || "").trim())}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" />
              </svg>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          <label
            style={{
              display: "flex", alignItems: "flex-start", gap: 7, cursor: "pointer",
              padding: "8px 10px", background: "var(--surface-1)", borderRadius: "var(--radius-sm)",
            }}
          >
            <input
              type="checkbox"
              checked={includeQr}
              onChange={(e) => setIncludeQr(e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 14, height: 14, marginTop: 1, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                Include evaluation QR code
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", lineHeight: 1.35, marginTop: 1 }}>
                Juror can scan the QR to go directly to the evaluation form — no token URL needed.
              </div>
            </div>
          </label>
        </div>

        <div className="fs-alert info" style={{ marginTop: 10, marginBottom: 0 }}>
          <div className="fs-alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
          </div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">No email on file?</div>
            <div className="fs-alert-desc">Add the juror's email in their profile to enable PIN delivery.</div>
          </div>
        </div>
      </div>

      <div className="fs-modal-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
