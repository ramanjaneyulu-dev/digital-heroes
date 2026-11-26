"use client";
// Add-score form (client component only so we can show pending/error state).
import { useActionState } from "react";
import { addScore, type ScoreFormState } from "./actions";
import { SCORE_MIN, SCORE_MAX } from "@/lib/scores";

export function ScoreForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ScoreFormState, FormData>(addScore, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Stableford score ({SCORE_MIN}–{SCORE_MAX})</span>
          <input
            name="score" type="number" inputMode="numeric" min={SCORE_MIN} max={SCORE_MAX} step={1} required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Date played</span>
          <input
            name="played_on" type="date" max={today} defaultValue={today} required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-emerald-300">{state.success}</p>}
      <button
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add score"}
      </button>
    </form>
  );
}
