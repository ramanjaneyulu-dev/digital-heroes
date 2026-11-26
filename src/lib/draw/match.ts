// Comparing one entrant's scores with the winning numbers.
import type { Tier } from "./types";

/**
 * Matches are counted on the DISTINCT values of the user's scores, so scoring 30 twice
 * can never count as two matches. Fewer than 3 matches = no prize (tier null).
 */
export function matchEntry(winning: number[], userScores: number[]): { matchCount: number; tier: Tier | null } {
  const win = new Set(winning);
  const matchCount = [...new Set(userScores)].filter((s) => win.has(s)).length;
  const tier: Tier | null = matchCount >= 5 ? "match_5" : matchCount === 4 ? "match_4" : matchCount === 3 ? "match_3" : null;
  return { matchCount, tier };
}
