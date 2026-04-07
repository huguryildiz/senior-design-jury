// src/jury/steps/ProgressStep.jsx
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import "../../styles/jury.css";

export default function ProgressStep({ state, onBack }) {
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = () => {
    setSubmitting(true);
    state.handleProgressContinue();
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        <div className="jury-icon-box primary">
          <Plus size={24} strokeWidth={1.5} />
        </div>

        <div className="jury-title">Your Progress</div>
        <div className="jury-sub">
          {state.progressCheck?.isInProgress
            ? "You have an in-progress session. You can continue from where you left off."
            : "No previous sessions found. Starting fresh."}
        </div>

        {state.progressCheck?.isInProgress && (
          <div
            style={{
              background: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(148, 163, 184, 0.08)",
              borderRadius: "10px",
              padding: "16px",
              margin: "16px 0",
              fontSize: "12px",
              color: "#cbd5e1",
            }}
          >
            <div style={{ marginBottom: "8px", fontWeight: "600" }}>
              Groups Completed: {state.progressCheck?.groupsCompleted || 0} / {state.activeProjectCount || 0}
            </div>
            <div style={{ marginBottom: "8px" }}>
              Last Worked: {state.progressCheck?.lastWorkedAt ? new Date(state.progressCheck?.lastWorkedAt).toLocaleString() : "N/A"}
            </div>

            <div className="jury-progress-bar">
              <div
                className="jury-progress-fill"
                style={{
                  width: `${
                    state.activeProjectCount
                      ? ((state.progressCheck?.groupsCompleted || 0) / state.activeProjectCount) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        <button
          className="btn-landing-primary"
          onClick={handleContinue}
          disabled={submitting}
          style={{ width: "100%", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting && <Loader2 size={15} className="jg-spin" />}
          {submitting ? "Loading…" : (state.progressCheck?.isInProgress ? "Resume Evaluation" : "Start Evaluation")}
        </button>

        <button
          className="dj-btn-secondary"
          onClick={onBack}
          style={{ width: "100%", marginTop: "8px" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
