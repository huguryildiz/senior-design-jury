// src/admin/EntryControlPage.jsx — Phase 9
// Entry Control page: QR access tokens, session monitoring, access history.
// Prototype: vera-premium-prototype.html lines 14797–15047

import { useCallback, useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import veraLogo from "@/assets/vera_logo.png";
import FbAlert from "@/shared/ui/FbAlert";
import { generateEntryToken, revokeEntryToken, getEntryTokenStatus, getActiveEntryTokenPlain, sendEntryTokenEmail } from "@/shared/api";
import { useToast } from "@/shared/hooks/useToast";
import {
  getRawToken as storageGetRawToken,
  setRawToken as storageSetRawToken,
  clearRawToken as storageClearRawToken,
} from "@/shared/storage/adminStorage";
import JuryRevokeConfirmDialog from "../settings/JuryRevokeConfirmDialog";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return ts;
  }
}

function fmtExpiry(ts) {
  if (!ts) return null;
  try {
    const diff = Date.parse(ts) - Date.now();
    if (diff <= 0) return null;
    if (diff >= 24 * 3600000) {
      return new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" });
    }
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  } catch {
    return null;
  }
}

function isExpiringSoon(ts) {
  if (!ts) return false;
  try {
    const diff = Date.parse(ts) - Date.now();
    return diff > 0 && diff < 3 * 3600000;
  } catch {
    return false;
  }
}

export default function EntryControlPage({
  organizationId,
  selectedPeriodId,
  selectedPeriod,
  isDemoMode = false,
}) {
  const periodId = selectedPeriodId;
  const periodName = selectedPeriod?.name || selectedPeriod?.period_name || selectedPeriod?.semester_name || "";

  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [rawToken, setRawToken] = useState("");
  const [showTokenDetail, setShowTokenDetail] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const qrRef = useRef(null);
  const qrInstance = useRef(null);
  const _toast = useToast();

  const entryUrl = rawToken
    ? `${window.location.origin}/?eval=${encodeURIComponent(rawToken)}${isDemoMode ? "&env=demo" : ""}`
    : "";

  // QR code instance
  useEffect(() => {
    qrInstance.current = new QRCodeStyling({
      width: 200,
      height: 200,
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
  }, [entryUrl]);

  const loadStatus = useCallback(async () => {
    if (!periodId) return;
    setError("");
    try {
      const s = await getEntryTokenStatus(periodId);
      setStatus(s);
    } catch (e) {
      setError(e?.unauthorized ? "Session expired — please log in again." : "Could not load token status.");
    }
  }, [periodId]);

  useEffect(() => {
    if (!periodId) {
      setRawToken("");
      setStatus(null);
      return;
    }
    const saved = storageGetRawToken(periodId);
    if (saved) {
      setRawToken(saved);
    }
    loadStatus();
    if (!saved) {
      getActiveEntryTokenPlain(periodId)
        .then((plain) => { if (plain) setRawToken(plain); })
        .catch(() => {});
    }
  }, [periodId, loadStatus]);

  useEffect(() => {
    if (!isDemoMode || !status?.has_token || !status?.enabled) return;
    if (rawToken) return;
    setRawToken("demo-token-" + (periodId || "").slice(0, 8));
  }, [isDemoMode, status, rawToken, periodId]);

  async function handleGenerate() {
    if (!periodId) return;
    setRegenerating(true);
    setError("");
    setRawToken("");
    storageClearRawToken(periodId);
    try {
      const token = await generateEntryToken(periodId);
      if (token) {
        setRawToken(token);
        storageSetRawToken(periodId, token);
        await loadStatus();
        _toast.success("New access QR generated");
      } else {
        setError("Token generation failed — please try again.");
      }
    } catch (e) {
      console.error("[generateEntryToken]", e);
      setError(e?.unauthorized ? "Unauthorized — check your session." : (e?.message || "Could not generate token."));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleRevoke() {
    if (!periodId) return;
    setRevoking(true);
    setError("");
    try {
      const result = await revokeEntryToken(periodId);
      setRawToken("");
      storageClearRawToken(periodId);
      await loadStatus();
      const lockMsg = result.active_juror_count > 0
        ? `Jury access revoked. ${result.active_juror_count} active session(s) locked.`
        : "Jury access revoked and evaluations locked.";
      _toast.success(lockMsg);
      setRevokeModalOpen(false);
    } catch (e) {
      setError(e?.unauthorized ? "Unauthorized — check your session." : "Could not revoke token.");
      _toast.error("Could not revoke jury access — please try again");
    } finally {
      setRevoking(false);
    }
  }

  async function handleCopy() {
    if (!entryUrl) return;
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = entryUrl;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Could not copy to clipboard.");
      }
    }
  }

  async function handleSendEmail(e) {
    e.preventDefault();
    if (!emailAddr.trim() || !entryUrl) return;
    setEmailSending(true);
    setEmailError("");
    setEmailSent(false);
    try {
      await sendEntryTokenEmail({
        recipientEmail: emailAddr.trim(),
        tokenUrl: entryUrl,
        expiresIn: expiryLabel || undefined,
        periodName: periodName || undefined,
      });
      setEmailSent(true);
      setEmailAddr("");
      _toast.success("Access link sent");
    } catch (err) {
      setEmailError(err?.message || "Could not send email — please try again.");
    } finally {
      setEmailSending(false);
    }
  }

  function handleDownload() {
    if (!qrInstance.current) return;
    qrInstance.current.download({
      name: `jury-qr-${periodName || periodId || "access"}`,
      extension: "png",
    });
  }

  const hasToken = status?.has_token;
  const isActive = status?.enabled;
  const isBusy = regenerating || revoking;
  const expirySoon = isExpiringSoon(status?.expires_at);
  const expiryLabel = fmtExpiry(status?.expires_at);
  const activeSessions = status?.active_session_count ?? status?.active_juror_count ?? "—";

  if (!periodId) {
    return (
      <div className="page" id="page-entry-control">
        <div className="page-title">Entry Control</div>
        <div className="page-desc">Select an evaluation period to manage QR access tokens.</div>
      </div>
    );
  }

  return (
    <div className="page" id="page-entry-control">
      <div className="page-title">Entry Control</div>
      <div className="page-desc" style={{ marginBottom: 18 }}>
        Manage QR access tokens, monitor active jury sessions, and control entry to the evaluation.
      </div>

      {/* Expiry advisory banner */}
      {expirySoon && expiryLabel && (
        <div className="ec-expiry-banner">
          <div className="ec-expiry-banner-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path d="M12 9v4m0 4h.01" />
            </svg>
          </div>
          <div className="ec-expiry-banner-content">
            <div className="ec-expiry-banner-title">Access expires in {expiryLabel}</div>
            <div className="ec-expiry-banner-text">
              Jurors will lose entry after expiration. Regenerate now to ensure uninterrupted access.
            </div>
          </div>
          <button className="ec-expiry-banner-action" onClick={handleGenerate} disabled={isBusy}>
            Regenerate QR
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{hasToken ? (status?.token_prefix || "Active") : "—"}</div>
          <div className="scores-kpi-item-label">Active Token</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">
            {hasToken && isActive ? <span className="success">{activeSessions}</span> : "—"}
          </div>
          <div className="scores-kpi-item-label">Active Sessions</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={expirySoon ? { color: "var(--danger)" } : {}}>
            {expiryLabel || (status?.expires_at ? fmtDate(status.expires_at) : "—")}
          </div>
          <div className="scores-kpi-item-label">Expires</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{status?.last_activity ? fmtDate(status.last_activity) : "—"}</div>
          <div className="scores-kpi-item-label">Last Activity</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{status?.revoked_count ?? "—"}</div>
          <div className="scores-kpi-item-label">Revoked</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">
            <span className="success">{status?.total_entries ?? "—"}</span>
          </div>
          <div className="scores-kpi-item-label">Total Entries</div>
        </div>
      </div>

      {error && (
        <FbAlert variant="danger" style={{ marginBottom: 12 }}>
          {error}
        </FbAlert>
      )}

      {/* Main layout */}
      <div className="ec-layout">
        {/* QR Card */}
        <div className="ec-qr-card">
          <div className="ec-qr-status">
            {hasToken && isActive ? (
              <span className="badge badge-success">
                <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Active
              </span>
            ) : hasToken ? (
              <span className="badge badge-danger">Revoked</span>
            ) : (
              <span className="badge badge-neutral">No Token</span>
            )}
          </div>

          {/* QR Frame */}
          <div className="ec-qr-frame">
            {rawToken ? (
              <div ref={qrRef} style={{ display: "flex", justifyContent: "center" }} />
            ) : (
              /* Placeholder SVG from prototype */
              <svg viewBox="0 0 148 148" xmlns="http://www.w3.org/2000/svg">
                <rect width="148" height="148" fill="none" />
                <rect x="10" y="10" width="36" height="36" rx="4" fill="var(--text-primary)" opacity="0.85" />
                <rect x="14" y="14" width="28" height="28" rx="2" fill="var(--bg-card)" />
                <rect x="20" y="20" width="16" height="16" rx="1" fill="var(--text-primary)" opacity="0.85" />
                <rect x="102" y="10" width="36" height="36" rx="4" fill="var(--text-primary)" opacity="0.85" />
                <rect x="106" y="14" width="28" height="28" rx="2" fill="var(--bg-card)" />
                <rect x="112" y="20" width="16" height="16" rx="1" fill="var(--text-primary)" opacity="0.85" />
                <rect x="10" y="102" width="36" height="36" rx="4" fill="var(--text-primary)" opacity="0.85" />
                <rect x="14" y="106" width="28" height="28" rx="2" fill="var(--bg-card)" />
                <rect x="20" y="112" width="16" height="16" rx="1" fill="var(--text-primary)" opacity="0.85" />
                <g fill="var(--text-primary)" opacity="0.3">
                  <rect x="54" y="54" width="40" height="40" rx="4" />
                </g>
              </svg>
            )}
          </div>

          <div className="ec-qr-label">
            {hasToken && isActive ? "Active Access QR" : "No Active QR"}
          </div>
          <div className="ec-qr-hint">
            Jurors scan this code to join the current evaluation flow. Print or display it at the poster session.
          </div>

          {status && (
            <div className="ec-qr-meta">
              <div className="ec-meta-row">
                <span className="ec-meta-row-label">Period</span>
                <span className="ec-meta-row-value">{periodName || periodId}</span>
              </div>
              {status.created_at && (
                <div className="ec-meta-row">
                  <span className="ec-meta-row-label">Created</span>
                  <span className="ec-meta-row-value vera-datetime-text">{fmtDate(status.created_at)}</span>
                </div>
              )}
              {status.expires_at && (
                <div className="ec-meta-row">
                  <span className="ec-meta-row-label">Expires</span>
                  <span className="ec-meta-row-value vera-datetime-text" style={expirySoon ? { color: "var(--danger)" } : {}}>
                    {fmtDate(status.expires_at)}
                  </span>
                </div>
              )}
              <div className="ec-meta-row">
                <span className="ec-meta-row-label">Active sessions</span>
                <span className="ec-meta-row-value">{activeSessions}</span>
              </div>
            </div>
          )}

          {/* Action toolbar */}
          <div className="ec-qr-actions">
            {rawToken && (
              <button className="btn btn-primary btn-sm" onClick={handleDownload} disabled={isBusy}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download QR
              </button>
            )}
            {rawToken && (
              <button className="btn btn-outline btn-sm" onClick={handleCopy} disabled={isBusy}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={handleGenerate} disabled={isBusy}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={regenerating ? "ec-spin" : ""}>
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
              {regenerating ? "Generating…" : (hasToken ? "Regenerate" : "Generate QR")}
            </button>
            {hasToken && isActive && (
              <button className="btn btn-outline btn-sm btn-revoke" onClick={() => setRevokeModalOpen(true)} disabled={isBusy}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
                Revoke
              </button>
            )}
          </div>

          {/* Token detail disclosure */}
          {rawToken && (
            <div className="ec-token-detail">
              <button
                className={`ec-token-toggle${showTokenDetail ? " open" : ""}`}
                onClick={() => setShowTokenDetail((v) => !v)}
              >
                Token details
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {showTokenDetail && (
                <div className="ec-token-row show">
                  <span className="ec-token-code">{rawToken.slice(0, 12)}…</span>
                  <button className="ec-token-copy" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Email access link */}
          {rawToken && isActive && (
            <div className="ec-email-section">
              <div className="ec-email-label">Send access link via email</div>
              <form className="ec-email-form" onSubmit={handleSendEmail}>
                <input
                  className="modal-input ec-email-input"
                  type="email"
                  placeholder="juror@university.edu"
                  value={emailAddr}
                  onChange={(e) => { setEmailAddr(e.target.value); setEmailSent(false); setEmailError(""); }}
                  disabled={emailSending}
                />
                <button
                  className="btn btn-outline btn-sm"
                  type="submit"
                  disabled={emailSending || !emailAddr.trim()}
                >
                  <span className="btn-loading-content">
                    <AsyncButtonContent loading={emailSending} loadingText="Sending…">Send</AsyncButtonContent>
                  </span>
                </button>
              </form>
              {emailSent && (
                <div className="ec-email-success">Access link sent successfully.</div>
              )}
              {emailError && (
                <div className="ec-email-error">{emailError}</div>
              )}
            </div>
          )}
        </div>

        {/* Session Overview */}
        <div className="ec-sessions">
          <div className="ec-sessions-title">
            Session Overview{" "}
            {status?.total_sessions != null && (
              <span className="ec-title-count">{status.total_sessions} total</span>
            )}
          </div>
          <div className="ec-sessions-grid">
            <div className="ec-sessions-stat">
              <div className="ec-sessions-stat-value success">{activeSessions}</div>
              <div className="ec-sessions-stat-label">Active</div>
            </div>
            <div className="ec-sessions-stat">
              <div className="ec-sessions-stat-value muted">{status?.expired_session_count ?? "—"}</div>
              <div className="ec-sessions-stat-label">Expired</div>
            </div>
            <div className="ec-sessions-stat">
              <div className="ec-sessions-stat-value">{status?.total_sessions ?? "—"}</div>
              <div className="ec-sessions-stat-label">Total</div>
            </div>
          </div>
          {status?.total_sessions > 0 && (
            <>
              <div className="ec-sessions-bar-wrap">
                <div className="ec-sessions-bar">
                  <span style={{
                    width: `${Math.round(((status.active_session_count || 0) / status.total_sessions) * 100)}%`,
                    background: "var(--success)"
                  }} />
                </div>
                <div className="ec-sessions-bar-label">
                  {status.active_session_count || 0} of {status.total_sessions} sessions active
                </div>
              </div>
            </>
          )}
          <div className="ec-divider" />
          <div className="ec-sessions-activity-title">Recent Activity</div>
          <div className="ec-sessions-list">
            <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
              {hasToken && isActive ? "Session activity unavailable in this view." : "No active token."}
            </div>
          </div>
        </div>
      </div>

      {/* Access History */}
      <div className="card" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="card-header">
          <div className="card-title">Access History</div>
          <span className="text-sm text-muted" style={{ fontWeight: 500 }}>
            {status?.has_token ? "Token history" : "No tokens generated"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Access ID</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Sessions</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hasToken ? (
                <tr style={{ background: "var(--accent-soft)" }}>
                  <td className="mono" style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {status?.token_prefix || "Current"}
                  </td>
                  <td className="text-sm" style={{ fontWeight: 500 }}>{fmtDate(status?.created_at)}</td>
                  <td className="text-sm">{fmtDate(status?.expires_at)}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{activeSessions}</td>
                  <td>
                    {isActive ? (
                      <span className="badge badge-success">
                        <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Active
                      </span>
                    ) : (
                      <span className="badge badge-danger">Revoked</span>
                    )}
                  </td>
                  <td className="text-right">
                    {rawToken && isActive && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600 }}
                        onClick={handleDownload}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                        </svg>
                        QR
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                    No tokens generated for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JuryRevokeConfirmDialog
        open={revokeModalOpen}
        loading={revoking}
        activeJurorCount={status?.active_juror_count ?? status?.active_session_count ?? 0}
        onCancel={() => setRevokeModalOpen(false)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
