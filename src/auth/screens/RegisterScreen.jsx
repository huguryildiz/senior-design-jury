// src/auth/RegisterScreen.jsx — Phase 12
// Apply-for-access form with success state, using vera.css design tokens.
// Replaces src/components/auth/RegisterForm.jsx.

import { useEffect, useMemo, useState } from "react";
import { listOrganizationsPublic } from "@/shared/api";

function generateTemporaryPassword() {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `Va!${rand.slice(0, 14)}9Z`;
}

function getUniversityLabel(tenant) {
  return String(tenant?.university || tenant?.name || "Organization").trim();
}

const normalizeError = (raw) => {
  const msg = String(raw || "").toLowerCase().trim();
  if (!msg) return "Application could not be submitted. Please try again.";
  if (msg.includes("email_already_registered")) return "This email is already registered. Please sign in.";
  if (msg.includes("email_required")) return "Work email is required.";
  if (msg.includes("name_required")) return "Full name is required.";
  if (msg.includes("tenant_not_found")) return "Selected department was not found.";
  if (msg.includes("application_already_pending")) return "You already have a pending application for this department.";
  if (msg.includes("duplicate") || msg.includes("already")) return "An application with this information already exists.";
  return String(raw);
};

const extractErrorText = (err) => {
  if (!err) return "";
  return [err.message, err.details, err.hint, err.code ? `code:${err.code}` : ""].filter(Boolean).join(" | ");
};

const EYE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EYE_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function RegisterScreen({ onRegister, onSwitchToLogin, onReturnHome, error: externalError }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submittedDept, setSubmittedDept] = useState("");
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listOrganizationsPublic()
      .then((data) => { if (active) setTenants(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setTenants([]); })
      .finally(() => { if (active) setTenantsLoading(false); });
    return () => { active = false; };
  }, []);

  const universityOptions = useMemo(
    () => [...new Set(tenants.map(getUniversityLabel).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [tenants]
  );

  const departmentOptions = useMemo(() => {
    if (!university) return [];
    return tenants
      .filter((t) => getUniversityLabel(t) === university)
      .sort((a, b) => String(a?.department || "").localeCompare(String(b?.department || "")));
  }, [university, tenants]);

  useEffect(() => {
    if (!university) { setTenantId(""); return; }
    if (!departmentOptions.some((d) => d.id === tenantId)) setTenantId("");
  }, [university, departmentOptions, tenantId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Work email is required."); return; }
    if (!university) { setError("Please select a university or organization."); return; }
    if (!tenantId) { setError("Please select a department."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      const deptLabel = String(selectedTenant?.department || selectedTenant?.name || "").trim();
      await onRegister(email.trim(), generateTemporaryPassword(), {
        name: fullName.trim(),
        university: university.trim(),
        department: deptLabel,
        tenantId,
      });
      setSubmittedEmail(email.trim());
      setSubmittedDept(`${university} — ${deptLabel}`);
      setSubmitted(true);
    } catch (err) {
      setError(normalizeError(extractErrorText(err) || "Application could not be submitted."));
    } finally {
      setLoading(false);
    }
  }

  const rawDisplayError = (error || externalError || "").trim();
  const displayError = rawDisplayError ? normalizeError(rawDisplayError) : "";

  if (submitted) {
    return (
      <div className="apply-screen">
        <div className="apply-wrap">
          <div className="apply-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" opacity="0.3"/>
              <path className="check-path" d="M8 12.5l2.5 3 5.5-6.5"/>
            </svg>
          </div>
          <div className="apply-success-title">Application Submitted</div>
          <div className="apply-success-sub">
            Your request has been sent to the department administrator. You&apos;ll receive an email notification once your access is approved.
          </div>

          <div className="apply-detail-card">
            <div className="apply-detail-row">
              <span className="apply-detail-label">Email</span>
              <span className="apply-detail-value">{submittedEmail}</span>
            </div>
            <div className="apply-detail-row">
              <span className="apply-detail-label">Department</span>
              <span className="apply-detail-value">{submittedDept}</span>
            </div>
            <div className="apply-detail-row">
              <span className="apply-detail-label">Status</span>
              <span className="apply-detail-value pending">Pending review</span>
            </div>
          </div>

          <div className="apply-info-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <p>Check your inbox at <strong>{submittedEmail}</strong> for a confirmation email. The department admin will review your application.</p>
          </div>

          <button type="button" className="apply-success-btn" onClick={onSwitchToLogin}>
            Back to Sign In
          </button>

          {onReturnHome && (
            <div className="login-footer" style={{ marginTop: "16px" }}>
              <button type="button" onClick={onReturnHome} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                ← Return Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="apply-screen">
      <div className="apply-wrap">
        <div className="apply-card">
          <div className="apply-header">
            <div className="apply-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div className="apply-title">Apply for Access</div>
            <div className="apply-sub">Register your department to start evaluating.</div>
          </div>

          {displayError && (
            <div className="fb-alert fba-danger" style={{ marginBottom: "16px" }}>
              <div className="fb-alert-body">
                <div className="fb-alert-desc">{displayError}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                className="apply-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Jane Doe"
                disabled={loading}
              />
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-email">Institutional Email</label>
              <input
                id="reg-email"
                className="apply-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@university.edu"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-university">University</label>
              <select
                id="reg-university"
                className="apply-select"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                disabled={loading || tenantsLoading}
              >
                <option value="">{tenantsLoading ? "Loading…" : "Select university…"}</option>
                {universityOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-dept">Apply to Department</label>
              <select
                id="reg-dept"
                className="apply-select"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                disabled={loading || !university}
              >
                <option value="">{university ? "Select department…" : "Choose university first"}</option>
                {departmentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.department || opt.name}</option>
                ))}
              </select>
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-password">Password</label>
              <div className="apply-pw-wrap">
                <input
                  id="reg-password"
                  className="apply-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 10 chars, upper, lower, digit, symbol"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" className="apply-pw-toggle" tabIndex={-1} onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                  {showPass ? EYE_OFF_ICON : EYE_ICON}
                </button>
              </div>
            </div>

            <div className="apply-field" style={{ marginBottom: "24px" }}>
              <label className="apply-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="apply-pw-wrap">
                <input
                  id="reg-confirm"
                  className="apply-input"
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" className="apply-pw-toggle" tabIndex={-1} onClick={() => setShowConfirmPass((v) => !v)} aria-label={showConfirmPass ? "Hide password" : "Show password"}>
                  {showConfirmPass ? EYE_OFF_ICON : EYE_ICON}
                </button>
              </div>
            </div>

            <button type="submit" className="apply-submit" disabled={loading || tenantsLoading}>
              {loading ? "Submitting…" : "Register"}
            </button>
          </form>
        </div>

        <div className="apply-footer">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            Sign in
          </button>
        </div>
        {onReturnHome && (
          <div className="login-footer" style={{ marginTop: "8px" }}>
            <button type="button" onClick={onReturnHome} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              ← Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
