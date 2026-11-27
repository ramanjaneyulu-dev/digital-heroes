import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { todayUtc } from "@/lib/scores";
import { AdminNav } from "@/components/admin-nav";
import { subscriptionAction } from "./actions";
import { AddScoreForm, ProfileForm, ScoreRowAdmin } from "./forms";
import {
  ChevronLeftIcon,
  UsersIcon,
  CreditCardIcon,
  ScoreCardIcon,
  CoinsIcon,
  TrophyIcon,
  AlertIcon,
} from "@/components/icons";

const h2 = "mb-4 text-sm uppercase tracking-wide text-zinc-400";
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const SUB_STATUS_TONE: Record<string, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  inactive: "border-zinc-700 bg-zinc-800/50 text-zinc-400",
  lapsed: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  canceled: "border-red-500/40 bg-red-500/10 text-red-300",
  past_due: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();

  const { data: user } = await admin.from("profiles").select("id, full_name, email, role, charity_id, charity_pct, created_at").eq("id", id).maybeSingle();
  if (!user) notFound();

  const [{ data: sub }, { data: scores }, { data: pays }, { data: wins }, { data: charities }] = await Promise.all([
    admin.from("subscriptions").select("status, plan_id, current_period_end, cancel_at_period_end").eq("user_id", id).maybeSingle(),
    admin.from("scores").select("id, score, played_on").eq("user_id", id).order("played_on", { ascending: false }).limit(5),
    admin.from("payments").select("id, kind, amount_cents, charity_cents, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("winners").select("id, tier, prize_cents, verification, payout").eq("user_id", id).order("id"),
    admin.from("charities").select("id, name").order("name"),
  ]);

  const ended = sub?.status === "active" && sub.current_period_end && new Date(sub.current_period_end).getTime() <= Date.now();
  const status = ended ? "lapsed" : (sub?.status ?? "inactive");
  const today = todayUtc();
  const btn = "rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800";

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> All users
        </Link>

        {/* Header card */}
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <UsersIcon size={22} />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold sm:text-2xl">{user.full_name || user.email}</h1>
              <p className="break-token text-sm text-zinc-400">{user.email} · joined {fmt(user.created_at)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs capitalize ${SUB_STATUS_TONE[status] ?? SUB_STATUS_TONE.inactive}`}>
            {status}
          </span>
        </div>
        <AdminNav current="/admin/users" />

        {/* Action needed banner when sub is lapsed/past_due */}
        {(status === "lapsed" || status === "past_due") && (
          <p className="alert-banner" data-tone="amber">
            <AlertIcon size={18} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-sm">
              This subscriber&apos;s access {status === "lapsed" ? "has lapsed" : "is past due"}. Grant access, mark inactive, or let them renew.
            </span>
          </p>
        )}

        {/* Profile */}
        <section className="glass-card p-5 sm:p-6">
          <h2 className={h2}>Profile and charity</h2>
          <ProfileForm
            userId={user.id}
            fullName={user.full_name ?? ""}
            charityId={user.charity_id ?? ""}
            charityPct={Number(user.charity_pct)}
            role={user.role}
            isSelf={user.id === me.id}
            charities={(charities ?? []) as { id: string; name: string }[]}
          />
        </section>

        {/* Subscription */}
        <section className="glass-card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <CreditCardIcon size={14} className="text-emerald-300" />
            <h2 className={h2.replace("mb-4", "")}>Subscription</h2>
          </div>
          <p className="break-token capitalize text-zinc-100">
            {status}
            {sub?.plan_id ? ` · ${sub.plan_id} plan` : ""}
            {sub?.cancel_at_period_end && status === "active" ? " · set to cancel" : ""}
          </p>
          <p className="mb-4 mt-1 text-sm text-zinc-400">Paid until {fmt(sub?.current_period_end ?? null)}</p>
          <div className="flex flex-wrap gap-2">
            {([["grant_month", "Grant 1 month"], ["grant_year", "Grant 1 year"], ["cancel_now", "Cancel now"], ["deactivate", "Mark inactive"]] as const).map(([op, label]) => (
              <form key={op} action={subscriptionAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="op" value={op} />
                <button className={`${btn} ${op === "cancel_now" || op === "deactivate" ? "text-red-300" : ""}`}>
                  {label}
                </button>
              </form>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Granting access is complimentary: no payment is recorded and it adds nothing to the prize pool.
          </p>
        </section>

        {/* Scores */}
        <section className="glass-card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <ScoreCardIcon size={14} className="text-emerald-300" />
            <h2 className={h2.replace("mb-4", "")}>Golf scores ({(scores ?? []).length}/5)</h2>
          </div>
          <ul className="mb-5 space-y-2">
            {(scores ?? []).length === 0 && <li className="text-sm text-zinc-400">No scores yet.</li>}
            {((scores ?? []) as { id: string; score: number; played_on: string }[]).map((s) => (
              <ScoreRowAdmin key={s.id} userId={user.id} id={s.id} score={s.score} playedOn={s.played_on} label={fmtDay(s.played_on)} today={today} />
            ))}
          </ul>
          <AddScoreForm userId={user.id} today={today} />
          <p className="mt-3 text-xs text-zinc-500">
            The same rules apply as for subscribers: one score per date, only the latest 5 are kept.
          </p>
        </section>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          {/* Payments */}
          <section className="glass-card p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <CoinsIcon size={14} className="text-emerald-300" />
              <h2 className={h2.replace("mb-4", "")}>Payments</h2>
            </div>
            {(pays ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">No payments.</p>
            ) : (
              <ul className="divide-y divide-white/5 text-sm">
                {((pays ?? []) as { id: string; kind: string; amount_cents: number; charity_cents: number; created_at: string }[]).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="break-token">
                      {fmt(p.created_at)} <span className="ml-1 text-zinc-500">{p.kind}</span>
                    </span>
                    <span className="break-token">{formatMoney(p.amount_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Winnings */}
          <section className="glass-card p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <TrophyIcon size={14} className="text-amber-300" />
              <h2 className={h2.replace("mb-4", "")}>Winnings</h2>
            </div>
            {(wins ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">No wins.</p>
            ) : (
              <ul className="divide-y divide-white/5 text-sm">
                {((wins ?? []) as { id: string; tier: string; prize_cents: number; verification: string; payout: string }[]).map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="break-token">
                      {w.tier.replace("match_", "")}-number match
                      <span className="ml-1 text-zinc-500">· {w.payout === "paid" ? "paid" : w.verification}</span>
                    </span>
                    <span className="break-token">{formatMoney(w.prize_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/winners" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
              Open winners →
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
