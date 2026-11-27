import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { AdminNav } from "@/components/admin-nav";
import { MoneyChart, UsersChart, type MonthPoint } from "./charts";
import { ChartIcon, UsersIcon, CoinsIcon, GiftIcon, TrophyIcon, TicketIcon } from "@/components/icons";

type Monthly = { month_start: string; revenue_cents: number; charity_cents: number; prize_pool_cents: number; new_users: number };
type CharityRow = { charity_id: string; name: string; is_active: boolean; contributions_cents: number; donations_cents: number; supporters: number };
type DrawRow = { draw_id: string; label: string; draw_month: string; mode: string; status: string; pool_total_cents: number; rollover_in_cents: number; rollover_out_cents: number; entrants: number; winners: number; paid_out_cents: number };

const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-400";
const td = "px-3 py-2 break-token";

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

  const kpis: { label: string; value: string; Icon: typeof UsersIcon; accent: string }[] = [
    { label: "Total users", value: String(n("total_users")), Icon: UsersIcon, accent: "emerald" },
    { label: "Active subscribers", value: String(n("active_subscribers")), Icon: TicketIcon, accent: "teal" },
    { label: "Total revenue", value: formatMoney(n("revenue_cents")), Icon: CoinsIcon, accent: "gold" },
    { label: "Prize pool now", value: formatMoney(n("current_pool_cents") + n("current_rollover_cents")), Icon: TrophyIcon, accent: "gold" },
    { label: "Charity (subscriptions)", value: formatMoney(n("charity_cents")), Icon: GiftIcon, accent: "emerald" },
    { label: "Charity (donations)", value: formatMoney(n("donations_cents")), Icon: GiftIcon, accent: "teal" },
    { label: "Prizes awarded", value: formatMoney(n("prizes_awarded_cents")), Icon: TrophyIcon, accent: "amber" },
    { label: "Prizes paid", value: formatMoney(n("prizes_paid_cents")), Icon: TrophyIcon, accent: "emerald" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <ChartIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Reports and analytics</h1>
        </div>
        <AdminNav current="/admin/reports" />

        {/* KPI cards */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card p-4 sm:p-5" data-accent={k.accent}>
              <span className="kpi-icon"><k.Icon size={18} /></span>
              <p className="mt-3 text-xs text-zinc-400">{k.label}</p>
              <p className="mt-0.5 break-token text-base font-semibold text-zinc-100 sm:text-xl">{k.value}</p>
            </div>
          ))}
        </section>

        <section className="glass-card p-5 sm:p-6">
          <h2 className="mb-1 font-medium text-zinc-100">Where the money goes (last 6 months)</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Each payment is split between the subscriber&apos;s charity, the prize pool and the platform.
          </p>
          <MoneyChart data={points} />
        </section>

        <section className="glass-card p-5 sm:p-6">
          <h2 className="mb-4 font-medium text-zinc-100">New users per month</h2>
          <UsersChart data={points} />
        </section>

        <section className="glass-card overflow-x-auto p-5 sm:p-6">
          <h2 className="mb-3 font-medium text-zinc-100">Charity contributions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Charity</th>
                <th className={th}>From subscriptions</th>
                <th className={th}>Donations</th>
                <th className={th}>Total</th>
                <th className={th}>Supporters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {charityRows.map((c) => (
                <tr key={c.charity_id}>
                  <td className={td}>
                    {c.name}
                    {!c.is_active && <span className="ml-2 text-xs text-zinc-500">(hidden)</span>}
                  </td>
                  <td className={td}>{formatMoney(Number(c.contributions_cents))}</td>
                  <td className={td}>{formatMoney(Number(c.donations_cents))}</td>
                  <td className={`${td} font-medium text-emerald-300`}>
                    {formatMoney(Number(c.contributions_cents) + Number(c.donations_cents))}
                  </td>
                  <td className={td}>{Number(c.supporters)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="glass-card overflow-x-auto p-5 sm:p-6">
          <h2 className="mb-3 font-medium text-zinc-100">Draw statistics</h2>
          {drawRows.length === 0 ? (
            <p className="text-sm text-zinc-400">No draws yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Draw</th>
                  <th className={th}>Status</th>
                  <th className={th}>Entrants</th>
                  <th className={th}>Winners</th>
                  <th className={th}>Pool</th>
                  <th className={th}>Rolled over</th>
                  <th className={th}>Paid out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drawRows.map((d) => (
                  <tr key={d.draw_id}>
                    <td className={td}>
                      {d.label}
                      <span className="block break-token text-xs text-zinc-500">{d.mode.replace("_", " ")}</span>
                    </td>
                    <td className={`${td} capitalize`}>{d.status}</td>
                    <td className={td}>{Number(d.entrants)}</td>
                    <td className={td}>{Number(d.winners)}</td>
                    <td className={td}>{formatMoney(Number(d.pool_total_cents))}</td>
                    <td className={td}>{formatMoney(Number(d.rollover_out_cents))}</td>
                    <td className={td}>{formatMoney(Number(d.paid_out_cents))}</td>
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
