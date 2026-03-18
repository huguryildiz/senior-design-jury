// src/shared/useFocusTrap.js
// ============================================================
// Focus-trap hook for modal dialogs.
//
// - Traps Tab / Shift+Tab within containerRef
// - Closes on Escape (calls onClose)
// - Focuses the first focusable element inside containerRef on open
// - Restores focus to the previously-focused element on close
//
// Based on the getFocusableElements + useFilterKeyboardInteractions
// pattern in src/admin/components.jsx. Native React + DOM only.
// ============================================================

import { useEffect, useRef } from "react";

function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      !el.getAttribute("aria-hidden") &&
      el.offsetParent !== null
  );
}

/**
 * useFocusTrap — keyboard focus management for modal dialogs.
 *
 * @param {object} opts
 * @param {React.RefObject<HTMLElement>} opts.containerRef  The dialog root element.
 * @param {boolean}  opts.isOpen   Whether the dialog is open.
 * @param {Function} opts.onClose  Called when Escape is pressed.
 */
export function useFocusTrap({ containerRef, isOpen, onClose }) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save the element that was focused before the dialog opened.
    triggerRef.current = document.activeElement;

    // Focus the first focusable element inside the dialog.
    const rafId = requestAnimationFrame(() => {
      const root = containerRef.current;
      if (!root || root.contains(document.activeElement)) return;
      getFocusableElements(root)[0]?.focus();
    });

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusableElements(containerRef.current);
      if (!focusables.length) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that triggered the dialog.
      triggerRef.current?.focus?.();
    };
  }, [isOpen, containerRef, onClose]);
}
