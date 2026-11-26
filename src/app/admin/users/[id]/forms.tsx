"use client";
// Small interactive forms for the admin user page.
import { useActionState, useState } from "react";
import { adminAddScore, adminDeleteScore, adminUpdateScore, updateProfile, type AdminFormState } from "./actions";
import { SCORE_MAX, SCORE_MIN } from "@/lib/scores";

const input = "rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500";

export function ProfileForm(props: {
  userId: string; fullName: string; charityId: string; charityPct: number; role: string; isSelf: boolean;
  charities: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateProfile, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="userId" value={props.userId} />
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Full name</span>
        <input name="full_name" defaultValue={props.fullName} className={`w-full ${input}`} /></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Role</span>
        <select name="role" defaultValue={props.role} className={`w-full ${input}`}>
          <option value="subscriber">Subscriber</option><option value="admin">Admin</option>
        </select>{props.isSelf && <span className="mt-1 block text-xs text-zinc-500">This is you: you can&rsquo;t remove your own admin role.</span>}</label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Charity</span>
        <select name="charity_id" defaultValue={props.charityId} className={`w-full ${input}`}>
          <option value="">None</option>
          {props.charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Charity share (%, min 10)</span>
        <input name="charity_pct" type="number" min={10} max={100} step="0.5" defaultValue={props.charityPct} className={`w-full ${input}`} /></label>
      <div className="sm:col-span-2">
        {state?.error && <p role="alert" className="mb-2 text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="mb-2 text-sm text-emerald-300">{state.success}</p>}
        <button disabled={pending} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">{pending ? "Saving…" : "Save profile"}</button>
      </div>
    </form>
  );
}

export function AddScoreForm({ userId, today }: { userId: string; today: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(adminAddScore, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="userId" value={userId} />
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Score</span>
        <input name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} required className={`w-24 ${input}`} /></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Date</span>
        <input name="played_on" type="date" max={today} defaultValue={today} required className={input} /></label>
      <button disabled={pending} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">{pending ? "Adding…" : "Add score"}</button>
      {state?.error && <p role="alert" className="w-full text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-300">{state.success}</p>}
    </form>
  );
}

export function ScoreRowAdmin({ userId, id, score, playedOn, label, today }: { userId: string; id: string; score: number; playedOn: string; label: string; today: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<AdminFormState, FormData>(async (prev, fd) => {
    const res = await adminUpdateScore(prev, fd);
    if (res?.success) setEditing(false);
    return res;
  }, null);

  if (editing) {
    return (
      <li className="rounded-xl border border-emerald-500/40 bg-zinc-900/60 p-3">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="userId" value={userId} /><input type="hidden" name="id" value={id} />
          <input name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} defaultValue={score} required className={`w-24 ${input}`} aria-label="Score" />
          <input name="played_on" type="date" max={today} defaultValue={playedOn} required className={input} aria-label="Date" />
          <button disabled={pending} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Cancel</button>
        </form>
        {state?.error && <p role="alert" className="mt-2 text-sm text-red-400">{state.error}</p>}
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5">
      <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-emerald-300">{score}</span><span className="text-sm text-zinc-300">{label}</span></span>
      <span className="flex gap-2">
        <button onClick={() => setEditing(true)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800">Edit</button>
        <form action={adminDeleteScore}><input type="hidden" name="userId" value={userId} /><input type="hidden" name="id" value={id} />
          <button className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-red-300 hover:bg-zinc-800">Delete</button></form>
      </span>
    </li>
  );
}
