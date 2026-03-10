// src/shared/scrollIndicators.js
// Detects horizontal overflow for swipe-able text and toggles
// is-overflowing / is-scrolled classes for the ellipsis indicator.

const SCROLL_SELECTOR = [
  ".swipe-x",
  ".eval-scroll-line",
  ".manage-meta-scroll",
  ".manage-item-title",
  ".manage-item-text",
  ".details-juror-name",
  ".detail-cell-scroll",
  ".matrix-juror-name-scroll",
  ".hbar-label",
  ".strictness-label",
].join(",");

export function initScrollIndicators(root = document) {
  if (typeof window === "undefined" || !root) return () => {};

  const elements = new Set();
  const update = (el) => {
    if (!el || !el.classList) return;
    const isOverflowing = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle("is-overflowing", isOverflowing);
    el.classList.toggle("is-scrolled", el.scrollLeft > 0);
  };
  const handleScroll = (e) => update(e.currentTarget);

  const resizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver((entries) => {
      entries.forEach((entry) => update(entry.target));
    })
    : null;

  const register = (el) => {
    if (!el || elements.has(el)) return;
    elements.add(el);
    el.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver?.observe(el);
    update(el);
  };

  let raf = 0;
  const scan = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      root.querySelectorAll(SCROLL_SELECTOR).forEach(register);
      elements.forEach(update);
    });
  };

  const mutationObserver = new MutationObserver(scan);
  mutationObserver.observe(root.body || root, { childList: true, subtree: true });
  window.addEventListener("resize", scan);
  scan();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", scan);
    elements.forEach((el) => {
      el.removeEventListener("scroll", handleScroll);
    });
    elements.clear();
  };
}
