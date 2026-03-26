// src/jury/QRShowcaseStep.jsx
// ============================================================
// Demo-only step: shows how jurors access evaluations in
// production via QR code, before entering the demo flow.
// ============================================================

import { QrCodeIcon, InfoIcon } from "../shared/Icons";

export default function QRShowcaseStep({ onContinue }) {
  return (
    <div className="premium-screen">
      <div className="premium-card">
        <div className="premium-header">
          <div className="premium-icon-square" aria-hidden="true"><QrCodeIcon /></div>
          <div className="premium-title">Jury Access QR Code</div>
          <div className="premium-subtitle">
            In production, admins generate a unique QR code for each semester.
            Jurors scan it to start their evaluation.
          </div>
        </div>

        <div className="qr-showcase-visual" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="140" height="140" role="img" aria-label="Sample QR code">
            <rect width="120" height="120" rx="8" fill="#f1f5f9" />
            <g fill="#334155">
              <rect x="12" y="12" width="28" height="28" rx="4" />
              <rect x="80" y="12" width="28" height="28" rx="4" />
              <rect x="12" y="80" width="28" height="28" rx="4" />
              <rect x="16" y="16" width="20" height="20" rx="2" fill="#fff" />
              <rect x="84" y="16" width="20" height="20" rx="2" fill="#fff" />
              <rect x="16" y="84" width="20" height="20" rx="2" fill="#fff" />
              <rect x="20" y="20" width="12" height="12" rx="1" />
              <rect x="88" y="20" width="12" height="12" rx="1" />
              <rect x="20" y="88" width="12" height="12" rx="1" />
              <rect x="48" y="12" width="6" height="6" rx="1" />
              <rect x="58" y="12" width="6" height="6" rx="1" />
              <rect x="48" y="22" width="6" height="6" rx="1" />
              <rect x="68" y="22" width="6" height="6" rx="1" />
              <rect x="48" y="48" width="6" height="6" rx="1" />
              <rect x="58" y="48" width="6" height="6" rx="1" />
              <rect x="68" y="48" width="6" height="6" rx="1" />
              <rect x="48" y="58" width="6" height="6" rx="1" />
              <rect x="12" y="48" width="6" height="6" rx="1" />
              <rect x="22" y="58" width="6" height="6" rx="1" />
              <rect x="32" y="48" width="6" height="6" rx="1" />
              <rect x="80" y="48" width="6" height="6" rx="1" />
              <rect x="90" y="58" width="6" height="6" rx="1" />
              <rect x="100" y="48" width="6" height="6" rx="1" />
              <rect x="80" y="68" width="6" height="6" rx="1" />
              <rect x="90" y="80" width="6" height="6" rx="1" />
              <rect x="100" y="68" width="6" height="6" rx="1" />
              <rect x="48" y="80" width="6" height="6" rx="1" />
              <rect x="58" y="90" width="6" height="6" rx="1" />
              <rect x="68" y="80" width="6" height="6" rx="1" />
              <rect x="48" y="100" width="6" height="6" rx="1" />
              <rect x="68" y="100" width="6" height="6" rx="1" />
              <rect x="100" y="100" width="6" height="6" rx="1" />
            </g>
          </svg>
        </div>

        <div className="premium-info-strip">
          <span className="info-strip-icon" aria-hidden="true"><InfoIcon /></span>
          <span>This step is skipped in the demo. In production, scanning the QR grants semester-scoped access.</span>
        </div>

        <button className="premium-btn-primary" type="button" onClick={onContinue}>
          Continue to Demo Evaluation
        </button>
      </div>
    </div>
  );
}
