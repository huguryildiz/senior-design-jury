import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export default function MinimalLoaderOverlay({
  open,
  label = "Loading",
  minDuration = 0,
  delay = 250,
}) {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef(null);
  const showTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visible) {
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
        showTimerRef.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          setVisible(true);
          showTimerRef.current = null;
        }, delay);
      }
      return;
    }

    if (!open) {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
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
  }, [open, minDuration, delay, visible]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
  }, []);

  if (!visible) return null;

  return (
    <div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader-card">
        <Loader2 className="loader-icon" size={24} strokeWidth={2} aria-hidden="true" />
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
