import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { DashboardNav } from "@/components/dashboard-nav";
import { RevealBalls } from "@/components/landing/reveal-balls";

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
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">← Back to dashboard</Link>
        <h1 className="text-2xl font-semibold">Draws and my entries</h1>
        <DashboardNav current="/dashboard/draws" />

        <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
          <span className="text-zinc-400">Next draw: </span>
          {upcoming ? `${upcoming.label} (${fmtMonth(upcoming.draw_month)})` : "to be announced"}. You&rsquo;re entered automatically when your subscription is active and you have 5 scores.
        </p>

        {draws.length === 0 && <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">No draws have been published yet.</p>}

        {draws.map((d) => {
          const e = entries.get(d.id);
          const win = new Set(d.winning_numbers ?? []);
          const prize = prizes.get(d.id);
          return (
            <section key={d.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{d.label}</h2>
                <span className="text-sm text-zinc-400">{fmtMonth(d.draw_month)} · pool {formatMoney(d.pool_total_cents ?? 0)}</span>
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">Winning numbers</p>
              <div className="mt-2"><RevealBalls numbers={d.winning_numbers ?? []} matched={e ? e.scores : []} celebrate={!!e?.tier} /></div>
              {e ? (
                <>
                  <p className="mt-4 text-xs uppercase tracking-wide text-zinc-500">Your scores in this draw</p>
                  <p className="mt-1 flex flex-wrap gap-2">
                    {e.scores.map((s, i) => (
                      <span key={i} className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold ${win.has(s) ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}>{s}</span>
                    ))}
                  </p>
                  <p className="mt-3 text-sm">
                    {e.tier
                      ? <span className="text-emerald-300">You matched {e.match_count}: {TIER[e.tier]}{prize != null ? ` · prize ${formatMoney(prize)}` : ""}</span>
                      : <span className="text-zinc-400">You matched {e.match_count}. No prize this time.</span>}
                  </p>
                  {e.tier && <Link href="/dashboard/winnings" className="mt-2 inline-block text-sm text-emerald-400 hover:underline">Claim your prize →</Link>}
                </>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">You weren&rsquo;t entered: an active subscription and 5 saved scores are needed on draw day.</p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
