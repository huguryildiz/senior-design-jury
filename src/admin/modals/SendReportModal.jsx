// src/admin/modals/SendReportModal.jsx
// "Send Report" dialog — lets admin email an export to one or more recipients.
// Uses the .share-modal / .share-chip design tokens from export.css.
//
// Props:
//   open          — boolean
//   onClose       — () => void
//   format        — "xlsx" | "csv" | "pdf"
//   formatLabel   — e.g. "Excel (.xlsx) · Heatmap"
//   meta          — e.g. "Includes selected criterion tab and per-project averages"
//   reportTitle   — e.g. "Heatmap" (used in email subject)
//   periodName    — e.g. "Spring 2026"
//   organization  — e.g. "TEDU EE"
//   generateFile  — (format) => Promise<{ blob, fileName, mimeType }>
//   onSend        — legacy: ({ recipients, message, includeCharts, ccMyself }) => Promise<void>

import { useState, useRef, useCallback } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { sendExportReport } from "@/shared/api/admin/notifications";
import { arrayBufferToBase64 } from "@/admin/utils/downloadTable";

import { Icon } from "lucide-react";

const FORMAT_ICON = { xlsx: "XLS", csv: "CSV", pdf: "PDF" };

function getInitials(email) {
  const local = email.split("@")[0] || "";
  const parts = local.replace(/[._-]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function SendIcon({ size = 18 }) {
  return (
    <Icon
      iconNode={[]}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="m22 2-11 11" />
    </Icon>
  );
}

export default function SendReportModal({
  open,
  onClose,
  format = "xlsx",
  formatLabel = "",
  meta = "",
  reportTitle = "",
  periodName = "",
  organization = "",
  department = "",
  generateFile,
  onSend,
}) {
  const [recipients, setRecipients] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [ccMyself, setCcMyself] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const _toast = useToast();
  const { profile, activeOrganization } = useAuth();

  const addRecipient = useCallback((email) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (recipients.includes(trimmed)) return;
    setRecipients((prev) => [...prev, trimmed]);
    setInputValue("");
  }, [recipients]);

  const removeRecipient = useCallback((email) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && recipients.length > 0) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const emails = text.split(/[,;\s]+/).filter(Boolean);
    emails.forEach(addRecipient);
  };

  const handleSend = async () => {
    if (recipients.length === 0) return;
    setSending(true);
    setError("");

    const count = recipients.length;

    const work = async () => {
      if (!generateFile && !onSend) {
        throw new Error("Email sending is not yet available for this export type.");
      }
      if (onSend && !generateFile) {
        await onSend({ recipients, message, includeCharts, ccMyself });
      } else if (generateFile) {
        const { blob, fileName, mimeType } = await generateFile(format);
        const arrayBuf = await blob.arrayBuffer();
        const fileBase64 = arrayBufferToBase64(arrayBuf);

        const senderName = profile?.display_name || profile?.email || "";
        const senderEmail = profile?.email || "";

        const result = await sendExportReport({
          recipients,
          fileName,
          fileBase64,
          mimeType,
          reportTitle: reportTitle || formatLabel.split(" · ")[1] || "Report",
          periodName,
          organization,
          department: department || undefined,
          message: message || undefined,
          senderName: senderName || undefined,
          ccSenderEmail: ccMyself && senderEmail ? senderEmail : undefined,
          organizationId: activeOrganization?.id || undefined,
        });

        if (!result.sent) {
          throw new Error(result.error || "Failed to send email");
        }
      }
      return count;
    };

    const promise = work();

    _toast.promise(promise, {
      loading: "Sending report\u2026",
      success: (n) => `Report sent — email delivered to ${n} recipient${n > 1 ? "s" : ""}.`,
      error: (err) => err?.message || "Failed to send report.",
    });

    try {
      await promise;
      setRecipients([]);
      setMessage("");
      setIncludeCharts(true);
      setCcMyself(false);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to send report");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setError("");
      onClose();
    }
  };

  if (!open) return null;

  const iconLabel = FORMAT_ICON[format] || "XLS";
  const iconClass = `export-option-icon export-option-icon--${format}`;

  return (
    <>
      {/* Overlay */}
      <div
        className="crud-overlay show"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      />

      {/* Modal */}
      <div className="crud-modal share-modal show" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="crud-modal-header">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SendIcon /> Send Report
          </h3>
          <button className="crud-modal-close" type="button" onClick={handleClose}>
            &#215;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recipients */}
          <div>
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-tertiary)", marginBottom: 6, display: "block" }}
            >
              Recipients
            </label>
            <div
              style={{
                display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px",
                minHeight: 42, border: "1px solid var(--border)", borderRadius: "var(--radius)",
                background: "var(--field-bg)", alignItems: "center", cursor: "text",
              }}
              onClick={() => inputRef.current?.focus()}
            >
              {recipients.map((email) => (
                <span key={email} className="share-chip">
                  <span className="share-chip-avatar">{getInitials(email)}</span>
                  {email}
                  <button
                    className="share-chip-remove"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeRecipient(email); }}
                  >
                    &#215;
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => { if (inputValue.trim()) addRecipient(inputValue); }}
                placeholder={recipients.length === 0 ? "Add email address..." : ""}
                style={{
                  flex: 1, minWidth: 120, border: "none", outline: "none",
                  background: "transparent", fontFamily: "var(--font)", fontSize: 12,
                  color: "var(--text-primary)", padding: "2px 0",
                }}
              />
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Press Enter to add multiple recipients
            </div>
          </div>

          {/* Format summary */}
          <div
            style={{
              padding: 12, border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", background: "var(--surface-1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{formatLabel}</div>
                {meta && (
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>{meta}</div>
                )}
              </div>
              <div
                className={iconClass}
                style={{ margin: 0, transform: "scale(0.7)", transformOrigin: "center right" }}
              >
                <span className="file-icon">
                  <span className="file-icon-label">{iconLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-tertiary)", marginBottom: 6, display: "block" }}
            >
              Message <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note for the recipients..."
              style={{
                width: "100%", height: 72, padding: "10px 12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                background: "var(--field-bg)", fontFamily: "var(--font)", fontSize: 12,
                color: "var(--text-primary)", resize: "vertical", outline: "none",
              }}
            />
          </div>

          {/* Options */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              />
              Include charts as images
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ccMyself}
                onChange={(e) => setCcMyself(e.target.checked)}
              />
              CC myself
            </label>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--danger-soft)", color: "var(--danger)", fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px", borderTop: "1px solid var(--border)",
            background: "var(--surface-1)", display: "flex", alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="text-xs text-muted">Report will be sent as an email attachment</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={handleClose}
              style={{ borderRadius: 999, padding: "8px 16px" }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              disabled={sending || recipients.length === 0}
              onClick={handleSend}
              style={{ borderRadius: 999, padding: "8px 20px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <SendIcon size={14} />
              {sending ? "Sending\u2026" : "Send Report"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
