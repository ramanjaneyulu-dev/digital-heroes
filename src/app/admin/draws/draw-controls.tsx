"use client";
import { useActionState } from "react";
import { simulateAction, publishAction, type DrawActionState } from "./actions";
import { formatMoney } from "@/lib/money";

const TIER_LABEL = { match_5: "5 numbers", match_4: "4 numbers", match_3: "3 numbers" } as const;

export function DrawControls({ id, status }: { id: string; status: string }) {
  const [sim, simAction, simPending] = useActionState<DrawActionState, FormData>(simulateAction, {});
  const [pub, pubAction, pubPending] = useActionState<DrawActionState, FormData>(publishAction, {});
  const shown = pub.result ?? sim.result;
  const error = pub.error ?? sim.error;

  return (
    <div className="mt-4 space-y-3">
      {status !== "published" && (
        <div className="flex flex-wrap gap-3">
          <form action={simAction}>
            <input type="hidden" name="id" value={id} />
            <button disabled={simPending} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-60">
              {simPending ? "Simulating…" : "Run simulation"}
            </button>
          </form>
          {status === "simulated" && (
            <form action={pubAction}>
              <input type="hidden" name="id" value={id} />
              <button disabled={pubPending} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
                {pubPending ? "Publishing…" : "Publish (final)"}
              </button>
            </form>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {pub.published && <p className="text-sm text-emerald-300">Published. Results are now final.</p>}
      {shown && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
          <p className="mb-2 text-zinc-400">{pub.published ? "Final result" : "Simulation preview (nothing is final)"}</p>
          <p className="mb-3 flex gap-2">
            {shown.winningNumbers.map((n) => (
              <span key={n} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-emerald-300">{n}</span>
            ))}
          </p>
          <p className="text-zinc-400">
            Entrants: {shown.entrants} · Pool: {formatMoney(shown.totalPoolCents, "INR")} (incl. rollover in {formatMoney(shown.rolloverInCents, "INR")})
          </p>
          <ul className="mt-2 space-y-1">
            {shown.tiers.map((t) => (
              <li key={t.tier}>
                {TIER_LABEL[t.tier]}: {t.winners} winner(s) · tier pool {formatMoney(t.poolCents, "INR")} · each {formatMoney(t.prizeEachCents, "INR")}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-amber-300">Rolls over to next draw: {formatMoney(shown.rolloverOutCents, "INR")}</p>
        </div>
      )}
    </div>
  );
}
