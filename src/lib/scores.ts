// Pure score helpers: no database, no React. Easy to unit-test.
// The DB (CHECK, UNIQUE, trigger, RLS) is the final judge; this gives friendly early feedback.
import { z } from "zod";

export const SCORE_MIN = 1;
export const SCORE_MAX = 45; // Stableford range from the PRD
export const MAX_SCORES = 5; // rolling window kept per user

/** Today's date as YYYY-MM-DD in UTC (matches the database's current_date). */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** True only for real calendar dates such as 2026-02-28 (rejects 2026-02-31). */
function isRealDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export type ScoreInput = { score: number; played_on: string };
export type ParseResult = { ok: true; data: ScoreInput } | { ok: false; error: string };

export function parseScoreInput(
  raw: { score: unknown; played_on: unknown },
  now: Date = new Date()
): ParseResult {
  const schema = z.object({
    score: z.coerce
      .number({ message: "Enter your score as a number." })
      .int("Score must be a whole number.")
      .min(SCORE_MIN, `Score must be between ${SCORE_MIN} and ${SCORE_MAX}.`)
      .max(SCORE_MAX, `Score must be between ${SCORE_MIN} and ${SCORE_MAX}.`),
    played_on: z
      .string({ message: "Pick the date you played." })
      .refine(isRealDate, "Pick a valid date.")
      .refine((v) => v <= todayUtc(now), "The date can't be in the future."),
  });
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Invalid input." };
  return { ok: true, data: r.data };
}

/** Turn a Postgres/PostgREST error into a message a person can act on. Never leaks raw errors. */
export function friendlyScoreError(err: { code?: string; message?: string } | null): string {
  if (!err) return "Something went wrong. Please try again.";
  const msg = (err.message ?? "").toLowerCase();
  if (err.code === "23505") return "You already have a score for that date. Edit that entry instead.";
  if (msg.includes("older than")) return "That date is older than your 5 most recent scores, so it can't be added.";
  if (msg.includes("future")) return "The date can't be in the future.";
  if (err.code === "42501" || msg.includes("row-level security"))
    return "You need an active subscription to change scores.";
  if (err.code === "23514") return `Score must be between ${SCORE_MIN} and ${SCORE_MAX}.`;
  return "Couldn't save your score. Please try again.";
}
