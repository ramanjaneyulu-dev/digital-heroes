"use client";

import { useActionState, useState } from "react";
import { startCheckout } from "./actions";
import { formatMoney, splitPayment } from "@/lib/money";

type Plan = { id: string; name: string; price_cents: number; billing_months: number };
type Charity = { id: string; name: string; description: string | null };

export function SubscribeForm(props: {
  plans: Plan[];
  charities: Charity[];
  defaultCharityId: string | null;
  defaultPct: number;
  prizeShare: number;
  currency: string;
}) {
  const { plans, charities, prizeShare, currency } = props;
  const [state, action, pending] = useActionState(startCheckout, null);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [charityId, setCharityId] = useState(props.defaultCharityId ?? charities[0]?.id ?? "");
  const [pct, setPct] = useState(Math.max(10, props.defaultPct));

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const monthly = plans.find((p) => p.billing_months === 1);
  const split = plan ? splitPayment(plan.price_cents, pct, prizeShare) : null;

  return (
    <form action={action} className="space-y-10">
      {/* 1. Plan */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">1 · Choose your plan</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => {
            const saving =
              monthly && p.billing_months === 12
                ? Math.round((1 - p.price_cents / (monthly.price_cents * 12)) * 100)
                : 0;
            return (
              <label key={p.id} className={`cursor-pointer rounded-2xl border p-5 transition ${planId === p.id ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}>
                <input type="radio" name="planId" value={p.id} checked={planId === p.id}
                  onChange={() => setPlanId(p.id)} className="sr-only" />
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-white">{p.name}</span>
                  {saving > 0 && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">Save {saving}%</span>}
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatMoney(p.price_cents, currency)}
                  <span className="text-sm font-normal text-zinc-400"> / {p.billing_months === 12 ? "year" : "month"}</span>
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 2. Charity */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">2 · Pick the cause you will back</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {charities.map((c) => (
            <label key={c.id} className={`cursor-pointer rounded-2xl border p-4 transition ${charityId === c.id ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}>
              <input type="radio" name="charityId" value={c.id} checked={charityId === c.id}
                onChange={() => setCharityId(c.id)} className="sr-only" />
              <span className="font-medium text-white">{c.name}</span>
              {c.description && <p className="mt-1 text-sm text-zinc-400">{c.description}</p>}
            </label>
          ))}
        </div>
      </fieldset>

      {/* 3. Percentage */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">3 · How much goes to them?</legend>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-white">{pct}%</span>
            <span className="text-sm text-zinc-400">of your fee (minimum 10%)</span>
          </div>
          <input type="range" name="charityPct" min={10} max={100} step={1} value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            aria-label="Charity percentage" className="mt-4 w-full accent-emerald-500" />
          {split && plan && (
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl bg-zinc-950 p-3"><dt className="text-zinc-400">To charity</dt><dd className="mt-1 font-semibold text-emerald-400">{formatMoney(split.charityCents, currency)}</dd></div>
              <div className="rounded-xl bg-zinc-950 p-3"><dt className="text-zinc-400">Prize pool</dt><dd className="mt-1 font-semibold text-white">{formatMoney(split.prizePoolCents, currency)}</dd></div>
              <div className="rounded-xl bg-zinc-950 p-3"><dt className="text-zinc-400">Platform</dt><dd className="mt-1 font-semibold text-white">{formatMoney(split.platformCents, currency)}</dd></div>
            </dl>
          )}
        </div>
      </fieldset>

      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending || !plan || !charityId}
        className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-lg font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60">
        {pending ? "Starting checkout…" : plan ? `Continue · ${formatMoney(plan.price_cents, currency)}` : "Continue"}
      </button>
    </form>
  );
}
