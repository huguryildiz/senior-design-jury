import "../../styles/jury.css";
import { formatDate } from "@/shared/lib/dateUtils";

export default function SemesterStep({ state, onBack }) {
  const handleSelectPeriod = (periodId) => {
    state.handlePeriodSelect(periodId);
  };

  if (!state.periods || state.periods.length === 0) {
    return (
      <div className="jury-step">
        <div className="jury-card dj-glass-card">
          <div className="jury-title">No Periods Available</div>
          <div className="jury-sub">
            Please contact the coordinators for access to an evaluation period.
          </div>
          <button
            className="dj-btn-secondary"
            onClick={onBack}
            style={{ width: "100%", marginTop: "16px" }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        <div className="jury-title">Select Evaluation Period</div>
        <div className="jury-sub">
          Choose the evaluation period you want to participate in
        </div>

        <div className="jury-semester-grid">
          {state.periods.map((period) => (
            <div
              key={period.id}
              className={`jury-semester-card ${
                state.periodId === period.id ? "selected" : ""
              }`}
              onClick={() => handleSelectPeriod(period.id)}
            >
              <div className="jury-semester-name">{period.name}</div>
              {period.start_date && (
                <div className="jury-semester-date">
                  {formatDate(period.start_date)}
                </div>
              )}
            </div>
          ))}
        </div>

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
