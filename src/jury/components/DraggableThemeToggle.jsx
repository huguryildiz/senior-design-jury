// src/jury/components/DraggableThemeToggle.jsx
// Floating draggable theme toggle — Rays Burst animation, snap-to-edge, inertia.
// Positioned bottom-right by CSS; touch-drag switches to left/top absolute coords.

import { useRef, useEffect, useState } from "react";
import { useTheme } from "@/shared/theme/ThemeProvider";

const SIZE = 40;       // button diameter px
const EDGE_PAD = 16;   // min px from screen edges after snap
const DRAG_THRESHOLD = 8; // px movement before touch counts as drag

export default function DraggableThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const btnRef = useRef(null);
  const raysRef = useRef(null);
  const moonRef = useRef(null);
  const spinRef = useRef({ rot: 0 });
  const dragRef = useRef({
    active: false,
    moved: false,
    usingAbsolute: false,
    startClientX: 0,
    startClientY: 0,
    startBtnX: 0,
    startBtnY: 0,
  });

  const [hint, setHint] = useState(true);

  // Dismiss hint jiggle after it finishes
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 2800);
    return () => clearTimeout(t);
  }, []);

  // Ambient slow spin — sun rays orbit
  useEffect(() => {
    if (isDark) return;
    const id = setInterval(() => {
      if (!dragRef.current.active && raysRef.current) {
        spinRef.current.rot = (spinRef.current.rot + 0.4) % 360;
        raysRef.current.setAttribute("transform", `rotate(${spinRef.current.rot} 12 12)`);
      }
    }, 50);
    return () => clearInterval(id);
  }, [isDark]);

  // Touch drag handlers
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const ease = "cubic-bezier(.4,0,.2,1)";

    const onStart = (e) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      const rect = el.getBoundingClientRect();

      // First drag: switch from CSS right/bottom to JS left/top
      if (!dragRef.current.usingAbsolute) {
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.left = rect.left + "px";
        el.style.top = rect.top + "px";
        dragRef.current.usingAbsolute = true;
      }

      el.style.transition = "none";
      dragRef.current.active = true;
      dragRef.current.moved = false;
      dragRef.current.startClientX = touch.clientX;
      dragRef.current.startClientY = touch.clientY;
      dragRef.current.startBtnX = rect.left;
      dragRef.current.startBtnY = rect.top;
    };

    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragRef.current.startClientX;
      const dy = touch.clientY - dragRef.current.startClientY;

      if (!dragRef.current.moved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        dragRef.current.moved = true;
      }

      if (dragRef.current.moved) {
        const newX = Math.max(0, Math.min(window.innerWidth - SIZE, dragRef.current.startBtnX + dx));
        const newY = Math.max(56, Math.min(window.innerHeight - SIZE - 20, dragRef.current.startBtnY + dy));
        el.style.left = newX + "px";
        el.style.top = newY + "px";

        // Drag-responsive visuals
        if (!isDark && raysRef.current) {
          spinRef.current.rot = (spinRef.current.rot + dx * 0.04) % 360;
          raysRef.current.setAttribute("transform", `rotate(${spinRef.current.rot} 12 12)`);
        }
        if (isDark && moonRef.current) {
          const tilt = Math.max(-25, Math.min(25, dx * 0.3));
          moonRef.current.style.transform = `scale(1) rotate(${tilt}deg)`;
        }
      }
    };

    const onEnd = () => {
      const wasMoved = dragRef.current.moved;
      dragRef.current.active = false;

      if (isDark && moonRef.current) {
        moonRef.current.style.transform = "scale(1) rotate(0deg)";
      }

      if (wasMoved) {
        // Snap to nearest horizontal edge, keep vertical position
        const curLeft = parseFloat(el.style.left) || 0;
        const targetX =
          curLeft + SIZE / 2 < window.innerWidth / 2
            ? EDGE_PAD
            : window.innerWidth - EDGE_PAD - SIZE;
        el.style.transition = `left 0.38s ${ease}`;
        el.style.left = targetX + "px";
      } else {
        setTheme(isDark ? "light" : "dark");
      }
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
      className={`dj-float-toggle${hint ? " dj-float-toggle--hint" : ""}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <svg
        width={20}
        height={20}
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
