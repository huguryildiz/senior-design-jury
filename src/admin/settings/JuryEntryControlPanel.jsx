// src/admin/settings/JuryEntryControlPanel.jsx
// ============================================================
// Phase 3.5 — Admin panel section for period-level QR access control.
//
// Admin can:
//   - generate (or regenerate) a jury entry token / QR
//   - revoke the current token
//   - view current status (active / disabled / no token)
//   - display the QR code on screen for jurors to scan
//   - copy the access link to clipboard
//
// The raw token is shown once after generation, then lost.
// The QR encodes: https://<origin>?eval=<rawToken>
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import veraLogo from "../../assets/vera_logo.png";
import {
  generateEntryToken,
  revokeEntryToken,
  getEntryTokenStatus,
} from "../../shared/api";
import { isDemoEnvironment } from "@/shared/lib/environment";
import { useToast } from "@/shared/hooks/useToast";
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
} from "@/shared/ui/Icons";
import {
  getRawToken as storageGetRawToken,
  setRawToken as storageSetRawToken,
  clearRawToken as storageClearRawToken,
} from "../../shared/storage";
import { formatDateTime as fmtDate } from "@/shared/lib/dateUtils";

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  if (!status) return null;
  if (!status.has_token) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide bg-slate-100 text-slate-500">No token</span>;
  }
  if (status.enabled) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide bg-green-100 text-green-600">Active</span>;
  }
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide bg-red-100 text-destructive">Disabled</span>;
}


// ── Main component ────────────────────────────────────────────
export default function JuryEntryControlPanel({
  periodId,
  periodName,
  isOpen,
  onToggle,
  isMobile,
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
    ? `${window.location.origin}${isDemoEnvironment() ? "/demo" : ""}/eval?t=${encodeURIComponent(rawToken)}`
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
      imageOptions:         { crossOrigin: "anonymous", margin: 4, imageSize: 0.46 },
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
    if (!periodId) return;
    setError("");
    try {
      const s = await getEntryTokenStatus(periodId);
      setStatus(s);
    } catch (e) {
      if (e?.unauthorized) {
        setError("Session expired — please log in again.");
      } else {
        setError("Could not load token status.");
      }
    }
  }, [periodId]);

  // Restore token and load status whenever periodId changes (independent of isOpen).
  useEffect(() => {
    if (!periodId) {
      setRawToken("");
      setShowQR(false);
      return;
    }
    const saved = storageGetRawToken(periodId);
    setRawToken(saved || "");
    setShowQR(!!saved);
    loadStatus();
  }, [periodId, loadStatus]);

  // Demo mode: show a dummy QR when the period has an active token
  useEffect(() => {
    if (!isDemoEnvironment() || !status?.has_token || !status?.enabled) return;
    if (rawToken) return; // already showing a real/dummy token
    setRawToken("demo-token-" + (periodId || "").slice(0, 8));
    setShowQR(true);
  }, [status, rawToken, periodId]);

  // ── Generate / Regenerate ─────────────────────────────────
  async function handleGenerate() {
    if (!periodId) return;
    setRegenerating(true);
    setError("");
    setRawToken("");
    setShowQR(false);
    storageClearRawToken(periodId);
    try {
      const token = await generateEntryToken(periodId);
      if (token) {
        setRawToken(token);
        setShowQR(true);
        storageSetRawToken(periodId, token);
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
    if (!periodId) return;
    setRevoking(true);
    setError("");
    try {
      const result = await revokeEntryToken(periodId);
      setRawToken("");
      setShowQR(false);
      storageClearRawToken(periodId);
      await loadStatus();
      const lockMsg = result.active_juror_count > 0
        ? `Jury access revoked. ${result.active_juror_count} active session(s) locked.`
        : "Jury access revoked and evaluations locked.";
      _toast.success(lockMsg);
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
  async function handleDownload() {
    if (!qrInstance.current) return;
    const fileName = `jury-qr-${periodName || periodId || "access"}`;
    try {
      const raw = await qrInstance.current.getRawData("png");
      if (!raw) throw new Error("QR data unavailable.");
      const blob = raw instanceof Blob ? raw : new Blob([raw], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setError("Could not download QR.");
    }
  }

  const hasToken    = status?.has_token;
  const isActive    = status?.enabled;
  const isBusy      = regenerating || revoking;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col gap-3.5 p-[18px] max-w-full min-w-0 overflow-x-hidden">
      <button
        type="button"
        className="flex items-center justify-between gap-3 bg-transparent border-none p-0 cursor-pointer text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 font-bold text-slate-900">
          <span className="text-lg [&>svg]:size-[18px] [&>svg]:block" aria-hidden="true"><QrCodeIcon /></span>
          <span className="section-label">Jury Access Control</span>
          {status && <StatusBadge status={status} />}
        </div>
        {isMobile && (
          <ChevronDownIcon className={`text-slate-600 transition-transform duration-200${isOpen ? " rotate-180" : ""}`} />
        )}
      </button>

      {(!isMobile || isOpen) && (
        <div className="flex flex-col gap-3 max-w-full min-w-0">
          <div className="text-xs text-muted-foreground">
            Generate a period-level QR code that jurors must scan to begin the
            evaluation flow. Show the QR on the coordinator&apos;s phone on poster day.
          </div>

          {!periodId && (
            <div className="text-[13px] text-slate-400 py-2.5">
              Select a period to manage its jury access token.
            </div>
          )}

          {periodId && (
            <>
              {/* Status row */}
              {status && (
                <div className="flex flex-col gap-1.5 mb-4 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-[10px] text-[13px]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-400 min-w-[110px] font-medium">Period:</span>
                    <span>{periodName || periodId}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-400 min-w-[110px] font-medium">Status:</span>
                    <StatusBadge status={status} />
                  </div>
                  {status.created_at && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-400 min-w-[110px] font-medium">Token created:</span>
                      <span>{fmtDate(status.created_at)}</span>
                    </div>
                  )}
                  {status.expires_at && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-400 min-w-[110px] font-medium">Expires:</span>
                      <span>{fmtDate(status.expires_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-destructive text-[13px] mb-3 [&>svg]:shrink-0 [&>svg]:size-4" role="alert">
                  <AlertCircleIcon />
                  <span>{error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {!hasToken || !isActive ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed [&>svg]:size-3.5 [&>svg]:block"
                    onClick={handleGenerate}
                    disabled={regenerating || revoking}
                  >
                    {regenerating ? <div className="spinner" /> : (hasToken ? <RefreshCcwIcon /> : <QrCodeIcon />)}
                    {regenerating ? "Generating…" : (hasToken ? "Regenerate QR" : "Generate QR")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed [&>svg]:size-3.5 [&>svg]:block${regenerating ? " [&>svg]:animate-spin" : ""}`}
                    onClick={handleGenerate}
                    disabled={regenerating || revoking}
                  >
                    <RefreshCcwIcon />
                    {regenerating ? "Regenerating…" : "Regenerate QR"}
                  </button>
                )}

                {hasToken && isActive && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white shadow hover:bg-destructive/90 disabled:opacity-60 disabled:cursor-not-allowed [&>svg]:size-3.5 [&>svg]:block"
                    onClick={() => setRevokeModalOpen(true)}
                    disabled={regenerating || revoking}
                  >
                    {revoking ? <div className="spinner" /> : <BanIcon />}
                    Revoke Access
                  </button>
                )}
              </div>

              {/* No cached token in this session — prompt to regenerate */}
              {hasToken && isActive && !rawToken && (
                <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-3.5">
                  <div className="flex items-start gap-2 text-[13px] text-green-700 text-justify [text-align-last:left] [&>svg]:shrink-0 [&>svg]:size-4 [&>svg]:mt-0.5">
                    <AlertCircleIcon />
                    QR was generated in a previous session and cannot be retrieved.
                    Regenerate to display a new QR — existing juror sessions will remain active.
                  </div>
                </div>
              )}

              {/* QR display — visible whenever an active token is cached in this session */}
              {rawToken && (
                <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-3.5">
                  <div className="flex items-start gap-2 text-[13px] text-green-700 text-justify [text-align-last:left] [&>svg]:shrink-0 [&>svg]:size-4 [&>svg]:mt-0.5">
                    <CheckCircle2Icon />
                    QR stays active until access is revoked or regenerated.
                  </div>

                  {showQR && (
                    <div className="flex justify-center py-2">
                      <div ref={qrRef} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="flex-1 min-w-0 text-[11px] break-all bg-white border border-green-200 rounded-md px-2 py-1 text-gray-700">{entryUrl}</code>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed [&>svg]:size-3.5 [&>svg]:block"
                      onClick={handleCopy}
                      title="Copy access link"
                      disabled={isBusy}
                    >
                      {copied ? <CheckCircle2Icon /> : <CopyIcon />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed [&>svg]:size-3.5 [&>svg]:block"
                      onClick={() => setShowQR((v) => !v)}
                      disabled={isBusy}
                    >
                      {showQR ? <EyeOffIcon /> : <EyeIcon />}
                      {showQR ? "Hide QR" : "Show QR"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed [&>svg]:size-3.5 [&>svg]:block"
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
        activeJurorCount={status?.active_juror_count ?? 0}
        onCancel={() => setRevokeModalOpen(false)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
