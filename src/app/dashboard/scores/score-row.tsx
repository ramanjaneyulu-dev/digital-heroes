"use client";
// One score in the list, with inline edit and delete.
import { useState, useActionState } from "react";
import { updateScore, deleteScore, type ScoreFormState } from "./actions";
import { SCORE_MIN, SCORE_MAX } from "@/lib/scores";

type Props = { id: string; score: number; playedOn: string; label: string; today: string };

export function ScoreRow({ id, score, playedOn, label, today }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ScoreFormState, FormData>(
    async (prev, fd) => {
      const res = await updateScore(prev, fd);
      if (res.success) setEditing(false);
      return res;
    },
    {}
  );

  if (editing) {
    return (
      <li className="rounded-xl border border-emerald-500/40 bg-zinc-900/60 p-4">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="text-sm">
            <span className="mb-1 block text-zinc-400">Score</span>
            <input name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} defaultValue={score} required
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-400">Date</span>
            <input name="played_on" type="date" max={today} defaultValue={playedOn} required
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" />
          </label>
          <button disabled={pending} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">
            Cancel
          </button>
        </form>
        {state.error && <p role="alert" className="mt-2 text-sm text-red-300">{state.error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-semibold text-emerald-300">
          {score}
        </span>
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">
          Edit
        </button>
        <form action={deleteScore}>
          <input type="hidden" name="id" value={id} />
          <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-red-300 hover:bg-zinc-800">Delete</button>
        </form>
      </div>
    </li>
  );
}
