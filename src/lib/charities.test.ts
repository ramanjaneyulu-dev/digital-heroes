import { describe, expect, it } from "vitest";
import { initials, parseDonationAmount, sanitizeSearch, slugify } from "./charities";

describe("parseDonationAmount", () => {
  it("converts rupees to paise", () => {
    expect(parseDonationAmount("500")).toEqual({ ok: true, cents: 50000 });
    expect(parseDonationAmount("1,250.50")).toEqual({ ok: true, cents: 125050 });
    expect(parseDonationAmount(75)).toEqual({ ok: true, cents: 7500 });
  });
  it("rejects bad input", () => {
    for (const bad of ["", "abc", "-5", "0", "10.123", "49.99", "100001"]) {
      expect(parseDonationAmount(bad).ok).toBe(false);
    }
  });
  it("accepts the exact limits", () => {
    expect(parseDonationAmount("50").ok).toBe(true);
    expect(parseDonationAmount("100000").ok).toBe(true);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Bright Futures & Co.")).toBe("bright-futures-co");
    expect(slugify("  Café   Hope!! ")).toBe("cafe-hope");
    expect(slugify("!!!")).toBe("");
  });
  it("never ends with a dash and caps the length", () => {
    const s = slugify("a".repeat(59) + " b");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("sanitizeSearch", () => {
  it("strips characters that could change a filter", () => {
    expect(sanitizeSearch("water,name.eq.x)(%*")).toBe("water name eq x");
    expect(sanitizeSearch(undefined)).toBe("");
    expect(sanitizeSearch("  hope   health ")).toBe("hope health");
  });
  it("keeps letters from any language", () => {
    expect(sanitizeSearch("విద్య")).toBe("విద్య");
  });
});

describe("initials", () => {
  it("takes up to two initials", () => {
    expect(initials("Clean Water Initiative")).toBe("CW");
    expect(initials("Hope")).toBe("H");
    expect(initials("")).toBe("?");
  });
});
