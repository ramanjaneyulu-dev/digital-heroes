import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { payDonation } from "../actions";
import { ChevronLeftIcon, AlertIcon, LockIcon, HeartHandIcon } from "@/components/icons";

export default async function DonatePage({ params }: { params: Promise<{ donationId: string }> }) {
  const { donationId } = await params;
  const me = await requireUser();
  const supabase = await createClient();

  // Row Level Security: a user can only ever read their own donations.
  const { data: d } = await supabase
    .from("donations").select("id, user_id, status, amount_cents, charity_id").eq("id", donationId).maybeSingle();
  if (!d || d.user_id !== me.id) notFound();

  const { data: c } = await supabase.from("charities").select("name, slug").eq("id", d.charity_id).maybeSingle();
  if (d.status === "paid") redirect(c ? `/charities/${c.slug}?thanks=1` : "/charities");
  const canPay = d.status === "pending"; // donations always use the sandbox gateway

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-3 py-10 text-zinc-100 sm:px-4">
      <div className="w-full max-w-md">
        <Link
          href={c ? `/charities/${c.slug}` : "/charities"}
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ChevronLeftIcon size={14} /> Back
        </Link>
        <div className="glass-card p-5 sm:p-8">
          <p className="alert-banner mb-4" data-tone="amber">
            <AlertIcon size={16} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-xs">DEMO GATEWAY · test mode. No real money moves and no card details are collected.</span>
          </p>
          <div className="flex items-center gap-2">
            <HeartHandIcon size={18} className="text-emerald-300" />
            <h1 className="text-xl font-semibold">Confirm your donation</h1>
          </div>
          <dl className="my-6 space-y-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-zinc-400">To</dt>
              <dd className="break-token text-zinc-100">{c?.name ?? "-"}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 pt-3 text-base font-semibold">
              <dt>Amount</dt>
              <dd className="break-token">{formatMoney(d.amount_cents)}</dd>
            </div>
          </dl>
          {d.status === "failed" && (
            <div className="alert-banner mb-4" data-tone="red">
              <AlertIcon size={16} className="mt-0.5 text-red-300" />
              <span className="flex-1 text-sm">
                The test card was declined.{" "}
                <Link href={c ? `/charities/${c.slug}` : "/charities"} className="underline">Try again</Link>
              </span>
            </div>
          )}
          {canPay && (
            <div className="space-y-3">
              <form action={payDonation}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="outcome" value="success" />
                <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400">
                  Donate {formatMoney(d.amount_cents)} with test card
                </button>
              </form>
              <form action={payDonation}>
                <input type="hidden" name="id" value={d.id} />
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
