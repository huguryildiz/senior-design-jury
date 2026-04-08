// src/jury/JuryGatePage.jsx
// Jury access gate — shown when landing with ?eval= or missing token.
// Verifies token against DB; on success stores grant and calls onGranted().

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { listPeriodsPublic, verifyEntryReference, verifyEntryToken } from "../shared/api";
import { setJuryAccess } from "../shared/storage";
import { resolveEnvironment, setEnvironment } from "../shared/lib/environment";
import FbAlert from "../shared/ui/FbAlert";
import "../styles/jury.css";

function extractTokenAndEnv(input) {
  const s = String(input || "").trim();
  try {
    const url = new URL(s, window.location.origin);
    const t = url.searchParams.get("t") || url.searchParams.get("eval");
    const env = url.searchParams.get("env") === "demo" ? "demo" : null;
    return {
      token: t || s,
      env,
    };
  } catch {
    return { token: s, env: null };
  }
}

function readDemoAlias(token) {
  const s = String(token || "").trim().toLowerCase();
  if (!s.startsWith("demo-")) return null;
  const orgCode = s.slice("demo-".length).trim();
  if (!orgCode) return null;
  return orgCode.toUpperCase();
}

async function resolveDemoAliasGrant(token) {
  const orgCode = readDemoAlias(token);
  if (!orgCode) return null;
  const periods = await listPeriodsPublic();
  const all = periods || [];
  const byCode = all.filter(
    (p) => String(p?.organizations?.code || "").trim().toUpperCase() === orgCode
  );
  if (!byCode.length) return null;

  const preferred =
    byCode.find((p) => p?.is_current && !p?.is_locked)
    || byCode.find((p) => p?.is_current)
    || byCode[0];
  if (!preferred?.id) return null;

  return {
    ok: true,
    period_id: preferred.id,
    period_name: preferred.name || "",
    is_current: preferred.is_current ?? true,
    is_locked: preferred.is_locked ?? false,
  };
}

function isReferenceId(value) {
  return /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(String(value || "").trim());
}

function mapDenyMessage(result) {
  const code = String(result?.error_code || "");
  if (code === "token_expired") return "This access code has expired.";
  if (code === "token_revoked") return "This access code has been revoked.";
  if (code === "ambiguous_reference") return "This reference ID matches multiple tokens. Please use the full access link.";
  if (code === "reference_not_found" || code === "invalid_reference") return "Reference ID not found. Please use the full access link or QR token.";
  return "The link is invalid, expired, or has been revoked.";
}

export default function JuryGatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");
  const envParam = searchParams.get("env");
  const [status, setStatus]       = useState(token ? "loading" : "missing");
  const [denyMessage, setDenyMessage] = useState("");
  const [manualToken, setManual]  = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  function markDenied(message) {
    setDenyMessage(message || "The link is invalid, expired, or has been revoked.");
    setStatus("denied");
  }

async function resolveAccessGrant(code, effectiveEnv) {
  const aliasGrant = effectiveEnv === "demo"
    ? await resolveDemoAliasGrant(code)
    : null;
  if (aliasGrant) return aliasGrant;

    if (isReferenceId(code)) {
      try {
        return await verifyEntryReference(code);
      } catch {
        // Backward compatibility for DBs where reference RPC is not deployed yet.
      }
    }

  return await verifyEntryToken(code);
}

function shouldTryOtherEnv(result) {
  const code = String(result?.error_code || "");
  return (
    code === "token_not_found" ||
    code === "reference_not_found" ||
    code === "invalid_reference"
  );
}

async function resolveAccessGrantWithEnvFallback(code, explicitEnv = null) {
  const normalizedExplicit = explicitEnv === "demo" ? "demo" : null;
  if (normalizedExplicit) {
    setEnvironment("demo");
    return { grant: await resolveAccessGrant(code, "demo"), env: "demo" };
  }

  const initialEnv = resolveEnvironment() === "demo" ? "demo" : "prod";
  const fallbackEnv = initialEnv === "demo" ? "prod" : "demo";

  setEnvironment(initialEnv);
  const first = await resolveAccessGrant(code, initialEnv === "demo" ? "demo" : null);
  if (first?.ok) return { grant: first, env: initialEnv };
  if (!shouldTryOtherEnv(first)) return { grant: first, env: initialEnv };

  setEnvironment(fallbackEnv);
  const second = await resolveAccessGrant(code, fallbackEnv === "demo" ? "demo" : null);
  if (second?.ok) return { grant: second, env: fallbackEnv };

  setEnvironment(initialEnv);
  return { grant: first, env: initialEnv };
}

  useEffect(() => {
    if (!token) return;
    let active = true;
    if (envParam === "demo") setEnvironment("demo");

    const run = async () => {
      try {
        const explicitEnv = envParam === "demo" ? "demo" : null;
        if (!active) return;
        const { grant: res, env: resolvedEnv } = await resolveAccessGrantWithEnvFallback(token, explicitEnv);
        if (!active) return;
        if (res?.ok) {
          setEnvironment(resolvedEnv === "demo" ? "demo" : "prod");
          setJuryAccess(res.period_id, res);
          navigate("/jury/identity", { replace: true });
        } else {
          markDenied(mapDenyMessage(res));
        }
      } catch {
        if (active) markDenied();
      }
    };

    run();
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e) {
    e.preventDefault();
    const parsed = extractTokenAndEnv(manualToken);
    const t = parsed.token;
    if (!t) return;
    setVerifying(true);
    setStatus("missing");
    setDenyMessage("");
    try {
      const explicitEnv = parsed.env === "demo" || envParam === "demo" ? "demo" : null;
      const { grant: res, env: resolvedEnv } = await resolveAccessGrantWithEnvFallback(t, explicitEnv);
      if (res?.ok) {
        setEnvironment(resolvedEnv === "demo" ? "demo" : "prod");
        setJuryAccess(res.period_id, res);
        navigate("/jury/identity", { replace: true });
      } else {
        markDenied(mapDenyMessage(res));
      }
    } catch {
      markDenied();
    } finally {
      setVerifying(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="jury-screen jury-gate-screen">
        <div className="jury-step">
          <div className="jury-card dj-glass-card jury-gate-card" style={{ textAlign: "center" }}>
            <div className="jury-gate-spinner" />
            <div className="jury-title">Verifying access…</div>
            <div className="jury-sub">Please wait while we validate your credentials.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jury-screen jury-gate-screen">
      <div className="jury-step">
        <div className="jury-card dj-glass-card jury-gate-card">

          {/* Icon */}
          <div className="jury-icon-box" style={{ marginBottom: 20 }}>
            <KeyRound size={24} strokeWidth={1.8} />
          </div>

          {/* Header */}
          <div className="jury-title" style={{ marginBottom: 8 }}>Enter your access code</div>
          <div className="jury-sub" style={{ marginBottom: 16 }}>
            Paste the link from your invitation email, or type your access code below.
          </div>

          {/* Denied banner */}
          {status === "denied" && (
            <FbAlert variant="danger" title="Access denied" style={{ marginBottom: 16, textAlign: "left" }}>
              {denyMessage || "The link is invalid, expired, or has been revoked."}
            </FbAlert>
          )}

          {/* Divider */}
          <div className="jg-divider">
            <span>or enter your access code</span>
          </div>

          {/* Manual token entry */}
          <form onSubmit={handleVerify} className="jg-form">
            <div className="jg-input-wrap">
              <KeyRound size={15} className="jg-input-icon" />
              <input
                ref={inputRef}
                className="form-input jg-token-input"
                placeholder="Paste your access link or code…"
                value={manualToken}
                onChange={(e) => setManual(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              className="btn-primary jg-verify-btn"
              disabled={!manualToken.trim() || verifying}
            >
              {verifying
                ? <><Loader2 size={14} className="jg-spin" /> Verifying…</>
                : "Verify Access"}
            </button>
          </form>

          {/* Back */}
          <button className="jg-back-btn" onClick={() => navigate("/", { replace: true })}>
            <ArrowLeft size={13} />
            Return Home
          </button>

          <div className="jury-gate-note">
            If you are a walk-in juror, please contact the registration desk.
          </div>

        </div>
      </div>
    </div>
  );
}
