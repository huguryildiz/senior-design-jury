// src/admin/modals/EntryTokenModal.jsx
// Modal: shows entry token QR, URL, expiry, active sessions, share via email.
//
// Props:
//   open           — boolean
//   onClose        — () => void
//   tokenUrl       — string
//   expiresIn      — string (e.g. "23h 42m")
//   activeSessions — number
//   onRevoke       — () => Promise<void>
//   onSendEmail    — (email: string) => Promise<void>

import { useState } from "react";
import { AlertTriangle, Icon } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function EntryTokenModal({
  open, onClose, tokenUrl, expiresIn, activeSessions, onRevoke, onSendEmail,
}) {
  const [copied, setCopied] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const handleCopy = () => {
    if (tokenUrl) {
      navigator.clipboard.writeText(tokenUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendEmail?.(emailRecipient.trim());
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await onRevoke?.();
      onClose();
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="fs-modal-header">
        <div className="fs-modal-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon success">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3z" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Jury Entry Token</div>
              <div className="fs-subtitle">Share this link or QR code for evaluation access.</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>
      <div className="fs-modal-body">
        {/* QR placeholder */}
        <div
          style={{
            width: 160, height: 160, margin: "0 auto 14px",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", display: "grid", placeItems: "center",
            color: "var(--text-quaternary)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ marginBottom: 4 }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
            </Icon>
            <div style={{ fontSize: 10 }}>QR Code</div>
          </div>
        </div>

        {/* Token URL */}
        <div className="fs-field" style={{ marginBottom: 10 }}>
          <div className="fs-field-label">Token URL</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="fs-input"
              value={tokenUrl || ""}
              readOnly
              style={{ fontFamily: "var(--mono)", fontSize: 10.5, background: "var(--surface-1)", flex: 1 }}
            />
            <button
              type="button"
              className="fs-btn fs-btn-secondary fs-btn-icon"
              title={copied ? "Copied!" : "Copy"}
              onClick={handleCopy}
              style={{ flexShrink: 0, width: 36, height: 36 }}
            >
              {copied ? (
                <Icon
                  iconNode={[]}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </Icon>
              ) : (
                <Icon
                  iconNode={[]}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </Icon>
              )}
            </button>
          </div>
        </div>

        {/* Info rows */}
        <div className="fs-info-row">
          <span className="fs-info-row-label">Expires</span>
          <span className="fs-info-row-value">{expiresIn ? `in ${expiresIn}` : "—"}</span>
        </div>
        <div className="fs-info-row">
          <span className="fs-info-row-label">Active Sessions</span>
          {activeSessions > 0 ? (
            <span className="fs-badge green" style={{ fontSize: 9 }}>
              {activeSessions} juror{activeSessions !== 1 ? "s" : ""} connected
            </span>
          ) : (
            <span className="fs-info-row-value">None</span>
          )}
        </div>

        {/* Share via email */}
        <div
          style={{
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: 12, background: "var(--bg-card)", marginTop: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              style={{ flexShrink: 0 }}>
              <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </Icon>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Share via Email</span>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginBottom: 8, lineHeight: 1.4 }}>
            Send the QR code and token link to a colleague — useful for printing or distributing before poster day.
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              className="fs-input"
              type="email"
              placeholder="recipient@university.edu"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              style={{ fontSize: 11.5, flex: 1 }}
              disabled={sending}
            />
            <button
              type="button"
              className="fs-btn fs-btn-primary fs-btn-sm"
              onClick={handleSend}
              disabled={sending || !emailRecipient.trim()}
            >
              <span className="btn-loading-content">
                <AsyncButtonContent loading={sending} loadingText="Sending…">
                  <>
                    <Icon
                      iconNode={[]}
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2">
                      <path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" />
                    </Icon>
                    Send
                  </>
                </AsyncButtonContent>
              </span>
            </button>
          </div>
        </div>

        <div className="fs-alert warning" style={{ marginTop: 10, marginBottom: 0 }}>
          <div className="fs-alert-icon"><AlertTriangle size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">Token expires in under 24h</div>
            <div className="fs-alert-desc">Revoking generates a new token with a fresh 24h window.</div>
          </div>
        </div>
      </div>
      <div className="fs-modal-footer">
        <button
          type="button"
          className="fs-btn fs-btn-danger-outline fs-btn-sm"
          onClick={handleRevoke}
          disabled={revoking}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={revoking} loadingText="Revoking…">Revoke & Regenerate</AsyncButtonContent>
          </span>
        </button>
        <div style={{ flex: 1 }} />
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
