// src/jury/JuryGatePage.jsx
// Jury access gate — shown when landing with ?t= token or no token.
// Verifies token against the active DB (determined by pathname: /demo/* → demo, else → prod).
// On success stores the access grant and navigates to the jury flow.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import veraLogoDark from "../assets/vera_logo_dark.png";
import veraLogoWhite from "../assets/vera_logo_white.png";
import { listPeriodsPublic, verifyEntryReference, verifyEntryToken } from "../shared/api";
import { setJuryAccess } from "../shared/storage";
import FbAlert from "../shared/ui/FbAlert";
import "../styles/jury.css";

/** Extract token from a pasted URL or raw code string. */
function extractToken(input) {
  const s = String(input || "").trim();
  try {
    const url = new URL(s, window.location.origin);
    return url.searchParams.get("t") || url.searchParams.get("eval") || s;
  } catch {
    return s;
  }
}

/** "demo-ORGCODE" shorthand → resolve period from public list. */
function readDemoAlias(token) {
  const s = String(token || "").trim().toLowerCase();
  if (!s.startsWith("demo-")) return null;
  const orgCode = s.slice("demo-".length).trim();
  return orgCode ? orgCode.toUpperCase() : null;
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
    byCode.find((p) => p?.is_current)
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
  if (code === "token_expired")       return "This access code has expired.";
  if (code === "token_revoked")       return "This access code has been revoked.";
  if (code === "ambiguous_reference") return "This reference ID matches multiple tokens. Please use the full access link.";
  if (code === "reference_not_found" || code === "invalid_reference")
    return "Reference ID not found. Please use the full access link or QR token.";
  return "The link is invalid, expired, or has been revoked.";
}

async function resolveAccessGrant(code) {
  const aliasGrant = await resolveDemoAliasGrant(code);
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

export default function JuryGatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");

  // Determine jury flow base path from current location.
  // /demo/eval → /demo/jury, /eval → /jury
  const isDemo = location.pathname.startsWith("/demo");
  const juryBase = isDemo ? "/demo/jury" : "/jury";

  const [status, setStatus]           = useState(token ? "loading" : "missing");
  const [denyMessage, setDenyMessage] = useState("");
  const [manualToken, setManual]      = useState("");
  const [verifying, setVerifying]     = useState(false);
  const inputRef = useRef(null);

  function markDenied(message) {
    setDenyMessage(message || "The link is invalid, expired, or has been revoked.");
    setStatus("denied");
  }

  function onGranted(grant) {
    setJuryAccess(grant.period_id, grant);
    navigate(`${juryBase}/identity`, { replace: true });
  }

  useEffect(() => {
    if (!token) return;
    let active = true;

    (async () => {
      try {
        const res = await resolveAccessGrant(token);
        if (!active) return;
        if (res?.ok) {
          onGranted(res);
        } else {
          markDenied(mapDenyMessage(res));
        }
      } catch {
        if (active) markDenied();
      }
    })();

    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e) {
    e.preventDefault();
    const t = extractToken(manualToken);
    if (!t) return;
    setVerifying(true);
    setStatus("missing");
    setDenyMessage("");
    try {
      const res = await resolveAccessGrant(t);
      if (res?.ok) {
        onGranted(res);
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
            <div className="jg-logo" style={{ marginBottom: 16 }}>
              <img src={veraLogoDark} alt="VERA" className="jg-logo-dark" />
              <img src={veraLogoWhite} alt="VERA" className="jg-logo-light" />
            </div>
            <div className="jury-gate-spinner" />
            <div className="jury-title">Verifying Access…</div>
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

          {/* Logo */}
          <div className="jg-logo">
            <img src={veraLogoDark} alt="VERA" className="jg-logo-dark" />
            <img src={veraLogoWhite} alt="VERA" className="jg-logo-light" />
          </div>

          {/* Header */}
          <div className="jury-title" style={{ marginBottom: 8 }}>Enter Your Access Code</div>
          <div className="jury-sub" style={{ marginBottom: 16 }}>
            Paste the link from your invitation email, or type your access code below.
          </div>

          {/* Denied banner */}
          {status === "denied" && (
            <FbAlert variant="danger" title="Access denied" style={{ marginBottom: 16, textAlign: "left" }}>
              {denyMessage || "The link is invalid, expired, or has been revoked."}
            </FbAlert>
          )}

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

          <div className="jury-gate-note">
            If you are a walk-in juror, please contact the registration desk.
          </div>

        </div>

        <div className="login-footer" style={{ marginTop: "8px" }}>
          <button type="button" className="form-link" onClick={() => navigate("/", { replace: true })}>
            ← Return Home
          </button>
        </div>

      </div>
    </div>
  );
}
