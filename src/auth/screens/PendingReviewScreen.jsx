// src/auth/PendingReviewScreen.jsx — Phase 12
// Premium pending-approval gate with status stepper, application cards,
// and contextual hints per state (pending / rejected / empty).

import { useEffect, useState } from "react";
import { Clock, Check, MoreVertical, LogIn, X, FileText, Plus, CircleAlert, Info } from "lucide-react";
import { getMyApplications } from "@/shared/api";
import { formatDate } from "@/shared/lib/dateUtils";

/* ── Status Stepper ── */
function StatusStepper({ hasRejected }) {
  return (
    <div className="prv-stepper">
      <div className="prv-step">
        <div className="prv-step-dot prv-dot-done">
          <Check size={14} strokeWidth={3} />
        </div>
        <div className="prv-step-label prv-label-done">Applied</div>
      </div>
      <div className={`prv-step-line ${hasRejected ? "prv-line-done" : "prv-line-active"}`} />
      <div className="prv-step">
        <div className={`prv-step-dot ${hasRejected ? "prv-dot-rejected" : "prv-dot-active"}`}>
          {hasRejected
            ? <X size={14} strokeWidth={3} />
            : <MoreVertical size={14} strokeWidth={2.5} />}
        </div>
        <div className={`prv-step-label ${hasRejected ? "prv-label-rejected" : "prv-label-active"}`}>
          {hasRejected ? "Reviewed" : "In Review"}
        </div>
      </div>
      <div className="prv-step-line" />
      <div className="prv-step">
        <div className="prv-step-dot prv-dot-pending">
          <LogIn size={14} strokeWidth={2.5} />
        </div>
        <div className="prv-step-label">Access</div>
      </div>
    </div>
  );
}

/* ── Application Card ── */
function ApplicationCard({ app, variant = "pending" }) {
  const isPending = variant === "pending";
  return (
    <div className={`prv-app-card ${isPending ? "" : "prv-app-card-rejected"}`}>
      <div className={`prv-app-icon ${isPending ? "prv-app-icon-pending" : "prv-app-icon-rejected"}`}>
        {isPending
          ? <Clock size={16} />
          : <X size={16} />}
      </div>
      <div className="prv-app-body">
        <div className="prv-app-name">
          {app.tenant_name || app.organization_name || "Unknown department"}
        </div>
        {app.created_at && (
          <div className="prv-app-date">Applied {formatDate(app.created_at)}</div>
        )}
      </div>
      <div className={`prv-app-badge ${isPending ? "prv-badge-pending" : "prv-badge-rejected"}`}>
        {isPending && <span className="prv-pulse-dot" />}
        {isPending ? "Pending" : "Declined"}
      </div>
    </div>
  );
}

export default function PendingReviewScreen({ user, onSignOut, onBack }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then((data) => { if (active) setApplications(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter((a) => a.status === "rejected");
  const hasApplications = pending.length > 0 || rejected.length > 0;
  const hasRejected = rejected.length > 0 && pending.length === 0;

  const title = !hasApplications && !loading
    ? "Access Required"
    : hasRejected
      ? "Application Status"
      : "Application Pending";

  return (
    <div className="login-screen">
      <div className="prv-wrap">
        <div className="prv-card">
          {/* Header */}
          <div className="prv-header">
            <div className="prv-icon">
              <Clock size={26} strokeWidth={1.5} />
            </div>
            <div className="prv-title">{title}</div>
            <div className="prv-sub">
              Your account <strong>{user?.email}</strong> is not yet approved for admin access.
            </div>
          </div>

          {/* Stepper — shown when there are applications */}
          {hasApplications && <StatusStepper hasRejected={hasRejected} />}

          {hasApplications && <div className="prv-divider" />}

          {!loading && (
            <>
              {/* Pending applications */}
              {pending.length > 0 && (
                <div className="prv-section">
                  <div className="prv-section-label">Your Applications</div>
                  <div className="prv-app-list">
                    {pending.map((app) => (
                      <ApplicationCard key={app.id} app={app} variant="pending" />
                    ))}
                  </div>
                  <div className="prv-hint prv-hint-info">
                    <Info size={16} />
                    <p>Your department administrator will review your application. You&apos;ll receive an <strong>email notification</strong> once a decision is made.</p>
                  </div>
                </div>
              )}

              {/* Rejected applications */}
              {rejected.length > 0 && (
                <div className="prv-section">
                  {pending.length > 0 && (
                    <div className="prv-section-label">Previous Applications</div>
                  )}
                  {pending.length === 0 && (
                    <div className="prv-section-label">Your Applications</div>
                  )}
                  <div className="prv-app-list">
                    {rejected.map((app) => (
                      <ApplicationCard key={app.id} app={app} variant="rejected" />
                    ))}
                  </div>
                  {pending.length === 0 && (
                    <div className="prv-hint prv-hint-danger">
                      <CircleAlert size={16} />
                      <p>Your application was not approved. You can apply to a different department or contact your administrator for details.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!hasApplications && (
                <div className="prv-empty">
                  <div className="prv-empty-icon">
                    <FileText size={22} strokeWidth={1.5} />
                  </div>
                  <div className="prv-empty-title">No Applications Yet</div>
                  <div className="prv-empty-desc">
                    Submit an application to request admin access for your department.
                  </div>
                  <button type="button" className="prv-btn-apply" onClick={onBack}>
                    <Plus size={14} strokeWidth={2.5} />
                    Apply for Access
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="prv-footer">
          <button type="button" onClick={onBack} className="prv-link-home">
            &larr; Return Home
          </button>
          <button type="button" onClick={onSignOut} className="prv-btn-signout">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
