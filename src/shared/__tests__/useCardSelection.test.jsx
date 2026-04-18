import { describe, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";
import useCardSelection from "../hooks/useCardSelection.js";

function Scope({ items }) {
  const scopeRef = useCardSelection();
  return (
    <div ref={scopeRef} data-testid="scope">
      {items.map((id) => (
        <div
          key={id}
          data-testid={`card-${id}`}
          data-card-selectable=""
          className="mcard"
        >
          <button
            data-testid={`inline-${id}`}
            className="row-inline-control"
            type="button"
          >
            toggle
          </button>
        </div>
      ))}
    </div>
  );
}

describe("useCardSelection", () => {
  qaTest("use-card-selection.selects-target", () => {
    const { getByTestId } = render(<Scope items={["a", "b"]} />);
    const cardA = getByTestId("card-a");
    fireEvent.pointerDown(cardA);
    expect(cardA.classList.contains("is-selected")).toBe(true);
  });

  qaTest("use-card-selection.deselects-siblings", () => {
    const { getByTestId } = render(<Scope items={["a", "b"]} />);
    const cardA = getByTestId("card-a");
    const cardB = getByTestId("card-b");
    fireEvent.pointerDown(cardA);
    fireEvent.pointerDown(cardB);
    expect(cardA.classList.contains("is-selected")).toBe(false);
    expect(cardB.classList.contains("is-selected")).toBe(true);
  });

  qaTest("use-card-selection.skips-inline-controls", () => {
    const { getByTestId } = render(<Scope items={["a"]} />);
    const cardA = getByTestId("card-a");
    const inlineA = getByTestId("inline-a");
    fireEvent.pointerDown(inlineA);
    expect(cardA.classList.contains("is-selected")).toBe(false);
  });

  qaTest("use-card-selection.toggles-same-card", () => {
    const { getByTestId } = render(<Scope items={["a"]} />);
    const cardA = getByTestId("card-a");
    fireEvent.pointerDown(cardA);
    fireEvent.pointerDown(cardA);
    expect(cardA.classList.contains("is-selected")).toBe(false);
  });
});
