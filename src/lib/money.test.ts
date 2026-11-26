import { describe, expect, it } from "vitest";
import { formatMoney, splitPayment } from "./money";

describe("splitPayment", () => {
  it("matches the database function for a monthly plan at 10%", () => {
    expect(splitPayment(49900, 10, 0.5)).toEqual({
      charityCents: 4990,
      prizePoolCents: 22455,
      platformCents: 22455,
    });
  });

  it("matches the database function for a yearly plan at 12.5%", () => {
    expect(splitPayment(499000, 12.5, 0.5)).toEqual({
      charityCents: 62375,
      prizePoolCents: 218312,
      platformCents: 218313,
    });
  });

  it("always adds up to the full amount", () => {
    for (const amount of [1, 99, 49900, 499000, 123457]) {
      for (let pct = 10; pct <= 100; pct += 0.5) {
        for (const share of [0, 0.25, 0.5, 0.55, 1]) {
          const s = splitPayment(amount, pct, share);
          expect(s.charityCents + s.prizePoolCents + s.platformCents).toBe(amount);
          expect(s.charityCents).toBeGreaterThanOrEqual(0);
          expect(s.prizePoolCents).toBeGreaterThanOrEqual(0);
          expect(s.platformCents).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("gives the whole fee to charity at 100%", () => {
    expect(splitPayment(49900, 100, 0.5)).toEqual({
      charityCents: 49900,
      prizePoolCents: 0,
      platformCents: 0,
    });
  });

  it("rejects a charity share below the 10% minimum", () => {
    expect(() => splitPayment(49900, 9.99, 0.5)).toThrow(RangeError);
  });

  it("rejects bad amounts and shares", () => {
    expect(() => splitPayment(0, 10, 0.5)).toThrow(RangeError);
    expect(() => splitPayment(100.5, 10, 0.5)).toThrow(RangeError);
    expect(() => splitPayment(100, 10, 1.5)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("formats rupees from paise", () => {
    expect(formatMoney(49900)).toContain("499");
    expect(formatMoney(49950)).toContain("499.50");
  });
});
