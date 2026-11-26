// Prize maths. Integers only (smallest currency unit), so nothing is ever lost to rounding:
//   sum(prizes paid) + rolloverOut + unclaimed === pool   (always; tested)
import { TIERS, type PoolSplit, type Tier } from "./types";

/** Read a stored setting leniently ({"match_5":40,...} or {"5":40,...}); null if unusable. */
export function parsePoolSplit(raw: unknown): PoolSplit | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pick = (n: 3 | 4 | 5) => Number(o[`match_${n}`] ?? o[String(n)]);
  const split = { match_5: pick(5), match_4: pick(4), match_3: pick(3) };
  return isValidSplit(split) ? split : null;
}

export function parseRolloverTier(raw: unknown): Tier | null {
  return typeof raw === "string" && (TIERS as string[]).includes(raw) ? (raw as Tier) : null;
}

export function isValidSplit(split: PoolSplit): boolean {
  const vals = TIERS.map((t) => split[t]);
  return vals.every((v) => Number.isFinite(v) && v >= 0) && Math.round(vals.reduce((a, b) => a + b, 0) * 100) === 10000;
}

export type TierPayout = { tier: Tier; poolCents: number; winners: number; prizeEachCents: number };
export type PrizeResult = {
  tiers: TierPayout[];
  rolloverOutCents: number; // carried to the next published draw
  unclaimedCents: number;   // non-rollover tiers with no winner: not paid, not carried
};

/**
 * @param poolCents        total pool for this draw INCLUDING any rollover brought in
 * @param winnersPerTier   how many winners landed in each tier
 * @param rolloverTier     the tier whose unclaimed amount carries forward (PRD: the 5-match jackpot)
 *
 * Rules:
 *  - Tier amount = floor(pool * pct). Pennies lost to that rounding ("dust") roll over.
 *  - Winners in a tier share equally; floor division, leftover pennies roll over.
 *  - A tier with no winner: rolls over only if it is the rollover tier, else stays unclaimed.
 */
export function calculatePrizes(
  poolCents: number,
  split: PoolSplit,
  winnersPerTier: Record<Tier, number>,
  rolloverTier: Tier
): PrizeResult {
  if (!Number.isInteger(poolCents) || poolCents < 0) throw new Error("Pool must be a non-negative integer.");
  if (!isValidSplit(split)) throw new Error("Pool split must be non-negative and add up to 100%.");

  const amounts = TIERS.map((t) => Math.floor((poolCents * Math.round(split[t] * 100)) / 10000));
  let rolloverOutCents = poolCents - amounts.reduce((a, b) => a + b, 0); // rounding dust
  let unclaimedCents = 0;

  const tiers = TIERS.map((tier, i): TierPayout => {
    const winners = winnersPerTier[tier] ?? 0;
    const poolCents = amounts[i];
    if (winners === 0) {
      if (tier === rolloverTier) rolloverOutCents += poolCents;
      else unclaimedCents += poolCents;
      return { tier, poolCents, winners, prizeEachCents: 0 };
    }
    const prizeEachCents = Math.floor(poolCents / winners);
    rolloverOutCents += poolCents - prizeEachCents * winners; // split remainder
    return { tier, poolCents, winners, prizeEachCents };
  });

  return { tiers, rolloverOutCents, unclaimedCents };
}
