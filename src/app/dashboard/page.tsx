import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getSubscriptionState } from "@/lib/subscription";
import { isDemoMode } from "@/lib/payments";
import { formatMoney } from "@/lib/money";
import { logout } from "@/app/(auth)/actions";
import { cancelSubscription, resumeSubscription, demoRenew, demoLapse } from "./actions";

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    : "-";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-zinc-700/40 text-zinc-300",
  lapsed: "bg-amber-500/15 text-amber-300",
  canceled: "bg-red-500/15 text-red-300",
  past_due: "bg-amber-500/15 text-amber-300",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string }>;
}) {
  const { subscribed } = await searchParams;
  const profile = await requireUser();
  const sub = await getSubscriptionState(profile.id);
  const settings = await getSettings();
  const supabase = await createClient();

  const [{ data: plan }, { data: charity }] = await Promise.all([
    sub.planId
      ? supabase.from("plans").select("name, price_cents, billing_months").eq("id", sub.planId).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.charity_id
      ? supabase.from("charities").select("name").eq("id", profile.charity_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Hello, {profile.full_name || profile.email}</h1>
          <form action={logout}>
            <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">Log out</button>
          </form>
        </header>

        {subscribed && sub.isActive && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            You&rsquo;re in! Your subscription is active and your charity contribution is set.
          </p>
        )}

        {/* Subscription */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400">Subscription</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[sub.status] ?? STATUS_STYLE.inactive}`}>
              {sub.cancelAtPeriodEnd && sub.isActive ? "Ending soon" : sub.status.replace("_", " ")}
            </span>
          </div>

          {sub.isActive ? (
            <div className="mt-4 space-y-4">
              <p className="text-lg">
                {plan?.name ?? sub.planId} plan
                {plan && <span className="text-zinc-400"> · {formatMoney(plan.price_cents, settings.currency)} / {plan.billing_months === 12 ? "year" : "month"}</span>}
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

        {/* Scores */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Your scores</h2>
          {sub.isActive ? (
            <Link href="/dashboard/scores" className="text-emerald-400 hover:underline">Enter or edit your scores →</Link>
          ) : (
            <p className="text-zinc-400">Scores unlock when your subscription is active.</p>
          )}
        </section>

        {/* Charity */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Your charity</h2>
          {charity ? (
            <p>{charity.name} <span className="text-emerald-400">· {Number(profile.charity_pct)}% of your fee</span></p>
          ) : (
            <p className="text-zinc-400">You will choose a charity when you subscribe.</p>
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

        {profile.role === "admin" && (
          <Link href="/admin" className="inline-block text-emerald-400 hover:underline">Go to admin panel →</Link>
        )}
      </div>
    </main>
  );
}
