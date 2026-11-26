import { describe, it, expect } from "vitest";
import { parseScoreInput, friendlyScoreError, todayUtc } from "./scores";

const NOW = new Date("2026-11-26T10:00:00Z");

describe("parseScoreInput", () => {
  it("accepts a valid score and today's date", () => {
    expect(parseScoreInput({ score: "36", played_on: "2026-11-26" }, NOW)).toEqual({
      ok: true,
      data: { score: 36, played_on: "2026-11-26" },
    });
  });
  it("accepts the boundaries 1 and 45", () => {
    expect(parseScoreInput({ score: 1, played_on: "2026-01-01" }, NOW).ok).toBe(true);
    expect(parseScoreInput({ score: 45, played_on: "2026-01-01" }, NOW).ok).toBe(true);
  });
  it("rejects 0, 46, decimals and non-numbers", () => {
    for (const s of [0, 46, 20.5, "abc", ""]) {
      expect(parseScoreInput({ score: s, played_on: "2026-01-01" }, NOW).ok).toBe(false);
    }
  });
  it("rejects future and impossible dates", () => {
    expect(parseScoreInput({ score: 20, played_on: "2026-11-27" }, NOW).ok).toBe(false);
    expect(parseScoreInput({ score: 20, played_on: "2026-02-31" }, NOW).ok).toBe(false);
    expect(parseScoreInput({ score: 20, played_on: "" }, NOW).ok).toBe(false);
  });
});

describe("friendlyScoreError", () => {
  it("maps known database errors", () => {
    expect(friendlyScoreError({ code: "23505" })).toMatch(/already have a score/);
    expect(friendlyScoreError({ message: "This date is older than your 5 most recent scores" })).toMatch(/older/);
    expect(friendlyScoreError({ code: "42501" })).toMatch(/subscription/);
  });
  it("never leaks raw messages", () => {
    expect(friendlyScoreError({ message: "relation \"scores\" blew up" })).not.toMatch(/relation/);
  });
});

it("todayUtc formats as YYYY-MM-DD", () => {
  expect(todayUtc(NOW)).toBe("2026-11-26");
});
