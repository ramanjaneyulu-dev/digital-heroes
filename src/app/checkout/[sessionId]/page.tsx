import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { isDemoMode } from "@/lib/payments";
import { formatMoney, splitPayment } from "@/lib/money";
import { payWithTestCard } from "../actions";
import { ChevronLeftIcon, AlertIcon, LockIcon } from "@/components/icons";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("payment_sessions")
    .select("id, user_id, status, plan_id, charity_id, charity_pct, amount_cents")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== profile.id) notFound();
  if (session.status === "paid") redirect("/dashboard?subscribed=1");

  const [{ data: plan }, { data: charity }, settings] = await Promise.all([
    supabase.from("plans").select("name, billing_months").eq("id", session.plan_id).maybeSingle(),
    supabase.from("charities").select("name").eq("id", session.charity_id).maybeSingle(),
    getSettings(),
  ]);
  const split = splitPayment(session.amount_cents, Number(session.charity_pct), settings.prizePoolShare);
  const money = (c: number) => formatMoney(c, settings.currency);
  const canPay = session.status === "pending" && isDemoMode();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-3 py-10 text-zinc-100 sm:px-4">
      <div className="w-full max-w-md">
        <Link href="/subscribe" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
          <ChevronLeftIcon size={14} /> Back
        </Link>
        <div className="glass-card p-5 sm:p-8">
          <p className="alert-banner mb-4" data-tone="amber">
            <AlertIcon size={16} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-xs">DEMO GATEWAY · test mode. No real money moves and no card details are collected.</span>
          </p>
          <h1 className="text-xl font-semibold">Complete your subscription</h1>

          <dl className="my-6 space-y-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Plan</dt>
              <dd className="break-token text-zinc-100">{plan?.name ?? session.plan_id}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Charity</dt>
              <dd className="break-token text-zinc-100">{charity?.name ?? "-"}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-zinc-400">To charity ({Number(session.charity_pct)}%)</dt>
              <dd className="break-token text-emerald-400">{money(split.charityCents)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Into the prize pool</dt>
              <dd className="break-token text-zinc-100">{money(split.prizePoolCents)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 pt-3 text-base font-semibold">
              <dt>Total today</dt>
              <dd className="break-token">{money(session.amount_cents)}</dd>
            </div>
          </dl>

          {session.status === "failed" && (
            <div className="alert-banner mb-4" data-tone="red">
              <AlertIcon size={16} className="mt-0.5 text-red-300" />
              <span className="flex-1 text-sm">
                The test card was declined. <Link href="/subscribe" className="underline">Start again</Link>
              </span>
            </div>
          )}
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-400">
              Something went wrong recording the payment. Please try again.
            </p>
          )}

          {canPay && (
            <div className="space-y-3">
              <form action={payWithTestCard}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="outcome" value="success" />
                <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400">
                  Pay {money(session.amount_cents)} with test card (success)
                </button>
              </form>
              <form action={payWithTestCard}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="outcome" value="decline" />
                <button className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
                  Simulate a declined card
                </button>
              </form>
            </div>
          )}
          <p className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-zinc-500">
            <LockIcon size={12} /> Demo gateway · no real charges
          </p>
        </div>
      </div>
    </main>
  );
}
