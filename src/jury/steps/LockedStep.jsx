// src/jury/steps/LockedStep.jsx
// ============================================================
// Dedicated locked recovery screen — shown when a juror exceeds
// the maximum PIN attempts and gets temporarily locked out.
//
// Features:
//   - Combined status badge + live countdown timer card
//   - Email request form to tenant admin for PIN reset
//   - Optional CC to super admin (chevron toggle)
//   - Success confirmation after sending
//   - "Start Over" back to identity step
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { Lock, Mail, ChevronDown, Send, Check, Loader2 } from "lucide-react";
import { requestPinReset } from "@/shared/api/juryApi";
import "../../styles/jury.css";

function formatRemaining(ms) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LockedStep({ state, onBack }) {
  const [remaining, setRemaining] = useState(() => {
    const target = state.pinLockedUntil ? new Date(state.pinLockedUntil).getTime() : 0;
    return Math.max(0, target - Date.now());
  });
  const [showCC, setShowCC] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const expired = remaining <= 0;

  // Live countdown
  useEffect(() => {
    if (!state.pinLockedUntil) return;
    const target = new Date(state.pinLockedUntil).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setRemaining(diff);
      if (diff <= 0) clearInterval(id);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.pinLockedUntil]);

  const adminEmail = state.tenantAdminEmail || "";
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "";

  const handleSend = useCallback(async () => {
    if (!adminEmail || sending || sent) return;
    setSending(true);
    setSendError("");
    try {
      await requestPinReset({
        periodId: state.periodId,
        jurorName: state.juryName,
        affiliation: state.affiliation,
        message: message.trim() || undefined,
        includeSuperAdmin: showCC && !!superAdminEmail,
      });
      setSent(true);
    } catch (e) {
      setSendError(e?.message || "Could not send request. Please try again.");
    } finally {
      setSending(false);
    }
  }, [adminEmail, sending, sent, state.periodId, state.juryName, state.affiliation, message, showCC, superAdminEmail]);

  const handleStartOver = () => {
    state.resetAll?.();
    onBack?.();
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">

        {/* Icon */}
        <div className="dj-icon-box warn">
          <Lock size={24} strokeWidth={1.5} />
        </div>

        {/* Header */}
        <div className="jury-title">Account Temporarily Locked</div>
        <div className="jury-sub">
          Too many incorrect PIN attempts. Your account has been locked for security.
        </div>

        {/* Combined status + timer card */}
        <div className={`locked-timer-card${expired ? " expired" : ""}`}>
          <span className="locked-status-label">
            <span className="locked-status-dot" />
            {expired ? "Lockout Expired" : "Security Lockout"}
          </span>
          <div className={`locked-timer-value${expired ? " expired" : ""}`}>
            {formatRemaining(remaining)}
          </div>
          <div className="locked-timer-hint">
            {expired
              ? "You can now go back and retry"
              : "You can retry after the timer expires"}
          </div>
        </div>

        {/* Divider — only show if admin email exists and not expired */}
        {adminEmail && !expired && (
          <div className="locked-divider">or get help now</div>
        )}

        {/* Email form — only if admin email and not expired */}
        {adminEmail && !expired && !sent && (
          <div className="locked-help-card">
            <div className="locked-help-header">
              <div className="locked-help-icon">
                <Mail size={16} />
              </div>
              <div className="locked-help-title">Request PIN Reset</div>
            </div>

            <div className="locked-help-desc">
              Your evaluation coordinator can reset your PIN immediately.
              An email will be sent on your behalf with your details.
            </div>

            {/* TO: tenant admin */}
            <div className="locked-recipient-row">
              <div className="locked-recipient-avatar admin">
                {adminEmail.charAt(0).toUpperCase()}
              </div>
              <div className="locked-recipient-info">
                <div className="locked-recipient-name">{adminEmail}</div>
                <div className="locked-recipient-role">Evaluation Coordinator</div>
              </div>
              <span className="locked-recipient-tag to">To</span>
            </div>

            {/* CC toggle */}
            {superAdminEmail && (
              <>
                <button
                  type="button"
                  className="locked-cc-toggle"
                  onClick={() => setShowCC((v) => !v)}
                >
                  <ChevronDown
                    size={14}
                    className={`locked-cc-chevron${showCC ? " open" : ""}`}
                  />
                  <span>
                    {showCC ? "Hide platform administrator" : "Also notify platform administrator"}
                  </span>
                </button>

                {showCC && (
                  <div className="locked-recipient-row">
                    <div className="locked-recipient-avatar super">
                      {superAdminEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="locked-recipient-info">
                      <div className="locked-recipient-name">{superAdminEmail}</div>
                      <div className="locked-recipient-role">Platform Administrator</div>
                    </div>
                    <span className="locked-recipient-tag cc">CC</span>
                  </div>
                )}
              </>
            )}

            {/* Optional message */}
            <textarea
              className="locked-message-area"
              placeholder={'Add an optional note (e.g. "I think I was given the wrong PIN")'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <div className="locked-message-hint">Optional</div>

            {/* Error */}
            {sendError && (
              <div className="locked-send-error">{sendError}</div>
            )}

            {/* Send button */}
            <button
              className="btn-landing-primary locked-send-btn"
              onClick={handleSend}
              disabled={sending}
            >
              {sending
                ? <><Loader2 size={15} className="jg-spin" /> Sending…</>
                : <><Send size={15} /> Request PIN Reset</>}
            </button>
          </div>
        )}

        {/* Sent success state */}
        {sent && (
          <div className="locked-sent-state">
            <div className="locked-sent-icon">
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div className="locked-sent-title">Request Sent Successfully</div>
            <div className="locked-sent-desc">
              Your coordinator has been notified.<br />
              They can reset your PIN from the admin panel.<br />
              You'll receive a new PIN shortly.
            </div>
          </div>
        )}

        {/* Back / Start Over */}
        <div style={{ textAlign: "center", marginTop: sent || expired ? 16 : 8 }}>
          <a className="form-link" onClick={handleStartOver} style={{ cursor: "pointer" }}>
            ← Start Over
          </a>
        </div>
      </div>
    </div>
  );
}
