import { useMemo, useState, useEffect, useRef } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

const STORAGE_KEY = "ee492_jury_draft_v1";
const SCRIPT_URL = APP_CONFIG?.scriptUrl;

// Full state reset helper
function makeEmptyScores() {
  return Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, ""]))])
  );
}
function makeEmptyComments() {
  return Object.fromEntries(PROJECTS.map((p) => [p.id, ""]));
}
function makeEmptyTouched() {
  return Object.fromEntries(
    PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, false]))])
  );
}

export default function JuryForm({ onBack }) {
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");
  const [step, setStep] = useState("info");
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState(makeEmptyScores);
  const [comments, setComments] = useState(makeEmptyComments);
  const [openRubric, setOpenRubric] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(makeEmptyTouched);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false); // banner
  const [showBackMenu, setShowBackMenu] = useState(false); // inline back menu
  const [submitError, setSubmitError] = useState(null);

  // Track original name to detect when user changes it (draft warning)
  const draftNameRef = useRef("");

  // 🔄 Load draft on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.juryName) { setJuryName(parsed.juryName); draftNameRef.current = parsed.juryName; }
      if (parsed.juryDept) setJuryDept(parsed.juryDept);
      if (parsed.scores) setScores(parsed.scores);
      if (parsed.comments) setComments(parsed.comments);
      if (typeof parsed.current === "number") setCurrent(parsed.current);
      if (parsed.step === "eval") { setStep("eval"); setDraftLoaded(true); }
      else if (parsed.juryName) setDraftLoaded(true);
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
  }, []);

  // 💾 Auto-save during eval
  useEffect(() => {
    if (step !== "eval") return;
    const draft = { juryName, juryDept, scores, comments, current, step };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch (e) {}
  }, [juryName, juryDept, scores, comments, current, step]);

  // Full state reset
  const resetAll = () => {
    setJuryName("");
    setJuryDept("");
    setStep("info");
    setCurrent(0);
    setScores(makeEmptyScores());
    setComments(makeEmptyComments());
    setTouched(makeEmptyTouched());
    setSubmitAttempted(false);
    setSubmitting(false);
    setDraftLoaded(false);
    setShowBackMenu(false);
    setSubmitError(null);
    draftNameRef.current = "";
  };

  const project = PROJECTS[current];

  const total = (pid) => CRITERIA.reduce((s, c) => s + (parseInt(scores[pid][c.id], 10) || 0), 0);
  const allFilled = (pid) => CRITERIA.every((c) => scores[pid][c.id] !== "");
  const incompleteCount = PROJECTS.reduce((acc, p) => acc + (allFilled(p.id) ? 0 : 1), 0);
  const firstIncompleteIdx = PROJECTS.findIndex((p) => !allFilled(p.id));
  const completedCount = PROJECTS.length - incompleteCount;
  const progressPct = Math.round((completedCount / PROJECTS.length) * 100);

  const markTouched = (pid, cid) =>
    setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));

  const markMissingTouched = (pid) =>
    setTouched((prev) => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        ...Object.fromEntries(
          CRITERIA.map((c) => [
            c.id,
            prev[pid]?.[c.id] || scores[pid][c.id] !== "" ? prev[pid]?.[c.id] : true,
          ])
        ),
      },
    }));

  const handleScore = (pid, cid, val) => {
    const crit = CRITERIA.find((c) => c.id === cid);
    const parsed = val === "" ? "" : parseInt(val, 10);
    const clamped =
      val === "" ? "" : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), crit.max);
    setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: clamped } }));
    markTouched(pid, cid);
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);
    PROJECTS.forEach((p) => { if (!allFilled(p.id)) markMissingTouched(p.id); });
    const firstBad = PROJECTS.findIndex((p) => !allFilled(p.id));
    if (firstBad !== -1) {
      setCurrent(firstBad);
      alert("Please complete all required scores before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      if (!SCRIPT_URL) throw new Error("Missing APP_CONFIG.scriptUrl in src/config.js");

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
      setSubmitError("Submission failed. Please check your internet connection and try again.");
    }
    setSubmitting(false);
  };

  // ─── DONE screen ───────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="done-screen">
        <div className="done-card">
          <div className="done-icon">✅</div>
          <h2>Evaluation Submitted</h2>
          <p>Thank you for reviewing the projects. 🙏</p>
          <p className="done-note">If needed, you may submit again to update your scores.</p>
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
              resetAll();
              onBack();
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ─── INFO screen ───────────────────────────────────────────
  if (step === "info") {
    const nameChanged =
      draftNameRef.current &&
      juryName.trim() &&
      juryName.trim().toLowerCase() !== draftNameRef.current.toLowerCase();

    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div>
            <h2>Evaluation Form</h2>
            <p>EE 492 Poster Presentation</p>
          </div>
        </div>

        {/* Draft loaded banner */}
        {draftLoaded && (
          <div className="info-draft-banner">
            <span>💾</span>
            <span>Saved draft found — you can continue from where you left off.</span>
          </div>
        )}

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

          {/* Warn if name differs from saved draft */}
          {nameChanged && (
            <div className="draft-name-warning">
              ⚠️ Entering a different name will overwrite the saved draft when you start evaluating.
            </div>
          )}

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

  // ─── EVAL screen ───────────────────────────────────────────
  return (
    <div className="form-screen">
      <div className="form-header">
        <button
          className="back-btn"
          onClick={() => setShowBackMenu((v) => !v)}
          title="Back"
          aria-label="Back"
        >
          ←
        </button>

        {/* Inline back menu overlay */}
        {showBackMenu && (
          <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
            <div className="back-menu" onClick={(e) => e.stopPropagation()}>
              <p className="back-menu-title">What would you like to do?</p>
              <p className="back-menu-sub">Your draft is saved and you can resume any time.</p>
              <button
                className="back-menu-btn primary"
                onClick={() => {
                  setShowBackMenu(false);
                  onBack();
                }}
              >
                🏠 Go to Home
              </button>
              <button
                className="back-menu-btn secondary"
                onClick={() => {
                  setShowBackMenu(false);
                  setStep("info");
                }}
              >
                ✏️ Edit Name / Department
              </button>
              <button
                className="back-menu-btn ghost"
                onClick={() => setShowBackMenu(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
                className={`dot-btn ${i === current ? "active" : ""} ${complete ? "done" : ""}`}
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
        {/* Group navigation */}
        <div className="group-nav" role="navigation" aria-label="Group navigation">
          <button
            type="button"
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            aria-label="Previous group"
          >←</button>

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
                <option key={p.id} value={i}>{p.name} {mark}</option>
              );
            })}
          </select>

          <button
            type="button"
            className="group-nav-btn"
            onClick={() => setCurrent((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={current === PROJECTS.length - 1}
            aria-label="Next group"
          >→</button>
        </div>

        {/* Overall progress */}
        <div className="overall-progress" aria-label="Overall progress">
          <div className="overall-progress-top">
            <span className="overall-progress-text">
              Progress: <strong>{progressPct}%</strong>
            </span>
            <span className="overall-progress-count">
              <strong>{completedCount}</strong> / {PROJECTS.length} completed
            </span>
          </div>
          <div
            className="overall-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div
              className="overall-progress-fill"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct === 100
                    ? "linear-gradient(90deg, rgba(34,197,94,1), rgba(16,185,129,1))"
                    : "linear-gradient(90deg, rgba(245,158,11,1), rgba(234,179,8,1))",
              }}
            />
          </div>
        </div>

        {CRITERIA.map((crit) => {
          const isMissing = scores[project.id][crit.id] === "";
          const showMissing = (touched[project.id][crit.id] || submitAttempted) && isMissing;

          return (
            <div key={crit.id} className={`crit-card ${showMissing ? "invalid" : ""}`}>
              <div className="crit-header">
                <div>
                  <div className="crit-label">{crit.label}</div>
                  <div className="crit-max">Maximum: {crit.max} pts</div>
                </div>
                <button
                  className="rubric-btn"
                  onClick={() => setOpenRubric(openRubric === crit.id ? null : crit.id)}
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
                      width: `${((parseInt(scores[project.id][crit.id], 10) || 0) / crit.max) * 100}%`,
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
          <span className={`total-score ${total(project.id) >= 80 ? "high" : total(project.id) >= 60 ? "mid" : ""}`}>
            {total(project.id)} / 100
          </span>
        </div>

        {/* Network/submit error */}
        {submitError && (
          <div className="submit-error-msg">
            ⚠️ {submitError}
          </div>
        )}

        <button
          className={`btn-primary full ${incompleteCount === 0 ? "green" : ""}`}
          disabled={submitting}
          onClick={() => {
            if (incompleteCount === 0) { handleSubmit(); return; }
            setSubmitAttempted(true);
            PROJECTS.forEach((p) => { if (!allFilled(p.id)) markMissingTouched(p.id); });
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
