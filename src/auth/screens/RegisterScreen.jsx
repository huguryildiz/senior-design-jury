// src/auth/RegisterScreen.jsx — Phase 12
// Premium apply-for-access form with Google OAuth flow badge,
// password strength indicator, and success state.

import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserPlus, Eye, EyeOff, Check, Info } from "lucide-react";
import FbAlert from "@/shared/ui/FbAlert";
import { listOrganizationsPublic } from "@/shared/api";
import CustomSelect from "@/shared/ui/CustomSelect";
import { AuthContext } from "@/auth/AuthProvider";
import { useSecurityPolicy } from "@/auth/SecurityPolicyContext";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

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

/* ── Google badge ── */
const GOOGLE_ICON = (
  <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

/* ── Password Strength ── */
function getPasswordStrength(password, minLen, requireSpecial) {
  if (!password) return { level: 0, label: "" };
  let score = 0;
  if (password.length >= minLen) score++;
  if (password.length >= minLen + 4) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (requireSpecial && !/[^A-Za-z0-9]/.test(password)) score = Math.min(score, 2);

  if (score <= 1) return { level: 1, label: "Weak" };
  if (score <= 2) return { level: 2, label: "Fair" };
  if (score <= 3) return { level: 3, label: "Good" };
  return { level: 4, label: "Strong" };
}

function PasswordStrengthBar({ password, minLen, requireSpecial }) {
  const { level, label } = getPasswordStrength(password, minLen, requireSpecial);
  if (!password) return null;
  const colors = ["", "reg-pw-weak", "reg-pw-fair", "reg-pw-good", "reg-pw-strong"];
  return (
    <div className="reg-pw-strength">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`reg-pw-bar ${i <= level ? colors[level] : ""}`} />
      ))}
      <span className={`reg-pw-label ${colors[level]}`}>{label}</span>
    </div>
  );
}

export default function RegisterScreen({ onRegister, onSwitchToLogin, onReturnHome, error: externalError }) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/demo") ? "/demo" : "";
  const auth = useContext(AuthContext);
  const authUser = auth?.user || null;
  const authLoading = !!auth?.loading;
  const profileIncomplete = !!auth?.profileIncomplete;
  const isGoogleApplicationFlow = !!authUser && profileIncomplete;
  const doRegister = onRegister || auth?.signUp || (async () => {
    throw new Error("Registration is not configured in this screen context.");
  });
  const doCompleteProfile = auth?.completeProfile;
  const goLogin = onSwitchToLogin || (() => navigate(`${base}/login`));
  const goHome = onReturnHome || (() => navigate("/"));

  const [fullName, setFullName] = useState(() => String(authUser?.name || "").trim());
  const [email, setEmail] = useState(() => String(authUser?.email || "").trim());
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

  const { minPasswordLength, requireSpecialChars } = useSecurityPolicy();

  const isValidPassword = (v) => {
    const s = String(v || "");
    if (s.length < minPasswordLength) return false;
    if (requireSpecialChars && !/[^A-Za-z0-9]/.test(s)) return false;
    return true;
  };

  const passwordPlaceholder = `Min ${minPasswordLength} chars${requireSpecialChars ? ", include a symbol" : ""}`;

  useEffect(() => {
    if (!authLoading && authUser && !profileIncomplete) {
      navigate(`${base}/admin`, { replace: true });
    }
  }, [authLoading, authUser, profileIncomplete, navigate]);

  useEffect(() => {
    if (!authUser) return;
    if (!email.trim() && authUser.email) setEmail(String(authUser.email));
    if (!fullName.trim() && authUser.name) setFullName(String(authUser.name));
  }, [authUser, email, fullName]);

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
    if (!isGoogleApplicationFlow) {
      if (!password) { setError("Password is required."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (!isValidPassword(password)) {
        setError(
          requireSpecialChars
            ? `Password must be at least ${minPasswordLength} characters and include a special character.`
            : `Password must be at least ${minPasswordLength} characters.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      const deptLabel = String(selectedTenant?.department || selectedTenant?.name || "").trim();
      if (isGoogleApplicationFlow) {
        if (typeof doCompleteProfile !== "function") {
          throw new Error("Profile completion is not configured.");
        }
        await doCompleteProfile({
          name: fullName.trim(),
          university: university.trim(),
          department: deptLabel,
          tenantId,
        });
      } else {
        await doRegister(email.trim(), generateTemporaryPassword(), {
          name: fullName.trim(),
          university: university.trim(),
          department: deptLabel,
          tenantId,
        });
      }
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
  const submitBtnRef = useShakeOnError(displayError);

  /* ── Success State ── */
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
            <Info size={16} />
            <p>Check your inbox at <strong>{submittedEmail}</strong> for a confirmation email. The department admin will review your application.</p>
          </div>

          <button
            type="button"
            className="apply-success-btn"
            onClick={isGoogleApplicationFlow ? () => navigate(`${base}/admin`) : goLogin}
          >
            {isGoogleApplicationFlow ? "Continue" : "Back to Sign In"}
          </button>

          {onReturnHome && (
            <div className="reg-home-link" style={{ marginTop: "16px" }}>
              <button type="button" onClick={goHome} className="form-link">
                &larr; Return Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Form State ── */
  return (
    <div className="apply-screen">
      <div className="apply-wrap">
        <div className="apply-card">
          {/* Header */}
          <div className="apply-header">
            <div className="apply-icon-wrap">
              <UserPlus size={24} strokeWidth={1.5} />
            </div>
            <div className="apply-title">Apply for Access</div>
            <div className="apply-sub">
              {isGoogleApplicationFlow
                ? "Complete your application to request admin access."
                : "Register your department to start evaluating."}
            </div>
          </div>

          {/* Google badge */}
          {isGoogleApplicationFlow && (
            <div className="reg-google-badge-wrap">
              <div className="reg-google-badge">
                {GOOGLE_ICON}
                Signed in with Google
              </div>
            </div>
          )}

          {displayError && (
            <FbAlert variant="danger" style={{ marginBottom: "16px" }}>
              {displayError}
            </FbAlert>
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
                disabled={loading || isGoogleApplicationFlow}
              />
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-university">University</label>
              <CustomSelect
                id="reg-university"
                value={university}
                onChange={(v) => setUniversity(v)}
                disabled={loading || tenantsLoading}
                options={[
                  { value: "", label: tenantsLoading ? "Loading…" : "Select university…" },
                  ...universityOptions.map((opt) => ({ value: opt, label: opt })),
                ]}
                ariaLabel="University"
              />
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-dept">Department</label>
              <CustomSelect
                id="reg-dept"
                value={tenantId}
                onChange={(v) => setTenantId(v)}
                disabled={loading || !university}
                options={[
                  { value: "", label: university ? "Select department…" : "Choose university first" },
                  ...departmentOptions.map((opt) => ({ value: opt.id, label: opt.department || opt.name })),
                ]}
                ariaLabel="Department"
              />
            </div>

            {!isGoogleApplicationFlow && (
              <>
                <div className="apply-field">
                  <label className="apply-label" htmlFor="reg-password">Password</label>
                  <div className="apply-pw-wrap">
                    <input
                      id="reg-password"
                      className="apply-input"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={passwordPlaceholder}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button type="button" className="apply-pw-toggle" tabIndex={-1} onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <PasswordStrengthBar
                    password={password}
                    minLen={minPasswordLength}
                    requireSpecial={requireSpecialChars}
                  />
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
                      {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <div className="reg-pw-mismatch">Passwords do not match</div>
                  )}
                  {confirmPassword && password === confirmPassword && password.length > 0 && (
                    <div className="reg-pw-match">
                      <Check size={12} strokeWidth={3} />
                      Passwords match
                    </div>
                  )}
                </div>
              </>
            )}

            <button ref={submitBtnRef} type="submit" className="apply-submit" disabled={loading || tenantsLoading}>
              {loading
                ? "Submitting…"
                : isGoogleApplicationFlow
                  ? "Submit Application"
                  : "Register"}
            </button>
          </form>
        </div>

        {!isGoogleApplicationFlow && (
          <div className="apply-footer">
            Already have an account?{" "}
            <button type="button" onClick={goLogin} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              Sign in
            </button>
          </div>
        )}
        <div className="reg-home-link">
          <button type="button" onClick={goHome} className="form-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            &larr; Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
