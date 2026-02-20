import { useMemo, useState, useEffect } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";


const STORAGE_KEY = "ee492_jury_draft_v1";

const SCRIPT_URL = APP_CONFIG?.scriptUrl;

export default function JuryForm({ onBack }) {
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");
  const [step, setStep] = useState("info"); // info | eval | done
  const [current, setCurrent] = useState(0);

  const [scores, setScores] = useState(
    Object.fromEntries(
      PROJECTS.map((p) => [
        p.id,
        Object.fromEntries(CRITERIA.map((c) => [c.id, ""])),
      ])
    )
  );

  const [comments, setComments] = useState(
    Object.fromEntries(PROJECTS.map((p) => [p.id, ""]))
  );

  const [openRubric, setOpenRubric] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // touched state: show required/invalid only after interaction OR submit attempt
  const initialTouched = useMemo(() => {
    return Object.fromEntries(
      PROJECTS.map((p) => [
        p.id,
        Object.fromEntries(CRITERIA.map((c) => [c.id, false])),
      ])
    );
  }, []);

  const [touched, setTouched] = useState(initialTouched);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // 🔄 Load draft from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (parsed.juryName) setJuryName(parsed.juryName);
      if (parsed.juryDept) setJuryDept(parsed.juryDept);
      if (parsed.scores) setScores(parsed.scores);
      if (parsed.comments) setComments(parsed.comments);
      if (typeof parsed.current === "number") setCurrent(parsed.current);
      if (parsed.step === "eval") setStep("eval");
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
  }, []);

  // 💾 Auto-save draft whenever evaluation data changes
  useEffect(() => {
    if (step !== "eval") return;

    const draft = {
      juryName,
      juryDept,
      scores,
      comments,
      current,
      step,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to save draft:", e);
    }
  }, [juryName, juryDept, scores, comments, current, step]);

  const project = PROJECTS[current];

  const total = (pid) =>
    CRITERIA.reduce((s, c) => s + (parseInt(scores[pid][c.id], 10) || 0), 0);

  const allFilled = (pid) => CRITERIA.every((c) => scores[pid][c.id] !== "");

  const incompleteCount = PROJECTS.reduce(
    (acc, p) => acc + (allFilled(p.id) ? 0 : 1),
    0
  );
  const firstIncompleteIdx = PROJECTS.findIndex((p) => !allFilled(p.id));

  // Overall progress
  const completedCount = PROJECTS.length - incompleteCount;
  const progressPct = Math.round((completedCount / PROJECTS.length) * 100);

  const markTouched = (pid, cid) => {
    setTouched((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], [cid]: true },
    }));
  };

  const markMissingTouched = (pid) => {
    setTouched((prev) => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        ...Object.fromEntries(
          CRITERIA.map((c) => [
            c.id,
            prev[pid]?.[c.id] || scores[pid][c.id] !== ""
              ? prev[pid]?.[c.id]
              : true,
          ])
        ),
      },
    }));
  };

  const handleScore = (pid, cid, val) => {
    const crit = CRITERIA.find((c) => c.id === cid);
    const parsed = val === "" ? "" : parseInt(val, 10);
    const clamped =
      val === ""
        ? ""
        : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), crit.max);

    setScores((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], [cid]: clamped },
    }));
    markTouched(pid, cid);
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    // mark missing fields across all projects so they can be highlighted
    PROJECTS.forEach((p) => {
      if (!allFilled(p.id)) markMissingTouched(p.id);
    });

    // block if any group incomplete, jump to first incomplete
    const firstBad = PROJECTS.findIndex((p) => !allFilled(p.id));
    if (firstBad !== -1) {
      setCurrent(firstBad);
      alert("Please complete all required scores before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      if (!SCRIPT_URL) {
        throw new Error("Missing APP_CONFIG.scriptUrl in src/config.js");
      }
      const rows = PROJECTS.map((p) => ({
        juryName: juryName.trim(),
        juryDept: juryDept.trim(),
        timestamp: new Date().toLocaleString("en-GB"),
        projectId: p.id,
        projectName: p.name,
        design: scores[p.id].design,
        technical: scores[p.id].technical,
        delivery: scores[p.id].delivery,
        teamwork: scores[p.id].teamwork,
        total: total(p.id),
        comments: comments[p.id] || "",
      }));

      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      localStorage.removeItem(STORAGE_KEY);
      setStep("done");
    } catch (e) {
      alert("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  // DONE screen
  if (step === "done") {
    return (
      <div className="done-screen">
        <div className="done-card">
          <div className="done-icon">✅</div>
          <h2>Evaluation Submitted</h2>
          <p>Thank you for reviewing the projects. 🙏</p>
          <p className="done-note">
            If needed, you may submit again to update your scores.
          </p>

          <div className="done-summary">
            {PROJECTS.map((p) => (
              <div key={p.id} className="done-row">
                <span>{p.name}</span>
                <span className="done-score">{total(p.id)} / 100</span>
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              setStep("info");
              setCurrent(0);
              onBack();
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // INFO screen
  if (step === "info") {
    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>
            ←
          </button>
          <div>
            <h2>Evaluation Form</h2>
            <p>EE 492 Poster Presentation</p>
          </div>
        </div>

        <div className="info-card">
          <h3>Jury Member Information</h3>

          <div className="field">
            <label>Full Name *</label>
            <input
              value={juryName}
              onChange={(e) => setJuryName(e.target.value)}
              placeholder="e.g. Prof. Dr. Jane Smith"
            />
          </div>

          <div className="field">
            <label>Department / Institution *</label>
            <input
              value={juryDept}
              onChange={(e) => setJuryDept(e.target.value)}
              placeholder="e.g. EEE Dept. / TED University"
            />
          </div>

          <button
            className="btn-primary"
            disabled={!juryName.trim() || !juryDept.trim()}
            onClick={() => setStep("eval")}
          >
            Start Evaluation →
          </button>
        </div>
      </div>
    );
  }

  // EVAL screen
  return (
    <div className="form-screen">
      <div className="form-header">
        <button
          className="back-btn"
          onClick={() => {
            const goHome = window.confirm(
              "Go back to Home? Your draft is saved, and you can resume later.\n\nPress OK to go Home, or Cancel to edit your name/department."
            );
            if (goHome) onBack();
            else setStep("info");
          }}
          title="Back"
          aria-label="Back"
        >
          ←
        </button>

        <div>
          <h2>{project.name}</h2>
          <p>{juryName || "Jury"}</p>
        </div>

        <div className="progress-dots">
          {PROJECTS.map((p, i) => {
            const complete = allFilled(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`dot-btn ${i === current ? "active" : ""} ${
                  complete ? "done" : ""
                }`}
                onClick={() => setCurrent(i)}
                title={complete ? "Complete" : "Missing scores"}
              >
                <span className="dot" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="eval-body">
        {/* Group navigation (scales to many groups): Prev/Next + dropdown */}
        <div className="group-nav" role="navigation" aria-label="Group navigation">
          <button
            type="button"
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            aria-label="Previous group"
            title="Previous"
          >
            ←
          </button>

          <div className="group-nav-title">
            <div className="group-nav-main">{project.name}</div>
            <div className="group-nav-sub">
              {current + 1} / {PROJECTS.length}
              {allFilled(project.id) ? (
                <span className="group-nav-status ok">· Complete</span>
              ) : submitAttempted ? (
                <span className="group-nav-status missing">· Missing</span>
              ) : (
                <span className="group-nav-status neutral">· In progress</span>
              )}
            </div>
          </div>

          <select
            className="group-nav-select"
            value={current}
            onChange={(e) => setCurrent(Number(e.target.value))}
            aria-label="Select group"
          >
            {PROJECTS.map((p, i) => {
              const complete = allFilled(p.id);
              const mark = complete ? "✅" : submitAttempted ? "⚠️" : "";
              return (
                <option key={p.id} value={i}>
                  {p.name} {mark}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1}
            aria-label="Next group"
            title="Next"
          >
            →
          </button>
        </div>

        {/* Overall progress */}
        <div
          className="overall-progress"
          aria-label="Overall progress"
          style={{
            margin: "10px 0 14px",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(226,232,240,1)",
            borderRadius: 14,
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="overall-progress-top"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 13,
              color: "rgba(71,85,105,1)",
            }}
          >
            <span className="overall-progress-text">
              Progress:{" "}
              <strong style={{ color: "rgba(15,23,42,1)" }}>{progressPct}%</strong>
            </span>
            <span className="overall-progress-count">
              <strong style={{ color: "rgba(15,23,42,1)" }}>
                {completedCount}
              </strong>{" "}
              / {PROJECTS.length} completed
            </span>
          </div>

          <div
            className="overall-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            style={{
              marginTop: 10,
              height: 10,
              borderRadius: 999,
              background: "rgba(226,232,240,1)",
              overflow: "hidden",
            }}
          >
            <div
              className="overall-progress-fill"
              style={{
                width: `${progressPct}%`,
                height: "100%",
                borderRadius: 999,
                background:
                  progressPct === 100
                    ? "linear-gradient(90deg, rgba(34,197,94,1), rgba(16,185,129,1))"
                    : "linear-gradient(90deg, rgba(245,158,11,1), rgba(234,179,8,1))",
                transition: "width 180ms ease",
              }}
            />
          </div>
        </div>

        {CRITERIA.map((crit) => {
          const isMissing = scores[project.id][crit.id] === "";
          const showMissing =
            (touched[project.id][crit.id] || submitAttempted) && isMissing;

          return (
            <div
              key={crit.id}
              className={`crit-card ${showMissing ? "invalid" : ""}`}
            >
              <div className="crit-header">
                <div>
                  <div className="crit-label">{crit.label}</div>
                  <div className="crit-max">Maximum: {crit.max} pts</div>
                </div>

                <button
                  className="rubric-btn"
                  onClick={() =>
                    setOpenRubric(openRubric === crit.id ? null : crit.id)
                  }
                >
                  {openRubric === crit.id ? "Hide Rubric ▲" : "Show Rubric ▼"}
                </button>
              </div>

              {openRubric === crit.id && (
                <div className="rubric-table">
                  {crit.rubric.map((r) => (
                    <div key={r.range} className="rubric-row">
                      <div className="rubric-range">{r.range}</div>
                      <div className="rubric-level">{r.level}</div>
                      <div className="rubric-desc">{r.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="score-input-row">
                <input
                  type="number"
                  min="0"
                  max={crit.max}
                  value={scores[project.id][crit.id]}
                  onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                  onBlur={() => markTouched(project.id, crit.id)}
                  placeholder="—"
                  className="score-input"
                />

                <span className="score-bar-wrap">
                  <span
                    className="score-bar"
                    style={{
                      width: `${
                        ((parseInt(scores[project.id][crit.id], 10) || 0) /
                          crit.max) *
                        100
                      }%`,
                    }}
                  />
                </span>

                <span className="score-pct">
                  {scores[project.id][crit.id] !== ""
                    ? `${scores[project.id][crit.id]} / ${crit.max}`
                    : `— / ${crit.max}`}
                </span>
              </div>

              {showMissing && <div className="required-hint">Required</div>}
            </div>
          );
        })}

        <div className="crit-card comment-card">
          <div className="crit-label">Comments (Optional)</div>
          <textarea
            value={comments[project.id]}
            onChange={(e) =>
              setComments((prev) => ({ ...prev, [project.id]: e.target.value }))
            }
            placeholder="Any additional comments about this group..."
            rows={3}
          />
        </div>

        <div className="total-bar">
          <span>Total</span>
          <span
            className={`total-score ${
              total(project.id) >= 80 ? "high" : total(project.id) >= 60 ? "mid" : ""
            }`}
          >
            {total(project.id)} / 100
          </span>
        </div>

        <button
          className={`btn-primary full ${incompleteCount === 0 ? "green" : ""}`}
          disabled={submitting}
          onClick={() => {
            if (incompleteCount === 0) {
              handleSubmit();
              return;
            }

            // Not ready yet: highlight missing fields and jump to first incomplete group
            setSubmitAttempted(true);
            PROJECTS.forEach((p) => {
              if (!allFilled(p.id)) markMissingTouched(p.id);
            });
            if (firstIncompleteIdx !== -1) setCurrent(firstIncompleteIdx);
          }}
        >
          {submitting
            ? "Submitting..."
            : incompleteCount === 0
            ? "✓ Submit All Evaluations"
            : `Complete remaining groups (${incompleteCount})`}
        </button>
      </div>
    </div>
  );
}