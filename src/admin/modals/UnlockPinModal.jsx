// src/admin/modals/UnlockPinModal.jsx
// ============================================================
// Shown after a juror's PIN lockout is cleared + new PIN generated.
// Displays the one-time PIN, copy button, and optional email send.
//
// Props:
//   open            — boolean
//   onClose         — () => void
//   pin             — string (4-digit plain PIN, shown once)
//   jurorId         — string
//   jurorName       — string
//   affiliation     — string
//   email           — string (pre-filled from juror record, editable)
//   periodId        — string
//   periodName      — string
//   organizationId  — string
// ============================================================

import { useState } from "react";
import { LockOpen, Send, Copy, Check, AlertTriangle } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import { sendJurorPinEmail } from "@/shared/api/admin/notifications";
import { useToast } from "@/shared/hooks/useToast";

export default function UnlockPinModal({
  open,
  onClose,
  pin = "",
  jurorId,
  jurorName = "",
  affiliation = "",
  email: initialEmail = "",
  periodId,
  periodName,
  organizationId,
}) {
  const _toast = useToast();
  const [copied, setCopied] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(pin);
      } else {
        const ta = document.createElement("textarea");
        ta.value = pin;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silently fail */ }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !pin) return;
    setSending(true);
    try {
      await sendJurorPinEmail({
        recipientEmail,
        jurorName,
        pin,
        jurorAffiliation: affiliation,
        periodName,
        organizationId,
        jurorId,
      });
      setSent(true);
      _toast.success(`PIN sent to ${recipientEmail}`);
    } catch (e) {
      _toast.error(e?.message || "Could not send email.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setCopied(false);
    setSent(false);
    setSending(false);
    setRecipientEmail(initialEmail);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon" style={{ margin: "0 auto 10px" }}>
          <LockOpen size={20} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>
          Juror Unlocked
        </div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          {jurorName
            ? <>A new PIN has been generated for <strong style={{ color: "var(--text-primary)" }}>{jurorName}</strong>.</>
            : "A new PIN has been generated."}
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 4 }}>
        {/* PIN display */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 10,
            }}
          >
            New PIN
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {(pin || "????").split("").map((digit, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 56,
                  background: "var(--surface-raised, rgba(255,255,255,0.04))",
                  border: "2px solid var(--border-primary, rgba(108,71,255,0.35))",
                  borderRadius: 8,
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
                  color: "var(--text-primary)",
                  letterSpacing: 0,
                  userSelect: "all",
                }}
              >
                {digit}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="dj-btn-secondary"
            onClick={handleCopy}
            style={{ padding: "6px 14px", fontSize: "11px", gap: 5, width: "fit-content" }}
          >
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border-secondary, rgba(255,255,255,0.08))", margin: "4px 0 14px" }} />

        {/* Email send section */}
        <div style={{ marginBottom: 4 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Send PIN via Email
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => { setRecipientEmail(e.target.value); setSent(false); }}
              placeholder="juror@example.com"
              disabled={sending}
              style={{
                flex: 1,
                padding: "7px 10px",
                background: "var(--surface-raised, rgba(255,255,255,0.04))",
                border: "1px solid var(--border-secondary, rgba(255,255,255,0.1))",
                borderRadius: 6,
                fontSize: 13,
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <button
              type="button"
              className="fs-btn fs-btn-primary fs-btn-sm"
              onClick={handleSendEmail}
              disabled={!recipientEmail || sending || sent}
            >
              <span className="btn-loading-content">
                <AsyncButtonContent loading={sending} loadingText="Sending…">
                  {sent ? <><Check size={12} strokeWidth={2.5} /> Sent</> : <><Send size={12} strokeWidth={2} /> Send</>}
                </AsyncButtonContent>
              </span>
            </button>
          </div>
        </div>

        {/* Warning note */}
        <div className="fs-alert warning" style={{ marginTop: 14 }}>
          <div className="fs-alert-icon">
            <AlertTriangle size={15} />
          </div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">This PIN is shown once</div>
            <div className="fs-alert-desc">
              Copy or send it now. It will not be displayed again after closing this dialog.
            </div>
          </div>
        </div>
      </div>

      <div
        className="fs-modal-footer"
        style={{
          justifyContent: "center",
          background: "transparent",
          borderTop: "none",
          paddingTop: 0,
        }}
      >
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={handleClose}
          style={{ flex: 1 }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
