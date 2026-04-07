// src/jury/JuryGatePage.jsx
// Jury access gate — shown when landing with ?eval= or missing token.
// Verifies token against DB; on success stores grant and calls onGranted().

import { useEffect, useRef, useState } from "react";
import { ShieldAlert, ShieldOff, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { verifyEntryToken } from "../shared/api";
import { setJuryAccess } from "../shared/storage";
import "../styles/jury.css";

function extractToken(input) {
  const s = input.trim();
  try {
    const url = new URL(s);
    const t = url.searchParams.get("eval");
    if (t) return t;
  } catch {}
  return s;
}

export default function JuryGatePage({ token, onGranted, onBack }) {
  const [status, setStatus]       = useState(token ? "loading" : "missing");
  const [manualToken, setManual]  = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    verifyEntryToken(token)
      .then((res) => {
        if (!active) return;
        if (res?.ok) {
          setJuryAccess(res.period_id);
          window.history.replaceState(null, "", "/jury-entry");
          onGranted();
        } else {
          setStatus("denied");
        }
      })
      .catch(() => { if (active) setStatus("denied"); });
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e) {
    e.preventDefault();
    const t = extractToken(manualToken);
    if (!t) return;
    setVerifying(true);
    setStatus("missing");
    try {
      const res = await verifyEntryToken(t);
      if (res?.ok) {
        setJuryAccess(res.period_id);
        window.history.replaceState(null, "", "/jury-entry");
        onGranted();
      } else {
        setStatus("denied");
      }
    } catch {
      setStatus("denied");
    } finally {
      setVerifying(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="jury-screen">
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
    <div className="jury-screen">
      <div className="jury-step">
        <div className="jury-card dj-glass-card jury-gate-card">

          {/* Icon */}
          <div className="jury-icon-box" style={{ marginBottom: 20 }}>
            <ShieldAlert size={24} strokeWidth={1.8} />
          </div>

          {/* Header */}
          <div className="jury-title" style={{ marginBottom: 8 }}>Jury access required</div>
          <div className="jury-sub" style={{ marginBottom: 16 }}>
            This page can only be opened with a valid QR code or access link
            provided by the event coordinators.
          </div>

          {/* Denied banner */}
          {status === "denied" && (
            <div className="fb-alert fba-danger" style={{ marginBottom: 16, textAlign: "left" }}>
              <div className="fb-alert-icon">
                <ShieldOff size={15} />
              </div>
              <div className="fb-alert-body">
                <div className="fb-alert-title">Access denied</div>
                <div className="fb-alert-desc">The link is invalid, expired, or has been revoked.</div>
              </div>
            </div>
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
          <button className="jg-back-btn" onClick={onBack}>
            <ArrowLeft size={13} />
            Back to home
          </button>

          <div className="jury-gate-note">
            If you are a walk-in juror, please contact the registration desk.
          </div>

        </div>
      </div>
    </div>
  );
}
