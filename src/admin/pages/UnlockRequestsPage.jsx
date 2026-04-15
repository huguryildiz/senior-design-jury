// src/admin/pages/UnlockRequestsPage.jsx
// Super-admin only: review pending unlock requests + view history.
// Org admin reason → approve (unlock the period) or reject (keep locked).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { useToast } from "@/shared/hooks/useToast";
import FbAlert from "@/shared/ui/FbAlert";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import Pagination from "@/shared/ui/Pagination";
import { listUnlockRequests, resolveUnlockRequest } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dateUtils";
import {
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) return <span className="sort-icon sort-icon-inactive">▲</span>;
  return <span className="sort-icon sort-icon-active">{sortDir === "asc" ? "▲" : "▼"}</span>;
}

const TABS = [
  { key: "pending",  label: "Pending",  icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
];

function StatusPill({ status }) {
  if (status === "approved") {
    return (
      <span className="sem-status sem-status-active" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <CheckCircle2 size={12} />
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="sem-status sem-status-locked" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <XCircle size={12} />
        Rejected
      </span>
    );
  }
  return (
    <span className="sem-status sem-status-draft" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Clock size={12} />
      Pending
    </span>
  );
}

export default function UnlockRequestsPage() {
  const { isSuper } = useAuth();
  const _toast = useToast();

  const [activeTab, setActiveTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null); // { row, decision }
  const [noteDraft, setNoteDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const load = useCallback(async (status) => {
    setLoading(true);
    setErrorBanner("");
    try {
      const data = await listUnlockRequests(status);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrorBanner(e?.message || "Could not load unlock requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuper) return;
    load(activeTab);
    setPage(1);
  }, [isSuper, activeTab, load]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "organization_name") {
        cmp = String(a.organization_name || "").localeCompare(String(b.organization_name || ""), "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "period_name") {
        cmp = String(a.period_name || "").localeCompare(String(b.period_name || ""), "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "requester_name") {
        cmp = String(a.requester_name || "").localeCompare(String(b.requester_name || ""), "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "created_at") {
        cmp = Date.parse(a.created_at || "") - Date.parse(b.created_at || "");
      } else if (sortKey === "status") {
        cmp = String(a.status || "").localeCompare(String(b.status || ""));
      } else if (sortKey === "reviewed_at") {
        cmp = Date.parse(a.reviewed_at || "") - Date.parse(b.reviewed_at || "");
      }
      return cmp * dir;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const openResolve = (row, decision) => {
    setResolveTarget({ row, decision });
    setNoteDraft("");
  };

  const closeResolve = () => {
    if (submitting) return;
    setResolveTarget(null);
    setNoteDraft("");
  };

  const submitResolve = async () => {
    if (!resolveTarget) return;
    setSubmitting(true);
    try {
      const result = await resolveUnlockRequest(
        resolveTarget.row.id,
        resolveTarget.decision,
        noteDraft.trim() || null,
      );
      if (result?.ok) {
        _toast.success(
          resolveTarget.decision === "approved"
            ? `Unlocked ${resolveTarget.row.period_name || "period"}.`
            : `Rejected unlock request for ${resolveTarget.row.period_name || "period"}.`
        );
        setResolveTarget(null);
        setNoteDraft("");
        load(activeTab);
      } else {
        _toast.error(
          result?.error_code === "request_not_pending"
            ? "This request was already resolved."
            : "Could not resolve the request."
        );
      }
    } catch (e) {
      _toast.error(e?.message || "Could not resolve the request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSuper) {
    return <Navigate to="../overview" replace />;
  }

  return (
    <div className="page" id="page-unlock-requests">
      <div>
        <div className="page-title">
          Unlock Requests
        </div>
        <div className="page-desc" style={{ marginBottom: 12 }}>
          Org admins must request approval to unlock a period after evaluations have begun. Review reason, then approve (unlock) or reject (keep locked).
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
        <span className="badge badge-neutral">Super Admin</span>
        <span className="badge" style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid rgba(217,119,6,0.18)" }}>
          Fairness Guard
        </span>
      </div>

      {errorBanner && (
        <FbAlert variant="danger" title="Error">{errorBanner}</FbAlert>
      )}

      <div
        role="tablist"
        aria-label="Request status filter"
        style={{ display: "flex", gap: 6, margin: "16px 0", borderBottom: "1px solid var(--border)" }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ overflow: "auto" }}>
          <table className="organizations-table">
            <thead>
              <tr>
                <th className={`sortable${sortKey === "organization_name" ? " sorted" : ""}`} onClick={() => handleSort("organization_name")}>Organization <SortIcon colKey="organization_name" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className={`sortable${sortKey === "period_name" ? " sorted" : ""}`} onClick={() => handleSort("period_name")}>Period <SortIcon colKey="period_name" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className={`sortable${sortKey === "requester_name" ? " sorted" : ""}`} onClick={() => handleSort("requester_name")}>Requester <SortIcon colKey="requester_name" sortKey={sortKey} sortDir={sortDir} /></th>
                <th>Reason</th>
                <th className={`sortable${sortKey === "created_at" ? " sorted" : ""}`} onClick={() => handleSort("created_at")}>Requested <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className={`sortable${sortKey === "status" ? " sorted" : ""}`} onClick={() => handleSort("status")}>Status <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} /></th>
                {activeTab !== "pending" && <th className={`sortable${sortKey === "reviewed_at" ? " sorted" : ""}`} onClick={() => handleSort("reviewed_at")}>Reviewed <SortIcon colKey="reviewed_at" sortKey={sortKey} sortDir={sortDir} /></th>}
                {activeTab === "pending" && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={activeTab === "pending" ? 7 : 7} style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)" }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={activeTab === "pending" ? 7 : 7} style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)" }}>
                    No {activeTab} requests.
                  </td>
                </tr>
              )}
              {!loading && pageRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.organization_name || "—"}</td>
                  <td><strong>{r.period_name || "—"}</strong></td>
                  <td>{r.requester_name || "—"}</td>
                  <td style={{ maxWidth: 400, whiteSpace: "normal", textAlign: "justify", textJustify: "inter-word" }}>
                    {r.reason}
                  </td>
                  <td className="vera-datetime-text">{formatDateTime(r.created_at)}</td>
                  <td><StatusPill status={r.status} /></td>
                  {activeTab !== "pending" && (
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      <div>{r.reviewer_name || "—"}</div>
                      <div className="vera-datetime-text">{r.reviewed_at ? formatDateTime(r.reviewed_at) : ""}</div>
                      {r.review_note && (
                        <div style={{ marginTop: 4, fontStyle: "italic" }}>“{r.review_note}”</div>
                      )}
                    </td>
                  )}
                  {activeTab === "pending" && (
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ marginRight: 6 }}
                        onClick={() => openResolve(r, "rejected")}
                      >
                        <XCircle size={13} style={{ marginRight: 4 }} />
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => openResolve(r, "approved")}
                      >
                        <CheckCircle2 size={13} style={{ marginRight: 4 }} />
                        Approve
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sortedRows.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        itemLabel="requests"
      />

      {/* Approve/Reject confirmation modal */}
      <Modal
        open={!!resolveTarget}
        onClose={closeResolve}
        size="sm"
        centered
      >
        <div className="fs-modal-header">
          <div className={`fs-modal-icon ${resolveTarget?.decision === "approved" ? "success" : "danger"}`}>
            {resolveTarget?.decision === "approved"
              ? <CheckCircle2 size={22} strokeWidth={2} />
              : <XCircle size={22} strokeWidth={2} />}
          </div>
          <div className="fs-title" style={{ textAlign: "center" }}>
            {resolveTarget?.decision === "approved" ? "Approve Unlock?" : "Reject Unlock?"}
          </div>
          <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
            {resolveTarget?.decision === "approved"
              ? <>Unlock <strong style={{ color: "var(--text-primary)" }}>{resolveTarget?.row?.period_name}</strong>. Admin can edit the rubric again — existing scores remain but may become inconsistent.</>
              : <>Keep <strong style={{ color: "var(--text-primary)" }}>{resolveTarget?.row?.period_name}</strong> locked. The requester will be notified.</>
            }
          </div>
        </div>

        <div className="fs-modal-body" style={{ paddingTop: 2 }}>
          {resolveTarget?.decision === "approved" && (
            <FbAlert variant="warning" title="High-impact action">
              This unlock bypasses the fairness guard. It is audit-logged with severity=high and the requester receives an email with your optional note below.
            </FbAlert>
          )}
          <div style={{ marginTop: 10 }}>
            <label
              htmlFor="resolve-note"
              style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}
            >
              Note to requester <span style={{ color: "var(--text-tertiary)" }}>(optional)</span>
            </label>
            <textarea
              id="resolve-note"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder={resolveTarget?.decision === "approved"
                ? "e.g. Approved — please make the fix and re-generate the QR code after."
                : "e.g. Rejected — the change you described affects rubric weights and would invalidate existing scores."}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--text-primary)",
                background: "var(--input-bg, var(--bg-2))",
                border: "1px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                minHeight: 72,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div
          className="fs-modal-footer"
          style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}
        >
          <button
            type="button"
            className="fs-btn fs-btn-secondary"
            onClick={closeResolve}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`fs-btn ${resolveTarget?.decision === "approved" ? "fs-btn-primary" : "fs-btn-danger"}`}
            onClick={submitResolve}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            <AsyncButtonContent
              loading={submitting}
              loadingText={resolveTarget?.decision === "approved" ? "Approving…" : "Rejecting…"}
            >
              {resolveTarget?.decision === "approved" ? "Approve & Unlock" : "Reject Request"}
            </AsyncButtonContent>
          </button>
        </div>
      </Modal>
    </div>
  );
}
