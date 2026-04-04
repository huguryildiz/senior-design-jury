// src/components/DemoAdminLoader.jsx
// Auto-login overlay for demo "Explore Admin Panel" flow.
// Runs real Supabase signIn in parallel with a 3-step animation.
import { useEffect, useRef } from "react";
import { useAuth } from "@/auth";
import { supabase } from "../api/core/client";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;

const STEPS = [
  {
    label: "Authenticating",
    desc: "Verifying demo credentials",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: "Loading organizations",
    desc: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Syncing evaluation data",
    desc: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

async function fetchDemoStats() {
  const [orgsRes, projectsRes, jurorsRes, periodsRes] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("jurors").select("*", { count: "exact", head: true }),
    supabase.from("periods").select("*", { count: "exact", head: true }),
  ]);
  return {
    orgs: orgsRes.error ? null : orgsRes.count,
    projects: projectsRes.error ? null : projectsRes.count,
    jurors: jurorsRes.error ? null : jurorsRes.count,
    periods: periodsRes.error ? null : periodsRes.count,
  };
}

// step state: "" | "active" | "done"
export default function DemoAdminLoader({ onComplete }) {
  const { signIn } = useAuth();
  const stepsRef = useRef([]);
  const descRefs = useRef([]);
  const barRef = useRef(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const setStep = (i, cls) => {
      const el = stepsRef.current[i];
      if (!el) return;
      el.className = "dao-step" + (cls ? " " + cls : "");
    };
    const setBar = (pct) => {
      if (barRef.current) barRef.current.style.width = pct + "%";
    };
    const setDesc = (i, text) => {
      const el = descRefs.current[i];
      if (!el) return;
      if (text) {
        el.textContent = text;
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    };

    // Run auth + stats + animation in parallel, navigate only when both auth+anim are done
    const authDone = signIn(DEMO_EMAIL, DEMO_PASSWORD, true).then(() => true, () => false);
    const statsDone = fetchDemoStats().catch(() => null);
    const animDone = new Promise((r) => setTimeout(r, 3100));

    // Step 0: Authenticating
    setTimeout(() => { setStep(0, "active"); setBar(15); }, 200);
    setTimeout(() => { setStep(0, "done"); setBar(35); }, 1000);

    // Step 1: Loading organizations — update desc when stats arrive
    setTimeout(() => { setStep(1, "active"); setBar(50); }, 1100);
    statsDone.then((stats) => {
      if (stats?.orgs > 0) setDesc(1, `${stats.orgs} organization${stats.orgs !== 1 ? "s" : ""}`);
    });
    setTimeout(() => { setStep(1, "done"); setBar(70); }, 1900);

    // Step 2: Syncing data — update desc when stats arrive
    setTimeout(() => { setStep(2, "active"); setBar(85); }, 2000);
    statsDone.then((stats) => {
      if (!stats) return;
      const parts = [];
      if (stats.projects > 0) parts.push(`${stats.projects} projects`);
      if (stats.jurors > 0) parts.push(`${stats.jurors} jurors`);
      if (stats.periods > 0) parts.push(`${stats.periods} period${stats.periods !== 1 ? "s" : ""}`);
      if (parts.length > 0) setDesc(2, parts.join(" · "));
    });
    setTimeout(() => { setStep(2, "done"); setBar(100); }, 2700);

    // Navigate only when auth succeeded AND animation finished
    Promise.all([authDone, animDone]).then(([ok]) => {
      if (ok) onComplete();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="demo-admin-overlay active">
      <div className="dao-content">
        <div className="dao-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="dao-title">Preparing your workspace</div>
        <div className="dao-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="dao-step" ref={(el) => (stepsRef.current[i] = el)}>
              <div className="dao-step-icon">{s.icon}</div>
              <div className="dao-step-text">
                <div className="dao-step-label">{s.label}</div>
                <div
                  className="dao-step-desc"
                  ref={(el) => (descRefs.current[i] = el)}
                  style={s.desc === null ? { display: "none" } : undefined}
                >
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="dao-progress">
          <div className="dao-progress-bar" ref={barRef} />
        </div>
      </div>
    </div>
  );
}
