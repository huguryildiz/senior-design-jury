// src/jury/steps/DoneStep.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import "../../styles/jury.css";
import {
  ArrowRight,
  Home,
  Info,
  MessageSquare,
  Pencil,
  PartyPopper,
  Send,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { submitJuryFeedback } from "../../shared/api";
import { StudentNames } from "../../shared/ui/EntityMeta";

function useConfetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#3b82f6", "#60a5fa", "#6366f1", "#a5b4fc", "#22c55e", "#4ade80", "#f1f5f9"];
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      r: 3 + Math.random() * 4,
      d: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      tiltAngle: 0,
      opacity: 1,
    }));

    let frame = 0;
    const totalFrames = 140;
    let rafId;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.tiltAngle += 0.07;
        p.y += p.d;
        p.x += p.vx;
        const tilt = Math.sin(p.tiltAngle) * 8;
        if (frame > 80) p.opacity = Math.max(0, 1 - (frame - 80) / 60);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, tilt, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      frame++;
      if (frame < totalFrames) rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);
  return canvasRef;
}

function getGradeClass(pct) {
  if (pct >= 90) return "grade-a";
  if (pct >= 80) return "grade-b";
  if (pct >= 70) return "grade-c";
  return "grade-d";
}

function getBarClass(pct) {
  if (pct >= 90) return "bar-a";
  if (pct >= 80) return "bar-b";
  if (pct >= 70) return "bar-c";
  return "bar-d";
}

function getScoreStyle(score, max) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 90) return { bg: "var(--score-excellent-bg)", color: "var(--score-excellent-text)" };
  if (pct >= 80) return { bg: "var(--score-high-bg)",      color: "var(--score-high-text)" };
  if (pct >= 75) return { bg: "var(--score-good-bg)",      color: "var(--score-good-text)" };
  if (pct >= 70) return { bg: "var(--score-adequate-bg)",  color: "var(--score-adequate-text)" };
  if (pct >= 60) return { bg: "var(--score-low-bg)",       color: "var(--score-low-text)" };
  return           { bg: "var(--score-poor-bg)",       color: "var(--score-poor-text)" };
}

const STAR_LABELS = ["", "Needs Work", "Below Average", "Average", "Great", "Excellent!"];

export default function DoneStep({ state, onBack }) {
  const confettiRef = useConfetti();

  // ── Feedback state ──
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [fbStatus, setFbStatus] = useState("idle"); // idle | submitting | done | skipped
  const [fbHover, setFbHover] = useState(0);

  const handleFbSubmit = useCallback(async () => {
    if (!fbRating || fbStatus !== "idle") return;
    setFbStatus("submitting");
    try {
      await submitJuryFeedback(state.periodId, state.jurorSessionToken, fbRating, fbComment);
      setFbStatus("done");
    } catch {
      setFbStatus("done"); // fail silently — feedback is non-critical
    }
  }, [fbRating, fbComment, fbStatus, state.periodId, state.jurorSessionToken]);

  const handleReturnHome = () => {
    state.clearLocalSession();
    onBack();
  };

  const handleAdminSignIn = () => {
    state.clearLocalSession();
    window.location.href = window.location.pathname + "?admin";
  };

  const handleOpenAdminImpact = () => {
    state.setStep("admin_impact");
  };

  const maxPerProject =
    state.effectiveCriteria.reduce((sum, c) => sum + c.max, 0) || 100;

  // Per-project stats
  const projectStats = state.projects.map((proj) => {
    const projScores =
      state.doneScores?.[proj.project_id] ?? state.scores[proj.project_id] ?? {};
    const filledCount = Object.values(projScores).filter(
      (v) => v !== undefined && v !== "" && v !== null
    ).length;
    const isComplete = filledCount >= state.effectiveCriteria.length;
    const total = Object.values(projScores).reduce(
      (sum, v) => sum + (parseInt(v) || 0),
      0
    );
    const pct = Math.round((total / maxPerProject) * 100);
    const criteriaBreakdown = state.effectiveCriteria.map((c) => {
      const key = c.id ?? c.key;
      const val = projScores[key];
      return {
        label: c.short_label || c.label,
        max: c.max,
        value: parseInt(val) || 0,
        filled: val !== undefined && val !== "" && val !== null,
      };
    });
    return { proj, total, pct, isComplete, criteriaBreakdown };
  });

  const completedProjects = projectStats.filter((p) => p.isComplete);
  const scoredCount = completedProjects.length;
  const totalCount = state.projects.length;

  const avgScore =
    scoredCount > 0
      ? (
          completedProjects.reduce((s, p) => s + p.total, 0) / scoredCount
        ).toFixed(1)
      : "—";

  const topScore =
    scoredCount > 0
      ? Math.max(...completedProjects.map((p) => p.total))
      : "—";

  const jurorName = state.juryName || "Juror";

  return (
    <div className="jury-step" id="dj-step-done" style={{ justifyContent: "flex-start", paddingTop: 16 }}>
      <div className="dj-glass dj-glass-card dj-done-card" style={{ maxWidth: "500px" }}>

        {/* Completion icon */}
        <div className="dj-done-icon celebrate">
          <PartyPopper size={24} strokeWidth={2} />
        </div>

        {/* Status pill */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <div className="dj-done-status-pill">Evaluation Submitted</div>
        </div>

        {/* Title + subtitle */}
        <div className="dj-h1" style={{ textAlign: "center", marginBottom: "6px" }}>
          Thank You, {jurorName}!
        </div>
        <div className="dj-sub" style={{ textAlign: "center", marginTop: 0, marginBottom: 0 }}>
          Your evaluations have been recorded. Reach out to the administrator if any changes are needed.
        </div>

        {/* Hero stats strip */}
        <div className="dj-done-hero">
          <div className="dj-done-hero-item">
            <div className="dj-done-hero-num green">
              {scoredCount}<span className="dj-hero-frac">/{totalCount}</span>
            </div>
            <div className="dj-done-hero-label">Groups Scored</div>
          </div>
          <div className="dj-done-hero-divider" />
          <div className="dj-done-hero-item">
            <div className="dj-done-hero-num">{avgScore}</div>
            <div className="dj-done-hero-label">Avg Score</div>
          </div>
          <div className="dj-done-hero-divider" />
          <div className="dj-done-hero-item">
            <div className="dj-done-hero-num">{topScore}</div>
            <div className="dj-done-hero-label">Top Score</div>
          </div>
        </div>

        {/* Final submission notice */}
        <div className="dj-info amber" style={{ marginBottom: "14px", fontSize: "11px" }}>
          <Info size={16} strokeWidth={2} />
          <span>Scores are final once submitted and visible to administrators.</span>
        </div>

        {/* Submitted groups list */}
        <div className="dj-done-section-label">Submitted Groups</div>
        <div className="dj-done-list-wrap">
          <div className="dj-score-list">
            {projectStats.map(({ proj, total, pct, isComplete, criteriaBreakdown }) => (
              <div key={proj.project_id} className="dj-done-proj-row">
                <div className={`dj-done-proj-dot ${isComplete ? "complete" : "partial"}`} />
                <div className="dj-done-proj-info">
                  <div className="dj-done-proj-name">{proj.title || "—"}</div>
                  {proj.members && <StudentNames names={proj.members} />}
                  <div className="dj-done-crit-chips">
                    {criteriaBreakdown.map((c) => {
                      const s = c.filled ? getScoreStyle(c.value, c.max) : null;
                      return (
                        <span
                          key={c.label}
                          className="dj-done-crit-chip"
                          style={s ? { background: s.bg, color: s.color } : undefined}
                        >
                          <span className="dj-done-crit-label">{c.label}</span>
                          <span className="dj-done-crit-val">{c.filled ? c.value : "—"}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="dj-done-proj-bar-track">
                    <div
                      className={`dj-done-proj-bar-fill ${isComplete ? getBarClass(pct) : "bar-partial"}`}
                      style={{ width: `${isComplete ? pct : Math.max(pct, 8)}%` }}
                    />
                  </div>
                </div>
                <div className={`dj-done-proj-score-wrap ${isComplete ? getGradeClass(pct) : "grade-partial"}`}>
                  <span className="dj-done-proj-score-num">{total}</span>
                  <span className="dj-done-proj-score-denom">/{maxPerProject}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback card */}
        {fbStatus !== "skipped" && (
          <div className="dj-feedback-section">
            <div className="dj-done-section-label">Quick Feedback</div>
            <div className="dj-feedback-card">
              {fbStatus === "done" ? (
                <div className="dj-feedback-submitted">
                  <div className="dj-feedback-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <div className="dj-feedback-thanks">Thank you for your feedback!</div>
                  <div className="dj-feedback-thanks-sub">Your input helps us improve VERA for everyone.</div>
                </div>
              ) : (
                <>
                  <div className="dj-feedback-icon">
                    <MessageSquare size={20} strokeWidth={2} />
                  </div>
                  <div className="dj-feedback-title">How was your experience?</div>
                  <div className="dj-feedback-sub">Your rating may appear on our website to help future jurors.</div>

                  <div className="dj-stars">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        className={`dj-star${v <= (fbHover || fbRating) ? " active" : ""}`}
                        onClick={() => setFbRating(v)}
                        onMouseEnter={() => setFbHover(v)}
                        onMouseLeave={() => setFbHover(0)}
                      >
                        <Star size={20} strokeWidth={1.5} fill={v <= (fbHover || fbRating) ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  {fbRating > 0 && (
                    <div className="dj-star-label">{STAR_LABELS[fbRating]}</div>
                  )}

                  <textarea
                    className="dj-feedback-textarea"
                    placeholder="Any suggestions or comments? (optional)"
                    rows={2}
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                  />

                  <div className="dj-feedback-actions">
                    <button className="dj-feedback-skip" onClick={() => setFbStatus("skipped")}>
                      Skip
                    </button>
                    <button
                      className="dj-feedback-submit"
                      disabled={!fbRating || fbStatus === "submitting"}
                      onClick={handleFbSubmit}
                    >
                      <Send size={14} strokeWidth={2} />
                      {fbStatus === "submitting" ? "Sending..." : "Send Feedback"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Next step */}
        <div className="dj-next-step-wrap" style={{ marginTop: "16px" }}>
          <div className="dj-done-section-label" style={{ marginTop: 0 }}>Next Step</div>

          {state.editAllowed ? (
            <button
              className="dj-done-primary-btn"
              onClick={state.handleEditScores}
              style={{ marginBottom: "8px" }}
            >
              <span className="dj-done-primary-btn-main">
                <Pencil className="dj-done-primary-btn-icon" size={16} strokeWidth={2} />
                <span className="dj-done-primary-btn-label">Edit Scores</span>
              </span>
              <ArrowRight className="dj-done-primary-btn-arrow" size={16} strokeWidth={2} />
            </button>
          ) : (
            <button className="dj-done-primary-btn" onClick={handleOpenAdminImpact}>
              <span className="dj-done-primary-btn-main">
                <TrendingUp className="dj-done-primary-btn-icon" size={16} strokeWidth={2} />
                <span className="dj-done-primary-btn-label">Open Admin Impact</span>
              </span>
              <ArrowRight className="dj-done-primary-btn-arrow" size={16} strokeWidth={2} />
            </button>
          )}

          <div className="dj-done-secondary-row">
            {state.editAllowed && (
              <button className="dj-done-sec-btn" onClick={handleOpenAdminImpact}>
                <TrendingUp size={16} strokeWidth={2} />
                Admin Impact
              </button>
            )}
            <button className="dj-done-sec-btn" onClick={handleAdminSignIn}>
              <ShieldCheck size={16} strokeWidth={2} />
              Admin Sign-In
            </button>
            <button className="dj-done-sec-btn" onClick={handleReturnHome}>
              <Home size={16} strokeWidth={2} />
              Return Home
            </button>
          </div>
        </div>

      </div>

      {/* Confetti canvas — fixed, full-screen, pointer-events none */}
      <canvas
        ref={confettiRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
    </div>
  );
}
