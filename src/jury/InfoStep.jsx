// src/jury/InfoStep.jsx
// ============================================================
// Step 1 — Juror identity form.
//
// The juror enters their name and department, then clicks
// "Start Evaluation". All cloud-state feedback (saved progress,
// already submitted) is handled by SheetsProgressDialog which
// is rendered as an overlay in JuryForm after PIN verification.
//
// This component is intentionally simple: it collects identity
// and delegates everything else downstream.
// ============================================================

import { InfoIcon, UserRoundCheckIcon, AlertCircleIcon } from "../shared/Icons";

export default function InfoStep({
  juryName, setJuryName,
  juryDept, setJuryDept,
  activeSemester,
  activeProjectCount,
  onStart,
  onBack,
  error,
}) {
  const canStart = juryName.trim().length > 0 && juryDept.trim().length > 0;
  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  };
  const formatLongDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  const semesterLabel = activeSemester?.name || "";
  const hasSemesterMeta = Boolean(semesterLabel);
  const infoDate = activeSemester?.starts_on || activeSemester?.ends_on;
  const infoDateLabel = formatLongDate(infoDate);
  const projectCountLabel =
    typeof activeProjectCount === "number"
      ? `${activeProjectCount} Project${activeProjectCount === 1 ? "" : "s"}`
      : "— Projects";
  const showInfoBlock = hasSemesterMeta || activeProjectCount !== null;
  const calendarIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days-icon lucide-calendar-days">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
  const projectIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-kanban-icon lucide-folder-kanban">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  );
  const calendarParts = [semesterLabel, infoDateLabel].filter(Boolean);
  const infoSegments = [
    ...calendarParts.map((label, index) => ({
      key: `calendar-${index}`,
      label,
      icon: index === 0 ? calendarIcon : null,
    })),
    {
      key: "projects",
      label: projectCountLabel,
      icon: projectIcon,
    },
  ];

  return (
    <div className="premium-screen">
      <div className="premium-card">
        <div className="premium-header">
          <div className="premium-icon-square" aria-hidden="true"><UserRoundCheckIcon /></div>
          <div className="premium-title">Jury Information</div>
          <div className="premium-subtitle">EE 492 — Senior Project Evaluation</div>
          {showInfoBlock && (
            <div className="premium-info-block" aria-label="Jury schedule summary">
              <div className="premium-info-line">
                {infoSegments.map((segment, index) => (
                  <span key={segment.key} className="premium-info-item">
                    {index > 0 && <span className="premium-info-sep" aria-hidden="true">·</span>}
                    {segment.icon && (
                      <span className="premium-info-icon" aria-hidden="true">
                        {segment.icon}
                      </span>
                    )}
                    {segment.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="premium-info-strip">
          <span className="info-strip-icon" aria-hidden="true"><InfoIcon /></span>
          <span>Your name and department/institution cannot be changed once the evaluation starts.</span>
        </div>

        {error && (
          <div className="premium-error-banner" role="alert">
            <AlertCircleIcon />
            <div>
              <div className="premium-error-title">Could not continue</div>
              <div className="premium-error-detail">{error}</div>
            </div>
          </div>
        )}

        <div className="info-form">
          <div className="field">
            <label htmlFor="jury-name">Full Name <span className="req">*</span></label>
            <input
              id="jury-name"
              value={juryName}
              onChange={(e) => setJuryName(e.target.value)}
              placeholder="e.g. Prof. Dr. Jane Smith"
              autoComplete="name"
              autoFocus
              className="premium-input"
            />
          </div>

          <div className="field">
            <label htmlFor="jury-dept">Department or Institution <span className="req">*</span></label>
            <input
              id="jury-dept"
              value={juryDept}
              onChange={(e) => setJuryDept(e.target.value)}
              placeholder="e.g. EEE Dept. / TED University"
              onKeyDown={(e) => { if (e.key === "Enter" && canStart) onStart(); }}
              className="premium-input"
            />
          </div>
        </div>

        <button
          className="premium-btn-primary"
          disabled={!canStart}
          onClick={onStart}
        >
          Start Evaluation →
        </button>
        <button className="premium-btn-link" onClick={onBack} type="button">
          <span aria-hidden="true">←</span>
          Return Home
        </button>
      </div>
    </div>
  );
}
