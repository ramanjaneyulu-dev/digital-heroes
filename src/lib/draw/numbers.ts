// Generating the 5 winning numbers (1-45): random, or weighted by score frequency.
import { NUMBER_MAX, NUMBER_MIN, NUMBERS_PER_DRAW, type DrawMode, type Rng } from "./types";

/** Production RNG: cryptographically strong, so draws can't be predicted. */
export function cryptoRng(): Rng {
  return () => {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0] / 4294967296;
  };
}

/** Deterministic RNG (mulberry32) for tests and reproducible simulations. */
export function seededRng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allNumbers = () =>
  Array.from({ length: NUMBER_MAX - NUMBER_MIN + 1 }, (_, i) => NUMBER_MIN + i);

/** 5 distinct numbers from 1-45, sorted. Partial Fisher-Yates shuffle: unbiased. */
export function generateRandomNumbers(rng: Rng = cryptoRng()): number[] {
  const pool = allNumbers();
  for (let i = 0; i < NUMBERS_PER_DRAW; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, NUMBERS_PER_DRAW).sort((a, b) => a - b);
}

/** How many times each number 1-45 appears across all entrants' scores. */
export function scoreFrequency(allScores: number[]): Map<number, number> {
  const freq = new Map<number, number>(allNumbers().map((n) => [n, 0]));
  for (const s of allScores) if (freq.has(s)) freq.set(s, freq.get(s)! + 1);
  return freq;
}

/**
 * Algorithmic draw, weighted by score frequency across all entrants:
 *  - algorithmic_common: frequent scores are MORE likely to be drawn.
 *  - algorithmic_rare:   frequent scores are LESS likely to be drawn.
 * Every number keeps a weight of at least 1, so any number can still come up.
 * Numbers are picked without replacement, so the 5 are always distinct.
 */
export function generateAlgorithmicNumbers(
  allScores: number[],
  mode: "algorithmic_common" | "algorithmic_rare",
  rng: Rng = cryptoRng()
): number[] {
  const freq = scoreFrequency(allScores);
  const maxFreq = Math.max(...freq.values());
  const candidates = allNumbers().map((n) => ({
    n,
    w: mode === "algorithmic_common" ? freq.get(n)! + 1 : maxFreq - freq.get(n)! + 1,
  }));

  const picked: number[] = [];
  for (let k = 0; k < NUMBERS_PER_DRAW; k++) {
    const total = candidates.reduce((sum, c) => sum + c.w, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < candidates.length - 1; idx++) {
      r -= candidates[idx].w;
      if (r < 0) break;
    }
    picked.push(candidates[idx].n);
    candidates.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}

/** Single entry point used by runDraw. With no entrants, algorithmic modes fall back to random. */
export function generateWinningNumbers(mode: DrawMode, allScores: number[], rng: Rng = cryptoRng()): number[] {
  if (mode === "random" || allScores.length === 0) return generateRandomNumbers(rng);
  return generateAlgorithmicNumbers(allScores, mode, rng);
}
