import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription";
import { MAX_SCORES, todayUtc } from "@/lib/scores";
import { ScoreForm } from "./score-form";
import { ScoreRow } from "./score-row";

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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">← Back to dashboard</Link>
        <h1 className="text-2xl font-semibold">Your scores</h1>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">{scores.length}/{MAX_SCORES} scores entered</span>
            <span className={scores.length === MAX_SCORES ? "text-emerald-300" : "text-amber-300"}>
              {scores.length === MAX_SCORES ? "You're ready for the draw" : `Add ${MAX_SCORES - scores.length} more to join draws`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(scores.length / MAX_SCORES) * 100}%` }} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">Add a score</h2>
          <ScoreForm today={today} />
          <p className="mt-4 text-xs text-zinc-500">
            Only your latest {MAX_SCORES} scores are kept. A new score replaces the oldest. One score per date.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Latest first</h2>
          {scores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
              No scores yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {scores.map((s) => (
                <ScoreRow key={s.id} id={s.id} score={s.score} playedOn={s.played_on} label={fmt(s.played_on)} today={today} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
