import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getSubscriptionState } from "@/lib/subscription";
import { isDemoMode } from "@/lib/payments";
import { formatMoney } from "@/lib/money";
import { DashboardNav } from "@/components/dashboard-nav";
import { logout } from "@/app/(auth)/actions";
import { cancelSubscription, resumeSubscription, demoRenew, demoLapse } from "./actions";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const fmtMonth = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-zinc-700/40 text-zinc-300",
  lapsed: "bg-amber-500/15 text-amber-300",
  canceled: "bg-red-500/15 text-red-300",
  past_due: "bg-amber-500/15 text-amber-300",
};
const TIER = { match_5: "5-number match", match_4: "4-number match", match_3: "3-number match" } as Record<string, string>;
const card = "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6";
const h2 = "mb-3 text-sm uppercase tracking-wide text-zinc-400";

type Win = { prize_cents: number; payout: string; verification: string };
type Pay = { id: string; kind: string; amount_cents: number; charity_cents: number; created_at: string };

// The subscriber's home: every module the PRD (§10) asks for on one page.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ subscribed?: string }> }) {
  const { subscribed } = await searchParams;
  const [me, settings] = await Promise.all([requireUser(), getSettings()]);
  const sub = await getSubscriptionState(me.id);

  const supabase = await createClient();
  const admin = createAdminClient();

  const [plan, charity, scoresRes, entriesRes, lastDrawRes, upcomingRes, winsRes, paysRes, donsRes] = await Promise.all([
    sub.planId ? supabase.from("plans").select("name, price_cents, billing_months").eq("id", sub.planId).maybeSingle() : Promise.resolve({ data: null }),
    me.charity_id ? supabase.from("charities").select("name, slug").eq("id", me.charity_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("scores").select("score, played_on").eq("user_id", me.id).order("played_on", { ascending: false }).limit(5),
    supabase.from("draw_entries").select("id", { count: "exact", head: true }).eq("user_id", me.id),
    supabase.from("draws").select("id, label, winning_numbers").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
    // Upcoming draws are hidden from users by RLS, so read just the label and month on the server.
    admin.from("draws").select("label, draw_month").in("status", ["draft", "simulated"]).order("draw_month").limit(1).maybeSingle(),
    admin.from("winners").select("prize_cents, payout, verification").eq("user_id", me.id),
    supabase.from("payments").select("id, kind, amount_cents, charity_cents, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(1000),
    supabase.from("donations").select("amount_cents").eq("user_id", me.id).eq("status", "paid"),
  ]);

  const scores = (scoresRes.data ?? []) as { score: number; played_on: string }[];
  const wins = (winsRes.data ?? []) as Win[];
  const pays = (paysRes.data ?? []) as Pay[];
  const lastDraw = lastDrawRes.data as { id: string; label: string; winning_numbers: number[] | null } | null;
  const upcoming = upcomingRes.data as { label: string; draw_month: string } | null;

  const myLast = lastDraw
    ? ((await supabase.from("draw_entries").select("match_count, tier").eq("draw_id", lastDraw.id).eq("user_id", me.id).maybeSingle()).data as { match_count: number; tier: string | null } | null)
    : null;

  const totalWon = wins.reduce((s, w) => s + w.prize_cents, 0);
  const paidOut = wins.filter((w) => w.payout === "paid").reduce((s, w) => s + w.prize_cents, 0);
  const needProof = wins.filter((w) => w.verification === "none" || w.verification === "rejected").length;
  const given =
    pays.reduce((s, p) => s + p.charity_cents, 0) +
    ((donsRes.data ?? []) as { amount_cents: number }[]).reduce((s, d) => s + d.amount_cents, 0);
  const money = (c: number) => formatMoney(c, settings.currency);
  const ready = scores.length === 5;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">Digital Heroes</Link>
            <h1 className="text-2xl font-semibold">Hello, {me.full_name || me.email}</h1>
          </div>
          <form action={logout}>
            <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">Log out</button>
          </form>
        </header>
        <DashboardNav current="/dashboard" />

        {subscribed && sub.isActive && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            You&rsquo;re in! Your subscription is active and your charity contribution is set.
          </p>
        )}

        {/* Headline numbers */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className={card}><p className="text-xs text-zinc-400">Subscription</p>
            <p className="mt-1 text-lg font-semibold capitalize">{sub.cancelAtPeriodEnd && sub.isActive ? "Ending soon" : sub.status.replace("_", " ")}</p></div>
          <div className={card}><p className="text-xs text-zinc-400">Draws entered</p>
            <p className="mt-1 text-lg font-semibold">{entriesRes.count ?? 0}</p></div>
          <div className={card}><p className="text-xs text-zinc-400">Total won</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{money(totalWon)}</p></div>
          <div className={card}><p className="text-xs text-zinc-400">Given to charity</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{money(given)}</p></div>
        </section>

        {/* Subscription */}
        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400">Subscription</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[sub.status] ?? STATUS_STYLE.inactive}`}>
              {sub.cancelAtPeriodEnd && sub.isActive ? "Ending soon" : sub.status.replace("_", " ")}
            </span>
          </div>
          {sub.isActive ? (
            <div className="mt-4 space-y-4">
              <p className="text-lg">
                {plan.data?.name ?? sub.planId} plan
                {plan.data && <span className="text-zinc-400"> · {money(plan.data.price_cents)} / {plan.data.billing_months === 12 ? "year" : "month"}</span>}
              </p>
              <p className="text-sm text-zinc-400">
                {sub.cancelAtPeriodEnd ? "Access ends on " : "Renews on "}
                <span className="text-zinc-100">{fmtDate(sub.currentPeriodEnd)}</span>
              </p>
              <form action={sub.cancelAtPeriodEnd ? resumeSubscription : cancelSubscription}>
                <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">
                  {sub.cancelAtPeriodEnd ? "Keep my subscription" : "Cancel subscription"}
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-zinc-300">
                {sub.status === "lapsed" && `Your plan ended on ${fmtDate(sub.currentPeriodEnd)}. Renew to keep entering scores and draws.`}
                {sub.status === "canceled" && `Your plan ended on ${fmtDate(sub.currentPeriodEnd)}. Come back any time.`}
                {sub.status === "inactive" && "Subscribe to enter your scores, join the monthly draw and fund a charity."}
                {sub.status === "past_due" && "Your last payment failed. Please renew."}
              </p>
              <Link href="/subscribe" className="inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">
                {sub.status === "inactive" ? "Subscribe" : "Renew"}
              </Link>
            </div>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Scores */}
          <section className={card}>
            <h2 className={h2}>Your latest scores</h2>
            {scores.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {scores.map((s) => (
                  <li key={s.played_on} className="rounded-xl bg-zinc-950 px-3 py-2 text-center">
                    <p className="text-lg font-semibold">{s.score}</p>
                    <p className="text-xs text-zinc-500">{new Date(`${s.played_on}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-zinc-400">No scores yet.</p>}
            <p className={`mt-3 text-sm ${ready ? "text-emerald-300" : "text-amber-300"}`}>
              {ready ? "5 of 5: you're in every draw." : `${scores.length} of 5: add ${5 - scores.length} more to join draws.`}
            </p>
            {sub.isActive
              ? <Link href="/dashboard/scores" className="mt-3 inline-block text-emerald-400 hover:underline">Enter or edit scores →</Link>
              : <p className="mt-3 text-sm text-zinc-500">Scores unlock when your subscription is active.</p>}
          </section>

          {/* Participation */}
          <section className={card}>
            <h2 className={h2}>Draws</h2>
            <p className="text-sm text-zinc-400">Next draw</p>
            <p className="mb-4">{upcoming ? `${upcoming.label} · ${fmtMonth(upcoming.draw_month)}` : "To be announced"}</p>
            <p className="text-sm text-zinc-400">Latest result</p>
            {lastDraw ? (
              <>
                <p className="mb-1">{lastDraw.label}</p>
                <p className="flex gap-1.5">
                  {(lastDraw.winning_numbers ?? []).map((n) => (
                    <span key={n} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300">{n}</span>
                  ))}
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {myLast ? (myLast.tier ? `You matched ${myLast.match_count}: ${TIER[myLast.tier]}!` : `You matched ${myLast.match_count}. No prize this time.`) : "You weren't entered in this draw."}
                </p>
              </>
            ) : <p className="text-zinc-400">No draws published yet.</p>}
            <Link href="/dashboard/draws" className="mt-3 inline-block text-emerald-400 hover:underline">All draws and my entries →</Link>
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Winnings */}
          <section className={card}>
            <h2 className={h2}>Winnings</h2>
            <p className="text-2xl font-semibold text-emerald-300">{money(totalWon)}</p>
            <p className="text-sm text-zinc-400">{money(paidOut)} paid out · {wins.length} win{wins.length === 1 ? "" : "s"}</p>
            {needProof > 0 && <p className="mt-2 rounded-lg bg-amber-400/10 px-3 py-2 text-sm text-amber-300">{needProof} win{needProof === 1 ? " needs" : "s need"} your proof screenshot.</p>}
            <Link href="/dashboard/winnings" className="mt-3 inline-block text-emerald-400 hover:underline">View winnings and upload proof →</Link>
          </section>

          {/* Charity */}
          <section className={card}>
            <h2 className={h2}>Your charity</h2>
            {charity.data ? (
              <p>{charity.data.name} <span className="text-emerald-400">· {Number(me.charity_pct)}% of your fee</span></p>
            ) : <p className="text-zinc-400">You will choose a charity when you subscribe.</p>}
            <p className="mt-1 text-sm text-zinc-400">Given so far: {money(given)}</p>
            <div className="mt-3 flex gap-4 text-sm">
              <Link href="/dashboard/charity" className="text-emerald-400 hover:underline">Change charity or %</Link>
              <Link href="/charities" className="text-emerald-400 hover:underline">Browse charities</Link>
            </div>
          </section>
        </div>

        {/* Payment history */}
        <section className={card}>
          <h2 className={h2}>Payment history</h2>
          {pays.length === 0 ? <p className="text-zinc-400">No payments yet.</p> : (
            <ul className="divide-y divide-zinc-800 text-sm">
              {pays.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span>{fmtDate(p.created_at)} <span className="ml-2 text-zinc-500">{p.kind === "renewal" ? "Renewal" : "Subscription"}</span></span>
                  <span>{money(p.amount_cents)} <span className="text-emerald-400">({money(p.charity_cents)} to charity)</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Demo tools */}
        {isDemoMode() && sub.planId && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="text-sm uppercase tracking-wide text-amber-300">Demo tools</h2>
            <p className="mb-4 mt-1 text-sm text-zinc-400">See the subscription lifecycle without waiting a month. Test mode only.</p>
            <div className="flex flex-wrap gap-3">
              <form action={demoRenew}><button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">Simulate renewal charge</button></form>
              {sub.isActive && <form action={demoLapse}><button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">Simulate end of paid period</button></form>}
            </div>
          </section>
        )}

        {me.role === "admin" && <Link href="/admin" className="inline-block text-emerald-400 hover:underline">Go to admin panel →</Link>}
      </div>
    </main>
  );
}
