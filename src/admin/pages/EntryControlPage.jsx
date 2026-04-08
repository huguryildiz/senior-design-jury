// src/admin/EntryControlPage.jsx — Phase 9
// Entry Control page: QR access tokens, session monitoring, access history.
// Prototype: vera-premium-prototype.html lines 14797–15047

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import QRCodeStyling from "qr-code-styling";
import veraLogo from "@/assets/vera_logo.png";
import FbAlert from "@/shared/ui/FbAlert";
import Modal from "@/shared/ui/Modal";
import {
  generateEntryToken,
  revokeEntryToken,
  getEntryTokenStatus,
  getEntryTokenHistory,
  getActiveEntryTokenPlain,
  sendEntryTokenEmail,
  supabase,
} from "@/shared/api";
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

function fmtExpiryHeadline(ts) {
  if (!ts) return null;
  try {
    const diff = Date.parse(ts) - Date.now();
    if (diff <= 0) return "expired";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? "" : "s"}`;
    }
    if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${Math.max(mins, 1)} minute${mins === 1 ? "" : "s"}`;
  } catch {
    return null;
  }
}

function fmtExpiryCompact(ts) {
  if (!ts) return null;
  try {
    const diff = Date.parse(ts) - Date.now();
    if (diff <= 0) return "expired";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h left`;
    return `${Math.max(mins, 1)}m left`;
  } catch {
    return null;
  }
}

function fmtRelative(ts) {
  if (!ts) return null;
  try {
    const diff = Date.now() - Date.parse(ts);
    if (!Number.isFinite(diff) || diff < 0) return null;
    if (diff < 60000) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return null;
  }
}

function fmtTokenPrefix(prefix) {
  if (!prefix) return null;
  const clean = String(prefix).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!clean) return null;
  if (clean.length >= 6) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
  if (clean.length >= 4) {
    const mid = Math.ceil(clean.length / 2);
    return `${clean.slice(0, mid)}-${clean.slice(mid)}`;
  }
  return clean;
}

function toTimestampMs(ts) {
  if (!ts) return 0;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : 0;
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

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) {
    return <span className="sort-icon sort-icon-inactive">▲</span>;
  }
  return (
    <span className="sort-icon sort-icon-active">
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

export default function EntryControlPage() {
  const {
    organizationId,
    selectedPeriodId,
    selectedPeriod,
    allJurors = [],
    isDemoMode = false,
  } = useAdminContext();
  const periodId = selectedPeriodId;
  const periodName = selectedPeriod?.name || selectedPeriod?.period_name || selectedPeriod?.semester_name || "";

  const [status, setStatus] = useState(null);
  const [tokenHistory, setTokenHistory] = useState([]);
  const [error, setError] = useState("");
  const [rawToken, setRawToken] = useState("");
  const [showTokenDetail, setShowTokenDetail] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historySortKey, setHistorySortKey] = useState("created_at");
  const [historySortDir, setHistorySortDir] = useState("desc");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendSuccessOpen, setSendSuccessOpen] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [bulkSending, setBulkSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserSending, setNewUserSending] = useState(false);
  const [newUserError, setNewUserError] = useState("");
  const [lastBulkSend, setLastBulkSend] = useState(null);
  const [sendSummary, setSendSummary] = useState({ delivered: 0, skipped: 0, failed: 0 });
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const qrRef = useRef(null);
  const qrInstance = useRef(null);
  const _toast = useToast();

  const entryUrl = rawToken
    ? `${window.location.origin}/?eval=${encodeURIComponent(rawToken)}${isDemoMode ? "&env=demo" : ""}`
    : "";

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setCurrentUserEmail(data?.user?.email || "");
      })
      .catch(() => {
        if (!mounted) return;
        setCurrentUserEmail("");
      });
    return () => { mounted = false; };
  }, []);

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
      const [s, history] = await Promise.all([
        getEntryTokenStatus(periodId),
        getEntryTokenHistory(periodId),
      ]);
      setStatus(s);
      const normalizedHistory = [...(history || [])].sort((a, b) => (
        toTimestampMs(b?.created_at) - toTimestampMs(a?.created_at)
      ));
      setTokenHistory(normalizedHistory);
    } catch (e) {
      setError(e?.unauthorized ? "Session expired — please log in again." : "Could not load token status.");
    }
  }, [periodId]);

  useEffect(() => {
    if (!periodId) {
      setRawToken("");
      setStatus(null);
      setTokenHistory([]);
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
        setHistorySortKey("created_at");
        setHistorySortDir("desc");
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

  const recipients = (allJurors || [])
    .filter((row) => row?.jurorId)
    .map((row) => {
      const name = row.juryName || "Unnamed juror";
      const email = (row.email || "").trim();
      const parts = String(name).trim().split(/\s+/).filter(Boolean);
      const initials = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
      return {
        id: row.jurorId,
        name,
        email,
        hasEmail: Boolean(email),
        initials: initials.toUpperCase() || "JR",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const emailRecipients = recipients.filter((r) => r.hasEmail);
  const noEmailCount = recipients.length - emailRecipients.length;
  const selectedSet = new Set(selectedRecipientIds);
  const selectedCount = emailRecipients.filter((r) => selectedSet.has(r.id)).length;

  const initializeRecipients = useCallback(() => {
    setSelectedRecipientIds(emailRecipients.map((r) => r.id));
  }, [emailRecipients]);

  function openSendModal() {
    if (!entryUrl) {
      _toast.error("Generate an active QR token first.");
      return;
    }
    initializeRecipients();
    setSendModalOpen(true);
  }

  function toggleRecipient(recipient) {
    if (!recipient?.hasEmail) return;
    setSelectedRecipientIds((prev) => {
      if (prev.includes(recipient.id)) return prev.filter((id) => id !== recipient.id);
      return [...prev, recipient.id];
    });
  }

  function selectAllRecipients() {
    setSelectedRecipientIds(emailRecipients.map((r) => r.id));
  }

  function deselectAllRecipients() {
    setSelectedRecipientIds([]);
  }

  async function handleSendTestToMe() {
    if (!entryUrl) return;
    if (!currentUserEmail) {
      _toast.error("Could not determine your account email.");
      return;
    }
    setTestSending(true);
    try {
      const result = await sendEntryTokenEmail({
        recipientEmail: currentUserEmail,
        tokenUrl: entryUrl,
        expiresIn: expiryLabel || undefined,
        periodName: periodName || undefined,
      });
      if (result?.sent === false || result?.ok === false) {
        throw new Error(result?.error || "send_failed");
      }
      _toast.success(`Test sent to ${currentUserEmail}`);
    } catch (err) {
      _toast.error(err?.message || "Could not send test email.");
    } finally {
      setTestSending(false);
    }
  }

  async function handleSendToNewUser() {
    if (!entryUrl) return;
    const email = String(newUserEmail || "").trim().toLowerCase();
    if (!email) {
      setNewUserError("Please enter an email address.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setNewUserError("Please enter a valid email address.");
      return;
    }
    setNewUserSending(true);
    setNewUserError("");
    try {
      const result = await sendEntryTokenEmail({
        recipientEmail: email,
        tokenUrl: entryUrl,
        expiresIn: expiryLabel || undefined,
        periodName: periodName || undefined,
      });
      if (result?.sent === false || result?.ok === false) {
        throw new Error(result?.error || "send_failed");
      }
      _toast.success(`Access link sent to ${email}`);
      setNewUserEmail("");
      setNewUserModalOpen(false);
    } catch (err) {
      setNewUserError(err?.message || "Could not send email.");
    } finally {
      setNewUserSending(false);
    }
  }

  async function handleBulkSend() {
    if (!entryUrl) return;
    const targets = emailRecipients.filter((recipient) => selectedSet.has(recipient.id));
    if (!targets.length) return;
    setBulkSending(true);
    try {
      const results = await Promise.allSettled(
        targets.map((recipient) =>
          sendEntryTokenEmail({
            recipientEmail: recipient.email,
            tokenUrl: entryUrl,
            expiresIn: expiryLabel || undefined,
            periodName: periodName || undefined,
          })
        )
      );
      let delivered = 0;
      let failed = 0;
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const payload = result.value;
          if (payload?.sent === false || payload?.ok === false) {
            failed += 1;
          } else {
            delivered += 1;
          }
        } else {
          failed += 1;
        }
      });
      const summary = { delivered, skipped: noEmailCount, failed };
      setSendSummary(summary);
      setLastBulkSend({
        sentAt: new Date().toISOString(),
        delivered,
        selected: targets.length,
        noEmail: noEmailCount,
        failed,
        totalAssigned: recipients.length,
      });
      setSendModalOpen(false);
      setSendSuccessOpen(true);
      if (delivered > 0) {
        _toast.success(`Sent to ${delivered} juror${delivered === 1 ? "" : "s"}.`);
      }
      if (failed > 0) {
        _toast.error(`${failed} email${failed === 1 ? "" : "s"} failed to send.`);
      }
    } catch (err) {
      _toast.error(err?.message || "Bulk send failed.");
    } finally {
      setBulkSending(false);
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
  const expiryHeadline = fmtExpiryHeadline(status?.expires_at);
  const expiryCompact = fmtExpiryCompact(status?.expires_at);
  const activeSessionsCount = typeof status?.active_session_count === "number"
    ? status.active_session_count
    : (typeof status?.active_juror_count === "number" ? status.active_juror_count : null);
  const totalSessionsCount = typeof status?.total_sessions === "number" ? status.total_sessions : null;
  const activeSessions = activeSessionsCount ?? "—";
  const lastActivityLabel = fmtRelative(status?.last_activity) || "—";
  const tokenPrefixLabel = hasToken ? (fmtTokenPrefix(status?.token_prefix) || "ACTIVE") : "—";
  const entryUrlLabel = (() => {
    if (!entryUrl) return "";
    try {
      const url = new URL(entryUrl);
      const evalToken = url.searchParams.get("eval");
      if (!evalToken || evalToken.length <= 16) return entryUrl;
      const shortened = `${evalToken.slice(0, 8)}...${evalToken.slice(-4)}`;
      url.searchParams.set("eval", shortened);
      return url.toString();
    } catch {
      return entryUrl;
    }
  })();
  const hasTokenHistory = tokenHistory.length > 0;
  const sortedTokenHistory = [...tokenHistory].sort((a, b) => {
    const dirMul = historySortDir === "asc" ? 1 : -1;
    const statusValue = (row) => {
      if (row?.is_active) return 3;
      if (row?.is_expired) return 2;
      return 1;
    };
    const numOrMin = (value) => (typeof value === "number" ? value : Number.NEGATIVE_INFINITY);
    switch (historySortKey) {
      case "access_id":
        return dirMul * String(a?.access_id || "").localeCompare(String(b?.access_id || ""), undefined, { numeric: true, sensitivity: "base" });
      case "created_at":
        {
          const createdDiff = Date.parse(a?.created_at || "") - Date.parse(b?.created_at || "");
          if (createdDiff !== 0) return dirMul * createdDiff;
          return dirMul * String(a?.id || "").localeCompare(String(b?.id || ""));
        }
      case "expires_at":
        return dirMul * (Date.parse(a?.expires_at || "") - Date.parse(b?.expires_at || ""));
      case "session_count":
        return dirMul * (numOrMin(a?.session_count) - numOrMin(b?.session_count));
      case "status":
        return dirMul * (statusValue(a) - statusValue(b));
      default:
        return 0;
    }
  });
  const latestToken = hasTokenHistory ? sortedTokenHistory[0] : null;
  const revokedCount = status?.revoked_count ?? tokenHistory.filter((token) => token.is_revoked).length;
  const totalEntries = status?.total_entries ?? tokenHistory.length;
  const recentActivities = useMemo(() => {
    const now = Date.now();
    return (allJurors || [])
      .filter((juror) => juror?.jurorId)
      .map((juror) => {
        const name = juror.juryName || "Unnamed juror";
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        const initials = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "JR";
        const lastSeenAt = juror.lastSeenAt || juror.last_seen_at || null;
        const finalSubmittedAt = juror.finalSubmittedAt || juror.final_submitted_at || null;
        const lastSeenMs = toTimestampMs(lastSeenAt);
        const finalSubmittedMs = toTimestampMs(finalSubmittedAt);
        const latestMs = Math.max(lastSeenMs, finalSubmittedMs);
        const latestAt = latestMs > 0 ? new Date(latestMs).toISOString() : null;
        const staleMs = latestMs > 0 ? now - latestMs : Number.POSITIVE_INFINITY;
        const isExpired = latestMs > 0 && staleMs >= 6 * 3600000;
        const isIdle = !isExpired && latestMs > 0 && staleMs >= 90 * 60000;

        let statusText = "Awaiting activity";
        let timeText = "—";
        let dotTone = "muted";
        let isDimmed = false;
        if (juror.finalSubmitted || finalSubmittedAt) {
          statusText = "Final scores submitted";
          dotTone = "success";
        } else if (juror.editEnabled) {
          statusText = "Scoring in progress";
          dotTone = "warning";
        } else if ((juror.completedProjects || 0) > 0) {
          const total = juror.totalProjects || "—";
          statusText = `${juror.completedProjects}/${total} projects scored`;
          dotTone = "neutral";
        }
        if (isExpired) {
          statusText = "Session expired";
          timeText = "expired";
          dotTone = "muted";
          isDimmed = true;
        } else if (isIdle) {
          const rel = latestAt ? (fmtRelative(latestAt) || fmtDate(latestAt)) : "a while ago";
          statusText = `Idle — last seen ${rel}`;
          const idleHours = Math.max(1, Math.floor(staleMs / 3600000));
          timeText = `idle ${idleHours}h`;
          dotTone = "warning";
        } else if (latestAt) {
          timeText = fmtRelative(latestAt) || fmtDate(latestAt);
          if (dotTone === "muted") dotTone = "success";
        }

        return {
          id: juror.jurorId,
          name,
          initials,
          latestAt,
          latestMs,
          statusText,
          timeText,
          dotClass:
            dotTone === "success"
              ? "dot-success"
              : dotTone === "warning"
                ? "dot-warning"
                : dotTone === "neutral"
                  ? "dot-neutral"
                  : "dot-muted",
          isDimmed,
        };
      })
      .filter((item) => item.latestMs > 0 || item.statusText !== "Awaiting activity")
      .sort((a, b) => {
        if (b.latestMs !== a.latestMs) return b.latestMs - a.latestMs;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [allJurors]);

  function handleHistorySort(key) {
    if (historySortKey === key) {
      setHistorySortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setHistorySortKey(key);
    setHistorySortDir(key === "created_at" ? "desc" : "asc");
  }

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
            <div className="ec-expiry-banner-title">Access expires in {expiryHeadline || expiryLabel}</div>
            <div className="ec-expiry-banner-text">
              Jurors will lose entry after expiration. Extend now to ensure uninterrupted access.
            </div>
          </div>
          <button className="ec-expiry-banner-action" onClick={handleGenerate} disabled={isBusy}>
            Extend 24 hours
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{tokenPrefixLabel}</div>
          <div className="scores-kpi-item-label">Active Token</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">
            {hasToken && isActive ? (
              activeSessionsCount != null && totalSessionsCount != null ? (
                <>
                  <span className="success">{activeSessionsCount}</span>
                  <span> / </span>
                  <span>{totalSessionsCount}</span>
                </>
              ) : (
                activeSessions
              )
            ) : "—"}
          </div>
          <div className="scores-kpi-item-label">Active Sessions</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={expirySoon ? { color: "var(--danger)" } : undefined}>
            {expiryCompact || (status?.expires_at ? fmtDate(status.expires_at) : "—")}
          </div>
          <div className="scores-kpi-item-label">Expires</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{lastActivityLabel}</div>
          <div className="scores-kpi-item-label">Last Activity</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{revokedCount}</div>
          <div className="scores-kpi-item-label">Revoked</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="success">{totalEntries}</span></div>
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
            ) : latestToken?.is_expired ? (
              <span className="badge badge-warning">Expired</span>
            ) : hasTokenHistory ? (
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
              <button className="btn btn-primary btn-sm ec-download-btn" onClick={handleDownload} disabled={isBusy}>
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

          {/* Bulk distribute panel */}
          {rawToken && isActive && (
            <div className="ec-distribute" id="ec-distribute-panel">
              <div className="ec-distribute-header">
                <div className="ec-distribute-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22l-4-9-9-4z" />
                  </svg>
                </div>
                <div>
                  <div className="ec-distribute-title">Distribute to Jurors</div>
                  <div className="ec-distribute-subtitle">
                    Send the access link to all {recipients.length} jurors assigned to {periodName || "this period"}
                  </div>
                </div>
              </div>
              <div className="ec-distribute-body">
                <button className="ec-distribute-btn" onClick={openSendModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22l-4-9-9-4z" />
                  </svg>
                  Send QR to All Jurors
                </button>
                <div className="ec-distribute-actions">
                  <button className="ec-distribute-link" onClick={openSendModal}>Preview recipients</button>
                  <button className="ec-distribute-link" onClick={handleSendTestToMe} disabled={testSending}>
                    {testSending ? "Sending..." : "Send test"}
                  </button>
                </div>
              </div>
              <div className="ec-distribute-meta" id="ec-last-sent">
                <div className="ec-sent-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Sent
                </div>
                {lastBulkSend
                  ? `Last bulk send: ${fmtDate(lastBulkSend.sentAt)} — ${lastBulkSend.delivered} of ${lastBulkSend.totalAssigned} delivered, ${lastBulkSend.noEmail} without email`
                  : "No bulk send yet for this period."}
              </div>
            </div>
          )}

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
                  <span className="mono text-sm" title={entryUrl}>{entryUrlLabel}</span>
                  <button className="ec-token-copy" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
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
            {hasToken && isActive ? (
              recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="ec-session-item" style={activity.isDimmed ? { opacity: 0.6 } : undefined}>
                    <div
                      className={`ec-session-dot status-dot ${activity.dotClass || "dot-muted"}`}
                    />
                    <div className="ec-session-avatar">{activity.initials}</div>
                    <div className="ec-session-info">
                      <div className="ec-session-name">{activity.name}</div>
                      <div className="ec-session-status-text">{activity.statusText}</div>
                    </div>
                    <div className="ec-session-time" title={activity.latestAt ? fmtDate(activity.latestAt) : undefined}>
                      {activity.timeText}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
                  No recent juror activity yet.
                </div>
              )
            ) : (
              <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
                No active token.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Access History */}
      <div className="card" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="card-header">
          <div className="card-title">Access History</div>
          <span className="text-sm text-muted" style={{ fontWeight: 500 }}>
            {hasTokenHistory
              ? `${tokenHistory.length} token${tokenHistory.length > 1 ? "s" : ""} generated`
              : "No tokens generated"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className={`sortable${historySortKey === "access_id" ? " sorted" : ""}`} onClick={() => handleHistorySort("access_id")}>
                  Reference ID <SortIcon colKey="access_id" sortKey={historySortKey} sortDir={historySortDir} />
                </th>
                <th className={`sortable${historySortKey === "created_at" ? " sorted" : ""}`} onClick={() => handleHistorySort("created_at")}>
                  Created <SortIcon colKey="created_at" sortKey={historySortKey} sortDir={historySortDir} />
                </th>
                <th className={`sortable${historySortKey === "expires_at" ? " sorted" : ""}`} onClick={() => handleHistorySort("expires_at")}>
                  Expires <SortIcon colKey="expires_at" sortKey={historySortKey} sortDir={historySortDir} />
                </th>
                <th className={`sortable${historySortKey === "session_count" ? " sorted" : ""}`} onClick={() => handleHistorySort("session_count")}>
                  Sessions <SortIcon colKey="session_count" sortKey={historySortKey} sortDir={historySortDir} />
                </th>
                <th className={`sortable${historySortKey === "status" ? " sorted" : ""}`} onClick={() => handleHistorySort("status")}>
                  Status <SortIcon colKey="status" sortKey={historySortKey} sortDir={historySortDir} />
                </th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hasTokenHistory ? (
                sortedTokenHistory.map((token) => (
                  <tr key={token.id} style={token.is_active ? { background: "var(--accent-soft)" } : undefined}>
                    <td className="mono" style={token.is_active ? { fontWeight: 700, color: "var(--accent)" } : {}}>
                      {token.access_id}
                    </td>
                    <td className="text-sm" style={{ fontWeight: 500 }}>{fmtDate(token.created_at)}</td>
                    <td className="text-sm">{fmtDate(token.expires_at)}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {typeof token.session_count === "number" ? token.session_count : "—"}
                    </td>
                    <td>
                      {token.is_active ? (
                        <span className="badge badge-success" style={{ boxShadow: "0 0 0 2px var(--success-soft)" }}>
                          <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Active
                        </span>
                      ) : token.is_expired ? (
                        <span className="badge badge-neutral">
                          <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 1.8" />
                          </svg>
                          Expired
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="m15 9-6 6" />
                            <path d="m9 9 6 6" />
                          </svg>
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {rawToken && token.is_active && (
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
                ))
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

      <Modal open={sendModalOpen} onClose={() => setSendModalOpen(false)} size="md">
        <div className="fs-modal-header">
          <div className="fs-modal-header-row">
            <div style={{ flex: 1 }}>
              <div className="fs-title">Send QR to All Jurors</div>
              <div className="fs-subtitle" style={{ marginTop: 3 }}>
                The active access link will be emailed to every juror assigned to <strong>{periodName || "this period"}</strong>.
              </div>
            </div>
            <button className="fs-close" onClick={() => setSendModalOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="fs-modal-body" style={{ paddingTop: 10, paddingBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{recipients.length}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--text-tertiary)", marginTop: 2 }}>Assigned</div>
            </div>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--accent)", background: "var(--accent-soft)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{selectedCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--text-tertiary)", marginTop: 2 }}>Selected</div>
            </div>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800, color: "var(--warning)" }}>{noEmailCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--text-tertiary)", marginTop: 2 }}>No Email</div>
            </div>
          </div>
          <div className="ec-send-toolbar">
            <div className="ec-send-toolbar-label"><span id="ec-send-count-label">{selectedCount} of {recipients.length}</span> jurors selected</div>
            <div className="ec-send-toolbar-actions">
              <button className="ec-send-toolbar-btn" onClick={selectAllRecipients}>Select all</button>
              <button className="ec-send-toolbar-btn" onClick={deselectAllRecipients}>Deselect all</button>
            </div>
          </div>
          <div className="ec-send-recipients" id="ec-send-list">
            {recipients.map((recipient) => {
              const checked = selectedSet.has(recipient.id);
              const rowClassName = recipient.hasEmail
                ? `ec-send-recipient ${checked ? "checked" : "unchecked"}`
                : "ec-send-recipient no-email-row";
              return (
                <div
                  key={recipient.id}
                  className={rowClassName}
                  onClick={recipient.hasEmail ? () => toggleRecipient(recipient) : undefined}
                >
                  <div className="ec-send-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div className="ec-send-recipient-avatar">{recipient.initials}</div>
                  <span className="ec-send-recipient-name">{recipient.name}</span>
                  {recipient.hasEmail ? (
                    <span className="ec-send-recipient-email">{recipient.email}</span>
                  ) : (
                    <span className="ec-send-recipient-tag no-email">No email</span>
                  )}
                </div>
              );
            })}
          </div>
          {noEmailCount > 0 && (
            <div className="fs-alert warning" style={{ margin: "14px 0 0" }}>
              <div className="fs-alert-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
              <div className="fs-alert-body">
                <div className="fs-alert-title">{noEmailCount} juror{noEmailCount === 1 ? "" : "s"} without email addresses</div>
                <div className="fs-alert-desc">They will be skipped. You can add their emails in the Jurors page.</div>
              </div>
            </div>
          )}
        </div>
        <div className="fs-modal-footer">
          <div className="ec-send-footer-left">
            <button
              className="ec-distribute-link"
              onClick={() => { setNewUserError(""); setNewUserModalOpen(true); }}
              style={{ fontSize: 11, padding: "6px 10px" }}
            >
              Send to new user
            </button>
          </div>
          <button className="fs-btn fs-btn-secondary" onClick={() => setSendModalOpen(false)}>Cancel</button>
          <button className="fs-btn fs-btn-primary" id="ec-send-submit-btn" onClick={handleBulkSend} disabled={bulkSending || selectedCount === 0}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4z" />
            </svg>
            <AsyncButtonContent loading={bulkSending} loadingText="Sending...">
              <span id="ec-send-btn-label">Send to {selectedCount} Juror{selectedCount === 1 ? "" : "s"}</span>
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>

      <Modal open={sendSuccessOpen} onClose={() => setSendSuccessOpen(false)} size="sm" centered>
        <div className="fs-modal-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div className="ec-send-success">
            <div className="ec-send-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="ec-send-success-title">QR link sent to {sendSummary.delivered} jurors</div>
            <div className="ec-send-success-desc">
              Access link for {periodName || "this period"} was delivered successfully.
              {sendSummary.skipped > 0 ? ` ${sendSummary.skipped} juror${sendSummary.skipped === 1 ? "" : "s"} were skipped (no email on file).` : ""}
              {sendSummary.failed > 0 ? ` ${sendSummary.failed} email${sendSummary.failed === 1 ? "" : "s"} failed.` : ""}
            </div>
          </div>
        </div>
        <div className="fs-modal-body" style={{ paddingTop: 6 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <div style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: "var(--success)" }}>{sendSummary.delivered}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--text-tertiary)", marginTop: 2 }}>Delivered</div>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: "var(--warning)" }}>{sendSummary.skipped + sendSummary.failed}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--text-tertiary)", marginTop: 2 }}>Skipped</div>
            </div>
          </div>
        </div>
        <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 2 }}>
          <button className="fs-btn fs-btn-secondary" onClick={() => setSendSuccessOpen(false)} style={{ minWidth: 120 }}>Done</button>
        </div>
      </Modal>

      <Modal
        open={newUserModalOpen}
        onClose={() => {
          if (newUserSending) return;
          setNewUserModalOpen(false);
          setNewUserError("");
        }}
        size="sm"
      >
        <div className="fs-modal-header">
          <div className="fs-modal-header-row">
            <div style={{ flex: 1 }}>
              <div className="fs-title">Send Access Link</div>
              <div className="fs-subtitle">Send the active QR access link to a new user email address.</div>
            </div>
            <button
              className="fs-close"
              onClick={() => {
                if (newUserSending) return;
                setNewUserModalOpen(false);
                setNewUserError("");
              }}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="fs-modal-body">
          <input
            className="modal-input"
            type="email"
            placeholder="new.user@university.edu"
            value={newUserEmail}
            onChange={(e) => {
              setNewUserEmail(e.target.value);
              if (newUserError) setNewUserError("");
            }}
            disabled={newUserSending}
            autoFocus
          />
          {newUserError ? (
            <div className="text-xs" style={{ color: "var(--danger)", marginTop: 8 }}>{newUserError}</div>
          ) : null}
        </div>
        <div className="fs-modal-footer">
          <button
            className="fs-btn fs-btn-secondary"
            onClick={() => {
              if (newUserSending) return;
              setNewUserModalOpen(false);
              setNewUserError("");
            }}
            disabled={newUserSending}
          >
            Cancel
          </button>
          <button
            className="fs-btn fs-btn-primary"
            onClick={handleSendToNewUser}
            disabled={newUserSending || !newUserEmail.trim()}
          >
            <AsyncButtonContent loading={newUserSending} loadingText="Sending...">Send</AsyncButtonContent>
          </button>
        </div>
      </Modal>
    </div>
  );
}
