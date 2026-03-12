// src/admin/components.jsx
// ============================================================
// Shared JSX components for admin tab modules.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jurorStatusMeta } from "./scoreHelpers";
export { HomeIcon, RefreshIcon } from "../shared/Icons";
// ============================================================

const FILTER_MOBILE_MAX_WIDTH = 900;
const FILTER_LARGE_DESKTOP_MIN_WIDTH = 1200;
const FILTER_LARGE_DESKTOP_MIN_HEIGHT = 760;

function FunnelPlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-funnel-plus-icon lucide-funnel-plus"
      aria-hidden="true"
    >
      <path d="M13.354 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l1.218-1.348" />
      <path d="M16 6h6" />
      <path d="M19 3v6" />
    </svg>
  );
}

function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden") && el.offsetParent !== null);
}

function useFilterKeyboardInteractions(open, panelRef, trapFocus, closeOnEscape, onClose) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (!trapFocus || e.key !== "Tab") return;
      const focusables = getFocusableElements(panelRef.current);
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
    };

    document.addEventListener("keydown", handleKeyDown);
    if (trapFocus) {
      const raf = requestAnimationFrame(() => {
        const root = panelRef.current;
        if (!root || root.contains(document.activeElement)) return;
        const focusables = getFocusableElements(root);
        focusables[0]?.focus();
      });
      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, panelRef, trapFocus, closeOnEscape, onClose]);
}

function useBodyScrollLock(locked) {
  useLayoutEffect(() => {
    if (!locked || typeof document === "undefined") return undefined;
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const scrollbarCompensation = Math.max(0, window.innerWidth - html.clientWidth);

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    html.style.overscrollBehavior = "contain";
    if (scrollbarCompensation > 0) {
      body.style.paddingRight = `${scrollbarCompensation}px`;
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
      body.style.overscrollBehavior = prevBodyOverscroll;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [locked]);
}

function getViewportPresentation() {
  if (typeof window === "undefined") {
    return {
      mode: "popover",
      sheetVariant: "bottom",
      isLandscape: false,
      isMobilePortrait: false,
      isLargeDesktop: true,
      viewportWidth: 1280,
      viewportHeight: 800,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isLandscape = viewportWidth > viewportHeight;
  const isMobilePortrait = !isLandscape && viewportWidth <= FILTER_MOBILE_MAX_WIDTH;
  const isCoarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const isLargeDesktop = !isCoarsePointer
    && viewportWidth >= FILTER_LARGE_DESKTOP_MIN_WIDTH
    && viewportHeight >= FILTER_LARGE_DESKTOP_MIN_HEIGHT;
  const shouldUseSheet = isMobilePortrait || (isLandscape && !isLargeDesktop);

  return {
    mode: shouldUseSheet ? "sheet" : "popover",
    sheetVariant: viewportHeight <= 560 ? "center" : "bottom",
    isLandscape,
    isMobilePortrait,
    isLargeDesktop,
    viewportWidth,
    viewportHeight,
  };
}

export function useResponsiveFilterPresentation() {
  const [state, setState] = useState(() => getViewportPresentation());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = () => setState(getViewportPresentation());
    const pointerMq = window.matchMedia("(hover: none), (pointer: coarse)");

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    if (pointerMq.addEventListener) pointerMq.addEventListener("change", update);
    else pointerMq.addListener(update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (pointerMq.addEventListener) pointerMq.removeEventListener("change", update);
      else pointerMq.removeListener(update);
    };
  }, []);

  return state;
}

// ── Outside click / tap (pointerdown) ────────────────────────
// Closes on pointerdown outside of provided target(s).
export function useOutsidePointerDown(isOpen, targets, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      const list = Array.isArray(targets) ? targets : [targets];
      for (const t of list) {
        const el = t?.current ?? t;
        if (!el) continue;
        if (el === e.target || (el.contains && el.contains(e.target))) return;
      }
      onClose?.();
    };
    document.addEventListener("pointerdown", handle, { capture: true });
    return () => document.removeEventListener("pointerdown", handle, { capture: true });
  }, [isOpen, targets, onClose]);
}

function PopoverFilterShell({
  open,
  anchorRect,
  anchorEl,
  onClose,
  className,
  contentKey,
  id,
  mode,
  trapFocus,
  closeOnEscape,
  children,
}) {
  const popRef = useRef(null);
  const [style, setStyle] = useState({ left: 0, top: 0, visibility: "hidden" });

  useOutsidePointerDown(open, [popRef, anchorEl], onClose);
  useFilterKeyboardInteractions(open, popRef, trapFocus, closeOnEscape, onClose);

  useLayoutEffect(() => {
    if (!open || !popRef.current) return;
    const pop = popRef.current;
    const measureAndPlace = () => {
      if (mode === "center") {
        setStyle({ left: "50%", top: "50%", transform: "translate(-50%, -50%)", visibility: "visible" });
        return;
      }
      if (!anchorRect) return;
      const margin = 8;
      const popW = pop.offsetWidth;
      const popH = pop.offsetHeight;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      let left = anchorRect.left;
      left = Math.min(left, viewportW - popW - margin);
      left = Math.max(margin, left);
      let top = anchorRect.bottom + 6;
      if (top + popH + margin > viewportH) {
        const above = anchorRect.top - popH - 6;
        if (above >= margin) top = above;
        else top = Math.max(margin, viewportH - popH - margin);
      }
      setStyle({ left, top, transform: "none", visibility: "visible" });
    };
    measureAndPlace();
    window.addEventListener("resize", measureAndPlace);
    window.addEventListener("orientationchange", measureAndPlace);
    return () => {
      window.removeEventListener("resize", measureAndPlace);
      window.removeEventListener("orientationchange", measureAndPlace);
    };
  }, [open, anchorRect, contentKey, mode]);

  if (!open || (mode !== "center" && !anchorRect)) return null;

  return createPortal(
    <div
      ref={popRef}
      id={id}
      className={className}
      style={style}
      role="dialog"
      aria-modal={mode === "center" ? "true" : "false"}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

function SheetFilterShell({
  open,
  onClose,
  className,
  id,
  trapFocus,
  closeOnEscape,
  children,
  sheetTitle,
  sheetSearch,
  sheetFooter,
  sheetClassName,
  sheetBodyClassName,
  showSheetHandle,
  closeLabel,
  sheetVariant,
}) {
  const panelRef = useRef(null);
  useBodyScrollLock(open);
  useFilterKeyboardInteractions(open, panelRef, trapFocus, closeOnEscape, onClose);

  if (!open) return null;

  return createPortal(
    <div className="filter-sheet-layer" role="presentation">
      <div className="filter-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <section
        ref={panelRef}
        id={id}
        className={`filter-sheet-panel filter-sheet-panel--${sheetVariant} ${className || ""} ${sheetClassName || ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={sheetTitle || "Filter"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {showSheetHandle && sheetVariant === "bottom" && (
          <div className="filter-sheet-handle-wrap" aria-hidden="true">
            <span className="filter-sheet-handle" />
          </div>
        )}
        <div className="filter-sheet-header">
          <div className="filter-sheet-title-wrap">
            <span className="filter-sheet-title-icon" aria-hidden="true">
              <FunnelPlusIcon />
            </span>
            {sheetTitle && <h3 className="filter-sheet-title">{sheetTitle}</h3>}
          </div>
          <button
            type="button"
            className="filter-sheet-close-btn"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
          >
            ×
          </button>
        </div>
        {sheetSearch && (
          <div className="filter-sheet-search">
            {sheetSearch}
          </div>
        )}
        <div className={`filter-sheet-body ${sheetBodyClassName || ""}`.trim()}>
          {children}
        </div>
        {sheetFooter && (
          <div className="filter-sheet-footer">
            {sheetFooter}
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}

export function FilterPanelActions({
  onClear,
  onApply,
  clearDisabled = false,
  applyDisabled = false,
  clearLabel = "Clear",
  applyLabel = "Apply",
}) {
  return (
    <div className="filter-panel-actions">
      <button
        type="button"
        className="filter-panel-btn filter-panel-btn-clear"
        onClick={onClear}
        disabled={clearDisabled}
      >
        {clearLabel}
      </button>
      <button
        type="button"
        className="filter-panel-btn filter-panel-btn-apply"
        onClick={onApply}
        disabled={applyDisabled}
      >
        {applyLabel}
      </button>
    </div>
  );
}

// ── Filter popover portal ─────────────────────────────────────
// Renders either anchored popover or responsive sheet.
// mode="anchor" keeps anchor positioning for desktop popovers.
// mode="center" hints a modal/sheet-style presentation.
export function FilterPopoverPortal({
  open,
  anchorRect,
  anchorEl,
  onClose,
  className,
  contentKey,
  id,
  mode = "anchor",
  trapFocus = mode === "center",
  closeOnEscape = true,
  presentation = "auto",
  sheetTitle = "",
  sheetSearch = null,
  sheetFooter = null,
  sheetClassName = "",
  sheetBodyClassName = "",
  showSheetHandle = true,
  closeLabel = "Close filter",
  sheetVariant = null,
  children,
}) {
  const responsive = useResponsiveFilterPresentation();
  const resolvedPresentation = presentation === "auto"
    ? (mode === "center" ? "sheet" : responsive.mode)
    : presentation;
  const resolvedSheetVariant = sheetVariant || responsive.sheetVariant || "bottom";

  if (resolvedPresentation === "sheet") {
    return (
      <SheetFilterShell
        open={open}
        onClose={onClose}
        className={className}
        id={id}
        trapFocus={true}
        closeOnEscape={closeOnEscape}
        sheetTitle={sheetTitle}
        sheetSearch={sheetSearch}
        sheetFooter={sheetFooter}
        sheetClassName={sheetClassName}
        sheetBodyClassName={sheetBodyClassName}
        showSheetHandle={showSheetHandle}
        closeLabel={closeLabel}
        sheetVariant={resolvedSheetVariant}
      >
        {children}
      </SheetFilterShell>
    );
  }

  return (
    <PopoverFilterShell
      open={open}
      anchorRect={anchorRect}
      anchorEl={anchorEl}
      onClose={onClose}
      className={className}
      contentKey={contentKey}
      id={id}
      mode={mode}
      trapFocus={trapFocus}
      closeOnEscape={closeOnEscape}
    >
      {children}
    </PopoverFilterShell>
  );
}

// ── Status badge ──────────────────────────────────────────────
// Renders a badge for any juror workflow state or cell state.
// Uses jurorStatusMeta for all label/icon/color lookups.
export function StatusBadge({ status, editingFlag, variant, icon, children }) {
  if (variant || icon || children) {
    return (
      <span className={`status-badge${variant ? ` ${variant}` : ""}`}>
        {icon}
        {children}
      </span>
    );
  }
  const key = editingFlag === "editing" ? "editing" : (status ?? "not_started");
  const meta = jurorStatusMeta[key] ?? jurorStatusMeta.not_started;
  const Icon = meta.icon;
  return (
    <span className={`status-badge ${meta.colorClass}`}>
      <Icon />{meta.label}
    </span>
  );
}
