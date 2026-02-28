import { useEffect, useRef, useState } from "react";

export default function MinimalLoaderOverlay({
  open,
  label = "Loading",
  minDuration = 400,
}) {
  const [visible, setVisible] = useState(!!open);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      shownAtRef.current = Date.now();
      setVisible(true);
      return;
    }

    if (!open && visible) {
      const elapsed = Date.now() - shownAtRef.current;
      const wait = Math.max(0, minDuration - elapsed);
      if (wait === 0) {
        setVisible(false);
      } else {
        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          hideTimerRef.current = null;
        }, wait);
      }
    }
  }, [open, minDuration, visible]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  if (!visible) return null;

  return (
    <div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader-card">
        <svg
          className="loader-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4" />
          <path d="m16.2 7.8 2.9-2.9" />
          <path d="M18 12h4" />
          <path d="m16.2 16.2 2.9 2.9" />
          <path d="M12 18v4" />
          <path d="m4.9 19.1 2.9-2.9" />
          <path d="M2 12h4" />
          <path d="m4.9 4.9 2.9 2.9" />
        </svg>
        <span className="loader-text">
          {label}
          <span className="loader-dot">.</span>
          <span className="loader-dot">.</span>
          <span className="loader-dot">.</span>
        </span>
      </div>
    </div>
  );
}
