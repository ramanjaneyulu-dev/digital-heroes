import { describe, it, expect } from "vitest";
import {
  seededRng, generateRandomNumbers, generateAlgorithmicNumbers, matchEntry,
  calculatePrizes, parsePoolSplit, runDraw, DEFAULT_SPLIT, type Tier,
} from "./index";

const none = { match_5: 0, match_4: 0, match_3: 0 } as Record<Tier, number>;
const sumPaid = (r: ReturnType<typeof calculatePrizes>) =>
  r.tiers.reduce((s, t) => s + t.prizeEachCents * t.winners, 0);

describe("number generation", () => {
  it("random: 5 distinct sorted numbers in 1-45", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 300; i++) {
      const n = generateRandomNumbers(rng);
      expect(n).toHaveLength(5);
      expect(new Set(n).size).toBe(5);
      expect(n.every((x) => x >= 1 && x <= 45)).toBe(true);
      expect([...n].sort((a, b) => a - b)).toEqual(n);
    }
  });
  it("is deterministic with the same seed", () => {
    expect(generateRandomNumbers(seededRng(42))).toEqual(generateRandomNumbers(seededRng(42)));
  });
  it("algorithmic: common favours frequent scores, rare avoids them", () => {
    const scores = Array.from({ length: 2000 }, (_, i) => [7, 8, 9, 10, 11][i % 5]);
    const hot = new Set([7, 8, 9, 10, 11]);
    const rng = seededRng(7);
    let common = 0, rare = 0;
    for (let i = 0; i < 100; i++) {
      common += generateAlgorithmicNumbers(scores, "algorithmic_common", rng).filter((n) => hot.has(n)).length;
      rare += generateAlgorithmicNumbers(scores, "algorithmic_rare", rng).filter((n) => hot.has(n)).length;
    }
    expect(common / 100).toBeGreaterThan(4.5);
    expect(rare / 100).toBeLessThan(0.5);
  });
  it("algorithmic still returns 5 distinct numbers", () => {
    const n = generateAlgorithmicNumbers([1, 1, 1, 2, 3], "algorithmic_common", seededRng(3));
    expect(new Set(n).size).toBe(5);
  });
});

describe("matchEntry", () => {
  const win = [5, 10, 15, 20, 25];
  it("counts 5/4/3 and no prize below 3", () => {
    expect(matchEntry(win, [5, 10, 15, 20, 25])).toEqual({ matchCount: 5, tier: "match_5" });
    expect(matchEntry(win, [5, 10, 15, 20, 1])).toEqual({ matchCount: 4, tier: "match_4" });
    expect(matchEntry(win, [5, 10, 15, 2, 1])).toEqual({ matchCount: 3, tier: "match_3" });
    expect(matchEntry(win, [5, 10, 3, 2, 1])).toEqual({ matchCount: 2, tier: null });
  });
  it("uses distinct values: a repeated score counts once", () => {
    expect(matchEntry(win, [5, 5, 5, 10, 10])).toEqual({ matchCount: 2, tier: null });
  });
});

describe("calculatePrizes", () => {
  it("splits 40/35/25 and splits equally among winners", () => {
    const r = calculatePrizes(100000, DEFAULT_SPLIT, { match_5: 1, match_4: 2, match_3: 5 }, "match_5");
    expect(r.tiers.map((t) => t.poolCents)).toEqual([40000, 35000, 25000]);
    expect(r.tiers.map((t) => t.prizeEachCents)).toEqual([40000, 17500, 5000]);
    expect(r.rolloverOutCents).toBe(0);
  });
  it("jackpot rolls over when nobody matches 5; 4 and 3 do not", () => {
    const r = calculatePrizes(100000, DEFAULT_SPLIT, none, "match_5");
    expect(r.rolloverOutCents).toBe(40000);
    expect(r.unclaimedCents).toBe(60000);
  });
  it("remainders from uneven splits roll over", () => {
    const r = calculatePrizes(100000, DEFAULT_SPLIT, { match_5: 0, match_4: 3, match_3: 0 }, "match_5");
    expect(r.tiers[1].prizeEachCents).toBe(11666); // 35000 / 3
    expect(r.rolloverOutCents).toBe(40000 + 2);    // jackpot + 2 left over
  });
  it("money is conserved for any pool and winner mix", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 500; i++) {
      const pool = Math.floor(rng() * 5_000_000);
      const w = { match_5: Math.floor(rng() * 4), match_4: Math.floor(rng() * 6), match_3: Math.floor(rng() * 9) };
      const r = calculatePrizes(pool, DEFAULT_SPLIT, w, "match_5");
      expect(sumPaid(r) + r.rolloverOutCents + r.unclaimedCents).toBe(pool);
    }
  });
  it("rejects a split that does not total 100 and a bad pool", () => {
    expect(() => calculatePrizes(1000, { match_5: 50, match_4: 35, match_3: 25 }, none, "match_5")).toThrow();
    expect(() => calculatePrizes(-1, DEFAULT_SPLIT, none, "match_5")).toThrow();
  });
  it("parsePoolSplit reads both key styles and rejects bad data", () => {
    expect(parsePoolSplit({ match_5: 40, match_4: 35, match_3: 25 })).toEqual(DEFAULT_SPLIT);
    expect(parsePoolSplit({ "5": 40, "4": 35, "3": 25 })).toEqual(DEFAULT_SPLIT);
    expect(parsePoolSplit({ match_5: 10, match_4: 10, match_3: 10 })).toBeNull();
    expect(parsePoolSplit(null)).toBeNull();
  });
});

describe("runDraw", () => {
  const base = { mode: "random" as const, split: DEFAULT_SPLIT, rolloverTier: "match_5" as Tier, basePoolCents: 100000, rolloverInCents: 0 };
  const win = [5, 10, 15, 20, 25];
  const entries = [
    { userId: "a", scores: [5, 10, 15, 20, 25] }, // 5 match
    { userId: "b", scores: [5, 10, 15, 20, 1] },  // 4
    { userId: "c", scores: [5, 10, 15, 2, 1] },   // 3
    { userId: "d", scores: [1, 2, 3, 4, 6] },     // none
    { userId: "e", scores: [5, 10, 15] },         // ineligible: only 3 scores
  ];
  it("finds winners, pays them, and drops ineligible entrants", () => {
    const r = runDraw({ ...base, entries, winningNumbers: win });
    expect(r.entrants).toBe(4);
    expect(r.winners).toEqual([
      { userId: "a", tier: "match_5", prizeCents: 40000 },
      { userId: "b", tier: "match_4", prizeCents: 35000 },
      { userId: "c", tier: "match_3", prizeCents: 25000 },
    ]);
    expect(r.rolloverOutCents).toBe(0);
  });
  it("rollover chain: unclaimed jackpot grows the next draw", () => {
    const d1 = runDraw({ ...base, entries: [{ userId: "d", scores: [1, 2, 3, 4, 6] }], winningNumbers: win });
    expect(d1.rolloverOutCents).toBe(40000);
    const d2 = runDraw({ ...base, entries, winningNumbers: win, rolloverInCents: d1.rolloverOutCents });
    expect(d2.totalPoolCents).toBe(140000);
    expect(d2.winners[0].prizeCents).toBe(56000); // 40% of 140000
  });
  it("same inputs and seed give the same result (safe to re-run)", () => {
    const a = runDraw({ ...base, entries, rng: seededRng(5) });
    const b = runDraw({ ...base, entries, rng: seededRng(5) });
    expect(a).toEqual(b);
  });
  it("rejects invalid supplied numbers", () => {
    expect(() => runDraw({ ...base, entries, winningNumbers: [1, 1, 2, 3, 4] })).toThrow();
    expect(() => runDraw({ ...base, entries, winningNumbers: [1, 2, 3, 4, 46] })).toThrow();
  });
  it("works with zero entrants in every mode", () => {
    for (const mode of ["random", "algorithmic_common", "algorithmic_rare"] as const) {
      const r = runDraw({ ...base, mode, entries: [], rng: seededRng(1) });
      expect(r.winningNumbers).toHaveLength(5);
      expect(r.rolloverOutCents).toBe(40000);
    }
  });
});
