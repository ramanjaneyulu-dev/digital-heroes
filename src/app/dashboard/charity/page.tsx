import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getSubscriptionState } from "@/lib/subscription";
import { DashboardNav } from "@/components/dashboard-nav";
import { CharityForm } from "./charity-form";
import { ChevronLeftIcon, HeartHandIcon } from "@/components/icons";

export default async function MyCharityPage() {
  const me = await requireUser();
  const supabase = await createClient();
  const sub = await getSubscriptionState(me.id);
  const settings = await getSettings();

  const [{ data: charities }, { data: plan }] = await Promise.all([
    supabase.from("charities").select("id, name, description").eq("is_active", true).order("name"),
    // Preview with the user's own plan, or the monthly plan if they have none yet.
    supabase.from("plans").select("price_cents").eq("id", sub.planId ?? "monthly").maybeSingle(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <HeartHandIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Your charity</h1>
        </div>
        <DashboardNav current="/dashboard/charity" />

        <p className="text-sm text-zinc-400">
          Choose who your subscription supports and how much of it. Changes apply from your next payment.
          Want to give extra?{" "}
          <Link href="/charities" className="text-emerald-400 hover:underline">Make a one-off donation</Link>.
        </p>

        {(charities ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
            No charities are available yet.
          </p>
        ) : (
          <CharityForm
            charities={charities ?? []}
            currentId={me.charity_id}
            currentPct={Number(me.charity_pct)}
            priceCents={plan?.price_cents ?? 49900}
            prizeShare={settings.prizePoolShare}
            currency={settings.currency}
          />
        )}
      </div>
    </main>
  );
}
