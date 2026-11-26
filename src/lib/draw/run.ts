// The whole draw as ONE pure function: entries in, results out. No I/O, so it can be
// simulated any number of times and re-run safely (PRD §14).
import { generateWinningNumbers } from "./numbers";
import { matchEntry } from "./match";
import { calculatePrizes, type TierPayout } from "./prizes";
import {
  NUMBER_MAX, NUMBER_MIN, NUMBERS_PER_DRAW, TIERS,
  type DrawMode, type EntryInput, type MatchedEntry, type PoolSplit, type Rng, type Tier,
} from "./types";

export type DrawInput = {
  mode: DrawMode;
  entries: EntryInput[];          // anyone; ineligible ones (not exactly 5 scores) are dropped here
  basePoolCents: number;          // from this period's subscriptions
  rolloverInCents: number;        // jackpot carried from the previous published draw
  split: PoolSplit;
  rolloverTier: Tier;
  rng?: Rng;                      // inject a seeded RNG in tests
  winningNumbers?: number[];      // supply to re-use numbers an admin already approved in a simulation
};

export type DrawResult = {
  winningNumbers: number[];
  entrants: number;
  entries: MatchedEntry[];
  winners: { userId: string; tier: Tier; prizeCents: number }[];
  tiers: TierPayout[];
  totalPoolCents: number;
  rolloverInCents: number;
  rolloverOutCents: number;
  unclaimedCents: number;
};

export function validateWinningNumbers(nums: number[]): boolean {
  return (
    nums.length === NUMBERS_PER_DRAW &&
    new Set(nums).size === NUMBERS_PER_DRAW &&
    nums.every((n) => Number.isInteger(n) && n >= NUMBER_MIN && n <= NUMBER_MAX)
  );
}

export function runDraw(input: DrawInput): DrawResult {
  const eligible = input.entries.filter((e) => e.scores.length === NUMBERS_PER_DRAW);

  let winningNumbers = input.winningNumbers;
  if (winningNumbers) {
    if (!validateWinningNumbers(winningNumbers)) throw new Error("Invalid winning numbers.");
  } else {
    winningNumbers = generateWinningNumbers(input.mode, eligible.flatMap((e) => e.scores), input.rng);
  }

  const entries: MatchedEntry[] = eligible.map((e) => ({
    userId: e.userId,
    scores: e.scores,
    ...matchEntry(winningNumbers!, e.scores),
  }));

  const winnersPerTier = { match_5: 0, match_4: 0, match_3: 0 } as Record<Tier, number>;
  for (const e of entries) if (e.tier) winnersPerTier[e.tier]++;

  const totalPoolCents = input.basePoolCents + input.rolloverInCents;
  const prizes = calculatePrizes(totalPoolCents, input.split, winnersPerTier, input.rolloverTier);
  const each = new Map(prizes.tiers.map((t) => [t.tier, t.prizeEachCents]));

  const winners = entries
    .filter((e): e is MatchedEntry & { tier: Tier } => e.tier !== null)
    .map((e) => ({ userId: e.userId, tier: e.tier, prizeCents: each.get(e.tier)! }))
    .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.userId.localeCompare(b.userId));

  return {
    winningNumbers,
    entrants: entries.length,
    entries,
    winners,
    tiers: prizes.tiers,
    totalPoolCents,
    rolloverInCents: input.rolloverInCents,
    rolloverOutCents: prizes.rolloverOutCents,
    unclaimedCents: prizes.unclaimedCents,
  };
}
