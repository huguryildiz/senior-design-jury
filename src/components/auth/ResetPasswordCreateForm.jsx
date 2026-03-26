import { useState } from "react";
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, ShieldUserIcon } from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";

const isStrongPassword = (v) => {
  const s = String(v || "");
  return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};

export default function ResetPasswordCreateForm({ onUpdatePassword, onBackToLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isStrongPassword(password)) {
      setError("Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await onUpdatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err?.message || "Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="admin-auth-form">
        <div className="admin-auth-header">
          <div className="premium-icon-square premium-icon-square--success" aria-hidden="true">
            <CheckCircle2Icon />
          </div>
          <h2 className="admin-auth-title">Password Updated</h2>
          <p className="admin-auth-subtitle">Your password has been updated. You can now sign in.</p>
        </div>
        <button type="button" onClick={onBackToLogin} className="admin-auth-submit">
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="admin-auth-form">
      <div className="admin-auth-header">
        <div className="premium-icon-square" aria-hidden="true"><ShieldUserIcon /></div>
        <h2 className="admin-auth-title">Create New Password</h2>
        <p className="admin-auth-subtitle">Set a new password for your admin account.</p>
      </div>

      {error && <AlertCard variant="error">{error}</AlertCard>}

      <label className="admin-auth-label">
        New Password
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
          <button type="button" onClick={() => setShowPass((v) => !v)} className="admin-auth-toggle-pass" tabIndex={-1}>
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
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            disabled={loading}
            className="admin-auth-input"
          />
          <button type="button" onClick={() => setShowConfirmPass((v) => !v)} className="admin-auth-toggle-pass" tabIndex={-1}>
            {showConfirmPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </label>

      <button type="submit" disabled={loading} className="admin-auth-submit">
        {loading ? "Updating…" : "Update Password"}
      </button>

      <div className="admin-auth-forgot">
        <button type="button" onClick={onBackToLogin} className="admin-auth-home-link">
          ← Back to Sign In
        </button>
      </div>
    </form>
  );
}
