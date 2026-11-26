import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getSubscriptionState } from "@/lib/subscription";
import { DashboardNav } from "@/components/dashboard-nav";
import { CharityForm } from "./charity-form";

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
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">← Back to dashboard</Link>
        <h1 className="text-2xl font-semibold">Your charity</h1>
        <DashboardNav current="/dashboard/charity" />
        <p className="text-sm text-zinc-400">Choose who your subscription supports and how much of it. Changes apply from your next payment. Want to give extra? <Link href="/charities" className="text-emerald-400 hover:underline">Make a one-off donation</Link>.</p>
        {(charities ?? []).length === 0 ? <p className="text-zinc-400">No charities are available yet.</p> : (
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
