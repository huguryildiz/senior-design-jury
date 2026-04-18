import { useCallback, useEffect, useRef } from "react";

const SELECTABLE_ATTR = "data-card-selectable";
const INLINE_CONTROL_SELECTOR = ".row-inline-control";
const SELECTED_CLASS = "is-selected";

export default function useCardSelection() {
  const scopeRef = useRef(null);

  const handlePointerDown = useCallback((event) => {
    if (event.target.closest(INLINE_CONTROL_SELECTOR)) return;
    const target = event.target.closest(`[${SELECTABLE_ATTR}]`);
    if (!target) return;
    const scope = scopeRef.current;
    if (!scope || !scope.contains(target)) return;

    const wasSelected = target.classList.contains(SELECTED_CLASS);
    scope
      .querySelectorAll(`[${SELECTABLE_ATTR}].${SELECTED_CLASS}`)
      .forEach((el) => el.classList.remove(SELECTED_CLASS));
    if (!wasSelected) target.classList.add(SELECTED_CLASS);
  }, []);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;
    scope.addEventListener("pointerdown", handlePointerDown);
    return () => scope.removeEventListener("pointerdown", handlePointerDown);
  }, [handlePointerDown]);

  return scopeRef;
}
