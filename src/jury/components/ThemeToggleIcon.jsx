// src/jury/components/ThemeToggleIcon.jsx
// Rays Burst theme toggle — ambient spin, touch-drag to rotate rays (sun) / wobble (moon).

import { useRef, useEffect } from "react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { Moon, SunMedium } from "lucide-react";

export default function ThemeToggleIcon({ size = 18 }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const btnRef = useRef(null);
  const raysRef = useRef(null);
  const moonRef = useRef(null);
  const s = useRef({ rot: 0, drag: false, moved: false, sa: 0, sr: 0 });
  const ease = "cubic-bezier(.4,0,.2,1)";

  const applySunTransform = (scale) => {
    if (!raysRef.current) return;
    raysRef.current.style.transform = `rotate(${s.current.rot}deg) scale(${scale})`;
  };

  const applyMoonTransform = (scale, rotate) => {
    if (!moonRef.current) return;
    moonRef.current.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
  };

  // Ambient slow spin — sun rays orbit
  useEffect(() => {
    if (isDark) return;
    const id = setInterval(() => {
      if (!s.current.drag && raysRef.current) {
        s.current.rot = (s.current.rot + 0.4) % 360;
        applySunTransform(1);
      }
    }, 50);
    return () => clearInterval(id);
  }, [isDark]);

  useEffect(() => {
    applySunTransform(isDark ? 0.6 : 1);
    applyMoonTransform(isDark ? 1 : 0.5, isDark ? 0 : -90);
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
        applyMoonTransform(1, tilt);
      } else {
        s.current.rot = s.current.sr + d;
        applySunTransform(1);
      }
    };

    const onEnd = () => {
      s.current.drag = false;
      if (isDark) applyMoonTransform(1, 0);
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

  return (
    <button
      ref={btnRef}
      className="dj-stepper-theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span style={{ position: "relative", width: size, height: size, display: "inline-flex" }}>
        <SunMedium
          ref={raysRef}
          size={size}
          strokeWidth={2}
          color="#f59e0b"
          aria-hidden="true"
          style={{
            opacity: isDark ? 0 : 1,
            transform: `rotate(${s.current.rot}deg) scale(${isDark ? 0.6 : 1})`,
            transformOrigin: "center",
            transition: `opacity 0.3s, transform 0.4s ${ease}`,
          }}
        />
        <Moon
          ref={moonRef}
          size={size}
          strokeWidth={2}
          color="#93c5fd"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            opacity: isDark ? 1 : 0,
            transform: `scale(${isDark ? 1 : 0.5}) rotate(${isDark ? 0 : -90}deg)`,
            transformOrigin: "center",
            transition: `opacity 0.3s ${isDark ? "0.1s" : "0s"}, transform 0.5s ${ease}`,
          }}
        />
      </span>
    </button>
  );
}
