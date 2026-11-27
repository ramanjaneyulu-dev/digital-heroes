import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription";
import { MAX_SCORES, todayUtc } from "@/lib/scores";
import { ScoreForm } from "./score-form";
import { ScoreRow } from "./score-row";
import { ChevronLeftIcon, ScoreCardIcon, CheckIcon } from "@/components/icons";

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ScoresPage() {
  const profile = await requireUser();
  await requireActiveSubscription(profile.id); // non-subscribers are sent to /subscribe

  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("id, score, played_on")
    .eq("user_id", profile.id)
    .order("played_on", { ascending: false }) // most recent first (PRD §05)
    .limit(MAX_SCORES);
  const scores = data ?? [];
  const today = todayUtc();
  const ready = scores.length === MAX_SCORES;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <ScoreCardIcon size={18} />
          </span>
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Your scores</h1>
            <p className="text-sm text-zinc-400">Stableford format · range 1–45 · latest five retained</p>
          </div>
        </div>

        {/* Progress tracker */}
        <section className="glass-card p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">{scores.length}/{MAX_SCORES} scores entered</span>
            <span className={`inline-flex items-center gap-1 ${ready ? "text-emerald-300" : "text-amber-300"}`}>
              {ready ? <><CheckIcon size={14} /> You&apos;re ready for the draw</> : `Add ${MAX_SCORES - scores.length} more to join draws`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${(scores.length / MAX_SCORES) * 100}%` }}
            />
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">Add a score</h2>
          <ScoreForm today={today} />
          <p className="mt-4 text-xs text-zinc-500">
            Only your latest {MAX_SCORES} scores are kept. A new score replaces the oldest. One score per date.
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-3">Latest first</h2>
          {scores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
              No scores yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {scores.map((s) => (
                <ScoreRow
                  key={s.id}
                  id={s.id}
                  score={s.score}
                  playedOn={s.played_on}
                  label={fmt(s.played_on)}
                  today={today}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
