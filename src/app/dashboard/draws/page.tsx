import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { DashboardNav } from "@/components/dashboard-nav";
import { RevealBalls } from "@/components/landing/reveal-balls";
import { ChevronLeftIcon, TicketIcon, TrophyIcon } from "@/components/icons";

const TIER = { match_5: "5-number match", match_4: "4-number match", match_3: "3-number match" } as Record<string, string>;
const fmtMonth = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

type Draw = { id: string; label: string; draw_month: string; mode: string; winning_numbers: number[] | null; pool_total_cents: number | null };
type Entry = { draw_id: string; match_count: number; tier: string | null; scores: number[] };

// Participation summary: every published draw and how MY five scores did in it.
export default async function MyDrawsPage() {
  const me = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: drawRows } = await supabase
    .from("draws")
    .select("id, label, draw_month, mode, winning_numbers, pool_total_cents")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);
  const draws = (drawRows ?? []) as Draw[];
  const ids = draws.map((d) => d.id);

  const [{ data: entryRows }, { data: winRows }, { data: upcoming }] = await Promise.all([
    ids.length ? supabase.from("draw_entries").select("draw_id, match_count, tier, scores").eq("user_id", me.id).in("draw_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("winners").select("draw_id, prize_cents").eq("user_id", me.id).in("draw_id", ids) : Promise.resolve({ data: [] }),
    admin.from("draws").select("label, draw_month").in("status", ["draft", "simulated"]).order("draw_month").limit(1).maybeSingle(),
  ]);
  const entries = new Map(((entryRows ?? []) as Entry[]).map((e) => [e.draw_id, e]));
  const prizes = new Map(((winRows ?? []) as { draw_id: string; prize_cents: number }[]).map((w) => [w.draw_id, w.prize_cents]));

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <TicketIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Draws and my entries</h1>
        </div>
        <DashboardNav current="/dashboard/draws" />

        {upcoming && (
          <p className="alert-banner" data-tone="emerald">
            <TicketIcon size={18} className="mt-0.5 text-emerald-300" />
            <span className="flex-1 text-sm">
              Next draw: <span className="text-zinc-100">{upcoming.label}</span> ({fmtMonth(upcoming.draw_month)}).
              You&apos;re entered automatically when your subscription is active and you have 5 scores.
            </span>
          </p>
        )}

        {draws.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
            No draws have been published yet.
          </p>
        )}

        {draws.map((d) => {
          const e = entries.get(d.id);
          const win = new Set(d.winning_numbers ?? []);
          const prize = prizes.get(d.id);
          return (
            <section key={d.id} className="glass-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium text-zinc-100">{d.label}</h2>
                <span className="break-token text-xs text-zinc-400 sm:text-sm">
                  {fmtMonth(d.draw_month)} · pool {formatMoney(d.pool_total_cents ?? 0)}
                </span>
              </div>
              <p className="mt-3 eyebrow">Winning numbers</p>
              <div className="mt-2">
                <RevealBalls numbers={d.winning_numbers ?? []} matched={e ? e.scores : []} celebrate={!!e?.tier} />
              </div>
              {e ? (
                <>
                  <p className="mt-4 eyebrow">Your scores in this draw</p>
                  <p className="mt-1 flex flex-wrap gap-2">
                    {e.scores.map((s, i) => (
                      <span
                        key={i}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                          win.has(s)
                            ? "bg-emerald-500 text-zinc-950 ring-2 ring-amber-300"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm">
                    {e.tier ? (
                      <>
                        <TrophyIcon size={14} className="text-amber-300" />
                        <span className="text-emerald-300">
                          You matched {e.match_count}: {TIER[e.tier]}
                          {prize != null ? ` · prize ${formatMoney(prize)}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-400">You matched {e.match_count}. No prize this time.</span>
                    )}
                  </p>
                  {e.tier && (
                    <Link href="/dashboard/winnings" className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
                      Claim your prize →
                    </Link>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">
                  You weren&apos;t entered: an active subscription and 5 saved scores are needed on draw day.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
