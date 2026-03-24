// src/jury/JuryGatePage.jsx
// ============================================================
// Phase 3.5 — Jury access gate.
//
// Shown when the user lands on /jury-entry.
// If a ?t= token is present, it is verified against the DB.
// On success:
//   - semester-scoped grant stored in localStorage (persists across sessions)
//   - URL cleaned to /jury-entry (token removed from address bar)
//   - onGranted() called → App sets page to "jury"
// On failure or missing token:
//   - access-required screen shown; no jury form rendered
//
// Resume (same or new browser session) is handled entirely
// by the App.jsx page initializer — this component is only
// mounted for fresh token verification.
// ============================================================

import { useEffect, useState } from "react";
import { verifyEntryToken } from "../shared/api";
import { AlertCircleIcon } from "../shared/Icons";
import { setJuryAccess } from "../shared/storage";

export default function JuryGatePage({ token, onGranted, onBack }) {
  // "loading" → verifying token; "denied" → bad/expired token; "missing" → no token
  const [status, setStatus] = useState(token ? "loading" : "missing");

  useEffect(() => {
    if (!token) return;
    let active = true;
    verifyEntryToken(token)
      .then((res) => {
        if (!active) return;
        if (res?.ok) {
          setJuryAccess(res.semester_id);
          window.history.replaceState(null, "", "/jury-entry");
          onGranted();
        } else {
          setStatus("denied");
        }
      })
      .catch(() => {
        if (active) setStatus("denied");
      });
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") {
    return (
      <div className="premium-screen">
        <div className="premium-card compact gate-card">
          <div className="premium-header">
            <div className="gate-spinner" aria-label="Verifying access…" />
            <div className="premium-title">Verifying access…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-screen">
      <div className="premium-card compact gate-card">
        <div className="premium-header">
          <div className="premium-icon-square gate-icon-denied" aria-hidden="true">
            <AlertCircleIcon />
          </div>
          <div className="premium-title">Jury access required</div>
          <div className="premium-subtitle gate-subtext">
            This page can only be opened with a valid jury QR code or access link
            provided by the coordinators.
          </div>
          {status === "denied" && (
            <div className="gate-denied-note">
              The link you used is invalid, expired, or has been revoked.
            </div>
          )}
        </div>

        <button className="premium-btn-primary" onClick={onBack}>
          ← Back to Home
        </button>

        <p className="gate-walkup-note">
          If you are a walk-in juror, please contact the registration desk.
        </p>
      </div>
    </div>
  );
}
