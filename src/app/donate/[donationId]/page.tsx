import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/payments";
import { formatMoney } from "@/lib/money";
import { payDonation } from "../actions";

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
  const canPay = d.status === "pending" && isDemoMode();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          DEMO GATEWAY · test mode. No real money moves and no card details are collected.
        </p>
        <h1 className="text-xl font-semibold">Confirm your donation</h1>
        <dl className="my-6 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">To</dt><dd>{c?.name ?? "-"}</dd></div>
          <div className="flex justify-between border-t border-zinc-800 pt-3 text-base font-semibold"><dt>Amount</dt><dd>{formatMoney(d.amount_cents)}</dd></div>
        </dl>
        {d.status === "failed" && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            The test card was declined. <Link href={c ? `/charities/${c.slug}` : "/charities"} className="underline">Try again</Link>
          </p>
        )}
        {canPay && (
          <div className="space-y-3">
            <form action={payDonation}>
              <input type="hidden" name="id" value={d.id} /><input type="hidden" name="outcome" value="success" />
              <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 hover:bg-emerald-400">Donate {formatMoney(d.amount_cents)} with test card</button>
            </form>
            <form action={payDonation}>
              <input type="hidden" name="id" value={d.id} /><input type="hidden" name="outcome" value="decline" />
              <button className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800">Simulate a declined card</button>
            </form>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-zinc-500"><Link href={c ? `/charities/${c.slug}` : "/charities"} className="hover:text-zinc-300">Cancel</Link></p>
      </div>
    </main>
  );
}
