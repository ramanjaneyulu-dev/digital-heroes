"use client";

import { useActionState, useState } from "react";
import { updateCharity } from "./actions";
import { formatMoney, splitPayment } from "@/lib/money";

type Charity = { id: string; name: string; description: string | null };

export function CharityForm(props: {
  charities: Charity[]; currentId: string | null; currentPct: number;
  priceCents: number; prizeShare: number; currency: string;
}) {
  const [state, action, pending] = useActionState(updateCharity, null);
  const [charityId, setCharityId] = useState(props.currentId ?? props.charities[0]?.id ?? "");
  const [pct, setPct] = useState(Math.max(10, props.currentPct));
  const split = splitPayment(props.priceCents, pct, props.prizeShare);

  return (
    <form action={action} className="space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Your charity</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {props.charities.map((c) => (
            <label key={c.id} className={`cursor-pointer rounded-2xl border p-4 transition ${charityId === c.id ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}>
              <input type="radio" name="charityId" value={c.id} checked={charityId === c.id} onChange={() => setCharityId(c.id)} className="sr-only" />
              <span className="font-medium">{c.name}</span>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <legend className="px-2 text-sm uppercase tracking-wide text-zinc-400">Share of your fee</legend>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-semibold">{pct}%</span>
          <span className="text-sm text-zinc-400">minimum 10%</span>
        </div>
        <input type="range" name="charityPct" min={10} max={100} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))}
          aria-label="Charity percentage" className="mt-4 w-full accent-emerald-500" />
        <p className="mt-4 text-sm text-zinc-300">
          On a {formatMoney(props.priceCents, props.currency)} payment, <span className="text-emerald-300">{formatMoney(split.charityCents, props.currency)}</span> goes to your charity and <span className="text-white">{formatMoney(split.prizePoolCents, props.currency)}</span> into the prize pool.
        </p>
      </fieldset>

      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-300">{state.success}</p>}
      <button disabled={pending || !charityId} className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
