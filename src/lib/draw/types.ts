// Shared types and constants for the draw engine.
// This folder is PURE: no database, no React, no Next.js imports (PRD §14: "draw logic isolated").

export type Tier = "match_5" | "match_4" | "match_3";
export type DrawMode = "random" | "algorithmic_common" | "algorithmic_rare";

/** Percentage of the pool per tier, e.g. { match_5: 40, match_4: 35, match_3: 25 }. Must sum to 100. */
export type PoolSplit = Record<Tier, number>;

export const TIERS: Tier[] = ["match_5", "match_4", "match_3"];
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45; // Stableford range
export const NUMBERS_PER_DRAW = 5;

export const DEFAULT_SPLIT: PoolSplit = { match_5: 40, match_4: 35, match_3: 25 };
export const DEFAULT_ROLLOVER_TIER: Tier = "match_5";

/** Random number source returning [0, 1). Injectable so tests are deterministic. */
export type Rng = () => number;

export type EntryInput = { userId: string; scores: number[] };
export type MatchedEntry = { userId: string; scores: number[]; matchCount: number; tier: Tier | null };
