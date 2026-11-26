import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { AdminNav } from "@/components/admin-nav";

type Overview = {
  total_users: number; new_users_30d: number; active_subscribers: number;
  revenue_cents: number; charity_cents: number; donations_cents: number;
  current_pool_cents: number; current_rollover_cents: number;
  draws_total: number; draws_published: number;
  prizes_awarded_cents: number; prizes_paid_cents: number;
  pending_reviews: number; pending_payouts: number;
};

const SURFACES = [
  { href: "/admin/users", title: "Users", text: "View and edit profiles, scores and subscriptions." },
  { href: "/admin/draws", title: "Draws", text: "Configure, simulate and publish monthly draws." },
  { href: "/admin/charities", title: "Charities", text: "Add, edit and remove charities, events and media." },
  { href: "/admin/winners", title: "Winners", text: "Verify proofs and mark payouts as completed." },
  { href: "/admin/reports", title: "Reports", text: "Users, prize pool, charity totals and draw statistics." },
];

export default async function AdminPage() {
  const me = await requireAdmin(); // non-admins are redirected to /dashboard
  const { data } = await createAdminClient().rpc("admin_overview");
  const o = (data ?? {}) as Partial<Overview>;
  const n = (v: number | undefined) => Number(v ?? 0);
  const todo = n(o.pending_reviews) + n(o.pending_payouts);

  const stats: [string, string, string?][] = [
    ["Total users", String(n(o.total_users)), `${n(o.new_users_30d)} new in 30 days`],
    ["Active subscribers", String(n(o.active_subscribers))],
    ["Current prize pool", formatMoney(n(o.current_pool_cents) + n(o.current_rollover_cents)), `incl. ${formatMoney(n(o.current_rollover_cents))} jackpot rollover`],
    ["Given to charity", formatMoney(n(o.charity_cents) + n(o.donations_cents)), `${formatMoney(n(o.donations_cents))} from donations`],
    ["Prizes awarded", formatMoney(n(o.prizes_awarded_cents)), `${formatMoney(n(o.prizes_paid_cents))} paid`],
    ["Draws published", `${n(o.draws_published)} / ${n(o.draws_total)}`],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Admin panel</h1>
            <p className="mt-1 text-sm text-zinc-400">Signed in as {me.email}</p>
          </div>
          <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">← My dashboard</Link>
        </div>
        <AdminNav current="/admin" />

        {todo > 0 && (
          <Link href="/admin/winners?status=review" className="block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 hover:bg-amber-500/15">
            {n(o.pending_reviews)} proof{n(o.pending_reviews) === 1 ? "" : "s"} waiting for review · {n(o.pending_payouts)} approved payout{n(o.pending_payouts) === 1 ? "" : "s"} to mark as paid →
          </Link>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(([label, value, hint]) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
              {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-emerald-500/50">
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{s.text}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
