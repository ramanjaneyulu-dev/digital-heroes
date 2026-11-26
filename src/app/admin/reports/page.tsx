import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { AdminNav } from "@/components/admin-nav";
import { MoneyChart, UsersChart, type MonthPoint } from "./charts";

type Monthly = { month_start: string; revenue_cents: number; charity_cents: number; prize_pool_cents: number; new_users: number };
type CharityRow = { charity_id: string; name: string; is_active: boolean; contributions_cents: number; donations_cents: number; supporters: number };
type DrawRow = { draw_id: string; label: string; draw_month: string; mode: string; status: string; pool_total_cents: number; rollover_in_cents: number; rollover_out_cents: number; entrants: number; winners: number; paid_out_cents: number };

const card = "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5";
const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-400";

// PRD §11.5: total users, total prize pool, charity contribution totals, draw statistics.
export default async function ReportsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [ov, monthly, charities, draws] = await Promise.all([
    admin.rpc("admin_overview"),
    admin.rpc("admin_monthly", { p_months: 6 }),
    admin.rpc("admin_charity_totals"),
    admin.rpc("admin_draw_stats", { p_limit: 12 }),
  ]);
  const o = (ov.data ?? {}) as Record<string, number>;
  const n = (k: string) => Number(o[k] ?? 0);

  const points: MonthPoint[] = ((monthly.data ?? []) as Monthly[]).map((m) => {
    const rev = Number(m.revenue_cents), ch = Number(m.charity_cents), pool = Number(m.prize_pool_cents);
    return {
      month: new Date(`${m.month_start}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }),
      charity: ch / 100, prizePool: pool / 100, platform: (rev - ch - pool) / 100, users: Number(m.new_users),
    };
  });
  const charityRows = (charities.data ?? []) as CharityRow[];
  const drawRows = (draws.data ?? []) as DrawRow[];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">Reports and analytics</h1>
        <AdminNav current="/admin/reports" />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["Total users", String(n("total_users"))],
            ["Active subscribers", String(n("active_subscribers"))],
            ["Total revenue", formatMoney(n("revenue_cents"))],
            ["Prize pool now", formatMoney(n("current_pool_cents") + n("current_rollover_cents"))],
            ["Charity (subscriptions)", formatMoney(n("charity_cents"))],
            ["Charity (donations)", formatMoney(n("donations_cents"))],
            ["Prizes awarded", formatMoney(n("prizes_awarded_cents"))],
            ["Prizes paid", formatMoney(n("prizes_paid_cents"))],
          ] as const).map(([l, v]) => (
            <div key={l} className={card}><p className="text-xs text-zinc-400">{l}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
          ))}
        </section>

        <section className={card}>
          <h2 className="mb-1 font-medium">Where the money goes (last 6 months)</h2>
          <p className="mb-4 text-sm text-zinc-400">Each payment is split between the subscriber&rsquo;s charity, the prize pool and the platform.</p>
          <MoneyChart data={points} />
        </section>

        <section className={card}>
          <h2 className="mb-4 font-medium">New users per month</h2>
          <UsersChart data={points} />
        </section>

        <section className={`${card} overflow-x-auto`}>
          <h2 className="mb-3 font-medium">Charity contributions</h2>
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Charity</th><th className={th}>From subscriptions</th><th className={th}>Donations</th><th className={th}>Total</th><th className={th}>Supporters</th></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {charityRows.map((c) => (
                <tr key={c.charity_id}>
                  <td className="px-3 py-2">{c.name}{!c.is_active && <span className="ml-2 text-xs text-zinc-500">(hidden)</span>}</td>
                  <td className="px-3 py-2">{formatMoney(Number(c.contributions_cents))}</td>
                  <td className="px-3 py-2">{formatMoney(Number(c.donations_cents))}</td>
                  <td className="px-3 py-2 font-medium text-emerald-300">{formatMoney(Number(c.contributions_cents) + Number(c.donations_cents))}</td>
                  <td className="px-3 py-2">{Number(c.supporters)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`${card} overflow-x-auto`}>
          <h2 className="mb-3 font-medium">Draw statistics</h2>
          {drawRows.length === 0 ? <p className="text-sm text-zinc-400">No draws yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Draw</th><th className={th}>Status</th><th className={th}>Entrants</th><th className={th}>Winners</th><th className={th}>Pool</th><th className={th}>Rolled over</th><th className={th}>Paid out</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {drawRows.map((d) => (
                  <tr key={d.draw_id}>
                    <td className="px-3 py-2">{d.label}<span className="block text-xs text-zinc-500">{d.mode.replace("_", " ")}</span></td>
                    <td className="px-3 py-2 capitalize">{d.status}</td>
                    <td className="px-3 py-2">{Number(d.entrants)}</td>
                    <td className="px-3 py-2">{Number(d.winners)}</td>
                    <td className="px-3 py-2">{formatMoney(Number(d.pool_total_cents))}</td>
                    <td className="px-3 py-2">{formatMoney(Number(d.rollover_out_cents))}</td>
                    <td className="px-3 py-2">{formatMoney(Number(d.paid_out_cents))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
