// src/jury/components/DraggableThemeToggle.jsx
// Floating draggable theme toggle — Rays Burst animation, snap-to-edge, inertia.
// Positioned bottom-right by CSS; touch-drag switches to left/top absolute coords.

import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { Moon, SunMedium } from "lucide-react";

const SIZE = 40; // button diameter px
const EDGE_PAD = 16; // min px from screen edges after snap
const DRAG_THRESHOLD = 8; // px movement before touch counts as drag

export default function DraggableThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const { pathname } = useLocation();
  const isJuryRoute = pathname.startsWith("/jury") || pathname === "/eval";
  const isOverlayRoute = pathname === "/demo";

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
  const ease = "cubic-bezier(.4,0,.2,1)";

  const applySunTransform = (scale) => {
    if (!raysRef.current) return;
    raysRef.current.style.transform = `rotate(${spinRef.current.rot}deg) scale(${scale})`;
  };

  const applyMoonTransform = (scale, rotate) => {
    if (!moonRef.current) return;
    moonRef.current.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
  };

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
        applySunTransform(1);
      }
    }, 50);
    return () => clearInterval(id);
  }, [isDark]);

  useEffect(() => {
    applySunTransform(isDark ? 0.6 : 1);
    applyMoonTransform(isDark ? 1 : 0.5, isDark ? 0 : -90);
  }, [isDark]);

  // Shared drag logic (used by both touch and mouse)
  const startDrag = (el, clientX, clientY) => {
    const rect = el.getBoundingClientRect();
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
    dragRef.current.startClientX = clientX;
    dragRef.current.startClientY = clientY;
    dragRef.current.startBtnX = rect.left;
    dragRef.current.startBtnY = rect.top;
  };

  const moveDrag = (el, clientX, clientY) => {
    if (!dragRef.current.active) return;
    const dx = clientX - dragRef.current.startClientX;
    const dy = clientY - dragRef.current.startClientY;

    if (!dragRef.current.moved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
    }

    if (dragRef.current.moved) {
      const newX = Math.max(0, Math.min(window.innerWidth - SIZE, dragRef.current.startBtnX + dx));
      const newY = Math.max(56, Math.min(window.innerHeight - SIZE - 20, dragRef.current.startBtnY + dy));
      el.style.left = newX + "px";
      el.style.top = newY + "px";

      if (!isDark) {
        spinRef.current.rot = (spinRef.current.rot + dx * 0.04) % 360;
        applySunTransform(1);
      }
      if (isDark) {
        const tilt = Math.max(-25, Math.min(25, dx * 0.3));
        applyMoonTransform(1, tilt);
      }
    }
  };

  const endDrag = (el, onClickToggle) => {
    const wasMoved = dragRef.current.moved;
    dragRef.current.active = false;

    if (isDark) {
      applyMoonTransform(1, 0);
    }

    if (wasMoved) {
      const curLeft = parseFloat(el.style.left) || 0;
      const targetX =
        curLeft + SIZE / 2 < window.innerWidth / 2
          ? EDGE_PAD
          : window.innerWidth - EDGE_PAD - SIZE;
      el.style.transition = `left 0.38s ${ease}`;
      el.style.left = targetX + "px";
    } else if (onClickToggle) {
      onClickToggle();
    }
  };

  // Touch drag handlers
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      startDrag(el, touch.clientX, touch.clientY);
    };

    const onTouchMove = (e) => {
      const touch = e.touches[0];
      moveDrag(el, touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      endDrag(el, () => setTheme(isDark ? "light" : "dark"));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDark, setTheme]);

  // Mouse drag handlers
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const onMouseDown = (e) => {
      e.preventDefault();
      startDrag(el, e.clientX, e.clientY);
      el.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    };

    const onMouseMove = (e) => {
      if (!dragRef.current.active) return;
      moveDrag(el, e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      if (!dragRef.current.active) return;
      el.style.cursor = "";
      document.body.style.userSelect = "";
      // Pass null — onClick handles the toggle for mouse clicks
      endDrag(el, null);
    };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDark, setTheme]);

  return (
    <button
      ref={btnRef}
      className={`dj-float-toggle${hint ? " dj-float-toggle--hint" : ""}${isJuryRoute ? " dj-float-toggle--jury" : ""}${isOverlayRoute ? " dj-float-toggle--above-overlay" : ""}`}
      onClick={() => {
        // Mouse drag end fires onClick too — ignore if drag moved
        if (dragRef.current.moved) {
          dragRef.current.moved = false;
          return;
        }
        setTheme(isDark ? "light" : "dark");
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span style={{ position: "relative", width: 20, height: 20, display: "inline-flex" }}>
        <SunMedium
          ref={raysRef}
          size={20}
          strokeWidth={2}
          color="#f59e0b"
          aria-hidden="true"
          style={{
            opacity: isDark ? 0 : 1,
            transform: `rotate(${spinRef.current.rot}deg) scale(${isDark ? 0.6 : 1})`,
            transformOrigin: "center",
            transition: `opacity 0.3s, transform 0.4s ${ease}`,
          }}
        />
        <Moon
          ref={moonRef}
          size={20}
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
