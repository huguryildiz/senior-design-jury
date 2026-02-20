import { useMemo, useState } from "react";

const PROJECTS = [
  { id: 1, name: "Group 1" },
  { id: 2, name: "Group 2" },
  { id: 3, name: "Group 3" },
  { id: 4, name: "Group 4" },
  { id: 5, name: "Group 5" },
  { id: 6, name: "Group 6" },
];

const CRITERIA = [
  {
    id: "design",
    label: "Poster Design & Organization",
    max: 20,
    rubric: [
      { range: "18–20", level: "Excellent", desc: "Information flow is intuitive and logical. Visuals are fully labeled and high quality. Layout is understandable even for non-technical readers." },
      { range: "14–17", level: "Good", desc: "Information flow is mostly logical. Visuals are readable with minor gaps. Layout is balanced and easy to follow." },
      { range: "9–13", level: "Developing", desc: "Occasional gaps in flow. Some missing labels or captions. Layout is acceptable but needs improvement." },
      { range: "0–8", level: "Insufficient", desc: "Information flow is confusing. Visuals are low quality or unlabeled. Layout is unbalanced or cluttered." },
    ],
  },
  {
    id: "technical",
    label: "Technical Content & Clarity",
    max: 40,
    rubric: [
      { range: "35–40", level: "Excellent", desc: "Problem, motivation, and design decisions are clear and well-justified. Engineering depth and originality are evident. Content is accessible to non-specialist readers." },
      { range: "28–34", level: "Good", desc: "Design is mostly clear and justified. Technical decisions are largely supported. Partial adaptation for different audiences." },
      { range: "18–27", level: "Developing", desc: "Problem is stated but motivation/justification is insufficient. Audience diversity not considered." },
      { range: "0–17", level: "Insufficient", desc: "Problem is vague, decisions unjustified. Technical content is superficial. No adaptation for different audiences." },
    ],
  },
  {
    id: "delivery",
    label: "Delivery & Q&A",
    max: 30,
    rubric: [
      { range: "27–30", level: "Excellent", desc: "Presentation consciously adapted for both technical and non-technical jury. Responses are accurate and audience-appropriate. Key ideas communicated within limited time." },
      { range: "21–26", level: "Good", desc: "Presentation is mostly clear. Partial audience adaptation. Most questions answered correctly. Time management acceptable." },
      { range: "13–20", level: "Developing", desc: "Understandable but inconsistent. Limited audience adaptation. Some questions unanswered. Weak time management." },
      { range: "0–12", level: "Insufficient", desc: "Presentation is unclear or disorganized. No audience adaptation. Most questions answered incorrectly or not at all." },
    ],
  },
  {
    id: "teamwork",
    label: "Teamwork & Professionalism",
    max: 10,
    rubric: [
      { range: "9–10", level: "Excellent", desc: "All members participate actively and equally. Team represents all project components. Professional and ethical conduct observed." },
      { range: "7–8", level: "Good", desc: "Most members contribute actively. Minor knowledge gaps. Professionalism mostly observed." },
      { range: "4–6", level: "Developing", desc: "Participation is uneven. Some members are passive. Knowledge gaps in certain areas." },
      { range: "0–3", level: "Insufficient", desc: "Participation is very low or limited to one person. Lack of professionalism or ethical concerns observed." },
    ],
  },
];

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzww7kMxTG-w7GQapNA-5jbiRCsXQ5SXFmCTe8vx6isE3Ann9ANUMqoTseddQfWBP4M6g/exec";

export default function JuryForm({ onBack }) {
  const [juryName, setJuryName] = useState("");
  const [juryDept, setJuryDept] = useState("");
  const [step, setStep] = useState("info");
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState(
    Object.fromEntries(PROJECTS.map((p) => [p.id, Object.fromEntries(CRITERIA.map((c) => [c.id, ""]))]))
  );
  const [comments, setComments] = useState(Object.fromEntries(PROJECTS.map((p) => [p.id, ""])));
  const [openRubric, setOpenRubric] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Track which inputs have been touched so we only show "required" styling after interaction
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
          CRITERIA.map((c) => [c.id, prev[pid]?.[c.id] || scores[pid][c.id] !== "" ? prev[pid]?.[c.id] : true])
        ),
      },
    }));
  };

  const firstIncompleteIndex = () => {
    const idx = PROJECTS.findIndex((p) => !allFilled(p.id));
    return idx >= 0 ? idx : 0;
  };

  const project = PROJECTS[current];
  const total = (pid) => CRITERIA.reduce((s, c) => s + (parseInt(scores[pid][c.id]) || 0), 0);
  const allFilled = (pid) => CRITERIA.every((c) => scores[pid][c.id] !== "");

  const handleScore = (pid, cid, val) => {
    const crit = CRITERIA.find((c) => c.id === cid);
    const num = Math.min(Math.max(parseInt(val) || 0, 0), crit.max);
    setScores((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: val === "" ? "" : num } }));
    markTouched(pid, cid);
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    // Mark all missing fields as touched so the UI can highlight them
    PROJECTS.forEach((p) => {
      if (!allFilled(p.id)) markMissingTouched(p.id);
    });

    // Block submit if any group is incomplete; jump to the first incomplete group
    const firstBad = PROJECTS.findIndex((p) => !allFilled(p.id));
    if (firstBad !== -1) {
      setCurrent(firstBad);
      alert("Please complete all required scores before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const rows = PROJECTS.map((p) => ({
        juryName,
        juryDept,
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
      setStep("done");
    } catch (e) {
      alert("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  if (step === "done") {
    return (
      <div className="done-screen">
        <div className="done-card">
          <div className="done-icon">✅</div>
          <h2>Evaluations Submitted!</h2>
          <p>Your evaluation has been successfully recorded. Thank you for your contribution. 🙏</p>
          <div className="done-summary">
            {PROJECTS.map((p) => (
              <div key={p.id} className="done-row">
                <span>{p.name}</span>
                <span className="done-score">{total(p.id)} / 100</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={onBack}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (step === "info") {
    return (
      <div className="form-screen">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div>
            <h2>Evaluation Form</h2>
            <p>EE 492 Poster Presentation</p>
          </div>
        </div>
        <div className="info-card">
          <h3>Jury Member Information</h3>
          <div className="field">
            <label>Full Name *</label>
            <input value={juryName} onChange={(e) => setJuryName(e.target.value)} placeholder="e.g. Prof. Dr. Jane Smith" />
          </div>
          <div className="field">
            <label>Department / Institution *</label>
            <input value={juryDept} onChange={(e) => setJuryDept(e.target.value)} placeholder="e.g. EEE Dept. / TED University" />
          </div>
          <button className="btn-primary" disabled={!juryName.trim() || !juryDept.trim()} onClick={() => setStep("eval")}>
            Start Evaluation →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-screen">
      <div className="form-header">
        <button className="back-btn" onClick={() => setStep("info")}>←</button>
        <div>
          <h2>{project.name}</h2>
          <p>{juryName} · {current + 1} / {PROJECTS.length}</p>
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
        <div className="group-selector">
          {PROJECTS.map((p, i) => {
            const complete = allFilled(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`group-chip ${i === current ? "active" : ""} ${complete ? "ok" : "missing"}`}
                onClick={() => setCurrent(i)}
              >
                {p.name} {complete ? "✅" : submitAttempted ? "⚠️" : ""}
              </button>
            );
          })}
        </div>
        {CRITERIA.map((crit) => (
          <div
            key={crit.id}
            className={`crit-card ${
              (touched[project.id][crit.id] || submitAttempted) && scores[project.id][crit.id] === "" ? "invalid" : ""
            }`}
          >
            <div className="crit-header">
              <div>
                <div className="crit-label">{crit.label}</div>
                <div className="crit-max">Maximum: {crit.max} pts</div>
              </div>
              <button className="rubric-btn" onClick={() => setOpenRubric(openRubric === crit.id ? null : crit.id)}>
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
                type="number" min="0" max={crit.max}
                value={scores[project.id][crit.id]}
                onChange={(e) => handleScore(project.id, crit.id, e.target.value)}
                onBlur={() => markTouched(project.id, crit.id)}
                placeholder="—" className="score-input"
              />
              <span className="score-bar-wrap">
                <span className="score-bar" style={{ width: `${((parseInt(scores[project.id][crit.id]) || 0) / crit.max) * 100}%` }} />
              </span>
              <span className="score-pct">
                {scores[project.id][crit.id] !== "" ? `${scores[project.id][crit.id]} / ${crit.max}` : `— / ${crit.max}`}
              </span>
            </div>
            {((touched[project.id][crit.id] || submitAttempted) && scores[project.id][crit.id] === "") && (
              <div className="required-hint">Required</div>
            )}
          </div>
        ))}

        <div className="crit-card comment-card">
          <div className="crit-label">Comments (Optional)</div>
          <textarea
            value={comments[project.id]}
            onChange={(e) => setComments((prev) => ({ ...prev, [project.id]: e.target.value }))}
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

        {current < PROJECTS.length - 1 ? (
          <button className="btn-primary full" onClick={() => setCurrent(current + 1)}>
            Next Group →
          </button>
        ) : (
          <button className="btn-primary full green" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "✓ Submit All Evaluations"}
          </button>
        )}

        {submitAttempted && PROJECTS.some((p) => !allFilled(p.id)) && (
          <div className="missing-note">
            Please complete the missing scores (highlighted in red) before submitting.
          </div>
        )}
      </div>
    </div>
  );
}
