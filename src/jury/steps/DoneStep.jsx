// src/jury/steps/DoneStep.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import "../../styles/jury.css";
import {
  ArrowLeft,
  BarChart2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  Star,
} from "lucide-react";
import { submitJuryFeedback, requestScoreEdit } from "../../shared/api";

/* ── Confetti animation (unchanged) ── */
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

const STAR_LABELS = ["", "Needs Work", "Below Average", "Average", "Great", "Excellent!"];

export default function DoneStep({ state, onBack }) {
  const confettiRef = useConfetti();

  // ── Feedback state ──
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [fbStatus, setFbStatus] = useState("idle"); // idle | submitting | done
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

  // ── Edit request state ──
  const [editReqStatus, setEditReqStatus] = useState("idle"); // idle | sending | sent | error

  // Auto-dismiss error after 4 s
  useEffect(() => {
    if (editReqStatus !== "error") return;
    const t = setTimeout(() => setEditReqStatus("idle"), 4000);
    return () => clearTimeout(t);
  }, [editReqStatus]);

  const handleRequestEdit = useCallback(async () => {
    if (editReqStatus !== "idle") return;
    setEditReqStatus("sending");
    try {
      await requestScoreEdit({
        periodId: state.periodId,
        jurorName: state.juryName,
        affiliation: state.affiliation,
        sessionToken: state.jurorSessionToken,
      });
      setEditReqStatus("sent");
    } catch {
      setEditReqStatus("error");
    }
  }, [editReqStatus, state.periodId, state.juryName, state.affiliation, state.jurorSessionToken]);

  const handleReturnHome = () => {
    state.clearLocalSession();
    onBack();
  };

  const jurorName = state.juryName || "Juror";
  const groupCount = state.projects.length;

  // ── Rankings computation ──
  const totalMax = (state.effectiveCriteria || []).reduce((s, c) => s + (c.max || 0), 0);
  const rankedProjects = [...state.projects]
    .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));

  return (
    <div className="jury-step" id="dj-step-done" style={{ justifyContent: "flex-start", paddingTop: 16, paddingBottom: 32 }}>
      <div className="dj-glass dj-glass-card dj-done-card">

        {/* ═══ LAYER 1: Hero ═══ */}
        <div className="dj-done-icon celebrate">
          <Check size={28} strokeWidth={2.5} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <div className="dj-done-status-pill">Evaluation Submitted</div>
        </div>

        <div className="dj-h1" style={{ textAlign: "center", marginBottom: "6px" }}>
          Thank you, {jurorName}!
        </div>
        <div className="dj-sub" style={{ textAlign: "center", marginTop: 0, marginBottom: 0 }}>
          You've evaluated all <strong>{groupCount} groups</strong> successfully.
        </div>

        {/* Subtle divider */}
        <div className="dj-done-divider" />

        {/* ═══ LAYER 2: Feedback micro-prompt ═══ */}
        {fbStatus !== "done" ? (
          <div className="dj-feedback-card">
            <div className="dj-feedback-title">How was your experience?</div>

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

            {/* Progressive disclosure: textarea + send appear after star click */}
            {fbRating > 0 && (
              <div className="dj-feedback-expanded">
                <textarea
                  className="dj-feedback-textarea"
                  placeholder="Any additional comments? (optional)"
                  rows={2}
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                />
                <div className="dj-feedback-actions">
                  <button
                    className="dj-feedback-submit"
                    disabled={fbStatus === "submitting"}
                    onClick={handleFbSubmit}
                  >
                    <Send size={14} strokeWidth={2} />
                    {fbStatus === "submitting" ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="dj-feedback-card">
            <div className="dj-feedback-submitted">
              <div className="dj-feedback-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <div className="dj-feedback-thanks">Thank you for your feedback!</div>
              <div className="dj-feedback-thanks-sub">Your input helps us improve VERA.</div>
            </div>
          </div>
        )}

        {/* ═══ LAYER 2.5: Live Rankings ═══ */}
        <div className="dj-done-rankings">
          <div className="dj-done-rankings-header">
            <BarChart2 size={11} strokeWidth={2} />
            Current Rankings
            {totalMax > 0 && <span className="dj-done-rankings-outof">/{totalMax}</span>}
            <span className="dj-done-rankings-badge">
              <span className="dj-live-dot" />
              LIVE
            </span>
          </div>
          {rankedProjects.map((project, idx) => {
            const rank = idx + 1;
            const score = project.avg_score != null ? Number(project.avg_score).toFixed(1) : "—";
            const pct = totalMax > 0 && project.avg_score != null
              ? Math.min((Number(project.avg_score) / totalMax) * 100, 100)
              : 0;
            return (
              <div key={project.project_id} className={`dj-done-rank-row${rank === 1 ? " rank-first" : ""}`}>
                <span className={`dj-done-rank-num${rank === 1 ? " gold" : ""}`}>#{rank}</span>
                <div className="dj-done-rank-body">
                  <span className="dj-done-rank-title">{project.title}</span>
                  <div className="dj-done-rank-bar-track">
                    <div className={`dj-done-rank-bar-fill${rank === 1 ? " gold" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="avg-score-cell dj-done-rank-score">
                  {project.avg_score != null ? (
                    <span className={`avg-score-value${rank === 1 ? " top" : ""}`}>{score}</span>
                  ) : (
                    <span className="avg-score-empty">—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* ═══ LAYER 3: Request Edit ghost button ═══ */}
        <div className="dj-done-utility-links">
          {editReqStatus === "sent" ? (
            <div className="dj-done-edit-req-sent">
              <CheckCircle2 size={14} strokeWidth={2} />
              Request sent — admin will be in touch.
            </div>
          ) : editReqStatus === "error" ? (
            <div className="dj-done-edit-req-sent error">
              <Mail size={14} strokeWidth={2} />
              Couldn't send — contact admin directly.
            </div>
          ) : (
            <button
              className="dj-done-edit-req-btn"
              onClick={handleRequestEdit}
              disabled={editReqStatus === "sending"}
            >
              {editReqStatus === "sending" ? (
                <Loader2 size={14} strokeWidth={2} className="dj-spin" />
              ) : (
                <Mail size={14} strokeWidth={2} />
              )}
              {editReqStatus === "sending" ? "Sending..." : "Request Edit"}
            </button>
          )}
        </div>

        {/* ═══ LAYER 4: Return Home ═══ */}
        <button className="dj-done-home-link" onClick={handleReturnHome}>
          <ArrowLeft size={14} strokeWidth={2} />
          Return Home
        </button>

      </div>

      {/* Confetti canvas */}
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
