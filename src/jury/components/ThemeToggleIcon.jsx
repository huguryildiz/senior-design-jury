// src/jury/components/ThemeToggleIcon.jsx
// Rays Burst theme toggle — ambient spin, touch-drag to rotate rays (sun) / wobble (moon).

import { useRef, useEffect } from "react";
import { useTheme } from "@/shared/theme/ThemeProvider";

export default function ThemeToggleIcon({ size = 18 }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const btnRef = useRef(null);
  const raysRef = useRef(null);
  const moonRef = useRef(null);
  const s = useRef({ rot: 0, drag: false, moved: false, sa: 0, sr: 0 });

  // Ambient slow spin — sun rays orbit
  useEffect(() => {
    if (isDark) return;
    const id = setInterval(() => {
      if (!s.current.drag && raysRef.current) {
        s.current.rot = (s.current.rot + 0.4) % 360;
        raysRef.current.setAttribute("transform", `rotate(${s.current.rot} 12 12)`);
      }
    }, 50);
    return () => clearInterval(id);
  }, [isDark]);

  // Touch: drag to spin rays (sun) or wobble (moon), tap to toggle
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const ang = (t) => {
      const b = el.getBoundingClientRect();
      return (
        Math.atan2(
          t.clientY - b.top - b.height / 2,
          t.clientX - b.left - b.width / 2,
        ) * 57.2958
      );
    };
    const onStart = (e) => {
      if (e.cancelable) e.preventDefault();
      s.current.drag = true;
      s.current.moved = false;
      s.current.sa = ang(e.touches[0]);
      s.current.sr = s.current.rot;
    };
    const onMove = (e) => {
      if (!s.current.drag) return;
      const d = ang(e.touches[0]) - s.current.sa;
      if (Math.abs(d) > 2) s.current.moved = true;
      if (isDark) {
        const tilt = Math.max(-20, Math.min(20, d * 0.4));
        if (moonRef.current)
          moonRef.current.style.transform = `scale(1) rotate(${tilt}deg)`;
      } else {
        s.current.rot = s.current.sr + d;
        if (raysRef.current)
          raysRef.current.setAttribute(
            "transform",
            `rotate(${s.current.rot} 12 12)`,
          );
      }
    };
    const onEnd = () => {
      s.current.drag = false;
      if (isDark && moonRef.current)
        moonRef.current.style.transform = "scale(1) rotate(0deg)";
      if (!s.current.moved) setTheme(isDark ? "light" : "dark");
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [isDark, setTheme]);

  const ease = "cubic-bezier(.4,0,.2,1)";

  return (
    <button
      ref={btnRef}
      className="dj-stepper-theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Rays — amber, orbit slowly, fade for dark */}
        <g
          ref={raysRef}
          stroke="#f59e0b"
          style={{ opacity: isDark ? 0 : 1, transition: "opacity 0.4s" }}
        >
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>

        {/* Sun core — amber */}
        <circle
          cx="12"
          cy="12"
          r="5"
          stroke="#f59e0b"
          style={{
            opacity: isDark ? 0 : 1,
            transform: isDark ? "scale(0.6) rotate(90deg)" : "scale(1)",
            transformOrigin: "12px 12px",
            transition: `opacity 0.3s, transform 0.4s ${ease}`,
          }}
        />

        {/* Moon crescent — soft blue */}
        <path
          ref={moonRef}
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          stroke="#93c5fd"
          style={{
            opacity: isDark ? 1 : 0,
            transform: isDark
              ? "scale(1) rotate(0deg)"
              : "scale(0.5) rotate(-90deg)",
            transformOrigin: "12px 12px",
            transition: `opacity 0.3s ${isDark ? "0.1s" : "0s"}, transform 0.5s ${ease}`,
          }}
        />
      </svg>
    </button>
  );
}
