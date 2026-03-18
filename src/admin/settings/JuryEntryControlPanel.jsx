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
import teduLogo from "../../assets/tedu-logo.png";
import {
  adminGenerateEntryToken,
  adminRevokeEntryToken,
  adminGetEntryTokenStatus,
} from "../../shared/api";
import {
  QrCodeIcon,
  KeyRoundIcon,
  RefreshIcon,
  BanIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  LockIcon,
  ChevronDownIcon,
  AlertCircleIcon,
  DownloadIcon,
} from "../../shared/Icons";

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
  adminPass,
  isOpen,
  onToggle,
  isMobile,
}) {
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [rawToken, setRawToken] = useState("");
  const [showQR, setShowQR]     = useState(false);

  const tokenStorageKey = semesterId ? `jury_raw_token_${semesterId}` : null;
  const [copied, setCopied]     = useState(false);
  const qrRef                   = useRef(null);
  const qrInstance              = useRef(null);

  const entryUrl = rawToken
    ? `${window.location.origin}/jury-entry?t=${rawToken}`
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
      imageOptions:         { crossOrigin: "anonymous", margin: 6, imageSize: 0.3 },
    });
  }, []);

  useEffect(() => {
    if (!qrInstance.current || !entryUrl) return;
    qrInstance.current.update({ data: entryUrl, image: teduLogo });
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qrInstance.current.append(qrRef.current);
    }
  }, [entryUrl, showQR]);

  // ── Load status when panel opens ──────────────────────────
  const loadStatus = useCallback(async () => {
    if (!semesterId || !adminPass) return;
    setError("");
    try {
      const s = await adminGetEntryTokenStatus(semesterId, adminPass);
      setStatus(s);
    } catch (e) {
      if (e?.unauthorized) {
        setError("Session expired — please log in again.");
      } else {
        setError("Could not load token status.");
      }
    }
  }, [semesterId, adminPass]);

  // Restore token and load status whenever semesterId changes (independent of isOpen).
  useEffect(() => {
    if (!semesterId) {
      setRawToken("");
      setShowQR(false);
      return;
    }
    const saved = tokenStorageKey
      ? (sessionStorage.getItem(tokenStorageKey) || localStorage.getItem(tokenStorageKey))
      : null;
    setRawToken(saved || "");
    setShowQR(!!saved);
    loadStatus();
  }, [semesterId, tokenStorageKey, loadStatus]);

  // ── Generate / Regenerate ─────────────────────────────────
  async function handleGenerate() {
    if (!semesterId || !adminPass) return;
    setLoading(true);
    setError("");
    setRawToken("");
    setShowQR(false);
    if (tokenStorageKey) {
      sessionStorage.removeItem(tokenStorageKey);
      localStorage.removeItem(tokenStorageKey);
    }
    try {
      const token = await adminGenerateEntryToken(semesterId, adminPass);
      if (token) {
        setRawToken(token);
        setShowQR(true);
        if (tokenStorageKey) {
          sessionStorage.setItem(tokenStorageKey, token);
          localStorage.setItem(tokenStorageKey, token);
        }
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
      setLoading(false);
    }
  }

  // ── Revoke ────────────────────────────────────────────────
  async function handleRevoke() {
    if (!semesterId || !adminPass) return;
    if (!window.confirm("Revoke jury entry token? Jurors who already scanned this session will keep access until they close their browser. New scans of the old QR will be rejected.")) return;
    setLoading(true);
    setError("");
    try {
      await adminRevokeEntryToken(semesterId, adminPass);
      setRawToken("");
      setShowQR(false);
      if (tokenStorageKey) {
        sessionStorage.removeItem(tokenStorageKey);
        localStorage.removeItem(tokenStorageKey);
      }
      await loadStatus();
    } catch (e) {
      if (e?.unauthorized) {
        setError("Unauthorized — check your admin password.");
      } else {
        setError("Could not revoke token.");
      }
    } finally {
      setLoading(false);
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
  const isGenerating = loading;

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
                    className="manage-btn manage-btn primary"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <KeyRoundIcon />
                    {isGenerating ? "Generating…" : (hasToken ? "Regenerate QR" : "Generate QR")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="manage-btn manage-btn primary"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <RefreshIcon />
                    {isGenerating ? "Regenerating…" : "Regenerate QR"}
                  </button>
                )}

                {hasToken && isActive && (
                  <button
                    type="button"
                    className="manage-btn manage-btn danger"
                    onClick={handleRevoke}
                    disabled={isGenerating}
                  >
                    <BanIcon />
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
                    This QR remains available while access is active.
                    Regenerating or revoking access will invalidate the current QR.
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
                    >
                      {copied ? <CheckCircle2Icon /> : <ClipboardIcon />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <div className="entry-token-qr-actions">
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={() => setShowQR((v) => !v)}
                    >
                      {showQR ? <LockIcon /> : <KeyRoundIcon />}
                      {showQR ? "Hide QR" : "Show QR"}
                    </button>
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={handleDownload}
                      title="Download QR as PNG"
                    >
                      <DownloadIcon />
                      Download QR
                    </button>
                  </div>
                </div>
              )}

              {/* Security note */}
              <div className="entry-token-security-note">
                This is a shared semester-level QR — not per-juror. The coordinator should
                display it on their own phone. Revoking immediately blocks new scans;
                existing granted browser sessions remain active until the juror closes their browser.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
