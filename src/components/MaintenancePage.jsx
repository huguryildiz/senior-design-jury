// src/components/MaintenancePage.jsx
// ============================================================
// Brand-aligned maintenance screen shown by MaintenanceGate to
// non-super-admin users when maintenance is active (and to anyone
// navigating to the landing page during maintenance).
//
// Visual language mirrors the landing-page hero: deep navy gradient
// background, VERA logo, cinematic bloom, premium typography. In
// light mode, it switches to a soft slate background with the same
// layout. Works across phone → desktop.
//
// Props are all optional — falls back to sensible defaults so the
// component still renders if called without any config.
// ============================================================

import { useEffect, useState } from "react";
import { Wrench, Clock, Activity } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { formatDateTime } from "@/shared/lib/dateUtils";
import veraLogoDark from "@/assets/vera_logo_dark.png";
import veraLogoWhite from "@/assets/vera_logo_white.png";

const DEFAULT_MESSAGE = "VERA is undergoing scheduled maintenance. We'll be back shortly.";


/**
 * Live countdown for a target end time.
 * Returns a human-friendly string like "2h 14m 03s" or null when
 * the target has passed / is not set.
 */
function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  const deltaMs = new Date(targetIso).getTime() - now;
  if (deltaMs <= 0) return null;

  const totalSec = Math.floor(deltaMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function MaintenancePage({
  message = "",
  startTime = null,
  endTime = null,
  mode = "scheduled",
  supportEmail = "support@vera-eval.app",
}) {
  const { theme } = useTheme();
  const countdown = useCountdown(endTime);
  const displayMessage = message?.trim() || DEFAULT_MESSAGE;

  const nowMs = Date.now();
  const isLive = mode === "immediate" || (startTime && new Date(startTime).getTime() <= nowMs);
  const endFormatted = formatDateTime(endTime);

  return (
    <div className="maintenance-screen" role="status" aria-live="polite">
      {/* Cinematic background layers */}
      <div className="maintenance-bloom" aria-hidden="true" />
      <div className="maintenance-vignette" aria-hidden="true" />

      <div className="maintenance-content">
        {/* Logo */}
        <div className="maintenance-logo">
          <img src={theme === "dark" ? veraLogoDark : veraLogoWhite} alt="VERA" />
        </div>

        {/* Status pill */}
        <div className={`maintenance-pill ${isLive ? "is-live" : "is-upcoming"}`}>
          <span className="maintenance-pill-dot" aria-hidden="true" />
          <span>{isLive ? "Maintenance in Progress" : "Maintenance Scheduled"}</span>
        </div>

        {/* Heading */}
        <h1 className="maintenance-heading" tabIndex={-1}>
          Scheduled <em>Maintenance</em>
        </h1>

        {/* Message */}
        <p className="maintenance-desc">{displayMessage}</p>

        {/* Info cards */}
        <div className="maintenance-cards">
          <div className="maintenance-card">
            <div className="maintenance-card-icon" aria-hidden="true">
              <Wrench size={16} strokeWidth={2} />
            </div>
            <div className="maintenance-card-label">Status</div>
            <div className="maintenance-card-value">
              {isLive ? "In Progress" : "Upcoming"}
            </div>
          </div>

          <div className="maintenance-card">
            <div className="maintenance-card-icon" aria-hidden="true">
              <Clock size={16} strokeWidth={2} />
            </div>
            <div className="maintenance-card-label">Estimated End</div>
            <div className="maintenance-card-value">
              {endFormatted || "Until manually lifted"}
            </div>
          </div>

          {countdown && (
            <div className="maintenance-card maintenance-card-highlight">
              <div className="maintenance-card-icon" aria-hidden="true">
                <Activity size={16} strokeWidth={2} />
              </div>
              <div className="maintenance-card-label">Time Remaining</div>
              <div className="maintenance-card-value maintenance-card-mono">{countdown}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="maintenance-footer">
          <div className="maintenance-wordmark">VERA Platform</div>
          <div className="maintenance-support">
            Need help?{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
