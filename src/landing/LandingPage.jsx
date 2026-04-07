import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, Moon, Quote, Star, Sun } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import ProductShowcase from "./components/ProductShowcase";
import veraLogoDark from "@/assets/vera_logo_dark.png";
import veraLogoWhite from "@/assets/vera_logo_white.png";
import navLogoDark from "@/assets/favicon/web-app-manifest-512x512.png";
import navLogoLight from "@/assets/favicon/favicon_light.png";

const FALLBACK_STATS = {
  organizations: 6, evaluations: 468, jurors: 36, projects: 76,
  institutions: ["CanSat Competition", "Carnegie Mellon University", "IEEE", "TED University", "TEKNOFEST", "TUBITAK"],
};

function useLandingStats() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const url = import.meta.env.VITE_DEMO_SUPABASE_URL;
    const key = import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const demo = createClient(url, key);
    demo.rpc("rpc_landing_stats").then(({ data }) => {
      if (data && typeof data === "object") setStats(data);
    }).catch(() => {});
  }, []);

  return stats;
}

const FALLBACK_FEEDBACK = { avg_rating: 0, total_count: 0, testimonials: [] };

function useLandingFeedback() {
  const [feedback, setFeedback] = useState(FALLBACK_FEEDBACK);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const url = import.meta.env.VITE_DEMO_SUPABASE_URL;
    const key = import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const demo = createClient(url, key);
    demo.rpc("rpc_get_public_feedback").then(({ data }) => {
      if (data && typeof data === "object") setFeedback(data);
    }).catch(() => {});
  }, []);

  return feedback;
}

function useCountUp(target, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const eased = 1 - Math.pow(2, -10 * progress);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export function LandingPage({ onStartJury, onAdmin, onSignIn }) {
  const { theme, setTheme } = useTheme();
  const stats = useLandingStats();
  const feedback = useLandingFeedback();
  const orgCount = useCountUp(stats.organizations);
  const evalCount = useCountUp(stats.evaluations);
  const jurorCount = useCountUp(stats.jurors);
  const projectCount = useCountUp(stats.projects);

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const testimonials = feedback.testimonials || [];
  const visibleTestimonial = testimonials[testimonialIdx] || null;
  const nextTestimonial = () => setTestimonialIdx((i) => (i + 1) % testimonials.length);
  const prevTestimonial = () => setTestimonialIdx((i) => (i - 1 + testimonials.length) % testimonials.length);

  // Auto-rotate testimonials every 6s
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const id = setInterval(nextTestimonial, 6000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const [openFaq, setOpenFaq] = useState([false, false, false, false, false, false]);

  const toggleFaq = (i) => {
    setOpenFaq((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  useEffect(() => {
    const els = document.querySelectorAll(".reveal-section, .landing-steps");
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="sb-logo-icon">
            <img src={theme === "dark" ? navLogoDark : navLogoLight} alt="V" />
          </div>
          <div className="sb-logo-text"><span>V</span>ERA</div>
        </div>
        <div className="landing-nav-links">
          <button className="nav-signin" onClick={onSignIn}>
            Sign In{" "}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <span className="nav-divider" />
          <button
            className="nav-theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            title="Toggle light/dark mode"
          >
            <Sun className="ntog-sun" strokeWidth={1.9} />
            <Moon className="ntog-moon" strokeWidth={1.9} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-logo-mark">
          <img src={theme === "dark" ? veraLogoDark : veraLogoWhite} alt="VERA" />
        </div>
        <div className="landing-section-label" style={{ marginBottom: "24px" }}>
          <span>Visual Evaluation</span>{" "}
          <span className="sep" style={{ color: "rgba(255,255,255,0.15)", fontSize: "8px", lineHeight: 1 }}>·</span>{" "}
          <span>Reporting</span>{" "}
          <span className="sep" style={{ color: "rgba(255,255,255,0.15)", fontSize: "8px", lineHeight: 1 }}>·</span>{" "}
          <span>Analytics</span>
        </div>
        <h1 className="landing-h1">Evaluate anything<br /><em>Prove everything</em></h1>
        <p className="landing-desc">
          Structured jury scoring for exhibitions, competitions, and review panels. Configurable criteria, real-time data capture, and outcome reports your accreditation body trusts.
        </p>
        <div className="landing-ctas">
          <button className="btn-landing-primary" id="btn-try-demo" onClick={(e) => {
            const btn = e.currentTarget;
            btn.classList.add("dj-loading");
            setTimeout(() => { btn.classList.remove("dj-loading"); onStartJury(); }, 500);
          }}>
            <svg className="dj-btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
            </svg>
            <span className="dj-normal-content" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.95 }}>
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Experience Demo
            </span>
          </button>
          <button className="btn-landing-secondary" onClick={onAdmin}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <rect width="7" height="9" x="3" y="3" rx="1.5" />
              <rect width="7" height="5" x="14" y="3" rx="1.5" />
              <rect width="7" height="9" x="14" y="12" rx="1.5" />
              <rect width="7" height="5" x="3" y="16" rx="1.5" />
            </svg>
            Explore Admin Panel
          </button>
        </div>
        <p className="landing-cta-hint">Interactive demo with real evaluation data — no sign-up required.</p>

        <div className="hero-showcase-container" style={{ marginTop: "40px", width: "100%", maxWidth: "1040px", position: "relative", zIndex: 10 }}>
          <ProductShowcase />
        </div>
      </div>

      {/* Mobile Mockup — 4 Phone Flow */}
      <section className="landing-mobile reveal-section">
        <div className="landing-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
          The juror experience
        </div>
        <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
          No app to install, no training needed. Jurors scan a QR code, enter their name, and start scoring.
        </p>
        <div className="mobile-flow">

          {/* Phone 1: Identity */}
          <div>
            <div className="mobile-frame">
              <div className="mobile-notch" />
              <div className="mobile-inner">
                <div style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", overflow: "hidden" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))", border: "1px solid rgba(139,92,246,0.25)", display: "grid", placeItems: "center", marginBottom: "9px", marginTop: "6px", boxShadow: "0 4px 12px rgba(99,102,241,0.18)" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#f1f5f9", marginBottom: "2px" }}>Jury Information</div>
                  <div style={{ fontSize: "7.5px", color: "#64748b", marginBottom: "9px", lineHeight: 1.3 }}>Enter your details to begin the evaluation</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center", marginBottom: "4px", fontSize: "6.5px", color: "#64748b" }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 10 3 12 0v-5" /></svg>
                    <span>TED University</span>
                    <span style={{ color: "#334155" }}>·</span>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                    <span>Electrical &amp; Electronics Eng.</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center", marginBottom: "9px", fontSize: "6.5px", color: "#64748b" }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    <span>Fall 2025</span>
                    <span style={{ color: "#334155" }}>·</span>
                    <span>20 Dec 2025</span>
                    <span style={{ color: "#334155" }}>·</span>
                    <span>12 Groups</span>
                  </div>
                  <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "5px", padding: "5px 7px", borderRadius: "6px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.14)", marginBottom: "9px", textAlign: "left" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    <span style={{ fontSize: "7px", color: "#93c5fd", lineHeight: 1.35, fontWeight: 500 }}>Name and Affiliation cannot be changed once evaluation starts.</span>
                  </div>
                  <div style={{ width: "100%", textAlign: "left", marginBottom: "5px" }}>
                    <div style={{ fontSize: "7.5px", fontWeight: 600, color: "#94a3b8", marginBottom: "2px" }}>Full Name</div>
                    <div style={{ padding: "5px 7px", borderRadius: "5px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "8.5px", color: "#e2e8f0" }}>Prof. Dr. Ayşe Demir</div>
                  </div>
                  <div style={{ width: "100%", textAlign: "left", marginBottom: "5px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#94a3b8", marginBottom: "2px" }}>Affiliation</div>
                    <div style={{ padding: "5px 7px", borderRadius: "5px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "8.5px", color: "#e2e8f0" }}>TED University / EE</div>
                  </div>
                  <div style={{ width: "100%", textAlign: "left", marginBottom: "10px" }}>
                    <div style={{ fontSize: "7.5px", fontWeight: 600, color: "#94a3b8", marginBottom: "2px" }}>E-mail <span style={{ color: "#475569", fontWeight: 400 }}>(optional)</span></div>
                    <div style={{ padding: "5px 7px", borderRadius: "5px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "8.5px", color: "#475569" }}>jury@example.com</div>
                  </div>
                  <div style={{ width: "100%", padding: "8px", borderRadius: "7px", background: "linear-gradient(180deg,#4b8ef2,#2563eb)", textAlign: "center", fontSize: "9.5px", color: "#fff", fontWeight: 600, boxShadow: "0 3px 10px rgba(37,99,235,0.35)" }}>Start Evaluation →</div>
                  <div style={{ marginTop: "7px", fontSize: "7.5px", color: "#475569" }}>← Return Home</div>
                </div>
              </div>
            </div>
            <div className="mobile-step-label">1 · Identity</div>
          </div>

          <div className="mobile-flow-arrow">→</div>

          {/* Phone 2: Session PIN */}
          <div>
            <div className="mobile-frame">
              <div className="mobile-notch" />
              <div className="mobile-inner">
                <div style={{ flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.2))", border: "1px solid rgba(147,197,253,0.15)", display: "grid", placeItems: "center", marginBottom: "10px", marginTop: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9", marginBottom: "3px" }}>Your Session PIN</div>
                  <div style={{ fontSize: "8px", color: "#64748b", marginBottom: "16px", lineHeight: 1.4 }}>Use this PIN to resume if you get disconnected.</div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                    {["4","7","2","1"].map((d) => (
                      <div key={d} style={{ width: "38px", height: "44px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(147,197,253,0.15)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ fontSize: "8px", color: "#64748b", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", marginBottom: "16px" }}>📋 Copy PIN</div>
                  <div style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: "6px", fontSize: "8.5px", color: "#94a3b8", marginBottom: "14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}><span style={{ color: "#475569", width: "60px" }}>Juror</span><span style={{ color: "#e2e8f0", fontWeight: 600 }}>Prof. Dr. Ayşe Demir</span></div>
                    <div style={{ display: "flex", gap: "6px" }}><span style={{ color: "#475569", width: "60px" }}>Org</span><span style={{ color: "#e2e8f0", fontWeight: 600 }}>TED University — EE</span></div>
                    <div style={{ display: "flex", gap: "6px" }}><span style={{ color: "#475569", width: "60px" }}>Period</span><span style={{ color: "#e2e8f0", fontWeight: 600 }}>Fall 2025</span></div>
                  </div>
                  <div style={{ width: "100%", padding: "9px", borderRadius: "8px", background: "linear-gradient(180deg,#4b8ef2,#2563eb)", textAlign: "center", fontSize: "10px", color: "#fff", fontWeight: 600, marginTop: "auto" }}>Begin Evaluation →</div>
                </div>
              </div>
            </div>
            <div className="mobile-step-label">2 · Session PIN</div>
          </div>

          <div className="mobile-flow-arrow">→</div>

          {/* Phone 3: Score */}
          <div>
            <div className="mobile-frame">
              <div className="mobile-notch" />
              <div className="mobile-inner">
                <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(148,163,184,0.08)", background: "rgba(6,10,22,0.6)", flexShrink: 0 }}>
                  <div style={{ fontSize: "8px", color: "#e2e8f0", fontWeight: 600 }}>Prof. Dr. Ayşe Demir</div>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}><span style={{ fontSize: "7px", padding: "2px 6px", borderRadius: "4px", background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>✓ Saved</span></div>
                </div>
                <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(148,163,184,0.08)", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>Adaptive RF Harvesting</div>
                    <div style={{ fontSize: "7px", color: "#475569" }}>Elif A., Berk K., Zeynep T.</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <span style={{ fontSize: "8px", color: "#64748b" }}>‹</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "#e2e8f0", fontWeight: 600 }}>7/12</span>
                    <span style={{ fontSize: "8px", color: "#64748b" }}>›</span>
                  </div>
                </div>
                <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
                  <div style={{ height: "100%", width: "88%", background: "linear-gradient(90deg,#3b82f6,#6366f1)" }} />
                </div>
                <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: "5px", overflow: "hidden" }}>
                  {[
                    { label: "Technical Content", color: "#60a5fa", max: 30, val: 27, pct: "90%" },
                    { label: "Written Comm.", color: "#4ade80", max: 30, val: 22, pct: "73%" },
                    { label: "Oral Comm.", color: "#a78bfa", max: 30, val: 24, pct: "80%" },
                    { label: "Teamwork", color: "#fbbf24", max: 10, val: 8, pct: "80%" },
                  ].map((c) => (
                    <div key={c.label} style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `3px solid ${c.color}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ fontSize: "8px", fontWeight: 700, color: "#f1f5f9" }}>{c.label} <span style={{ color: "#4ade80" }}>✓</span></div>
                        <span style={{ fontSize: "6.5px", padding: "2px 5px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Rubric</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "28px", height: "24px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, color: "#f1f5f9", textAlign: "center", display: "grid", placeItems: "center" }}>{c.val}</div>
                        <div style={{ flex: 1, height: "3px", borderRadius: "99px", background: "rgba(255,255,255,0.06)" }}>
                          <div style={{ height: "100%", width: c.pct, borderRadius: "99px", background: c.color }} />
                        </div>
                        <span style={{ fontSize: "7px", color: "#64748b", fontFamily: "var(--mono)" }}>{c.val}/{c.max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mobile-step-label">3 · Score</div>
          </div>

          <div className="mobile-flow-arrow">→</div>

          {/* Phone 4: Done */}
          <div>
            <div className="mobile-frame">
              <div className="mobile-notch" />
              <div className="mobile-inner">
                <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,rgba(34,197,94,0.3),rgba(22,163,74,0.2))", border: "1px solid rgba(74,222,128,0.2)", display: "grid", placeItems: "center", marginTop: "8px", marginBottom: "10px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9", marginBottom: "2px" }}>Thank You, Prof. Demir!</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "28px", fontWeight: 800, color: "#4ade80", marginBottom: "2px" }}>81</div>
                  <div style={{ fontSize: "7px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Your Score — Group 7 / 100 pts</div>
                  <div style={{ fontSize: "8px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "10px" }}>Your evaluations have been submitted. Contact the administrator if you need changes.</div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "2px", textAlign: "left", fontSize: "8px" }}>
                    {[
                      { g: "Group 1", s: "78", ok: true },
                      { g: "Group 2", s: "85", ok: true },
                      { g: "Group 3", s: "72", ok: true },
                      { g: "Group 4", s: "91", ok: true },
                      { g: "Group 5", s: "66", ok: true },
                      { g: "Group 6", s: "—", ok: false },
                    ].map((row) => (
                      <div key={row.g} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 7px", borderRadius: "5px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.06)" }}>
                        <span style={{ color: row.ok ? "#4ade80" : "#fbbf24" }}>{row.ok ? "✓" : "⚠"}</span>
                        <span style={{ color: "#94a3b8", flex: 1 }}>{row.g}</span>
                        <span style={{ fontFamily: "var(--mono)", color: row.ok ? "#e2e8f0" : "#475569", fontWeight: row.ok ? 600 : 400 }}>{row.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mobile-step-label">4 · Done</div>
          </div>

        </div>
      </section>

      {/* Trust Band */}
      <section className="landing-trust reveal-section">
        <div className="landing-trust-proof">
          <div className="landing-proof-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Built for every evaluation
          </div>
          <div
            className="trust-feature-grid"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              e.currentTarget.style.setProperty('--spotlight-x', `${x}px`);
              e.currentTarget.style.setProperty('--spotlight-y', `${y}px`);
              e.currentTarget.style.setProperty('--spotlight-opacity', '1');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty('--spotlight-opacity', '0');
            }}
          >
            <div className="trust-feature-card reveal-child">
              <div className="tfc-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
              </div>
              <div className="tfc-body">
                <div className="tfc-title">Works on any device</div>
                <div className="tfc-desc">Mobile, tablet, or desktop — zero installation required</div>
              </div>
            </div>
            <div className="trust-feature-card reveal-child">
              <div className="tfc-icon tfc-icon--green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div className="tfc-body">
                <div className="tfc-title">PIN-secured sessions</div>
                <div className="tfc-desc">Jurors authenticate with a PIN — no accounts needed</div>
              </div>
            </div>
            <div className="trust-feature-card reveal-child">
              <div className="tfc-icon tfc-icon--violet">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </div>
              <div className="tfc-body">
                <div className="tfc-title">XLSX &amp; PDF export</div>
                <div className="tfc-desc">Full score reports in one click, formatted for review</div>
              </div>
            </div>
            <div className="trust-feature-card reveal-child">
              <div className="tfc-icon tfc-icon--amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              </div>
              <div className="tfc-body">
                <div className="tfc-title">Real-time analytics</div>
                <div className="tfc-desc">Live dashboards update as jurors score across projects</div>
              </div>
            </div>
            <div className="trust-feature-card reveal-child">
              <div className="tfc-icon tfc-icon--rose">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><path d="M14 2v6h6" /><path d="m9 15 2 2 4-4" /></svg>
              </div>
              <div className="tfc-body">
                <div className="tfc-title">Accreditation-ready</div>
                <div className="tfc-desc">Built-in MÜDEK / ABET outcome mapping and programme reports</div>
              </div>
            </div>
          </div>
          <div className="landing-proof-eyebrow landing-proof-eyebrow--usecase">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
            </svg>
            Works across every context
          </div>
          <div className="trust-usecase-grid">
            <div className="trust-usecase-card">
              <div className="trust-usecase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
                </svg>
              </div>
              <span className="trust-usecase-label">Universities</span>
              <span className="trust-usecase-hint">Capstone & thesis defenses</span>
            </div>
            <div className="trust-usecase-card">
              <div className="trust-usecase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
              </div>
              <span className="trust-usecase-label">Hackathons</span>
              <span className="trust-usecase-hint">48-hour innovation sprints</span>
            </div>
            <div className="trust-usecase-card">
              <div className="trust-usecase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <span className="trust-usecase-label">Competitions</span>
              <span className="trust-usecase-hint">TEKNOFEST, CanSat, IEEE</span>
            </div>
            <div className="trust-usecase-card">
              <div className="trust-usecase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16.5h10" />
                </svg>
              </div>
              <span className="trust-usecase-label">Research Councils</span>
              <span className="trust-usecase-hint">Grant reviews & project evaluations</span>
            </div>
            <div className="trust-usecase-card">
              <div className="trust-usecase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M12 4v6" /><path d="M2 20h20" /><path d="m6 10 4 4" /><path d="m14 10 4 4" />
                </svg>
              </div>
              <span className="trust-usecase-label">Design Exhibitions</span>
              <span className="trust-usecase-hint">Poster days & showcases</span>
            </div>
            <div className="trust-usecase-card">
              <div className="trust-usecase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </div>
              <span className="trust-usecase-label">Accreditation</span>
              <span className="trust-usecase-hint">ABET, MÜDEK, EUR-ACE</span>
            </div>
          </div>
        </div>
        <div className="landing-trust-divider" />
        <div className="landing-stats">
          <div className="landing-stat" ref={orgCount.ref}>
            <div className="landing-stat-value">{orgCount.count}</div>
            <div className="landing-stat-label">Organizations</div>
          </div>
          <div className="landing-stat" ref={evalCount.ref}>
            <div className="landing-stat-value">{evalCount.count.toLocaleString()}</div>
            <div className="landing-stat-label">Evaluations</div>
          </div>
          <div className="landing-stat" ref={jurorCount.ref}>
            <div className="landing-stat-value">{jurorCount.count}</div>
            <div className="landing-stat-label">Jurors</div>
          </div>
          <div className="landing-stat" ref={projectCount.ref}>
            <div className="landing-stat-value">{projectCount.count}</div>
            <div className="landing-stat-label">Projects Scored</div>
          </div>
        </div>
        <div className="landing-trust-sandbox">
          <span className="landing-proof-live-dot" />
          <span>All metrics sourced from live sandbox — explore real evaluation data anytime</span>
        </div>
      </section>

      {/* How it works */}
      <div className="landing-how" id="section-how">
        <div className="landing-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          How it works
        </div>
        <div className="landing-steps">
          <div className="landing-step" style={{ "--step-i": 0 }}>
            <div className="step-number">1</div>
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 15h4" />
              </svg>
            </div>
            <h4>Set Up &amp; Share</h4>
            <p>Define criteria, add projects, invite jurors. Share a QR code or link — evaluators join in seconds.</p>
          </div>
          <div className="step-arrow" style={{ "--arrow-i": 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <div className="landing-step" style={{ "--step-i": 1 }}>
            <div className="step-number">2</div>
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20V4M4 12l8-8 8 8" />
                <path d="M8 16h8" />
              </svg>
            </div>
            <h4>Score Live</h4>
            <p>Jurors evaluate on any device. Scores auto-save on every input — no paper forms, no data entry.</p>
          </div>
          <div className="step-arrow" style={{ "--arrow-i": 1 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <div className="landing-step" style={{ "--step-i": 2 }}>
            <div className="step-number">3</div>
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 6-6" />
              </svg>
            </div>
            <h4>Report &amp; Prove</h4>
            <p>Rankings, outcome attainment, analytics, and exports — accreditation-ready the moment scoring ends.</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="landing-features-section reveal-section" id="section-features">
        <div className="landing-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
          Why teams choose VERA
        </div>
        <div className="landing-features">
          <div className="landing-feature reveal-child">
            <div className="landing-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 14l2 2 4-4" />
              </svg>
            </div>
            <h3>Flexible Criteria</h3>
            <p>Define rubrics per evaluation period — technical, design, delivery, or any domain-specific criteria. Map each to programme outcomes.</p>
          </div>
          <div className="landing-feature reveal-child">
            <div className="landing-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h3>Real-Time Scoring</h3>
            <p>Jurors score on any device during the event. Auto-save on every input, live sync, PIN-secured sessions. Zero friction.</p>
          </div>
          <div className="landing-feature reveal-child">
            <div className="landing-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 6-6" />
              </svg>
            </div>
            <h3>Outcome-Level Reporting</h3>
            <p>Every score maps to programme outcomes. Generate accreditation-ready attainment reports — not just rankings.</p>
          </div>
        </div>
      </div>

      {/* Before / After */}
      <section className="landing-before-after reveal-section">
        <div className="landing-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          The difference
        </div>
        <div className="ba-grid">
          <div className="ba-card before reveal-child">
            <h4>Without VERA</h4>
            <div className="ba-item"><span style={{ color: "#f87171", flexShrink: 0 }}>✗</span> Paper forms collected manually at the event</div>
            <div className="ba-item"><span style={{ color: "#f87171", flexShrink: 0 }}>✗</span> Scores entered into spreadsheets after the fact</div>
            <div className="ba-item"><span style={{ color: "#f87171", flexShrink: 0 }}>✗</span> Outcome mapping done by hand for accreditation</div>
            <div className="ba-item"><span style={{ color: "#f87171", flexShrink: 0 }}>✗</span> No audit trail — impossible to verify or defend</div>
            <div className="ba-item"><span style={{ color: "#f87171", flexShrink: 0 }}>✗</span> Results take days to compile and distribute</div>
          </div>
          <div className="ba-arrow">→</div>
          <div className="ba-card after reveal-child">
            <h4>With VERA</h4>
            <div className="ba-item"><span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> Jurors score on their phones in real time</div>
            <div className="ba-item"><span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> Every input auto-saved — zero data entry</div>
            <div className="ba-item"><span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> Scores auto-map to programme outcomes</div>
            <div className="ba-item"><span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> Full audit trail with action-level history</div>
            <div className="ba-item"><span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span> Rankings and reports ready the moment scoring ends</div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="landing-compare reveal-section">
        <div className="landing-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
          How VERA compares
        </div>
        <table className="compare-table">
          <thead>
            <tr>
              <th></th>
              <th>Paper + Excel</th>
              <th>Google Forms</th>
              <th>Judgify</th>
              <th className="highlight">VERA</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Real-time mobile scoring</td><td className="ct-no">—</td><td className="ct-partial">~</td><td className="ct-yes">✓</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>Auto-save on every input</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="ct-partial">~</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>Configurable rubric criteria</td><td className="ct-partial">~</td><td className="ct-partial">~</td><td className="ct-yes">✓</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>Programme outcome mapping</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>Accreditation-ready reports</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>Full audit trail</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="ct-partial">~</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>Multi-organization isolation</td><td className="ct-no">—</td><td className="ct-no">—</td><td className="ct-yes">✓</td><td className="highlight ct-yes">✓</td></tr>
            <tr><td>No setup / training needed</td><td className="ct-yes">✓</td><td className="ct-yes">✓</td><td className="ct-partial">~</td><td className="highlight ct-yes">✓</td></tr>
          </tbody>
        </table>
      </section>

      {/* Social Proof */}
      <section className="landing-testimonial reveal-section">
        <div className="testimonial-module">

          {/* Section header */}
          <div className="landing-section-label" style={{ justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Trusted by evaluators
          </div>

          {/* Aggregate rating pill */}
          {feedback.total_count > 0 && (
            <div className="testimonial-aggregate">
              <div className="testimonial-agg-inner">
                <div className="testimonial-stars">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                      key={v}
                      size={21}
                      strokeWidth={0}
                      fill={v <= Math.round(feedback.avg_rating) ? "currentColor" : "currentColor"}
                      className={v <= Math.round(feedback.avg_rating) ? "star-filled" : "star-empty"}
                    />
                  ))}
                </div>
                <span className="testimonial-rating-text">{feedback.avg_rating}</span>
                <span className="testimonial-rating-sep" />
                <span className="testimonial-rating-count">
                  {feedback.total_count} reviews
                </span>
              </div>
            </div>
          )}

          {/* Testimonial card */}
          {visibleTestimonial ? (
            <div className="testimonial-card" key={testimonialIdx}>
              <div className="testimonial-quote-icon">
                <Quote size={20} strokeWidth={1.5} />
              </div>
              <blockquote className="testimonial-quote">{visibleTestimonial.comment}</blockquote>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  {(visibleTestimonial.juror_name || "")
                    .split(" ")
                    .filter((w) => !/^(Prof\.|Dr\.|Assoc\.|Asst\.)$/.test(w))
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="testimonial-meta">
                  <div className="testimonial-name">{visibleTestimonial.juror_name}</div>
                  <div className="testimonial-role">{visibleTestimonial.affiliation}</div>
                </div>
                <div className="testimonial-author-stars">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                      key={v}
                      size={15}
                      strokeWidth={0}
                      fill="currentColor"
                      className={v <= visibleTestimonial.rating ? "star-filled" : "star-empty"}
                    />
                  ))}
                </div>
              </div>
              {testimonials.length > 1 && (
                <div className="testimonial-nav">
                  <button className="testimonial-nav-btn" onClick={prevTestimonial} aria-label="Previous">
                    <ChevronLeft size={14} strokeWidth={2.5} />
                  </button>
                  <div className="testimonial-dots">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        className={`testimonial-dot${i === testimonialIdx ? " active" : ""}`}
                        onClick={() => setTestimonialIdx(i)}
                        aria-label={`Testimonial ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button className="testimonial-nav-btn" onClick={nextTestimonial} aria-label="Next">
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="testimonial-card">
              <div className="testimonial-quote-icon">
                <Quote size={20} strokeWidth={1.5} />
              </div>
              <blockquote className="testimonial-quote">We evaluated 41 capstone projects with 19 jurors in under two hours. Scores were live, rankings were instant, and the accreditation report was ready before we left the building.</blockquote>
              <div className="testimonial-author">
                <div className="testimonial-avatar">AY</div>
                <div className="testimonial-meta">
                  <div className="testimonial-name">Prof. Ahmet Yilmaz</div>
                  <div className="testimonial-role">EE Department &middot; Poster Day Coordinator</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* FAQ */}
      <section className="landing-faq reveal-section">
        <div className="landing-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
          </svg>
          Common questions
        </div>
        <div className="faq-list">
          {[
            {
              q: "Is VERA free to use?",
              a: "VERA is free for academic departments and research groups. For large-scale commercial use or custom deployments, contact us for pricing.",
            },
            {
              q: "Can I define my own evaluation criteria?",
              a: "Yes. Each evaluation period has fully configurable criteria — labels, weights, max scores, rubric descriptions, and programme outcome mappings. You can use the built-in defaults or create domain-specific criteria from scratch.",
            },
            {
              q: "Which accreditation standards does VERA support?",
              a: "VERA supports MÜDEK and ABET programme outcome mapping out of the box. You can also define custom outcome frameworks for any accreditation body or internal quality standard.",
            },
            {
              q: "Do jurors need to install an app?",
              a: "No. VERA runs entirely in the browser. Jurors scan a QR code or click a link, enter their name, and start scoring. No downloads, no accounts, no training.",
            },
            {
              q: "What happens if a juror loses connection?",
              a: "Scores auto-save after every input. If disconnected, the juror can return using their 4-digit session PIN and resume exactly where they left off. No data is lost.",
            },
            {
              q: "Where is evaluation data stored?",
              a: "All data is stored in a secure Supabase (PostgreSQL) database with row-level security, role-based access controls, and a full audit trail. Each organization's data is completely isolated.",
            },
          ].map((item, i) => (
            <div
              key={item.q}
              className={`faq-item${openFaq[i] ? " open" : ""}`}
              onClick={() => toggleFaq(i)}
            >
              <div className="faq-q">
                {item.q}
                <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>


      {/* Footer */}
      <div className="landing-footer-bottom">
        © 2026 VERA · Developed by{" "}
        <a href="https://huguryildiz.com/" target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "1px", transition: "border-color .2s" }}>
          Huseyin Ugur Yildiz
        </a>
      </div>
    </div>
  );
}
