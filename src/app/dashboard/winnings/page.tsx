import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { canUploadProof, statusLabel, type Payout, type Verification } from "@/lib/winners";
import { ProofForm } from "./proof-form";
import { ChevronLeftIcon, TrophyIcon, CoinsIcon, AlertIcon } from "@/components/icons";

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
  const needProof = wins.filter((w) => canUploadProof(w.verification)).length;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
            <TrophyIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Your winnings</h1>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="kpi-card p-4 sm:p-5" data-accent="emerald">
            <span className="kpi-icon"><CoinsIcon size={18} /></span>
            <p className="mt-3 text-xs text-zinc-400">Total won</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-300 sm:text-2xl">{formatMoney(total, "INR")}</p>
          </div>
          <div className="kpi-card p-4 sm:p-5" data-accent="gold">
            <span className="kpi-icon"><TrophyIcon size={18} /></span>
            <p className="mt-3 text-xs text-zinc-400">Paid out so far</p>
            <p className="mt-0.5 text-lg font-semibold text-zinc-100 sm:text-2xl">{formatMoney(paid, "INR")}</p>
          </div>
        </div>

        {needProof > 0 && (
          <p className="alert-banner" data-tone="amber">
            <AlertIcon size={18} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-sm">
              {needProof} win{needProof === 1 ? " needs" : "s need"} your proof screenshot. Upload it below.
            </span>
          </p>
        )}

        {wins.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
            No wins yet. Keep your 5 scores up to date to be in every draw.
          </p>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {wins.map((w) => (
              <li key={w.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-token font-medium text-zinc-100">{labels.get(w.draw_id) ?? "Draw"}</p>
                    <p className="text-sm text-zinc-400">{TIER[w.tier] ?? w.tier}</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-300">{formatMoney(w.prize_cents, "INR")}</p>
                </div>
                <p className="mt-3 inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  {statusLabel(w.verification, w.payout)}
                </p>
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
