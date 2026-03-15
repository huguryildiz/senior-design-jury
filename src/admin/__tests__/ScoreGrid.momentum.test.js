// src/admin/__tests__/ScoreGrid.momentum.test.js
// ============================================================
// ScoreGrid — transitionend isConnected guard.
// Audit item: M-1
//
// JSDOM has no CSS engine so transitionend never fires automatically.
// We manually dispatch the event and verify the guard prevents DOM
// access errors when the element is detached before the event fires.
// ============================================================

import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// Replicate the minimal shape of the transitionend handler from ScoreGrid.jsx
// so we can unit-test the guard in isolation without mounting the full component.
function makeHandler(el, inner) {
  return function onEnd() {
    if (!el.isConnected) return;
    inner.style.transition = "";
    inner.removeEventListener("transitionend", onEnd);
    if (Number(el.dataset.currentTranslate ?? "0") >= 0) {
      el.classList.remove("is-scrollable");
      inner.style.transform = "";
      delete el.dataset.currentTranslate;
    }
  };
}

describe("ScoreGrid — transitionend isConnected guard", () => {
  qaTest("scoregrid.momentum.01", () => {
    // Set up real DOM elements (JSDOM)
    const el    = document.createElement("div");
    const inner = document.createElement("div");
    el.appendChild(inner);
    document.body.appendChild(el);

    // Simulate data written during momentum scroll
    el.dataset.currentTranslate = "-50";
    inner.style.transition = "transform 450ms ease";

    const onEnd = makeHandler(el, inner);
    inner.addEventListener("transitionend", onEnd);

    // Detach el from DOM — mimics component unmount mid-transition
    el.remove();
    expect(el.isConnected).toBe(false);

    // Firing transitionend on a detached element must not throw
    expect(() => {
      inner.dispatchEvent(new Event("transitionend", { bubbles: true }));
    }).not.toThrow();

    // Transition style should NOT have been cleared (guard fired early)
    expect(inner.style.transition).toBe("transform 450ms ease");
  });
});
