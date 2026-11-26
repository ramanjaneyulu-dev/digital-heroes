"use client";

import { useActionState, useState } from "react";
import { startDonation } from "../actions";

const PRESETS = [100, 500, 1000, 2500];

export function DonateForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(startDonation, null);
  const [amount, setAmount] = useState("500");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => setAmount(String(p))}
            className={`rounded-lg border px-3 py-1.5 text-sm ${amount === String(p) ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 hover:bg-zinc-800"}`}>
            ₹{p.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Amount (₹)</span>
        <input name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500" />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
        {pending ? "Starting…" : "Donate"}
      </button>
      <p className="text-xs text-zinc-500">A one-off gift, separate from your subscription and the prize draw.</p>
    </form>
  );
}
