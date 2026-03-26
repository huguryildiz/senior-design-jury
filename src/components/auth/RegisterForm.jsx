// src/components/auth/RegisterForm.jsx
// ============================================================
// Phase C.4: Admin self-registration + tenant application form.
// After sign-up, submits a tenant admin application.
// ============================================================

import { useEffect, useState } from "react";
import { CheckCircle2Icon, EyeIcon, EyeOffIcon } from "../../shared/Icons";
import { listTenantsPublic } from "../../shared/api";
import AlertCard from "../../shared/AlertCard";
import TenantSearchDropdown from "./TenantSearchDropdown";

export default function RegisterForm({ onRegister, onSwitchToLogin, onReturnHome, error: externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Load tenants for dropdown
  useEffect(() => {
    let active = true;
    // Public RPC: tenant list can be loaded before authentication.
    listTenantsPublic()
      .then((data) => {
        if (active) setTenants(data || []);
      })
      .catch(() => {
        // Not authenticated yet — tenants will be loaded after sign-up
      })
      .finally(() => {
        if (active) setTenantsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const isStrongPassword = (v) => {
    const s = String(v || "");
    return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
  };

  const normalizeRegisterError = (raw) => {
    const msg = String(raw || "").toLowerCase().trim();
    if (!msg) return "Registration failed. Please try again.";
    if (msg.includes("email_already_registered")) {
      return "This email is already registered. Please sign in or use a different email.";
    }
    if (msg.includes("password_too_short")) {
      return "Password must be at least 10 characters.";
    }
    if (msg.includes("email_required")) {
      return "Email is required.";
    }
    if (msg.includes("name_required")) {
      return "Full name is required.";
    }
    if (msg.includes("tenant_not_found")) {
      return "Selected department was not found. Please try again.";
    }
    if (msg.includes("application_already_pending")) {
      return "You already have a pending application for this department.";
    }
    if (msg.includes("duplicate") || msg.includes("already")) {
      return "An application with this information already exists.";
    }
    return raw;
  };

  const extractErrorText = (err) => {
    if (!err) return "";
    const parts = [
      err.message,
      err.details,
      err.hint,
      err.code ? `code:${err.code}` : "",
    ].filter(Boolean);
    return parts.join(" | ");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required."); return; }
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!isStrongPassword(password)) {
      setError("Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.");
      return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!tenantId) { setError("Please select a department to apply to."); return; }

    setLoading(true);
    try {
      await onRegister(email.trim(), password, {
        name: fullName.trim(),
        university: university.trim(),
        department: department.trim(),
        tenantId,
      });
      setSubmitted(true);
    } catch (err) {
      const raw = extractErrorText(err);
      setError(normalizeRegisterError(raw || "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  // Prefer form-local validation errors over parent-level generic errors.
  const rawDisplayError = (error || externalError || "").trim();
  const displayError = rawDisplayError ? normalizeRegisterError(rawDisplayError) : "";

  if (submitted) {
    const selectedTenant = tenants.find((t) => t.id === tenantId);
    return (
      <div className="application-submitted-view">
        <div className="application-submitted-icon" aria-hidden="true">
          <CheckCircle2Icon />
        </div>
        <h2>Application Submitted</h2>
        <p>
          Your application for <strong>{selectedTenant?.university || selectedTenant?.name || "the selected department"}</strong>
          {selectedTenant?.department && <> · <strong>{selectedTenant.department}</strong></>} has been submitted.
          You&apos;ll be able to sign in once an administrator approves your request.
        </p>
        <button type="button" onClick={onSwitchToLogin} className="admin-auth-submit application-submitted-primary">
          Back to Sign In
        </button>
        <button type="button" onClick={onReturnHome} className="application-submitted-home">
          ← Return Home
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="admin-auth-form admin-auth-form-register">
      <h2 className="admin-auth-title">Apply for Admin Access</h2>

      {displayError && (
        <AlertCard variant="error">{displayError}</AlertCard>
      )}

      <label className="admin-auth-label">
        Full Name
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Dr. Jane Doe"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Institutional Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane.doe@university.edu"
          autoComplete="email"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        University
        <input
          type="text"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          placeholder="e.g. TED University"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Department
        <input
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Electrical Engineering"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Apply to Department
        <TenantSearchDropdown
          tenants={tenants}
          value={tenantId}
          onChange={setTenantId}
          disabled={loading || tenantsLoading}
        />
      </label>

      <label className="admin-auth-label">
        Password
        <div className="admin-auth-pass-wrap">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 10 chars, upper, lower, digit, symbol"
            autoComplete="new-password"
            disabled={loading}
            className="admin-auth-input"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="admin-auth-toggle-pass"
            tabIndex={-1}
          >
            {showPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </label>

      <label className="admin-auth-label">
        Confirm Password
        <div className="admin-auth-pass-wrap">
          <input
            type={showConfirmPass ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            disabled={loading}
            className="admin-auth-input"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPass(!showConfirmPass)}
            className="admin-auth-toggle-pass"
            tabIndex={-1}
          >
            {showConfirmPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </label>

      <button type="submit" disabled={loading} className="admin-auth-submit">
        {loading ? "Registering…" : "Register"}
      </button>

      <p className="admin-auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="admin-auth-link">
          Sign in
        </button>
      </p>
    </form>
  );
}
