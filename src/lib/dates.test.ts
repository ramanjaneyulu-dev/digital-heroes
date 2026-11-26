import { describe, expect, it } from "vitest";
import { addMonthsUtc } from "./dates";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("addMonthsUtc", () => {
  it("adds whole months", () => {
    expect(iso(addMonthsUtc(new Date("2026-11-15T00:00:00Z"), 1))).toBe("2026-12-15");
    expect(iso(addMonthsUtc(new Date("2026-12-15T00:00:00Z"), 1))).toBe("2027-01-15");
    expect(iso(addMonthsUtc(new Date("2026-11-26T00:00:00Z"), 12))).toBe("2027-11-26");
  });
  it("clamps to the last day of shorter months", () => {
    expect(iso(addMonthsUtc(new Date("2026-01-31T00:00:00Z"), 1))).toBe("2026-02-28");
    expect(iso(addMonthsUtc(new Date("2028-01-31T00:00:00Z"), 1))).toBe("2028-02-29");
    expect(iso(addMonthsUtc(new Date("2026-03-31T00:00:00Z"), 1))).toBe("2026-04-30");
  });
  it("does not change the original date", () => {
    const d = new Date("2026-01-31T00:00:00Z");
    addMonthsUtc(d, 1);
    expect(iso(d)).toBe("2026-01-31");
  });
});
