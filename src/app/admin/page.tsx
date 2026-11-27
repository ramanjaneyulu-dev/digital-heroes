import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { AdminNav } from "@/components/admin-nav";
import {
  UsersIcon,
  CoinsIcon,
  GiftIcon,
  TrophyIcon,
  TicketIcon,
  ChartIcon,
  AlertIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  HeartHandIcon,
} from "@/components/icons";

type Overview = {
  total_users: number; new_users_30d: number; active_subscribers: number;
  revenue_cents: number; charity_cents: number; donations_cents: number;
  current_pool_cents: number; current_rollover_cents: number;
  draws_total: number; draws_published: number;
  prizes_awarded_cents: number; prizes_paid_cents: number;
  pending_reviews: number; pending_payouts: number;
};

const SURFACES = [
  { href: "/admin/users", title: "Users", text: "View and edit profiles, scores and subscriptions.", Icon: UsersIcon },
  { href: "/admin/draws", title: "Draws", text: "Configure, simulate and publish monthly draws.", Icon: TicketIcon },
  { href: "/admin/charities", title: "Charities", text: "Add, edit and remove charities, events and media.", Icon: HeartHandIcon },
  { href: "/admin/winners", title: "Winners", text: "Verify proofs and mark payouts as completed.", Icon: TrophyIcon },
  { href: "/admin/reports", title: "Reports", text: "Users, prize pool, charity totals and draw statistics.", Icon: ChartIcon },
];

export default async function AdminPage() {
  const me = await requireAdmin(); // non-admins are redirected to /dashboard
  const { data } = await createAdminClient().rpc("admin_overview");
  const o = (data ?? {}) as Partial<Overview>;
  const n = (v: number | undefined) => Number(v ?? 0);
  const pendingReviews = n(o.pending_reviews);
  const pendingPayouts = n(o.pending_payouts);

  const kpis: { label: string; value: string; hint?: string; Icon: typeof UsersIcon; accent: string }[] = [
    { label: "Total users", value: String(n(o.total_users)), hint: `${n(o.new_users_30d)} new in 30 days`, Icon: UsersIcon, accent: "emerald" },
    { label: "Active subscribers", value: String(n(o.active_subscribers)), Icon: CoinsIcon, accent: "teal" },
    { label: "Current prize pool", value: formatMoney(n(o.current_pool_cents) + n(o.current_rollover_cents)), hint: `incl. ${formatMoney(n(o.current_rollover_cents))} jackpot rollover`, Icon: TrophyIcon, accent: "gold" },
    { label: "Given to charity", value: formatMoney(n(o.charity_cents) + n(o.donations_cents)), hint: `${formatMoney(n(o.donations_cents))} from donations`, Icon: GiftIcon, accent: "emerald" },
    { label: "Prizes awarded", value: formatMoney(n(o.prizes_awarded_cents)), hint: `${formatMoney(n(o.prizes_paid_cents))} paid`, Icon: CoinsIcon, accent: "amber" },
    { label: "Draws published", value: `${n(o.draws_published)} / ${n(o.draws_total)}`, Icon: TicketIcon, accent: "teal" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Admin panel</p>
            <h1 className="text-xl font-semibold sm:text-2xl">Operations overview</h1>
            <p className="mt-1 break-token text-sm text-zinc-400">Signed in as {me.email}</p>
          </div>
          <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">← My dashboard</Link>
        </div>
        <AdminNav current="/admin" />

        {/* Action-needed banner */}
        {(pendingReviews > 0 || pendingPayouts > 0) && (
          <Link
            href="/admin/winners?status=review"
            className="alert-banner transition hover:bg-amber-500/15"
            data-tone="amber"
          >
            <AlertIcon size={18} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-sm">
              {pendingReviews} proof{pendingReviews === 1 ? "" : "s"} waiting for review · {pendingPayouts} approved payout{pendingPayouts === 1 ? "" : "s"} to mark as paid.
            </span>
            <ArrowRightIcon size={16} className="mt-0.5 text-amber-300" />
          </Link>
        )}

        {/* KPI cards */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card p-4 sm:p-5" data-accent={k.accent}>
              <span className="kpi-icon">
                <k.Icon size={18} />
              </span>
              <p className="mt-3 text-xs text-zinc-400">{k.label}</p>
              <p className="mt-0.5 break-token text-base font-semibold text-zinc-100 sm:text-2xl">{k.value}</p>
              {k.hint && <p className="mt-0.5 break-token text-xs text-zinc-500">{k.hint}</p>}
            </div>
          ))}
        </section>

        {/* Control surfaces */}
        <section className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="glass-card group flex items-start gap-3 p-4 sm:p-5 transition hover:border-emerald-500/40"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition-transform group-hover:scale-110">
                <s.Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-medium text-zinc-100">
                  {s.title}
                  <ChevronRightIcon size={14} className="text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
                <p className="mt-1 text-sm text-zinc-400">{s.text}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
