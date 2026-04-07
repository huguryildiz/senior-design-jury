# DoneStep Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long, information-heavy DoneStep with a focused 5-layer premium completion experience: Hero, Feedback micro-prompt, Live Rankings snippet, Utility links, Return Home.

**Architecture:** Rewrite `DoneStep.jsx` as a streamlined component with progressive-disclosure feedback (stars only → textarea slides in on star click). Remove all per-project breakdowns, hero stats grid, and multiple CTA buttons. Add inline rankings snippet with delta badges, mailto-based edit request link, and clean up ~300 lines of now-unused CSS.

**Design amendment (2026-04-07 brainstorm):** AdminImpactStep is deprecated from the juror flow. Before/after toggle provided poor UX — one juror's mathematical impact on averages is too small (1/N weight) to be visually meaningful, and the before-snapshot implementation is complex. Instead, a lightweight inline rankings snippet (Layer 2.5) shows current standings with position-change badges (`↑1`, `—`). This gives jurors context without a dedicated screen.

**Tech Stack:** React, Lucide icons, existing jury CSS system, existing `submitJuryFeedback` API.

**Spec:** `docs/superpowers/specs/2026-04-07-done-step-redesign.md`

---

### Task 1: Update QA Catalog

Old test cases reference removed UI elements (edit button visibility, total score display). Update them to match the new design.

**Files:**
- Modify: `src/test/qa-catalog.json:1472-1514`

- [ ] **Step 1: Update QA catalog entries**

Replace the 4 existing `jury.done.*` entries with new ones matching the redesigned component:

```json
{
  "id": "jury.done.01",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Thank You Title",
  "scenario": "Thank You title includes the juror name after submission",
  "whyItMatters": "Personalised confirmation reassures the juror that their submission was accepted.",
  "risk": "A missing or broken title could be confused with an error state.",
  "coverageStrength": "Medium",
  "severity": "normal"
},
{
  "id": "jury.done.02",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Group Count in Message",
  "scenario": "Subtitle shows the correct number of evaluated groups",
  "whyItMatters": "Confirms the juror's work scope — they need to know all groups were captured.",
  "risk": "Wrong count could make juror think some evaluations were lost.",
  "coverageStrength": "Strong",
  "severity": "normal"
},
{
  "id": "jury.done.03",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Feedback Progressive Disclosure",
  "scenario": "Textarea is hidden until a star is clicked, then slides in",
  "whyItMatters": "Progressive disclosure keeps the success screen clean while still capturing feedback.",
  "risk": "Always-visible textarea clutters the celebration moment.",
  "coverageStrength": "Medium",
  "severity": "normal"
},
{
  "id": "jury.done.04",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Feedback Submission",
  "scenario": "Submitting a star rating calls submitJuryFeedback and shows confirmation",
  "whyItMatters": "Feedback data is valuable for platform improvement.",
  "risk": "Silent failure is acceptable but success confirmation must appear.",
  "coverageStrength": "Strong",
  "severity": "normal"
},
{
  "id": "jury.done.05",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Request Edit Mailto",
  "scenario": "Request Edit link opens a mailto with pre-filled subject and body",
  "whyItMatters": "Provides a controlled edit request flow instead of direct score editing.",
  "risk": "Broken mailto could leave juror with no way to request corrections.",
  "coverageStrength": "Medium",
  "severity": "normal"
},
{
  "id": "jury.done.06",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Return Home Clears Session",
  "scenario": "Clicking Return to Home calls clearLocalSession and navigates back",
  "whyItMatters": "Session data must be cleaned up to prevent stale state on next visit.",
  "risk": "Stale session could auto-login the wrong juror.",
  "coverageStrength": "Strong",
  "severity": "critical"
},
{
  "id": "jury.done.07",
  "module": "Jury Flow",
  "area": "Done Step",
  "story": "Live Rankings Snippet",
  "scenario": "Rankings section shows all projects ordered by score with rank number and score",
  "whyItMatters": "Jurors want to see where things stand after submitting — inline rankings replace the separate AdminImpactStep.",
  "risk": "Missing or empty rankings could confuse jurors or look like an error.",
  "coverageStrength": "Medium",
  "severity": "normal"
}
```

- [ ] **Step 2: Verify catalog is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/test/qa-catalog.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/test/qa-catalog.json
git commit -m "chore: update qa-catalog for DoneStep redesign"
```

---

### Task 2: Write DoneStep Tests

Write tests for the new component behavior before implementing changes.

**Files:**
- Create: `src/jury/__tests__/DoneStep.test.jsx`

- [ ] **Step 1: Write the test file**

```jsx
// src/jury/__tests__/DoneStep.test.jsx
import { describe, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

// Mock the API — submitJuryFeedback
const mockSubmitFeedback = vi.fn().mockResolvedValue({ data: true });
vi.mock("../../shared/api", () => ({
  submitJuryFeedback: (...args) => mockSubmitFeedback(...args),
}));

// DoneStep uses useConfetti which needs canvas — mock it
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  globalAlpha: 1,
  fillStyle: "",
}));

// We need to import after mocks
const { default: DoneStep } = await import("../steps/DoneStep.jsx");

function makeState(overrides = {}) {
  return {
    periodId: "period-1",
    jurorSessionToken: "token-abc",
    juryName: "Dr. Yıldız",
    projects: [
      { project_id: "p1", title: "Project Alpha", members: "A, B" },
      { project_id: "p2", title: "Project Beta", members: "C, D" },
      { project_id: "p3", title: "Project Gamma", members: "E, F" },
    ],
    effectiveCriteria: [
      { id: "technical", label: "Technical", short_label: "Tech", max: 30 },
      { id: "written", label: "Written", short_label: "Written", max: 30 },
    ],
    scores: {},
    doneScores: {},
    doneComments: {},
    editAllowed: false,
    setStep: vi.fn(),
    clearLocalSession: vi.fn(),
    handleEditScores: vi.fn(),
    ...overrides,
  };
}

describe("DoneStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("jury.done.01", () => {
    const state = makeState({ juryName: "Dr. Yıldız" });
    render(<DoneStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText(/Thank you, Dr\. Yıldız/i)).toBeTruthy();
  });

  qaTest("jury.done.02", () => {
    const state = makeState({
      projects: [
        { project_id: "p1", title: "A", members: "" },
        { project_id: "p2", title: "B", members: "" },
        { project_id: "p3", title: "C", members: "" },
        { project_id: "p4", title: "D", members: "" },
        { project_id: "p5", title: "E", members: "" },
      ],
    });
    render(<DoneStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText(/5 groups/i)).toBeTruthy();
  });

  qaTest("jury.done.03", () => {
    const state = makeState();
    render(<DoneStep state={state} onBack={vi.fn()} />);

    // Textarea should NOT be visible initially
    expect(screen.queryByPlaceholderText(/comment/i)).toBeNull();

    // Click a star (4th star)
    const stars = screen.getAllByRole("button").filter((btn) =>
      btn.classList.contains("dj-star")
    );
    fireEvent.click(stars[3]);

    // Now textarea should be visible
    expect(screen.getByPlaceholderText(/comment/i)).toBeTruthy();
  });

  qaTest("jury.done.04", async () => {
    const state = makeState();
    render(<DoneStep state={state} onBack={vi.fn()} />);

    // Click 4th star
    const stars = screen.getAllByRole("button").filter((btn) =>
      btn.classList.contains("dj-star")
    );
    fireEvent.click(stars[3]);

    // Click send
    const sendBtn = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith("period-1", "token-abc", 4, "");
    });

    // Should show thank you message
    await waitFor(() => {
      expect(screen.getByText(/thank you for your feedback/i)).toBeTruthy();
    });
  });

  qaTest("jury.done.05", () => {
    const state = makeState();
    render(<DoneStep state={state} onBack={vi.fn()} />);

    const editLink = screen.getByText(/request edit/i);
    expect(editLink.closest("a")).toBeTruthy();
    expect(editLink.closest("a").href).toMatch(/^mailto:/);
  });

  qaTest("jury.done.06", () => {
    const onBack = vi.fn();
    const state = makeState();
    render(<DoneStep state={state} onBack={onBack} />);

    const homeLink = screen.getByText(/return to home/i);
    fireEvent.click(homeLink);

    expect(state.clearLocalSession).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/jury/__tests__/DoneStep.test.jsx`
Expected: Tests fail because DoneStep still has old structure (textarea always visible, no mailto link, etc.)

- [ ] **Step 3: Commit failing tests**

```bash
git add src/jury/__tests__/DoneStep.test.jsx
git commit -m "test: add DoneStep redesign tests (failing — TDD)"
```

---

### Task 3: Rewrite DoneStep Component

Replace the entire DoneStep with the new 4-layer design.

**Files:**
- Modify: `src/jury/steps/DoneStep.jsx`

- [ ] **Step 1: Rewrite DoneStep.jsx**

Replace the full file content with:

```jsx
// src/jury/steps/DoneStep.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import "../../styles/jury.css";
import {
  ArrowLeft,
  Check,
  Mail,
  Send,
  Star,
  TrendingUp,
} from "lucide-react";
import { submitJuryFeedback } from "../../shared/api";

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

  const handleReturnHome = () => {
    state.clearLocalSession();
    onBack();
  };

  const jurorName = state.juryName || "Juror";
  const groupCount = state.projects.length;

  // ── Mailto for edit request ──
  const adminEmail = state.tenantAdminEmail || "";
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "";
  const periodName = state.periodName || "this evaluation period";
  const mailtoSubject = encodeURIComponent(`Score Edit Request — ${periodName}`);
  const mailtoBody = encodeURIComponent(
    `Hello,\n\nI would like to request an edit to my submitted scores for ${periodName}.\n\nJuror: ${jurorName}\n\nThank you.`
  );
  const mailtoHref = adminEmail
    ? `mailto:${adminEmail}?${superAdminEmail ? `cc=${superAdminEmail}&` : ""}subject=${mailtoSubject}&body=${mailtoBody}`
    : null;

  return (
    <div className="jury-step" id="dj-step-done" style={{ justifyContent: "flex-start", paddingTop: 16 }}>
      <div className="dj-glass dj-glass-card dj-done-card" style={{ maxWidth: "500px" }}>

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

        {/* ═══ LAYER 3: Utility links ═══ */}
        <div className="dj-done-utility-links">
          {mailtoHref ? (
            <a href={mailtoHref} className="dj-done-utility-link">
              <Mail size={14} strokeWidth={2} />
              Request Edit
            </a>
          ) : (
            <span className="dj-done-utility-link disabled">
              <Mail size={14} strokeWidth={2} />
              Contact admin for edits
            </span>
          )}
          <div className="dj-done-utility-divider" />
          <button className="dj-done-utility-link" onClick={() => state.setStep("admin_impact")}>
            <TrendingUp size={14} strokeWidth={2} />
            View Full Results
          </button>
        </div>

        {/* ═══ LAYER 4: Return Home ═══ */}
        <button className="dj-done-home-link" onClick={handleReturnHome}>
          <ArrowLeft size={14} strokeWidth={2} />
          Return to Home
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
```

- [ ] **Step 2: Run tests**

Run: `npm test -- --run src/jury/__tests__/DoneStep.test.jsx`
Expected: Most tests pass. If any fail, fix the component to match test expectations.

- [ ] **Step 3: Commit**

```bash
git add src/jury/steps/DoneStep.jsx
git commit -m "feat: rewrite DoneStep as 4-layer premium completion screen"
```

---

### Task 4: Replace CSS — Remove Old, Add New

Remove the ~300 lines of now-unused DoneStep CSS and replace with the new streamlined styles.

**Files:**
- Modify: `src/styles/jury.css:2144-2439` (Done step + Feedback card sections)

- [ ] **Step 1: Replace Done step CSS block**

Remove everything from the `/* ── Done step ── */` comment (line 2144) through the end of the feedback light-mode block (line 2439), and replace with:

```css
/* ── Done step ── */
.dj-done-icon{width:64px;height:64px;border-radius:18px;margin:0 auto 16px;display:grid;place-items:center;position:relative}
.dj-done-icon.celebrate{background:linear-gradient(135deg,#22c55e,#15803d);border:none;color:#fff;box-shadow:0 4px 24px rgba(34,197,94,0.25),0 0 0 1px rgba(255,255,255,0.12) inset}
.dj-done-icon.celebrate::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 60%);pointer-events:none}
.dj-done-icon svg{width:28px;height:28px;position:relative;z-index:1}
/* Done status badge */
.dj-done-status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#4ade80;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.15);margin:0 auto 14px}
.dj-done-status-pill::before{content:'';width:5px;height:5px;border-radius:50%;background:#4ade80;flex-shrink:0}
/* Done divider */
.dj-done-divider{width:48px;height:1px;background:linear-gradient(90deg,transparent,#334155,transparent);margin:24px auto}
/* Done utility links */
.dj-done-utility-links{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:24px}
.dj-done-utility-link{display:inline-flex;align-items:center;gap:6px;font-family:var(--font);font-size:12px;font-weight:500;color:#64748b;text-decoration:none;cursor:pointer;background:none;border:none;padding:0;transition:color .15s}
.dj-done-utility-link:hover{color:#94a3b8}
.dj-done-utility-link:focus-visible{outline:2px solid var(--btn-focus-ring-brand);outline-offset:2px;border-radius:4px}
.dj-done-utility-link.disabled{cursor:default;opacity:0.6}
.dj-done-utility-link.disabled:hover{color:#64748b}
.dj-done-utility-link svg{width:14px;height:14px;flex-shrink:0}
.dj-done-utility-divider{width:1px;height:14px;background:#1e293b}
/* Done return home */
.dj-done-home-link{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(51,65,85,0.3);font-family:var(--font);font-size:12px;font-weight:500;color:#475569;cursor:pointer;background:none;border-left:none;border-right:none;border-bottom:none;width:100%;transition:color .15s}
.dj-done-home-link:hover{color:#94a3b8}
.dj-done-home-link:focus-visible{outline:2px solid var(--btn-focus-ring-brand);outline-offset:2px;border-radius:4px}
.dj-done-home-link svg{width:14px;height:14px;flex-shrink:0}

/* ── Feedback card (DoneStep) ── */
.dj-feedback-card{border-radius:14px;padding:20px;text-align:center;background:rgba(30,41,59,0.6);border:1px solid rgba(51,65,85,0.5)}
.dj-feedback-title{font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:12px}
.dj-stars{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px}
.dj-star{width:36px;height:36px;border-radius:10px;border:none;cursor:pointer;display:grid;place-items:center;transition:all .18s cubic-bezier(0.34,1.56,0.64,1);background:rgba(30,41,59,0.6);color:#334155}
.dj-star svg{width:20px;height:20px;transition:all .18s}
.dj-star:hover{background:rgba(251,191,36,0.08);color:#fbbf24;transform:scale(1.12)}
.dj-star.active{background:rgba(251,191,36,0.12);color:#fbbf24;transform:scale(1.08)}
.dj-star.active svg{filter:drop-shadow(0 0 6px rgba(251,191,36,0.3))}
.dj-star:focus-visible{outline:2px solid var(--btn-focus-ring-brand);outline-offset:2px}
.dj-star-label{font-size:10px;font-weight:600;color:#fbbf24;min-height:16px;margin-bottom:4px}
/* Feedback expanded (progressive disclosure) */
.dj-feedback-expanded{animation:dj-fb-in .3s ease}
.dj-feedback-textarea{width:100%;padding:10px 14px;border:1px solid rgba(148,163,184,0.08);border-radius:10px;background:rgba(15,23,42,0.4);color:#e2e8f0;font-family:var(--font);font-size:12px;resize:none;min-height:52px;outline:none;transition:border-color .15s,box-shadow .15s;line-height:1.5}
.dj-feedback-textarea:focus{border-color:rgba(59,130,246,0.3);box-shadow:0 0 0 3px rgba(59,130,246,0.08)}
.dj-feedback-textarea::placeholder{color:#334155}
.dj-feedback-actions{display:flex;align-items:center;justify-content:flex-end;margin-top:10px}
.dj-feedback-submit{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;border:none;font-family:var(--font);font-size:12px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 2px 10px rgba(59,130,246,0.2);transition:all .15s}
.dj-feedback-submit:hover{box-shadow:0 4px 16px rgba(59,130,246,0.3);transform:translateY(-1px)}
.dj-feedback-submit:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none}
.dj-feedback-submit:focus-visible{outline:2px solid var(--btn-focus-ring-brand);outline-offset:2px}
.dj-feedback-submit svg{width:14px;height:14px}
/* Feedback submitted state */
.dj-feedback-submitted{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 0 4px;animation:dj-fb-in .4s ease}
.dj-feedback-check{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:rgba(34,197,94,0.1);color:#4ade80}
.dj-feedback-check svg{width:18px;height:18px}
.dj-feedback-thanks{font-size:13px;font-weight:600;color:#e2e8f0}
.dj-feedback-thanks-sub{font-size:11px;color:#475569}
@keyframes dj-fb-in{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}

/* ── Done step: light mode ── */
body:not(.dark-mode) .dj-done-status-pill{color:#15803d !important;background:rgba(22,163,74,0.08) !important;border-color:rgba(22,163,74,0.2) !important;box-shadow:0 1px 3px rgba(22,163,74,0.08) !important}
body:not(.dark-mode) .dj-done-status-pill::before{background:#16a34a !important}
body:not(.dark-mode) .dj-done-icon.celebrate{box-shadow:0 2px 8px rgba(21,128,61,0.22),0 10px 24px rgba(22,163,74,0.24),0 0 0 1px rgba(255,255,255,0.16) inset !important}
body:not(.dark-mode) .dj-done-divider{background:linear-gradient(90deg,transparent,#cbd5e1,transparent) !important}
body:not(.dark-mode) .dj-done-utility-link{color:#94a3b8 !important}
body:not(.dark-mode) .dj-done-utility-link:hover{color:#64748b !important}
body:not(.dark-mode) .dj-done-utility-divider{background:#e2e8f0 !important}
body:not(.dark-mode) .dj-done-home-link{color:#94a3b8 !important;border-top-color:rgba(15,23,42,0.06) !important}
body:not(.dark-mode) .dj-done-home-link:hover{color:#64748b !important}
/* Feedback card light mode */
body:not(.dark-mode) .dj-feedback-card{background:rgba(255,255,255,0.85) !important;border-color:rgba(15,23,42,0.06) !important;box-shadow:0 1px 4px rgba(15,23,42,0.04) !important}
body:not(.dark-mode) .dj-feedback-title{color:#475569 !important}
body:not(.dark-mode) .dj-star{background:rgba(241,245,249,0.8) !important;color:#cbd5e1 !important;border:1px solid rgba(15,23,42,0.05) !important}
body:not(.dark-mode) .dj-star:hover{background:rgba(251,191,36,0.08) !important;color:#d97706 !important;border-color:rgba(251,191,36,0.2) !important}
body:not(.dark-mode) .dj-star.active{background:rgba(251,191,36,0.1) !important;color:#d97706 !important;border-color:rgba(251,191,36,0.25) !important}
body:not(.dark-mode) .dj-star.active svg{filter:drop-shadow(0 0 4px rgba(217,119,6,0.25)) !important}
body:not(.dark-mode) .dj-star-label{color:#d97706 !important}
body:not(.dark-mode) .dj-feedback-textarea{border-color:rgba(15,23,42,0.08) !important;background:#fff !important;color:#1e293b !important}
body:not(.dark-mode) .dj-feedback-textarea:focus{border-color:rgba(59,130,246,0.35) !important;box-shadow:0 0 0 3px rgba(59,130,246,0.08) !important}
body:not(.dark-mode) .dj-feedback-textarea::placeholder{color:#94a3b8 !important}
body:not(.dark-mode) .dj-feedback-check{background:rgba(22,163,74,0.08) !important;color:#16a34a !important}
body:not(.dark-mode) .dj-feedback-thanks{color:#1e293b !important}
body:not(.dark-mode) .dj-feedback-thanks-sub{color:#94a3b8 !important}
/* Light mode: done screen premium finish */
body:not(.dark-mode) #dj-step-done{
  background:
    radial-gradient(620px 280px at 50% -40px,rgba(22,163,74,0.08) 0%,rgba(22,163,74,0.02) 48%,transparent 72%),
    radial-gradient(560px 260px at 50% 100%,rgba(59,130,246,0.06) 0%,transparent 70%),
    linear-gradient(180deg,#eff4fb 0%,#edf2f9 100%) !important;
}
body:not(.dark-mode) .dj-done-card{
  position:relative;overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,0.93) 0%,rgba(247,250,255,0.9) 100%) !important;
  border:1px solid rgba(15,23,42,0.09) !important;
  box-shadow:0 18px 42px rgba(15,23,42,0.10),0 2px 8px rgba(15,23,42,0.05),0 0 0 1px rgba(255,255,255,0.72) inset !important;
}
body:not(.dark-mode) .dj-done-card::before{content:'';position:absolute;inset:0 0 auto 0;height:34%;background:linear-gradient(180deg,rgba(59,130,246,0.07) 0%,rgba(59,130,246,0) 100%);pointer-events:none}
body:not(.dark-mode) .dj-done-card::after{content:'';position:absolute;left:50%;top:58px;width:300px;height:120px;transform:translateX(-50%);background:radial-gradient(circle,rgba(22,163,74,0.10) 0%,rgba(22,163,74,0.02) 55%,transparent 78%);pointer-events:none}
body:not(.dark-mode) .dj-done-card > *{position:relative;z-index:1}
body:not(.dark-mode) .dj-done-icon{margin-bottom:10px !important}
body:not(.dark-mode) .dj-done-status-pill{margin-bottom:10px !important}
body:not(.dark-mode) #dj-step-done .dj-h1{letter-spacing:-0.02em;margin-bottom:8px !important}
body:not(.dark-mode) #dj-step-done .dj-sub{color:#5f728f !important;max-width:690px;margin:0 auto 2px !important}
body:not(.dark-mode) .dj-glass.dj-glass-card{
  background:rgba(255,255,255,0.95) !important;
  border-color:rgba(15,23,42,0.07) !important;
  box-shadow:0 0 0 1px rgba(15,23,42,0.04),0 2px 8px rgba(15,23,42,0.06),0 8px 28px rgba(15,23,42,0.08),0 1px 0 rgba(255,255,255,0.7) inset !important;
}
```

- [ ] **Step 2: Run tests**

Run: `npm test -- --run src/jury/__tests__/DoneStep.test.jsx`
Expected: All 6 tests pass.

- [ ] **Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass. No other tests should reference removed DoneStep elements.

- [ ] **Step 4: Commit**

```bash
git add src/styles/jury.css
git commit -m "style: replace DoneStep CSS with streamlined 4-layer styles"
```

---

### Task 5: Verify Build and Manual Test

Ensure the app builds and the DoneStep works correctly in the browser.

**Files:** None (verification only)

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run native select check**

Run: `npm run check:no-native-select`
Expected: `OK: no native <select> usage found`

- [ ] **Step 3: Manual verification checklist**

Start `npm run dev` and navigate through the jury flow to the Done step:

1. Confetti animation fires on arrival
2. Green checkmark icon, "EVALUATION SUBMITTED" pill, "Thank you, {name}!" heading, group count in subtitle
3. Feedback card shows only stars initially — no textarea
4. Clicking a star shows the amber label + textarea slides in + Send button appears
5. Clicking Send submits feedback and shows "Thank you for your feedback!" with animated checkmark
6. "Request Edit" is a mailto link (or static fallback text if no admin email)
7. Rankings snippet shows all projects with rank number, title, delta badge (↑N / —), and score
8. "View Full Results" navigates to admin_impact step (if retained) or is omitted
9. "← Return to Home" clears session and navigates home
10. Light mode: all elements have proper contrast and styling
11. Dark mode: glass card, subtle colors, proper contrast

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: DoneStep premium redesign — 4-layer completion experience"
```

---

### Task 6: Wire Tenant Admin Email (Data Dependency)

The mailto link needs the tenant admin email. This requires passing it through the jury flow state.

**Files:**
- Modify: `src/shared/api/juryApi.js` (add email to period load response)
- Modify: `src/jury/hooks/useJuryLoading.js` (store admin email from response)
- Modify: `src/jury/useJuryState.js` (expose admin email in state)

- [ ] **Step 1: Check if period load RPC already returns tenant admin info**

Read `src/shared/api/juryApi.js` and find the function that loads period/semester data for the jury flow. Check what fields are returned. Also check the DB migration for the RPC to see if admin email is available.

If the RPC does not return admin email: this task requires a DB migration to add admin email to the RPC response. Create a new migration file `sql/migrations/026_jury_period_admin_email.sql` that modifies the relevant RPC to join on tenant admin memberships and return `contact_email`.

If the RPC already returns it: skip the migration and just wire it through the hooks.

- [ ] **Step 2: Store admin email in loading hook**

In `src/jury/hooks/useJuryLoading.js`, add a `tenantAdminEmail` state variable. Set it from the RPC response when period data is loaded.

- [ ] **Step 3: Expose in useJuryState**

In `src/jury/useJuryState.js`, add `tenantAdminEmail: loading.tenantAdminEmail` to the return object.

- [ ] **Step 4: Also expose periodName**

The mailto body uses the period name. Ensure `periodName` (or `semesterName`) is in the state return object. Check if it's already there; if not, add it from `loading`.

- [ ] **Step 5: Run tests**

Run: `npm test -- --run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/juryApi.js src/jury/hooks/useJuryLoading.js src/jury/useJuryState.js
git commit -m "feat: wire tenant admin email through jury flow for edit request mailto"
```

If a migration was needed:

```bash
git add sql/migrations/026_jury_period_admin_email.sql
git commit -m "migration: add admin email to jury period load RPC"
```
