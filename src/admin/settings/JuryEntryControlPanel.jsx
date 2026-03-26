// src/admin/settings/JuryEntryControlPanel.jsx
// ============================================================
// Phase 3.5 — Admin panel section for semester-level QR access control.
//
// Admin can:
//   - generate (or regenerate) a jury entry token / QR
//   - revoke the current token
//   - view current status (active / disabled / no token)
//   - display the QR code on screen for jurors to scan
//   - copy the access link to clipboard
//
// The raw token is shown once after generation, then lost.
// The QR encodes: https://<origin>/jury-entry?t=<rawToken>
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import veraLogo from "../../assets/vera_logo.png";
import {
  adminGenerateEntryToken,
  adminRevokeEntryToken,
  adminGetEntryTokenStatus,
} from "../../shared/api";
import { useToast } from "../../components/toast/useToast";
import JuryRevokeConfirmDialog from "./JuryRevokeConfirmDialog";
import {
  QrCodeIcon,
  RefreshCcwIcon,
  BanIcon,
  CheckCircle2Icon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  AlertCircleIcon,
} from "../../shared/Icons";
import {
  getRawToken as storageGetRawToken,
  setRawToken as storageSetRawToken,
  clearRawToken as storageClearRawToken,
} from "../../shared/storage";

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  if (!status) return null;
  if (!status.has_token) {
    return <span className="entry-token-badge entry-token-badge--none">No token</span>;
  }
  if (status.enabled) {
    return <span className="entry-token-badge entry-token-badge--active">Active</span>;
  }
  return <span className="entry-token-badge entry-token-badge--disabled">Disabled</span>;
}

// ── Formatted date helper ─────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch { return ts; }
}

// ── Main component ────────────────────────────────────────────
export default function JuryEntryControlPanel({
  semesterId,
  semesterName,
  isOpen,
  onToggle,
  isMobile,
  isDemoMode = false,
}) {
  const [status, setStatus]     = useState(null);
  const [error, setError]       = useState("");
  const [rawToken, setRawToken] = useState("");
  const [showQR, setShowQR]     = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [regenerating, setRegenerating]       = useState(false);
  const [revoking, setRevoking]               = useState(false);

  const _toast = useToast();

  const [copied, setCopied]     = useState(false);
  const qrRef                   = useRef(null);
  const qrInstance              = useRef(null);

  const entryUrl = rawToken
    ? `${window.location.origin}/jury-entry?t=${encodeURIComponent(rawToken)}`
    : "";

  // ── QR code instance ──────────────────────────────────────
  useEffect(() => {
    qrInstance.current = new QRCodeStyling({
      width: 260,
      height: 260,
      type: "svg",
      dotsOptions:          { type: "extra-rounded", color: "#1e3a5f" },
      cornersSquareOptions: { type: "extra-rounded", color: "#1e3a5f" },
      cornersDotOptions:    { type: "dot", color: "#2563eb" },
      backgroundOptions:    { color: "#ffffff" },
      imageOptions:         { crossOrigin: "anonymous", margin: 6, imageSize: 0.375 },
    });
  }, []);

  useEffect(() => {
    if (!qrInstance.current || !entryUrl) return;
    qrInstance.current.update({ data: entryUrl, image: veraLogo });
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qrInstance.current.append(qrRef.current);
    }
  }, [entryUrl, showQR]);

  // ── Load status when panel opens ──────────────────────────
  const loadStatus = useCallback(async () => {
    if (!semesterId) return;
    setError("");
    try {
      const s = await adminGetEntryTokenStatus(semesterId);
      setStatus(s);
    } catch (e) {
      if (e?.unauthorized) {
        setError("Session expired — please log in again.");
      } else {
        setError("Could not load token status.");
      }
    }
  }, [semesterId]);

  // Restore token and load status whenever semesterId changes (independent of isOpen).
  useEffect(() => {
    if (!semesterId) {
      setRawToken("");
      setShowQR(false);
      return;
    }
    const saved = storageGetRawToken(semesterId);
    setRawToken(saved || "");
    setShowQR(!!saved);
    loadStatus();
  }, [semesterId, loadStatus]);

  // ── Generate / Regenerate ─────────────────────────────────
  async function handleGenerate() {
    if (!semesterId) return;
    setRegenerating(true);
    setError("");
    setRawToken("");
    setShowQR(false);
    storageClearRawToken(semesterId);
    try {
      const token = await adminGenerateEntryToken(semesterId);
      if (token) {
        setRawToken(token);
        setShowQR(true);
        storageSetRawToken(semesterId, token);
        await loadStatus();
      } else {
        setError("Token generation failed — please try again.");
      }
    } catch (e) {
      if (e?.unauthorized) {
        setError("Unauthorized — check your admin password.");
      } else {
        setError("Could not generate token.");
      }
    } finally {
      setRegenerating(false);
    }
  }

  // ── Revoke ────────────────────────────────────────────────
  async function handleRevoke() {
    if (!semesterId) return;
    setRevoking(true);
    setError("");
    try {
      await adminRevokeEntryToken(semesterId);
      setRawToken("");
      setShowQR(false);
      storageClearRawToken(semesterId);
      await loadStatus();
      _toast.success("Jury access revoked");
      setRevokeModalOpen(false);
    } catch (e) {
      if (e?.unauthorized) {
        setError("Unauthorized — check your admin password.");
      } else {
        setError("Could not revoke token.");
      }
      _toast.error("Failed to revoke access");
    } finally {
      setRevoking(false);
    }
  }

  // ── Copy link ─────────────────────────────────────────────
  async function handleCopy() {
    if (!entryUrl) return;
    setError("");
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts (HTTP on local network)
      try {
        const ta = document.createElement("textarea");
        ta.value = entryUrl;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Could not copy to clipboard.");
      }
    }
  }

  // ── Download QR as PNG ────────────────────────────────────
  function handleDownload() {
    if (!qrInstance.current) return;
    qrInstance.current.download({
      name: `jury-qr-${semesterName || semesterId || "access"}`,
      extension: "png",
    });
  }

  const hasToken    = status?.has_token;
  const isActive    = status?.enabled;
  const isBusy      = regenerating || revoking;

  return (
    <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
      <button
        type="button"
        className="manage-card-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true"><QrCodeIcon /></span>
          <span className="section-label">Jury Access Control</span>
          {status && <StatusBadge status={status} />}
        </div>
        {isMobile && (
          <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />
        )}
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">
            Generate a semester-level QR code that jurors must scan to begin the
            evaluation flow. Show the QR on the coordinator&apos;s phone on poster day.
          </div>

          {!semesterId && (
            <div className="entry-token-notice">
              Select a semester to manage its jury access token.
            </div>
          )}

          {semesterId && (
            <>
              {/* Status row */}
              {status && (
                <div className="entry-token-status-row">
                  <div className="entry-token-meta">
                    <span className="entry-token-meta-label">Semester:</span>
                    <span>{semesterName || semesterId}</span>
                  </div>
                  <div className="entry-token-meta">
                    <span className="entry-token-meta-label">Status:</span>
                    <StatusBadge status={status} />
                  </div>
                  {status.created_at && (
                    <div className="entry-token-meta">
                      <span className="entry-token-meta-label">Token created:</span>
                      <span>{fmtDate(status.created_at)}</span>
                    </div>
                  )}
                  {status.expires_at && (
                    <div className="entry-token-meta">
                      <span className="entry-token-meta-label">Expires:</span>
                      <span>{fmtDate(status.expires_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="entry-token-error" role="alert">
                  <AlertCircleIcon />
                  <span>{error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="entry-token-actions">
                {!hasToken || !isActive ? (
                  <button
                    type="button"
                    className="manage-btn primary"
                    onClick={handleGenerate}
                    disabled={regenerating || revoking || isDemoMode}
                  >
                    {regenerating ? <div className="spinner" /> : (hasToken ? <RefreshCcwIcon /> : <QrCodeIcon />)}
                    {regenerating ? "Generating…" : (hasToken ? "Regenerate QR" : "Generate QR")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`manage-btn primary${regenerating ? " is-spinning" : ""}`}
                    onClick={handleGenerate}
                    disabled={regenerating || revoking || isDemoMode}
                  >
                    <RefreshCcwIcon />
                    {regenerating ? "Regenerating…" : "Regenerate QR"}
                  </button>
                )}

                {hasToken && isActive && (
                  <button
                    type="button"
                    className="manage-btn danger"
                    onClick={() => setRevokeModalOpen(true)}
                    disabled={regenerating || revoking || isDemoMode}
                  >
                    {revoking ? <div className="spinner" /> : <BanIcon />}
                    Revoke Access
                  </button>
                )}
              </div>

              {/* No cached token in this session — prompt to regenerate */}
              {hasToken && isActive && !rawToken && (
                <div className="entry-token-qr-panel">
                  <div className="entry-token-qr-note">
                    <AlertCircleIcon />
                    QR was generated in a previous session and cannot be retrieved.
                    Regenerate to display a new QR — existing juror sessions will remain active.
                  </div>
                </div>
              )}

              {/* QR display — visible whenever an active token is cached in this session */}
              {rawToken && (
                <div className="entry-token-qr-panel">
                  <div className="entry-token-qr-note">
                    <CheckCircle2Icon />
                    QR stays active until access is revoked or regenerated.
                  </div>

                  {showQR && (
                    <div className="entry-token-qr-wrap">
                      <div ref={qrRef} />
                    </div>
                  )}

                  <div className="entry-token-link-row">
                    <code className="entry-token-link">{entryUrl}</code>
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={handleCopy}
                      title="Copy access link"
                      disabled={isBusy}
                    >
                      {copied ? <CheckCircle2Icon /> : <CopyIcon />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <div className="entry-token-qr-actions">
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={() => setShowQR((v) => !v)}
                      disabled={isBusy}
                    >
                      {showQR ? <EyeOffIcon /> : <EyeIcon />}
                      {showQR ? "Hide QR" : "Show QR"}
                    </button>
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={handleDownload}
                      title="Download QR as PNG"
                      disabled={isBusy}
                    >
                      <QrCodeIcon />
                      Download QR
                    </button>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      )}

      <JuryRevokeConfirmDialog
        open={revokeModalOpen}
        loading={revoking}
        onCancel={() => setRevokeModalOpen(false)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
