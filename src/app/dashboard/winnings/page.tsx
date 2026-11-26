import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { canUploadProof, statusLabel, type Payout, type Verification } from "@/lib/winners";
import { ProofForm } from "./proof-form";

const TIER = { match_5: "5-number match", match_4: "4-number match", match_3: "3-number match" } as Record<string, string>;

type Win = {
  id: string; draw_id: string; tier: string; prize_cents: number;
  verification: Verification; payout: Payout; admin_note: string | null;
};

export default async function WinningsPage() {
  const me = await requireUser(); // no active subscription needed: past winners can still claim

  // Read server-side with the secret client, restricted to MY id (me.id comes from the
  // logged-in session, never from the browser), so a database policy quirk can't hide my wins.
  const admin = createAdminClient();
  const { data } = await admin
    .from("winners")
    .select("id, draw_id, tier, prize_cents, verification, payout, admin_note")
    .eq("user_id", me.id)
    .order("id");
  const wins = (data ?? []) as Win[];

  // Draw labels: read server-side, only for draws I actually won.
  const labels = new Map<string, string>();
  if (wins.length) {
    const { data: draws } = await admin
      .from("draws").select("id, label").in("id", [...new Set(wins.map((w) => w.draw_id))]);
    for (const d of draws ?? []) labels.set(d.id, d.label);
  }

  const total = wins.reduce((s, w) => s + w.prize_cents, 0);
  const paid = wins.filter((w) => w.payout === "paid").reduce((s, w) => s + w.prize_cents, 0);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">← Back to dashboard</Link>
        <h1 className="text-2xl font-semibold">Your winnings</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-400">Total won</p>
            <p className="text-2xl font-semibold text-emerald-300">{formatMoney(total, "INR")}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-400">Paid out so far</p>
            <p className="text-2xl font-semibold">{formatMoney(paid, "INR")}</p>
          </div>
        </div>

        {wins.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
            No wins yet. Keep your 5 scores up to date to be in every draw.
          </p>
        ) : (
          <ul className="space-y-4">
            {wins.map((w) => (
              <li key={w.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{labels.get(w.draw_id) ?? "Draw"}</p>
                    <p className="text-sm text-zinc-400">{TIER[w.tier] ?? w.tier}</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-300">{formatMoney(w.prize_cents, "INR")}</p>
                </div>
                <p className="mt-3 inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs">{statusLabel(w.verification, w.payout)}</p>
                {w.verification === "rejected" && w.admin_note && (
                  <p className="mt-2 text-sm text-amber-300">Reviewer note: {w.admin_note}</p>
                )}
                {canUploadProof(w.verification) && <ProofForm winnerId={w.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
