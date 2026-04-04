// src/admin/__tests__/captureChartImage.test.js
// ============================================================
// captureChartImage — chart element snapshot capture for PDF embedding.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mock html2canvas before importing the module under test ─────────────────
const mockToDataURL = vi.fn(() => "data:image/png;base64,FAKE");
const mockCanvas = { toDataURL: mockToDataURL };
const mockHtml2canvas = vi.fn(() => Promise.resolve(mockCanvas));

vi.mock("html2canvas", () => ({ default: mockHtml2canvas }));

// Import after mock registration
const { captureChartImage } = await import("../analytics/captureChartImage.js");

describe("captureChartImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  qaTest("analytics.pdf.capture.01", async () => {
    const result = await captureChartImage("non-existent-id");
    expect(result).toBeNull();
    expect(mockHtml2canvas).not.toHaveBeenCalled();
  });

  qaTest("analytics.pdf.capture.02", async () => {
    const div = document.createElement("div");
    div.id = "test-chart";
    document.body.appendChild(div);

    let classWasAdded = false;
    const origAdd = div.classList.add.bind(div.classList);
    vi.spyOn(div.classList, "add").mockImplementation((cls) => {
      if (cls === "pdf-capture-mode") classWasAdded = true;
      origAdd(cls);
    });

    await captureChartImage("test-chart");

    expect(classWasAdded).toBe(true);
    // Class must be removed after capture
    expect(div.classList.contains("pdf-capture-mode")).toBe(false);
  });

  qaTest("analytics.pdf.capture.03", async () => {
    const div = document.createElement("div");
    div.id = "test-chart-2";
    document.body.appendChild(div);

    const result = await captureChartImage("test-chart-2");

    expect(mockHtml2canvas).toHaveBeenCalledWith(div, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    expect(result).toBe("data:image/png;base64,FAKE");
  });
});
