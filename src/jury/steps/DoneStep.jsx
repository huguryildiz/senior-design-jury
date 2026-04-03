// src/jury/steps/DoneStep.jsx
import "../../styles/jury.css";

export default function DoneStep({ state, onBack }) {
  const handleExit = () => {
    state.clearLocalSession();
    onBack();
  };

  // Calculate total score
  const totalScore =
    Object.values(state.scores).reduce((sum, projScores) => {
      return (
        sum +
        Object.values(projScores).reduce((pSum, score) => {
          return pSum + (parseInt(score) || 0);
        }, 0)
      );
    }, 0) || 0;

  const maxPossible =
    state.effectiveCriteria.reduce((sum, crit) => sum + crit.max, 0) *
    state.projects.length;

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card" style={{ maxWidth: "480px" }}>
        <div className="dj-done-icon">✓</div>

        <div className="jury-title">Thank You!</div>
        <div className="jury-sub">
          Your evaluation has been submitted successfully.
        </div>

        {/* Summary stats */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            borderRadius: "10px",
            padding: "16px",
            margin: "20px 0",
            fontSize: "12px",
            color: "#cbd5e1",
          }}
        >
          <div style={{ marginBottom: "12px", fontWeight: "600" }}>
            Your Summary
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Groups Evaluated
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginTop: "4px",
                }}
              >
                {state.projects.length}
              </div>
            </div>

            <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Total Score
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginTop: "4px",
                  fontFamily: "monospace",
                }}
              >
                {totalScore} / {maxPossible}
              </div>
            </div>
          </div>
        </div>

        {/* Score grid */}
        {state.projects.length > 0 && (
          <div
            style={{
              background: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(148, 163, 184, 0.08)",
              borderRadius: "10px",
              padding: "12px",
              margin: "12px 0",
              maxHeight: "200px",
              overflowY: "auto",
              fontSize: "11px",
            }}
          >
            {state.projects.map((proj, idx) => {
              const projScores = state.scores[proj.project_id] || {};
              const projTotal = Object.values(projScores).reduce(
                (sum, score) => sum + (parseInt(score) || 0),
                0
              );

              return (
                <div
                  key={proj.project_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px",
                    borderBottom:
                      idx < state.projects.length - 1
                        ? "1px solid rgba(148, 163, 184, 0.08)"
                        : "none",
                    color: "#cbd5e1",
                  }}
                >
                  <span>{proj.title}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
                    {projTotal}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            className="dj-btn-primary"
            onClick={handleExit}
            style={{ width: "100%" }}
          >
            Exit
          </button>

        </div>
      </div>
    </div>
  );
}
