// src/auth/screens/InviteAcceptScreen.jsx
// Handles Supabase native invite flow.
// User arrives from invite email — the magic link redirects here with
// #access_token=…&type=invite in the URL hash.
// Supabase JS client processes the hash automatically via onAuthStateChange.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserPlus, AlertCircle, CheckCircle, Icon } from "lucide-react";
import { supabase } from "@/shared/api";
import FbAlert from "@/shared/ui/FbAlert";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import { useTheme } from "@/shared/theme/ThemeProvider";
import veraLogoDark from "@/assets/vera_logo_dark.png";
import veraLogoWhite from "@/assets/vera_logo_white.png";
import {
  isStrongPassword,
  evaluatePassword,
  getStrengthMeta,
  PASSWORD_REQUIREMENTS,
  PASSWORD_POLICY_PLACEHOLDER,
} from "@/shared/passwordPolicy";

const EYE_ICON = (
  <Icon
    iconNode={[]}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </Icon>
);
const EYE_OFF_ICON = (
  <Icon
    iconNode={[]}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </Icon>
);

function buildDisplayName(email) {
  const local = (email || "").split("@")[0] || "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function InviteAcceptScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const veraLogo = theme === "dark" ? veraLogoDark : veraLogoWhite;
  const base = location.pathname.startsWith("/demo") ? "/demo" : "";

  // Session resolved from the invite hash
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [organization, setOrganization] = useState("");
  const [programName, setProgramName] = useState("");

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const submitBtnRef = useShakeOnError(submitError);

  // Supabase processes the #access_token hash automatically.
  // We listen for SIGNED_IN (from hash) or pick up an existing session.
  useEffect(() => {
    let resolved = false;

    async function resolveOrgName(userId) {
      try {
        const { data } = await supabase
          .from("memberships")
          .select("organizations(name, institution)")
          .eq("user_id", userId)
          .in("status", ["invited", "active"])
          .limit(1)
          .maybeSingle();
        const org = data?.organizations;
        if (org?.name) setProgramName(org.name);
        if (org?.institution) setOrganization(org.institution);
      } catch {
        // non-fatal — display-only
      }
    }

    function resolve(s) {
      if (resolved) return;
      resolved = true;
      if (s) {
        setSession(s);
        setDisplayName(buildDisplayName(s.user?.email));
        if (s.user?.id) resolveOrgName(s.user.id);
      }
      setSessionLoading(false);
    }

    // Case: hash already processed by the time this effect runs
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) resolve(s);
    });

    // Case: Supabase fires SIGNED_IN after processing the invite hash
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && s) {
        resolve(s);
      }
    });

    // Timeout: if nothing resolves in 6s the link is likely invalid/expired
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setSessionError(
          "This invite link is invalid or has expired. Please ask your admin to send a new one."
        );
        setSessionLoading(false);
      }
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Validation
  const passwordValid = isStrongPassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && displayName.trim();

  // Submit: set password + persist display name
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit || submitting) return;

      setSubmitting(true);
      setSubmitError("");

      try {
        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) throw pwErr;

        const userId = session?.user?.id;
        if (userId && displayName.trim()) {
          await supabase
            .from("profiles")
            .update({ display_name: displayName.trim() })
            .eq("id", userId);
        }

        // Promote any 'invited' memberships to 'active' now that the user
        // has completed account setup. Uses a SECURITY DEFINER RPC because
        // the memberships UPDATE policy is super-admin-only.
        // Memberships from approval_flow are already 'active' — this is a no-op for those.
        await supabase.rpc("rpc_accept_invite");

        setDone(true);
      } catch (err) {
        setSubmitError(err?.message || "Could not complete account setup. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, submitting, password, displayName, session]
  );

  // ── Loading ──────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="login-screen">
        <div style={{ width: "400px", maxWidth: "92vw" }}>
          <div className="login-card" style={{ display: "flex", justifyContent: "center", padding: "48px 32px" }}>
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / invalid link ─────────────────────────────────────
  if (sessionError || !session) {
    return (
      <div className="login-screen">
        <div style={{ width: "400px", maxWidth: "92vw" }}>
          <div className="login-card">
            <div className="login-header">
              <img src={veraLogo} alt="VERA" style={{ height: 45, objectFit: "contain", marginBottom: 8 }} />
              <div className="login-title">Invite Unavailable</div>
              <div className="login-sub">
                {sessionError || "This invite link is invalid or has already been used."}
              </div>
            </div>
            <FbAlert variant="warning" style={{ marginBottom: "20px", textAlign: "justify" }}>
              Invite links expire after a short period and can only be used once. Ask your admin to send a new invite.
            </FbAlert>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => navigate(`${base}/login`, { replace: true })}
            >
              Go to Login
            </button>
          </div>
          <div className="login-footer">
            <button type="button" onClick={() => navigate(`${base}/login`)} className="form-link">
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────
  if (done) {
    return (
      <div className="login-screen">
        <div style={{ width: "400px", maxWidth: "92vw" }}>
          <div className="login-card">
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                background: "rgba(22,163,74,0.1)", display: "inline-grid",
                placeItems: "center", marginBottom: "14px",
              }}>
                <CheckCircle size={24} stroke="#16a34a" strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="auth-state-title">Account Ready</div>
              <div className="auth-state-desc">
                Your account has been set up. You can now access the admin panel.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: "16px" }}
                onClick={() => navigate(`${base}/admin`, { replace: true })}
              >
                Go to Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Accept form ──────────────────────────────────────────────
  return (
    <div className="login-screen">
      <div style={{ width: "400px", maxWidth: "92vw" }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrap">
              <UserPlus size={26} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="login-title">Complete Your Account</div>
            <div className="login-sub">
              Set a password to finish joining as <strong>{session.user?.email}</strong>
            </div>
            {(organization || programName) && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(108,71,255,0.08)",
                  border: "1px solid rgba(108,71,255,0.25)",
                  textAlign: "left",
                }}
              >
                {organization && (
                  <div style={{ marginBottom: programName ? 8 : 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "var(--accent, #6c47ff)",
                        marginBottom: 2,
                      }}
                    >
                      Organization
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                      {organization}
                    </div>
                  </div>
                )}
                {programName && (
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "var(--accent, #6c47ff)",
                        marginBottom: 2,
                      }}
                    >
                      Program
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                      {programName}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {submitError && (
              <FbAlert variant="danger" style={{ marginBottom: "16px" }}>
                {submitError}
              </FbAlert>
            )}

            {/* Display Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="invite-display-name">
                Display Name
              </label>
              <input
                id="invite-display-name"
                className="form-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                disabled={submitting}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="invite-password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="invite-password"
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={PASSWORD_POLICY_PLACEHOLDER}
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                  minLength={10}
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: "var(--text-tertiary)", display: "flex", alignItems: "center",
                  }}
                >
                  {showPass ? EYE_OFF_ICON : EYE_ICON}
                </button>
              </div>
              {password && (() => {
                const { checks, score } = evaluatePassword(password);
                const { label, color, pct } = getStrengthMeta(score);
                return (
                  <div style={{ marginTop: "10px" }}>
                    {/* Strength bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <div style={{
                        flex: 1, height: "5px", borderRadius: "999px",
                        background: "var(--border-subtle, rgba(255,255,255,0.08))",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: color,
                          borderRadius: "999px",
                          transition: "width 0.25s ease, background 0.25s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 600, color, whiteSpace: "nowrap", minWidth: "70px", textAlign: "right" }}>
                        {label}
                      </span>
                    </div>
                    {/* Checklist */}
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "5px" }}>
                      {PASSWORD_REQUIREMENTS.map((req) => {
                        const ok = checks[req.key];
                        return (
                          <li key={req.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{
                              width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: ok ? "none" : "1.5px solid var(--text-tertiary, #718096)",
                              background: ok ? "#16a34a" : "transparent",
                              transition: "background 0.2s, border 0.2s",
                            }}>
                              {ok && (
                                <Icon iconNode={[]} viewBox="0 0 12 12" width="9" height="9" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </Icon>
                              )}
                            </span>
                            <span style={{ fontSize: "12px", color: ok ? "#16a34a" : "var(--text-tertiary, #718096)", transition: "color 0.2s" }}>
                              {req.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="invite-confirm-password">
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="invite-confirm-password"
                  className="form-input"
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPass((v) => !v)}
                  aria-label={showConfirmPass ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: "var(--text-tertiary)", display: "flex", alignItems: "center",
                  }}
                >
                  {showConfirmPass ? EYE_OFF_ICON : EYE_ICON}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <div style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>
                  Passwords do not match
                </div>
              )}
            </div>

            <button
              ref={submitBtnRef}
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit || submitting}
              style={{ width: "100%" }}
            >
              {submitting ? "Setting up your account…" : "Accept Invite & Join"}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <button
            type="button"
            onClick={() => navigate(`${base}/login`)}
            className="form-link"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
