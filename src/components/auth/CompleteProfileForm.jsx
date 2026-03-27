// src/components/auth/CompleteProfileForm.jsx
// ============================================================
// Profile completion form for first-time Google OAuth users.
// Collects university, department, and tenant selection before
// submitting a tenant application.
// ============================================================

import { useState, useEffect } from "react";
import { ShieldUserIcon } from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";
import TenantSearchDropdown from "./TenantSearchDropdown";
import { listTenantsPublic } from "../../shared/api";

export default function CompleteProfileForm({ user, onComplete, onSignOut }) {
  const [fullName, setFullName] = useState(user?.name || "");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    listTenantsPublic()
      .then((data) => { if (active) setTenants(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setTenantsLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!tenantId) { setError("Please select a department to apply to."); return; }

    setLoading(true);
    try {
      await onComplete({
        name: fullName.trim(),
        university: university.trim(),
        department: department.trim(),
        tenantId,
      });
    } catch (err) {
      setError(String(err?.message || "Failed to complete profile. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-auth-form" noValidate>
      <div className="admin-auth-header">
        <div className="premium-icon-square" aria-hidden="true"><ShieldUserIcon /></div>
        <h2 className="admin-auth-title">Complete Your Profile</h2>
        <p className="admin-auth-subtitle">
          One more step before you can start managing your department.
        </p>
      </div>

      {error && <AlertCard variant="error">{error}</AlertCard>}

      <label className="admin-auth-label">
        Email
        <div className="admin-auth-profile-readonly">{user?.email}</div>
      </label>

      <label className="admin-auth-label">
        Full Name
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          disabled={loading}
          className="admin-auth-input"
          autoFocus
        />
      </label>

      <label className="admin-auth-label">
        University
        <input
          type="text"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          placeholder="Your university"
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
          placeholder="Your department"
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
          loading={tenantsLoading}
          disabled={loading}
        />
      </label>

      <button type="submit" disabled={loading} className="admin-auth-submit">
        {loading ? "Submitting\u2026" : "Submit Application"}
      </button>

      <button type="button" onClick={onSignOut} className="admin-auth-home-link">
        Sign out
      </button>
    </form>
  );
}
