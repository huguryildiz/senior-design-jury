import { describe, expect, it } from "vitest";
import {
  adminCompletionPct,
  dedupeAndSort,
  formatTs,
  parseCsv,
  rowKey,
  tsToMillis,
} from "../utils";

describe("admin utils", () => {
  it("parses CSV with quoted delimiters and multiline fields", () => {
    const csv = 'name,dept\n"Alice, B.","EE"\n"Line1\nLine2";"CS"';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["name", "dept"],
      ["Alice, B.", "EE"],
      ["Line1\nLine2", "CS"],
    ]);
  });

  it("builds stable row key with jurorId priority", () => {
    expect(rowKey({ jurorId: "abc-123", juryName: "A", juryDept: "B" })).toBe("abc-123");
    expect(rowKey({ juryName: "  Alice  ", juryDept: " TEDU / EE " })).toBe(
      "alice__tedu / ee"
    );
  });

  it("computes completion percent based on filled criteria count", () => {
    const rows = [
      { technical: 25, design: 24, delivery: 23, teamwork: 9 },
      { technical: 20, design: 19, delivery: null, teamwork: null },
    ];
    expect(adminCompletionPct(rows, 2)).toBe(75);
    expect(adminCompletionPct([], 0)).toBe(0);
  });

  it("dedupes by juror/dept/group and keeps newest row", () => {
    const rows = [
      {
        juryName: "Alice",
        juryDept: "EE",
        projectId: "g1",
        updatedMs: 1000,
        total: 60,
      },
      {
        juryName: "Alice",
        juryDept: "EE",
        projectId: "g1",
        updatedMs: 2000,
        total: 70,
      },
      {
        juryName: "Bob",
        juryDept: "EE",
        projectId: "g2",
        updatedMs: 1500,
        total: 80,
      },
    ];

    const deduped = dedupeAndSort(rows);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].juryName).toBe("Alice");
    expect(deduped[0].total).toBe(70);
    expect(deduped[1].juryName).toBe("Bob");
  });

  it("formats stored timestamps and parses EU dot format", () => {
    expect(formatTs("13.03.2026 11:09:33")).toBe("13.03.2026 11:09");
    expect(tsToMillis("13.03.2026 11:09:33")).toBeGreaterThan(0);
    expect(tsToMillis("not-a-date")).toBe(0);
  });
});
