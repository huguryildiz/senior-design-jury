// src/components/MaintenancePage.jsx
// Shown to non-super-admin users when maintenance mode is active.

export default function MaintenancePage({ message, endTime }) {
  const formattedEnd = endTime
    ? new Date(endTime).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "32px 24px",
        background: "var(--bg-base, #0f1117)",
        color: "var(--text-primary, #f1f5f9)",
        textAlign: "center",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(217,119,6,0.1)",
          border: "1px solid rgba(217,119,6,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--warning, #d97706)"
          strokeWidth="1.75"
          style={{ width: 30, height: 30 }}
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>

      {/* Heading */}
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            marginBottom: 8,
            color: "var(--text-primary, #f1f5f9)",
          }}
        >
          Under Maintenance
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #94a3b8)",
            maxWidth: 380,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          {message || "VERA is undergoing scheduled maintenance. We'll be back shortly."}
        </p>
      </div>

      {/* Estimated end time */}
      {formattedEnd && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-tertiary, #64748b)",
            background: "var(--bg-card, #1a1f2e)",
            border: "1px solid var(--border, #2d3748)",
            borderRadius: 8,
            padding: "8px 16px",
          }}
        >
          Estimated completion: <strong style={{ color: "var(--text-secondary, #94a3b8)" }}>{formattedEnd}</strong>
        </div>
      )}

      {/* VERA wordmark */}
      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          letterSpacing: "0.12em",
          fontWeight: 700,
          color: "var(--text-muted, #475569)",
          textTransform: "uppercase",
        }}
      >
        VERA Platform
      </div>
    </div>
  );
}
