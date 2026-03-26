// src/shared/useAnchoredPopover.js
// ============================================================
// Anchored popover positioning hook — shared by dropdowns
// (SemesterDropdown, ScoresDropdown, UserAvatarMenu, etc.).
// ============================================================

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useAnchoredPopover(isOpen, deps = []) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);
  const [panelPlacement, setPanelPlacement] = useState("bottom");

  const computePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 180);
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = Math.min(rect.left, viewportW - minWidth - 12);
    left = Math.max(12, left);
    let top = rect.bottom + 6;
    let placement = "bottom";

    if (panelRef.current) {
      const panelHeight = panelRef.current.offsetHeight;
      if (top + panelHeight > viewportH - 12) {
        const aboveTop = rect.top - panelHeight - 6;
        if (aboveTop >= 12) {
          top = aboveTop;
          placement = "top";
        } else {
          top = Math.max(12, viewportH - panelHeight - 12);
        }
      }
    }

    setPanelPlacement(placement);
    setPanelStyle({
      position: "fixed",
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      minWidth: `${Math.round(minWidth)}px`,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => computePanelPosition();
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, computePanelPosition, ...deps]);

  return { triggerRef, panelRef, panelStyle, panelPlacement };
}
